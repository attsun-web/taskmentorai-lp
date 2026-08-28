# プロジェクト設定

> カスタマイズ: プロジェクト開始時にこのファイルを編集する。

> **設定の二層管理**
>
> - **config.md**（このファイル）: チーム共有のデフォルト設定。git 管理下で配布対象。全案件の共通ベースになる。
> - **config.local.md**（プロジェクトルート・git 管理外）: 案件／個人ごとの上書き設定。存在すれば config.md より優先される。
> - 案件固有の値（ブレークポイント・インナー幅・抽出カラー・命名規則・レスポンシブ方針・単位 等）は **config.local.md に記載し、本ファイル（config.md）は編集しない**。

---

## 基本設定

### 出力先パス

```yaml
HTML: /index.html
CSS: /sass/style.scss # 形式: SCSS × CSS出力方式: 単一 のとき。分割のときは /sass/styles.scss（複数形・sあり）。形式: CSS（ビルドレス）のときは /css/style.css
JS: /js/script.js # <head>内に defer 付きで読み込む（固定・references/html.md「scriptの配置」参照）
画像フォルダ: /images/ # Figma/XD/PSD経由時の画像保存先
```

- **マルチページ時の出力先**: 2 ページ目以降は `{ページ名}/index.html` に配置する（例: `about/index.html` → `/about/` で表示）。ルート直下の `index.html` はトップページのみ。`ビルドツール: Vite` の場合は `vite.config.js` の `rollupOptions.input` に各ページを追記する（詳細は references/ref:build（工程APIから取得） 参照）。

### 命名規則

```yaml
方式: FLOCSS # 選択肢: BEM / FLOCSS / SMACSS / 独自
```

### CSSプリプロセッサ

```yaml
形式: SCSS # 選択肢: CSS / SCSS / Sass
```

- **CSS出力方式との対応**: `CSS出力方式: 分割`（3層アーキテクチャ base/global/module）選択時のエントリは `/sass/styles.scss`、`CSS出力方式: 単一` 選択時は `/sass/style.scss` を出力先とする。

#### ⚠️ ビルド（Vite 等）を使わない場合は `形式: CSS` にする

`形式: SCSS` は**コンパイルが必要**（SCSS はブラウザがそのまま解釈できない）。`ビルドツール: なし` のまま `形式: SCSS` を出力すると、変換されず**ブラウザで表示されない**。ビルド環境を用意しない運用では次の組み合わせにする:

- `形式: CSS`（プレーンCSS。`.css` をそのまま納品でき、コンパイル不要）
- `ビルドツール: なし`（既定）
- この場合、SCSS 専用機能（`to-rem()`・`mq-up`/`mq-down` mixin・`$` 色型ルール）は使わず、css.md 記載の CSS フォールバック（`px`/生 `rem` 直書き、生 `@media`）で書く。リセットCSS は ref:reset（工程APIから取得） をそのまま `<style>`/`.css` に出力する。
- **WebP**: ローカル画像で `<picture>` を使う場合、`.webp` 生成には `node scripts/generate-webp.js`（Node が必要。**スクリプト実体は references/ref:build（工程APIから取得） の「generate-webp.js」節にあり、ビルドレスでも WebP対応: true なら ref:build（工程APIから取得） を読んで配置する**）を実行する。Node も使わないなら `WebP対応: false` にして `<img>` 直参照にする（`<source>` の壊れ参照を防ぐ）。スクリーンショット運用（Placeholder/picsum）は WebP 生成不要で影響なし。
- **画像最適化**: ビルドレス構成では自動圧縮が走らない。書き出した画像が大きい場合（目安: 1枚300KB超）は、macOS 標準の `sips` で納品前に一括縮小する（例: `sips -Z 2000 images/*.jpg` で最大辺2000pxに縮小）。自動最適化が必要なら `ビルドツール: Vite`（references/ref:build（工程APIから取得））を使う。

> ビルドを使う人は `形式: SCSS` + `ビルドツール: Vite`、使わない人は `形式: CSS` + `ビルドツール: なし` が基本の組み合わせ。

### その他

```yaml
インデント: 2スペース
文字コード: UTF-8
改行コード: LF
```

---

## コーディング規約設定

### レスポンシブ設定

```yaml
基本方針: モバイルファースト # 選択肢: モバイルファースト / デスクトップファースト
ブレークポイント:
  - tablet: 768px
  - desktop: 1024px
  - wide: 1280px
```

- ※ 既定を「モバイルファースト」とするのは、css.md のコード例がすべてモバイルファースト記法（基準ルール＋`min-width`で上書き）で書かれており、実挙動と表記を一致させるため。デスクトップファーストにしたい案件は config.local.md で上書きする（その場合 `max-width` 系のメディアクエリで書く）。

### レイアウト設定

