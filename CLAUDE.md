# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Vite + FLOCSS + WordPress のテーマ開発テンプレート。ローカル環境は `@wordpress/env`（Docker 必須）。ドキュメントはすべて日本語。

## コマンド

パッケージマネージャは **yarn 固定**（`preinstall` の `bin/check-env.js` が npm 実行を弾く）。

```bash
yarn doctor              # Node/Yarn/Docker/ポート/テーマ設定の診断。まずこれ
yarn wp-start            # WordPress 起動 → localhost:8888（初回 5-10 分）
yarn wp-init             # WP 初期設定＋テーマ自動有効化。wp-start 後の初回のみ
yarn dev                 # Vite + SCSS glob 監視 → localhost:5173（別ターミナルで常駐）
yarn build:wp            # 本番ビルド → wordpress/themes/{THEME_NAME}/assets/
yarn wp-stop
```

品質チェック（**テストスイートは存在しない**。単体テストのコマンドは無い）:

```bash
yarn format              # eslint --fix + stylelint --fix + prettier --write
yarn format:check        # チェックのみ
yarn validate:acf        # acf-json/ の構文・必須キー検証
```

Prettier は **PHP も整形する**（`@prettier/plugin-php`, `printWidth: 250`, ダブルクォート）。ESLint は `vite.config.*` と `wordpress/**` を、Stylelint は `wordpress/**` を対象外にしている。

## アーキテクチャ上の要点

### テーマ名は config/project.json が正本

`config/project.json` の `themeSlug` を `bin/utils/paths.js` が `THEME_NAME` として解決し、そこから Vite の出力先・`.wp-env.json` の mappings・`style.css` の Theme Name・DB の `template`/`stylesheet` がすべて派生する（未作成時のみフォルダ名にフォールバック）。現在の値は `wp-template`。テーマ名を変えるときは `yarn init:project` → `yarn update:wp-config` を通すこと。ディレクトリを直接リネームしない。

- `yarn wp-init`（`init-wp-options.js`）= **WordPress の中身**（DB のオプション・固定ページ・シード投稿）。wp-env 起動済みが前提。
- `yarn update:wp-config` = **テーマ名まわりと設定ファイル**。`yarn wp-start` の内部でも `--wp-env` 付きで自動実行される。

### 開発/本番の切り替えは PHP 側のランタイム判定

`functions-lib/func-helpers.php` の `get_asset_environment()` が `dev` / `manifest` / `fallback` を返し、`func-enqueue.php` が読み込み方を分岐する。`dev` になる条件は **`WP_DEBUG` が true かつ `manifest.dev.json` が存在し、かつその `url` のホストが localhost/127.0.0.1** の3点すべて。

`manifest.dev.json` は `vite-plugin-dev-manifest` がテーマ直下に書き出す開発専用ファイルで、**本番に残るとサイトが壊れる**。`yarn build:wp` の末尾で `bin/clean-dev-files.js` が削除する（同時に manifest に載っていない過去ビルドのハッシュ付き JS/CSS も掃除する）。デプロイ前にテーマ直下に存在しないことを必ず確認する。

本番は `.vite/manifest.json` 経由。ライブラリ CSS（Splide 等）を先に enqueue し、メイン CSS を依存指定で後ろに回している — CSS の詰め込み順を変えるときはこの依存関係を壊さないこと。

### ビルド成果物はテーマディレクトリに直接出る

`yarn build:wp` の出力先は `dist/` ではなく `wordpress/themes/{THEME_NAME}/assets/`。JS/CSS はハッシュ付き、**画像はハッシュなし**（`assetFileNames` で分岐）。`wordpress/themes/*/assets/js/`・`assets/styles/`・`.vite/`・`manifest.dev.json` は gitignore 済み＝コミット対象外の生成物。

### SCSS は FLOCSS + glob import

`src/assets/styles/style.scss` が `@use "layouts/**"` のようにワイルドカードで読み込み、`vite-plugin-sass-glob-import` が展開する。

