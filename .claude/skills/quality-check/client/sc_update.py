"""通信部の自動更新（static-code API）。

サーバー上の最新版と手元の版を比べ、違えば入れ替える。同じなら何もしない。
入れ替え前に .bak を取り、新版が読み込めなければ自動で元へ戻す。
"""
import hashlib
import importlib.util
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TARGET = HERE / "sc_client.py"
sys.path.insert(0, str(HERE))


def main():
    import sc_client

    api_url, license_key, machine_id = sc_client.load_config()
    client = sc_client.SCClient(api_url, license_key, machine_id)
    client.start_session()
    latest = client._request("GET", "/v1/client/source", token=client.token)

    current = TARGET.read_bytes()
    if hashlib.sha256(current).hexdigest() == latest["sha256"]:
        return 0  # 最新。何もしない（毎回走っても無害）

    new_text = latest["content"]
    if hashlib.sha256(new_text.encode("utf-8")).hexdigest() != latest["sha256"]:
        print("通信部の更新を中止しました（受信データが壊れています）")
        return 0

    backup = TARGET.with_suffix(".py.bak")
    shutil.copy2(TARGET, backup)
    TARGET.write_text(new_text, encoding="utf-8")

    # 新版が壊れていないか確認し、駄目なら元へ戻す
    try:
        spec = importlib.util.spec_from_file_location("_sc_check", TARGET)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        assert hasattr(module, "SCClient") and hasattr(module, "load_config")
    except Exception as exc:
        shutil.copy2(backup, TARGET)
        print(f"通信部の更新に失敗したため元に戻しました: {exc}")
        return 0

    old = getattr(sc_client, "CLIENT_VERSION", "(不明)")
    print(f"通信部を更新しました: {old} -> {latest['version']}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        # 更新に失敗してもコーディング作業は止めない
        print(f"通信部の更新をスキップしました: {exc}")
        sys.exit(0)