```yaml
インナー幅: 1200px # 選択肢: 1200px / 1140px / 1280px / 1366px / カスタム
インナー余白（SP）: 16px
インナー余白（PC）: 24px
```

### 余白の指定方法

```yaml
縦方向: margin-top（上のみ使用） # 選択肢: margin-top統一 / margin-bottom統一 / 自由
横方向: margin-left（左のみ使用） # 選択肢: margin-left統一 / margin-right統一 / 自由
上下両方同値: margin-block
左右両方同値: margin-inline
要素内部: padding
```

- ※ 中央寄せの `margin: 0 auto` は書かない → `margin-inline: auto`（関係ない上下に0を書かないため）。左右セット → `margin-inline`、片側だけ → 横方向設定（margin-left）に従う。詳細は references/css.md「論理プロパティの使い分け」。

### 画像設定

```yaml
WebP対応: true # picture + source タグ使用
遅延読み込み: true # loading="lazy"
画像命名規則: "{セクション名}/{セクション名}-{連番}.{拡張子}" # セクション別フォルダ。例: about/about-01.jpg, service/service-02.jpg
Placeholder: https://picsum.photos/seed/{連番}/{width}/{height}
```

- **セクション別フォルダ構成**: フォルダ名 = セクション名（Block 名と一致）。サイト共通画像（ロゴ・アイコン等）は `images/common/`。複数ページで同名セクションがある場合のみ `ページ名-セクション名/`（例: `top-service/`）。詳細は references/html.md「画像フォルダ構成」。
- ※ ファーストビュー（初期表示で画面内に見える主要画像・ヒーロー画像）には `loading="lazy"` を付けない（LCP 悪化を防ぐため）。詳細は references/html.md を参照。
- **Figma MCP 経由の場合**: デザインカンプ内の画像を書き出して画像フォルダに保存し、ローカルパスで参照する（Placeholder は使わない）
  - 命名規則: `{セクション名}/{セクション名}-{連番}.{拡張子}`（例: `fv/fv-01.png`, `service/service-02.jpg`）
  - 人物写真: jpg / その他: png / アイコン: svg（可能な場合）
- **スクリーンショットの場合**: Placeholder URL をそのまま使用する
- seed方式で確実に画像が表示される
- 複数画像: seed/1, seed/2, seed/3... と連番
- 同じseed値で常に同じ画像（リンク切れなし）

### 色設定

```yaml
色の抽出方法: デザイン画像から目視で確認（推測禁止）
CSS変数化: true # 全色変数化: デザインに登場する色はすべて変数を経由（HEX直書き禁止）
CSS変数プレフィックス: --color-
```

- **全色変数化**: 一致する変数が無い色は、近似の既存変数にまとめず**用途ベースで新しい変数を追加**してから使う（詳細は references/css.md「CSS変数の完全一致ルール（全色変数化）」）。

### 色の用途ベース命名（CSS変数/SCSS変数 両対応）

色は「見た目の色名」ではなく「用途（役割）」で命名する。CSS 変数（`var()` 運用）でも SCSS 変数（`$color` 運用）でも同じ用途名を使う。

| 用途 | CSS変数 | SCSS変数 | 説明 |
|---|---|---|---|
| メインカラー | `--color-main` | `$color-main` | ブランド基調色・主要要素 |
| アクセントカラー | `--color-accent` | `$color-accent` | 強調・CTA・リンク等 |
| 背景色 | `--color-bg` | `$color-bg` | ページ／セクションの基本背景 |
| サブ背景色 | `--color-bg-sub` | `$color-bg-sub` | 補助的な背景（カード・帯等） |
| テキスト色 | `--color-text` | `$color-text` | 基本の本文文字色 |
| サブテキスト色 | `--color-text-sub` | `$color-text-sub` | 補足・キャプション等の文字色 |
| 反転テキスト色 | `--color-text-inverse` | `$color-text-inverse` | 濃色背景上の白抜き文字等 |
| ボーダー色 | `--color-border` | `$color-border` | 罫線・区切り線 |
| オーバーレイ（暗） | `--color-overlay-dark` | `$color-overlay-dark` | 画像上の暗幕・モーダル背景等 |

- **色は「用途」で命名する**（役割で命名し、見た目の色名は付けない）。この表が命名の正であり、工程API Step 2 の `:root` サンプルもこの表と同一語彙。

### フォント/ウェイト変数

フォントファミリー・ウェイトは数値・名称をベタ書きせず、**必ず変数経由で指定する**。

| 用途 | CSS変数 | 例 |
|---|---|---|
| 基本フォント | `--font-primary` | `"Noto Sans JP", sans-serif` |
| セカンドフォント | `--font-second` | 見出し等で使う別書体 |
| 英字フォント | `--font-en` | 数字・英字用（`Montserrat` 等） |

