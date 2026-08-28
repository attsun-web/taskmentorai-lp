#!/usr/bin/env python3
"""static-code API 統合抽出CLI（配布クライアント用・stdlib-only）。

拡張子で経路を分岐する:
    .psd/.psb/.xd → design経路（アップロード→サーバー抽出→ダウンロード＆展開）
    .ai           → ai経路（ローカルIllustrator起動でraw.json+preview生成→zip化→
                    アップロード→サーバー抽出処理→ダウンロード＆展開→
                    image_manifestに従いリンク画像をローカルからコピー）

Illustrator起動部（find_illustrator_app/as_str/_tcc_denied/_run_illustrator）は
フル版の抽出スクリプトの該当ロジックを移植したもの。
セクション分割・PC/SP判定などの「頭脳ロジック」はサーバー側の抽出処理が担うため、
ここには一切含まない。
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Optional

import sc_client
from sc_client import SCClient, SCError

ENGINE_JSX_PATH = Path(__file__).resolve().parent / "ai2json.jsx"

_DESIGN_EXTS = {".psd", ".psb", ".xd"}


class ExtractError(Exception):
    """ユーザー向けメッセージを持つ致命的エラー。"""
    pass


# ---------------------------------------------------------------------------
# defense-in-depth: 展開先がout_dir配下に収まることを検証してから展開する
# （結果zipは認証済みサーバー由来だが、配布物なので念のため防御する）
# ---------------------------------------------------------------------------

def _safe_extract(zip_path, out_dir: Path) -> None:
    root = out_dir.resolve()
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            dest = (out_dir / info.filename).resolve()
            if not dest.is_relative_to(root):
                raise ExtractError(f"不正なzipメンバーパス: {info.filename}")
        zf.extractall(out_dir)


# ---------------------------------------------------------------------------
# design経路
# ---------------------------------------------------------------------------

def extract_design(client: SCClient, path: str, out: str) -> None:
    src = Path(path)
    upload = client.request_upload_url(src.name, kind="design")
    client.put_file(upload["put_url"], str(src))
    result = client.run_extract(upload["upload_id"], upload["object_name"], kind="design")

    out_dir = Path(out)
    out_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="sc-extract-dl-") as tmp:
        zip_path = Path(tmp) / "result.zip"
        client.download(result["download_url"], str(zip_path))
        _safe_extract(zip_path, out_dir)


# ---------------------------------------------------------------------------
# ai経路
# ---------------------------------------------------------------------------

def extract_ai(client: SCClient, path: str, out: str) -> None:
    src = Path(path)
    with tempfile.TemporaryDirectory(prefix="sc-ai-extract-") as tmp:
        workdir = Path(tmp)
        raw_json_path, preview_dir = _run_illustrator(src, workdir)

        bundle_zip = workdir / "bundle.zip"
        with zipfile.ZipFile(bundle_zip, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.write(raw_json_path, "raw.json")
            if preview_dir.is_dir():
                for p in preview_dir.iterdir():
                    if p.is_file():
                        zf.write(p, f"preview/{p.name}")

        upload = client.request_upload_url(f"{src.stem}.zip", kind="ai")
        client.put_file(upload["put_url"], str(bundle_zip))
        result = client.run_extract(upload["upload_id"], upload["object_name"], kind="ai")

        out_dir = Path(out)
        out_dir.mkdir(parents=True, exist_ok=True)
        result_zip = workdir / "result.zip"
        client.download(result["download_url"], str(result_zip))
        _safe_extract(result_zip, out_dir)

        images_dir = out_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        for entry in result.get("image_manifest", []):
            source_path = Path(entry["source_path"])
            # defense-in-depth: targetはbasenameのみ採用（../等でimages_dir外への書き込みを防ぐ）
            target = Path(entry["target"]).name
            if not target:
                print(f"警告: 不正な画像ターゲット名をスキップ: {entry['target']}")
                continue
            if source_path.exists():
                shutil.copyfile(str(source_path), str(images_dir / target))
            else:
                print(f"警告: リンク画像が見つかりません: {source_path}")


# ---------------------------------------------------------------------------
# Illustratorローカル起動（フル版の抽出スクリプトから移植・薄型化。頭脳ロジックは含まない）
# ---------------------------------------------------------------------------

def find_illustrator_app(explicit_path: Optional[str] = None) -> str:
    if explicit_path:
        p = Path(explicit_path)
        if not p.exists():
            raise ExtractError(f"指定されたIllustratorアプリが見つかりません: {p}")
        return str(p)

    apps_dir = Path("/Applications")
    candidates = []
    if apps_dir.exists():
        for d in apps_dir.glob("Adobe Illustrator*"):
            if not d.is_dir():
                continue
            m = re.search(r"(\d{4})", d.name)
            year = int(m.group(1)) if m else 0
            bundle = d / "Adobe Illustrator.app"
            if bundle.exists():
                candidates.append((year, bundle))
    if not candidates:
        raise ExtractError(
            "Adobe Illustratorが見つかりません。/Applications/ にインストールされているか確認するか、"
            "--illustrator オプションでアプリ本体(.app)のフルパスを指定してください。"
        )
    candidates.sort(key=lambda t: t[0], reverse=True)
    return str(candidates[0][1])


def as_str(s) -> str:
    """AppleScript/ExtendScriptの文字列リテラルとして安全な形にエスケープする。"""
    escaped = str(s).replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def _tcc_denied(stderr_text: Optional[str]) -> bool:
    return "-1743" in (stderr_text or "") or "not authorized" in (stderr_text or "").lower()


def _ping_illustrator(app_path: str, timeout_per_try: int = 20, max_wait: int = 180):
    """軽量ping(app.version)をリトライし、Illustratorの応答を確認する。"""
    script = (
        f"with timeout of {timeout_per_try} seconds\n"
        f"\ttell application {as_str(app_path)}\n"
        '\t\tdo javascript "app.version"\n'
        "\tend tell\n"
        "end timeout\n"
    )
    deadline = time.time() + max_wait
    attempt = 0
    while time.time() < deadline:
        attempt += 1
        try:
            result = subprocess.run(
                ["osascript", "-e", script],
                capture_output=True, text=True, timeout=timeout_per_try + 15,
            )
        except subprocess.TimeoutExpired:
            time.sleep(2)
            continue
        if result.returncode == 0 and result.stdout.strip():
            return True, attempt
        if _tcc_denied(result.stderr):
            raise ExtractError(
                "AppleScriptからIllustratorを制御する権限がありません(TCC未許可)。\n"
                "  1) システム設定 > プライバシーとセキュリティ > オートメーション を開く\n"
                "  2) 実行中のターミナル/Claude実行環境の項目を探し、"
                "「Adobe Illustrator」へのアクセスを許可する\n"
                "  3) 許可後にこのコマンドを再実行してください"
            )
        time.sleep(2)
    return False, attempt


def _run_illustrator(ai_path: Path, workdir: Path) -> tuple[Path, Path]:
    """Illustratorをosascript経由で起動しai2json.jsxを実行させ、raw.jsonとpreviewディレクトリを生成する。
    フル版の抽出スクリプトの run_extraction_for_file 相当（頭脳ロジック抜き・薄型移植）。
    戻り値: (raw_json_path, preview_dir)
    """
    ai_path = Path(ai_path)
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)

    app_path = find_illustrator_app()

    print("Illustratorの応答を確認しています(初回はアプリ起動のため数十秒かかる場合があります)...")
    ok, attempts = _ping_illustrator(app_path)
    if not ok:
        raise ExtractError(
            "Illustratorが応答しませんでした。Illustratorが正常に起動できているか、"
            "他のダイアログが表示されたままになっていないか確認してください。"
        )
    print(f"  応答確認OK（{attempts}回目の試行）")

    raw_json_path = workdir / "raw.json"
    preview_dir = workdir / "preview"
    preview_dir.mkdir(parents=True, exist_ok=True)
    marker_done = workdir / "done.marker"
    marker_error = workdir / "error.txt"
    progress_path = workdir / "progress.txt"
    wrapper_jsx = workdir / "wrapper.jsx"
    applescript_path = workdir / "run.applescript"

    for p in (marker_done, marker_error, progress_path, raw_json_path):
        if p.exists():
            p.unlink()

    if not ENGINE_JSX_PATH.exists():
        raise ExtractError(f"ai2json.jsx が見つかりません: {ENGINE_JSX_PATH}")
    engine_src = ENGINE_JSX_PATH.read_text(encoding="utf-8")

    def js_str(s):
        escaped = str(s).replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'

    var_defs = (
        f"var AI_SOURCE_PATH = {js_str(str(ai_path))};\n"
        f"var AI_OUTPUT_JSON_PATH = {js_str(str(raw_json_path))};\n"
        f"var AI_PREVIEW_DIR = {js_str(str(preview_dir))};\n"
        f"var AI_MARKER_DONE_PATH = {js_str(str(marker_done))};\n"
        f"var AI_MARKER_ERROR_PATH = {js_str(str(marker_error))};\n"
        f"var AI_PROGRESS_PATH = {js_str(str(progress_path))};\n"
    )
    wrapper_jsx.write_text(var_defs + "\n" + engine_src, encoding="utf-8")

    timeout = 300
    applescript_src = (
        "on run\n"
        f"\tset jsxSource to (read (POSIX file {as_str(str(wrapper_jsx))}) as «class utf8»)\n"
        f"\ttell application {as_str(app_path)}\n"
        f"\t\twith timeout of {int(timeout)} seconds\n"
        "\t\t\tdo javascript jsxSource\n"
        "\t\tend timeout\n"
        "\tend tell\n"
        "end run\n"
    )
    applescript_path.write_text(applescript_src, encoding="utf-8")

    proc = subprocess.Popen(
        ["osascript", str(applescript_path)],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )

    start = time.time()
    last_progress = None
    try:
        while True:
            if marker_error.exists():
                try:
                    proc.wait(timeout=5)
                except Exception:
                    proc.kill()
                msg = marker_error.read_text(encoding="utf-8", errors="replace")
                raise ExtractError(
                    f"'{ai_path.name}' の抽出中にIllustrator内でエラーが発生しました: {msg}"
                )
            if marker_done.exists():
                break
            if progress_path.exists():
                try:
                    content = progress_path.read_text(encoding="utf-8", errors="replace").strip()
                except Exception:
                    content = None
                if content and content != last_progress:
                    print(f"  進捗: アートボード {content}")
                    last_progress = content
            if proc.poll() is not None:
                stderr_text = ""
                try:
                    stderr_text = proc.stderr.read() if proc.stderr else ""
                except Exception:
                    pass
                if _tcc_denied(stderr_text):
                    raise ExtractError(
                        "AppleScriptからIllustratorを制御する権限がありません(TCC未許可)。\n"
                        "  1) システム設定 > プライバシーとセキュリティ > オートメーション を開く\n"
                        "  2) 実行中のターミナル/Claude実行環境の項目を探し、"
                        "「Adobe Illustrator」へのアクセスを許可する\n"
                        "  3) 許可後にこのコマンドを再実行してください"
                    )
                raise ExtractError(
                    f"'{ai_path.name}' の処理中にosascriptが完了マーカーなしで終了しました。"
                    f"(exit={proc.returncode}) stderr: {stderr_text.strip()[:800]}"
                )
            if time.time() - start > timeout:
                proc.kill()
                raise ExtractError(
                    f"'{ai_path.name}' の処理がタイムアウトしました({timeout}秒)。"
                    "Illustratorがダイアログ待ちで停止していないか確認し、再実行してください。"
                )
            time.sleep(1)
    finally:
        if proc.poll() is None:
            try:
                proc.wait(timeout=5)
            except Exception:
                proc.kill()

    if not raw_json_path.exists():
        raise ExtractError(f"'{ai_path.name}': 完了マーカーはありましたが出力JSONが見つかりませんでした")

    return raw_json_path, preview_dir


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="static-code API 統合抽出CLI")
    parser.add_argument("files", nargs="+", help="入力ファイル（.psd/.psb/.xd/.ai、複数可）")
    parser.add_argument("--out", type=str, default=".design-extract", help="出力先ディレクトリ")
    args = parser.parse_args()

    file_paths = []
    for raw in args.files:
        p = Path(raw)
        if not p.exists():
            print(f"エラー: ファイルが見つかりません: {p}", file=sys.stderr)
            sys.exit(1)
        file_paths.append(p)

    try:
        api_url, license_key, machine_id = sc_client.load_config()
    except SCError as e:
        print(f"エラー: {e}", file=sys.stderr)
        sys.exit(1)

    client = SCClient(api_url, license_key, machine_id)
    try:
        client.start_session()
    except SCError as e:
        print(f"エラー: セッション開始に失敗しました: {e}", file=sys.stderr)
        sys.exit(1)

    for p in file_paths:
        ext = p.suffix.lower()
        try:
            if ext in _DESIGN_EXTS:
                print(f"処理中: {p.name}")
                extract_design(client, str(p), args.out)
            elif ext == ".ai":
                print(f"処理中: {p.name}")
                extract_ai(client, str(p), args.out)
            else:
                print(f"エラー: 対応していない拡張子です: {p.name}", file=sys.stderr)
                sys.exit(1)
        except (SCError, ExtractError) as e:
            print(f"エラー: '{p.name}' の抽出に失敗しました: {e}", file=sys.stderr)
            sys.exit(1)

    print(f"完了しました: {args.out}")


if __name__ == "__main__":
    main()