- **ファイルを追加・削除したら `yarn dev`（内部の `bin/watch-scss-globs.js`）が起動している必要がある** — style.scss の mtime を更新して glob を再展開させるため。dev を止めたまま追加したファイルは読み込まれない。
- `The default namespace "**" is not a valid Sass identifier.` という Sass 警告は**この構成では想定どおり**。無視してよい。
- ネストは書かない（FLOCSS 方針）。エイリアスは `@` → `src/assets/styles`、`@js` → `src/assets/js`。
- SCSS の `url()` は **その SCSS ファイル自身の位置基準**で解決される（Sass modern API）。`projects/` や `components/` からは `../../images/...`。解決できないと `didn't resolve at build time` 警告が出て画像が出力されないので、ビルドログを確認する。

### 画像

`src/assets/images/` に置くと `bin/vite-plugin-convert-images.js`（Sharp 実装）が WebP/AVIF に変換し、src とテーマの両方へ出力する。dev では監視して都度変換、build では `buildStart` で一括変換してから継続するため、`yarn dev` を一度も回していなくても `yarn build:wp` だけで揃う。PHP からは `img_path('/logo.svg')`（`functions-lib/func-url.php` で定義）。

### プラグインは .wp-env.json が正本

`wordpress/plugins/*` は gitignore されているため、**管理画面から入れたプラグインは `yarn wp-plugins:sync` で `.wp-env.json` に反映しないとクローン先で再現されない**。カスタム投稿タイプ（works 等）はコードではなく CPT UI プラグインで登録されている（`functions.php` のコメント参照）。ACF フィールドは `acf-json/` で同期。

### DB の共有

`yarn wp-contents:export` → `wordpress/uploads/backup.sql`、`yarn wp-contents:import` で復元。import は DB を完全リセットするため確認プロンプトがあり、**エージェントが自己判断で `--yes` を付けてはいけない**（`bin/README.md` に明記）。配布・共有用は `yarn wp-contents:export:sanitized` で無害化してから。

### テンプレート構成

`functions.php` は `functions-lib/func-*.php` を `get_template_part` で読むだけの薄いローダー。`functions-lib/lib/`（TGMPA 等のライブラリ）は Vite のライブリロード監視から**除外**されているので、触っても自動リロードされない。

一覧は archive 系、固定コンテンツは page 系。汎用アーカイブは `archive.php → archive-list → archive-loop → archive-card` の階層で、専用投稿タイプは `works-list → works-card` のようにカードだけ差し替える。パーツへのデータ受け渡しは**パーツ内で直接取得**が推奨。詳細は `doc/TEMPLATE_GUIDE.md`。

## コーディング規則（doc/coding-guidelines.md 要約）

- クラス名は BEM / FLOCSS、**略さない**（`.ttl` ではなく `.title`）。Stylelint の `selector-class-pattern` で強制。
- `img` は `width`/`height` 必須、MV 以外は `loading="lazy"`。
- サイト内パスはルート相対（`/` 始まり）。文字実体参照は使わず UTF-8 直書き（`&copy;` ではなく `©`）。
- margin/padding は論理プロパティで方向を明示（`margin-block-start` / `margin-inline-start`）。等間隔は `gap`、画像比率は `aspect-ratio`。
- `font-size` は `calc(値 * var(--to-rem))`。
- JS は ES モジュール、`var` 禁止。`src/assets/js/` の `_` 始まりファイルは Vite のエントリから除外される（部分モジュール扱い）。

## AI エージェント向けスキル

`skills/` が**正本**で、`.claude/skills/` は「正本を Read してから作業せよ」と指示するだけの薄いエントリ（Codex / Cursor と共用するための構成）。スキルを編集するときは `skills/` 側を直す。

- `wp-env-setup` — 環境構築・投稿作成・DB/プラグイン同期
- `adapt-styles` — foundation/global の SCSS を参照プロジェクトの流儀に差し替え

ルートの `Claude Code導入ガイド.md` / `Claude Code導入_AI指示書.md` は **エンドユーザー向けの Claude Code インストール手引き**であり、このリポジトリのコードとは無関係。

## 環境

Node.js >= 20.19.0 / yarn 4.12.0 / Docker Desktop（Compose V2 必須。`@wordpress/env` 11 系のため V1 では動かない）。Windows でも動作する前提でスクリプトが書かれており、glob や chokidar にパスを渡す箇所では `bin/utils/paths.js` の `toPosixPath()` で区切り文字を変換している — 新しくパスをパターンとして埋め込むときは同様に扱うこと。

管理画面 `http://localhost:8888/wp-admin/`（admin / password）。`.wp-env.json` の `WPLANG: "ja"` で日本語版が入る。