| ウェイト用途 | SCSS変数 | CSS変数（ビルドレス時） | 値 |
|---|---|---|---|
| Light | `$fw-light` | `--fw-light` | `300` |
| Normal | `$fw-normal` | `--fw-normal` | `400` |
| Medium | `$fw-medium` | `--fw-medium` | `500` |
| Bold | `$fw-bold` | `--fw-bold` | `700` |

- `font-family` / `font-weight` は数値・名称をベタ書きせず、必ず上記の変数を経由して指定する。

### アクセシビリティ

```yaml
alt属性: 必須（日本語で50文字以内目安）
aria-label: ボタン・アイコンに必須
role属性: 必要に応じて
```

---

## システム動作設定

### コーディング動作フラグ

スキルの挙動を制御する契約フラグ。既定値はすべて現行維持（自律スタート・単一 CSS・生成のみ）側に設定してある。案件で変える場合は config.local.md で上書きする。

```yaml
ヒアリングゲート: ON            # ON / OFF（Step0 の初回対話ゲートを制御）
CSS出力方式: 単一              # 単一(style.scss) / 分割(3層アーキテクチャ base/global/module)
レイアウトスケール: 固定        # 固定 / rem液体（vwでhtml font-sizeをスケール）
ビルドツール: なし             # なし / Vite
ビルド検証: OFF               # OFF / ON（ビルドツール:Vite のときのみ有効）
ブラウザQC検証: OFF            # OFF / ON（Playwright MCP。既定OFF厳守）
計画提案しきい値: 200          # 行数。この行数を超える追加/変更・全面書き換え前に計画提案
```

- **ヒアリングゲート**: Step0 の初回対話ゲートの ON/OFF。ON でも聞くべき項目が無ければ自動スキップし Step1 へ進む。
- **CSS出力方式**: `単一` は `style.scss` 1 ファイルにセクション追記。`分割` は 3 層アーキテクチャ（base/global/module）で `@use`/`@forward` 運用。
  - **`分割` を選ぶ案件では、プロジェクト直下の `.claude/check-overrides` に `margin-lr` を1行書いておく**（グローバルの即時ルールチェックフック（iro-templates系）が `sass/module/` 配下で発動し、「margin-left 禁止」の検査が本スキルの横方向設定（margin-left統一）と衝突して誤警告を出すため）。
- **script配置**: `<head>` 内に `defer` 付きで固定（旧 `script配置` フラグは廃止。body末尾方式は推奨しないため選択肢から削除。詳細は references/html.md「script の配置」）。
- **レイアウトスケール**: `固定` は px 系の固定レイアウト。`rem液体` は html の font-size を vw でスケールさせる液体レイアウト（`基本単位: rem` + `to-rem()` 必須のセット条件・実験的 opt-in）。
- **ビルドツール**: `なし` はランタイム非依存で生成のみ。`Vite` を選ぶとビルド層を有効化（詳細は references/ref:build（工程APIから取得））。
- **ビルド検証**: `ON` で `npm run dev/build` の通過や `@forward` 漏れを検証（`ビルドツール: Vite` のときのみ有効）。
- **ブラウザQC検証**: `ON` で Playwright MCP によるビジュアル QC を実行。既定 OFF を厳守（生成のみ・ブラウザ検証しないのが基本）。
- **計画提案しきい値**: 指定行数を超える追加／変更・全面書き換えの前に計画を提案する（既定 200 行）。

※ `基本単位: px / rem` は既存の「CSS詳細設定 › CSS単位設定」で定義（このセクションでは再定義しない）。

### UI/UX慣習パターンの適用

```yaml
適用: OFF # 選択肢: OFF / ON
```

- **OFF**: デザイン画像にあるものだけ実装（推測禁止）
  - ただし、一般的なWeb UXパターン（ハンバーガーメニュー、ドロップダウン、タブ、アコーディオン等）の動作は標準的に実装する
- **ON**: デザイン画像が簡略化されている場合、業界標準パターンを積極的に適用

**重要**: OFFでも、デザインで明示されているUIコンポーネントは一般的な動作パターンで実装する。「推測禁止」=「要素を勝手に追加しない」であり、「標準的なUI動作を実装しない」ではない。

---

## CSS詳細設定

### CSS単位設定

```yaml
CSS単位:
  基本単位: px  # 選択肢: px / rem
  rem基準値: 16px  # rem使用時のベースフォントサイズ
  letter-spacing: em変換  # Figma等のpx値をem値に自動変換
```

### メディアクエリ設定

```yaml
メディアクエリ配置: セレクタ直下  # 選択肢: セレクタ直下 / ファイル末尾まとめ
```

### positionルール

```yaml
position-absolute: 制限あり  # 選択肢: 制限あり / 自由
# 制限あり = Flexbox/Gridを優先し、absoluteは装飾・オーバーレイのみ許可
```


