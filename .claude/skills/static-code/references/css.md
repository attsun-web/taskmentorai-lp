# CSSコーディング規約

## リセットCSS（初回のみ・必ず先頭に出力）

初回の CSS 生成時、出力の**先頭に `references/ref:reset（工程APIから取得）` を丸ごと（全文）採用**して貼り付ける。要約・抜粋は禁止。

- 要約すると `cursor: pointer` / `color: inherit` / `resize: vertical` / `text-wrap: balance`・`pretty` / `min-height: 100dvh` / `interpolate-size: allow-keywords` / `prefers-reduced-motion` ガード等の細部が落ちるため、必ず全文で貼る。
- 画像の `width` / `height` / `display` の想定は reset 側（`img { display: block; max-width: 100%; height: auto; }`）に**一元化**する。個別セクションで再指定しない（上書きが必要なときのみ明示）。
- SCSS 分割時（`CSS出力方式: 分割`）は reset を `base/_reset.scss` として配置し、`@use`/`@forward` で最初に読み込む。

### SCSS分割（3層アーキテクチャ）の全体構造（`CSS出力方式: 分割` のときの正）

```
sass/
├── styles.scss          # エントリ（複数形・sあり）。中身は @use "base"; @use "global"; @use "module"; のみ
├── base/
│   ├── _index.scss      # @forward "reset";
│   └── _reset.scss      # ref:reset（工程APIから取得） 全文
├── global/
│   ├── _index.scss      # @forward で配下を列挙
│   ├── _variables.scss  # 色・フォント変数
│   └── _common.scss     # .inner 等の共通レイアウト
└── module/
    ├── _index.scss      # @forward "_header"; @forward "_fv"; …（★追加のたびに列挙。漏れるとビルドに含まれない）
    ├── _header.scss     # 1ブロック（BEM/FLOCSSの1コンポーネント）= 1ファイル
    └── _fv.scss …
```

- 依存方向は一方通行: `styles.scss` → 各層の `_index.scss` → 個別ファイル。個別ファイル同士は互いに @use しない（変数・mixinが必要なら `global` を @use する）
- 新しいセクションを追加したら **module/ に `_[block].scss` を作成し、`module/_index.scss` に @forward を必ず追記**する（qc.md のチェック対象）

## 1. 最優先ルール（MUST）

### 余白の指定方向

config.mdの余白設定に必ず従う（例外なし）

**gap と margin の使い分け:**

- **gap**: 同じ要素が繰り返され、間隔が均等な場合（カードグリッド、ナビリンク横並び、ニュース記事一覧の縦並び等）
- **margin**: それ以外（要素ごとに余白値が異なる場合、異なる種類の要素間）

```css
/* OK: 同じカードの繰り返し → gap（間隔が均等） */
.p-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }

/* OK: 画像+テキストの横並び → flex + margin（異なる要素間） */
.p-about__inner { display: flex; }
.p-about__description { margin-left: 40px; }

/* OK: 縦の要素間は margin（config.md の方向に従う） */
.p-about__text { margin-top: 16px; }
.p-about__button { margin-top: 24px; }

/* OK: 同じ要素の縦繰り返しで間隔均等 → gap */
.p-news__list { display: flex; flex-direction: column; gap: 16px; }

/* NG: 異なる要素が縦に並ぶだけなのに gap */
.p-about__content { display: flex; flex-direction: column; gap: 24px; }
```

### 余白の設計（決定木）

要素同士の余白は「関係」で手段を選ぶ:

| 関係 | 手段 | 理由 |
|------|------|------|
| 同一グループの繰り返し（カード・リスト・ブロック列） | 親コンテナの `flex/grid` + `gap` | 一元管理。要素の増減・並び替えに壊れない |
| 同一グループでない要素同士の縦の流れ | `margin-top`（config.md の縦方向設定に従う） | 余白の出どころを「下の要素が上との距離を持つ」に統一 |
| セクションとセクションの間 | `padding-top` のみ（`padding-bottom` は原則0） | アンカーリンクの着地がずれない。前後合算で余白の出どころが追えなくなるのを防ぐ |
| 背景色・背景画像を持つ帯の内側余白 | 帯自身の `padding-block` | 背景の効く範囲 = padding。この場合のセクション間隔は `margin-top` |

- 背景のない要素同士の余白を `padding` で取らない（`margin-top` と混同しない）
- 帯の端の余白は帯自身が持つ。「帯の端→最初/最後の要素」の余白を、子要素の `padding-top` や `.inner` の `padding-bottom` に分散させない。帯の端 = 帯の `padding-block`、帯の中の要素間 = `margin-top`
- `margin-top` + `:first-child` 打ち消しパターンは、親の `gap` 一元管理に置き換える
- 最初の要素に不要な `margin-top` がつく場合は親側で調整する
- 自要素の `border`（下線等）までの距離は `padding` が正（例: 下線付き見出しの `padding-bottom`）
- 端の値が PC/SP で異なる場合はメディアクエリで分岐する（片方の実寸だけで共有値を上書きしない）

---

## 2. 必須ルール（REQUIRED）

### 論理プロパティの使い分け

- 左右セットの余白 → `margin-inline` / `padding-inline`（1行で書ける）
- 上下セットの余白 → `padding-block`。**片側だけなら `padding-top` / `padding-bottom` 単独**で書く（`padding-block: 0 24px` のような0埋めをしない）
- `padding` ショートハンドは4辺すべて同値の1値のみOK（`padding: 40px`）。2値以上は `padding-block` / `padding-inline` の2本に分ける（3値は「真ん中が右か左右か」を誤読しやすい。論理2本は縦横の意図が即読める）
- 中央寄せの `margin: 0 auto;` は書かない → `margin-inline: auto;`（関係ない上下に0を書かないため）
- 片側だけの横余白は config.md の横方向設定に従い `margin-left` でよい（`margin-inline-start` 等に言い換えない）
- 上方向の余白は `margin-top`（`margin-block-start` は使わない）

### 禁止事項

- **transition: all 禁止** → プロパティを明示（例: `transition: background-color 0.3s, color 0.3s;`）
- **存在しないCSSプロパティ・値を生成しない（ハルシネーション禁止）** → 標準仕様（MDN準拠）に無いプロパティ・値を推測で書かない。曖昧なときは確実に存在する記法のみ使う。
- **Sassネスト禁止** → フラットに記述。ただし**疑似要素・疑似クラスのネストはOK**:

```scss
/* 禁止: BEM要素のネスト */
.c-card { &__title { font-size: 18px; } }

/* 正しい: フラットに記述 */
.c-card__title { font-size: 18px; }

/* OK: 疑似要素・疑似クラスはネストしてよい */
.c-card__title {
  font-size: 18px;
  &::before { content: ""; }
  &:hover { color: red; }
  &:focus-visible { outline: 2px solid blue; }
}
```

- **!important 原則禁止** → 詳細度・記述順で解決する（外部ライブラリの上書き等、他に手段が無い場合のみ理由コメント付きで許可）
- **IDセレクタでスタイルを当てない** → スタイルは class に当てる（`#header` 等にスタイルを書かない。ID はページ内アンカー・JS 用途に限定）

### :focus-visible

すべてのインタラクティブ要素に設定:

```css
.c-button:focus-visible {
  outline: 2px solid var(--color-main);
  outline-offset: 2px;
}

.c-input:focus-visible {
  outline: 2px solid var(--color-main);
  border-color: var(--color-main);
}
```

### any-hover

すべての `:hover` は `@media (any-hover: hover)` 内に記述:

```css
@media (any-hover: hover) {
  .c-button:hover {
    background-color: var(--color-main-dark); /* 派生変数は案件で:rootに追加定義する */
  }
}
```

hover で変化させるプロパティには、要素側に `transition` を必ずセットで書く（例: hover で `opacity` を変えるなら要素側に `transition: opacity 0.3s;`）。`text-decoration` 等アニメーション不可のプロパティは対象外。

### z-index管理

position 指定時は必ず z-index を明示。10刻み（100, 110, 200...）。99999 のような過剰値は禁止。

### 装飾用の疑似要素と z-index

装飾（背景文字・飾り・アイコン等）を `::before` / `::after` の `position: absolute` で重ねる場合は、`z-index: -1` でテキストの下に敷き、**親要素に `position: relative` と `z-index: 0` を必ずセットで付ける**（親がスタッキングコンテキストを作らないと、疑似要素が祖先の背景の裏に隠れて消える）。

```css
/* 装飾疑似要素の定型 */
.p-about__catch {
  position: relative;
  z-index: 0; /* スタッキングコンテキスト（これがないと装飾が背景裏に消える） */
}
.p-about__catch::after {
  content: "";
  position: absolute;
  z-index: -1; /* テキストの下に敷く */
  top: -6px;
  right: 12px;
  /* background-image 等の装飾 */
}
```

### letter-spacing は em 単位

px ÷ font-size = em値:

```css
/* font-size 20px, spacing 1px → 1 ÷ 20 = 0.05em */
.c-heading { font-size: 20px; letter-spacing: 0.05em; }

/* font-size 14px, spacing 0.42px → 0.42 ÷ 14 = 0.03em */
.c-text { font-size: 14px; letter-spacing: 0.03em; }
```

#### letter-spacing の継承の注意

- `body` に letter-spacing を指定すると、**計算後の px 値**が子に継承される。文字詰めが視覚的に重要な大きい見出しには、その要素自身に em で再指定する
- 字間0が正の要素（表の品目・価格等）には `letter-spacing: 0` を明示して継承を断つ
- CSS の letter-spacing は末尾文字の後ろにも付く。1行に収めたいテキストをデザイン実寸ちょうどの幅に入れると、1px 未満の超過で段落ちすることがある → 実寸 + 数px の余裕を持たせる

### メディアクエリはセレクタ直後

ファイル末尾にまとめず、各セレクタの直後に配置:

```css
/* 正しい: セレクタ直下 */
.p-hero__title { font-size: 24px; }
@media (min-width: 768px) { .p-hero__title { font-size: 40px; } }

.p-hero__text { font-size: 14px; }
@media (min-width: 768px) { .p-hero__text { font-size: 16px; } }
```

```css
/* 禁止: ファイル末尾にまとめる */
.p-hero__title { font-size: 24px; }
.p-hero__text { font-size: 14px; }

@media (min-width: 768px) {
  .p-hero__title { font-size: 40px; }
  .p-hero__text { font-size: 16px; }
}
```

理由: セレクタとそのレスポンシブ対応が近接し、保守性が高い

### レイアウト手法の使い分け

**flex / grid を使う場面**: 要素を横並びにする時のみ
- カードを横に並べる → grid
- 画像とテキストを横に並べる → flex
- ボタンを横に並べる → flex
- ナビゲーションリンクを横に並べる → flex

**通常フロー + margin を使う場面**: 要素が縦に積まれるだけの場合
- 見出し → テキスト → ボタンが縦に並ぶ → flex/grid 不要。通常のブロック要素 + margin-top
- セクション内のコンテンツが上から下に並ぶだけ → flex/grid 不要

```css
/* NG: 縦並びなのに flex を使い gap で余白を取る */
.p-about__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* OK: 通常フロー + margin */
.p-about__title { margin-top: 0; }
.p-about__text { margin-top: 16px; }
.p-about__button { margin-top: 24px; }

/* OK: 横並びには flex/grid を使う */
.p-about__inner {
  display: flex;
  gap: 40px;
}
```

**position: absolute** はレイアウトには使わず、装飾や重ね表示の用途に限定:
- `::before` / `::after` による装飾の配置
- モーダル・オーバーレイの全画面表示
- バッジやラベルを親要素に重ねる

### grid-template-areas を使う場面

PC と SP で要素の配置順・方向が変わるが、HTML の構造は 1 つに保ちたい場合に使う。flex の `order` を多用するより、名前付きエリアで配置が一目で読めるため可読性が高い。

```css
/* HTML: .p-profile > .p-profile__image / .p-profile__name / .p-profile__body の3要素 */

/* SP: 画像 → 名前 → 本文 の縦積み */
.p-profile {
  display: grid;
  grid-template-areas:
    "image"
    "name"
    "body";
  gap: 16px;
}
.p-profile__image { grid-area: image; }
.p-profile__name  { grid-area: name; }
.p-profile__body  { grid-area: body; }

/* PC: 左に画像、右上に名前・右下に本文（HTMLの並び順は変えない） */
@media (min-width: 768px) {
  .p-profile {
    grid-template-columns: 240px 1fr;
    grid-template-areas:
      "image name"
      "image body";
    column-gap: 40px;
  }
}
```

判断基準: 配置が二次元（行と列の両方）で入れ替わる、または SP/PC で並び順が変わるとき。単純な一次元の並びは flex/grid の通常指定で足りる。

#### grid の規律

- `display: grid` を使うときは `grid-template-columns` を必ず明示する（暗黙の単列 grid 禁止）
- 同じ値の繰り返しは `repeat()` を使う（例: `repeat(3, 1fr)`）
- grid/flex 内でテキストがはみ出す・潰れるときの `min-width: auto` 対策: `grid-template-columns: minmax(0, 1fr)` または子要素に `min-width: 0`

### SCSS 選択時

config.mdでSCSS指定時のみ適用:

- `@import` 禁止 → `@use` を使用
- ネスト禁止は共通（疑似要素・疑似クラスのネストはOK）
- SCSS変数（`$`）を使用する（CSS変数 `var()` ではなく）

---

## 3. 推奨ルール（RECOMMENDED）

### レスポンシブ

- config.mdの設定（モバイルファースト/デスクトップファースト）に従う
- ブレークポイントはconfig.mdの値を使用
- SP版とPC版で配置が変わる場合、メディアクエリで切り替え

### rem変換（config で 基本単位: rem のとき）

`基本単位: rem` を選択したときは、手計算の rem 直書きを禁止し、必ず `to-rem()` を経由する。SCSS 選択時のみ有効。

```scss
@use "sass:math";

// 単位を除去（strip-unit）
@function strip-unit($n){ @return if(math.is-unitless($n), $n, math.div($n, $n*0 + 1)); }

// px → rem 変換（ルート16px基準。10px基準なら 16→10 に変更）
@function to-rem($px){ @return math.div($px, 16) * 1rem; }

// 使用例
.c-heading { font-size: to-rem(24); }
```

- 例外: `border-width`（1px 等の細線）と `box-shadow` のオフセット値は **px のまま**据え置く（rem 化しない）。
- CSS（非SCSS）指定時は関数が使えないため、px か（設計に応じて）生の rem を直書きする。

### ブレークポイント mixin

`$breakpoints` マップを唯一の情報源として、`mq-up()`/`mq-down()` で参照する。SCSS 選択時のみ有効。

```scss
@use "sass:map";

// ブレークポイント定義（デザインに合わせて更新）
$breakpoints: (sm:550, md:768, lg:1200, xl:1400);

// min-width（モバイルファースト）
@mixin mq-up($size: md){ @media screen and (min-width:#{map.get($breakpoints,$size)}px){ @content; } }

// max-width 相当（デスクトップファースト）
@mixin mq-down($size){ @media not all and (min-width:#{map.get($breakpoints,$size)}px){ @content; } }

// 使用例
.p-hero__title {
  font-size: 24px;
  @include mq-up(md){ font-size: 40px; }
}
```

- `mq-down`（max-width 相当）はスキル既定の**デスクトップファースト運用を後押し**する。
- CSS（非SCSS）指定時は mixin が使えないため、生 `@media`（ビルドがあれば `@custom-media`）にフォールバックする。

### CSSモードのブレークポイント（@custom-media）

プリプロセッサ設定が CSS（非SCSS）で、かつ Lightning CSS 等のビルドが使える場合は、生 `@media` を各所に散らさず `@custom-media` で名前付き一元管理する（mq mixin の「CSS版」）。

```css
/* 定義（1箇所にまとめる） */
@custom-media --sm-up (width >= 550px);
@custom-media --md-up (width >= 768px);
@custom-media --lg-up (width >= 1200px);

/* 使用 */
.p-hero__title { font-size: 24px; }
@media (--md-up) { .p-hero__title { font-size: 40px; } }
```

- ビルドが無い（生CSSをそのまま納品する）場合は `@custom-media` が使えないため、生 `@media (min-width: 768px)` を直接書く。

### 表示切替ユーティリティ（u-pc-only / u-sp-only）

日本語 Web 制作で頻出する PC/SP の出し分けは、FLOCSS の Utility 層として `u-` プレフィックスで用意する（Component `c-` / Project `p-` とは別レイヤー）。

```scss
/* SCSS 選択時（mq mixin を利用） */
.u-pc-only { display: none; }
@include mq-up(md){ .u-pc-only { display: block; } }

.u-sp-only { display: block; }
@include mq-up(md){ .u-sp-only { display: none; } }
```

```css
/* CSS 選択時（生 @media。ビルドがあれば @media (--md-up)） */
.u-pc-only { display: none; }
@media (min-width: 768px) { .u-pc-only { display: block; } }

.u-sp-only { display: block; }
@media (min-width: 768px) { .u-sp-only { display: none; } }
```

- 表示切替ユーティリティは必ず `u-pc-only` / `u-sp-only` の名称を使う。
- インライン要素に適用する場合は `display: inline` / `inline-block` を明示する。

### レイアウトスケール: rem液体（config で選択時のみ）

`レイアウトスケール: rem液体` を選択したときのみ、html の font-size を vw で伸縮させ、rem 指定の要素をビューポート幅に比例してスケールさせる。SCSS 選択時を想定。

```scss
// 例: 375px カンプ基準で SP を液体化（10px 基準運用の場合）
html {
  // 375px 時に 10px 相当 → (10 / 375) * 100 = 2.6667vw
  font-size: 2.6667vw;
}

// PC は上限を固定（伸びすぎ防止）
@media (min-width: 768px) {
  html { font-size: 62.5%; } // 16px * 62.5% = 10px
}
```

> ⚠️ 重要警告（最も事故りやすい機能）
> - **`基本単位: rem` + `to-rem()` 経由をセットで強制**する。px 指定の要素と混在させると、rem だけ伸縮・px は固定となりレイアウトが崩れる。
> - 本機能の**単独有効化は禁止**。必ず rem 運用（C2/C3）とセットで使う。
> - 既定は **`レイアウトスケール: 固定`**。実験的 opt-in 扱いとし、指定が無ければ有効化しない。

### .innerの基本スタイル

```css
.inner {
  max-width: 1200px; /* config.mdのインナー幅 */
  margin-inline: auto;
  padding-inline: 16px; /* SP: config.mdのインナー余白 */
}

@media (min-width: 768px) {
  .inner {
    padding-inline: 24px; /* PC: config.mdのインナー余白 */
  }
}
```

**改善版（実効内寸を設計値に一致させる）**: `max-width` にインナー幅だけを指定すると、`padding-inline` の分だけコンテンツの実効内寸が設計値より狭くなる。`max-width` を「インナー幅 + PC余白 × 2」にすると、パディングを差し引いた実効内寸がちょうど設計上のインナー幅と一致する。

```css
.inner {
  max-width: calc(1200px + 24px * 2); /* インナー幅 + PC余白 × 2 */
  margin-inline: auto;
  padding-inline: 16px; /* SP: カンプ由来の余白 */
}

@media (min-width: 768px) {
  .inner {
    padding-inline: 24px; /* PC: 端張り付き防止の最低ガター */
  }
}
```

SCSS 分割時（変数を使う場合）:

```scss
.inner {
  max-width: $inner + $padding-pc * 2; // インナー幅 + PC余白 × 2
  margin-inline: auto;
  padding-inline: $padding-sp;
}
```

**余白の役割の違い（重要）**: `padding-inline` の SP 値は**カンプ由来の設計値**（デザインで指定された左右余白）を使う。一方 PC 値は設計値ではなく、**コンテンツが画面端に張り付くのを防ぐための「最低確保ガター」**として捉える。ウィンドウがインナー幅 + ガターより広ければ余白は自然に増えるため、PC 余白は保証値であって固定の設計値ではない。

#### .inner の運用ルール

- `.inner` は**1箇所だけ定義して使い回す**。セクションごとに同じ内容の `.p-about__inner` 等を再定義しない
- 幅を変えたいセクションは `class="inner p-section__inner"` の**マルチクラス**で上書きする（`.p-section .inner { ... }` の文脈セレクタ上書きは禁止。共通パーツ変更時の波及が HTML からも CSS からも追えなくなる）
- セクションごとにコンテンツ全幅が異なるデザインでは、広いセクションを標準 `.inner` に押し込まない（列の圧縮・ボタンのはみ出し・テキストの段落ちが起きる）。実測して**専用の inner**（`max-width: 全幅 + 左右padding`）を与える
- SP 側にも `max-width`（600px 目安）を指定すると、ブレークポイント直下の幅広 SP 帯（600〜767px）でレイアウトが間延びしない

### CSS変数（色）

```css
:root {
  --color-main: #xxx;
  --color-accent: #xxx;
  --color-text: #xxx;
  --color-bg: #xxx;
}
```

変数名は config.md「色の用途ベース命名」表を正とする。色はデザイン画像から目視で確認。推測禁止。

### CSS変数の完全一致ルール（全色変数化）

デザインに登場する色は**すべて変数を経由**する（HEX直書き禁止）。ただし変数を使ってよいのはデザインの値と**完全に一致する場合のみ**——近似値を既存の変数にまとめてはならない。一致する変数が無ければ、**用途ベースで新しい変数を追加してから**使う。

```css
/* デザインの色が #1f1f1f、CSS変数 --color-text が #333333 の場合 */

/* 禁止: 近似値でCSS変数を使う（デザイナーの色の使い分けが失われる） */
.p-about__text { color: var(--color-text); }

/* 禁止: 変数を作らず直接指定（色の管理が変数と直書きの二重になる） */
.p-about__text { color: #1f1f1f; }

/* 正しい: 新しい変数を追加して経由する */
:root { --color-text-strong: #1f1f1f; }
.p-about__text { color: var(--color-text-strong); }
```

デザイナーは微妙な色の違い（背景と文字で異なる黒、セクションごとのトーン差など）を意図的に使い分けている。近似値でまとめるとその意図が失われ、直書きすると色の出どころが追えなくなる。変数名は config.md「色の用途ベース命名」表を基準にし、足りない用途は `-sub` / `-light` / `-strong` 等の派生名で増やす。SCSS 選択時は `$color-` 変数で同様に行う。

### 色変数は「色型」で持つ（SCSS指定時）

SCSS で色を変数化するときは、必ず**色型の値**（HEX / 色キーワード / `rgba()`）で定義する。`0, 0, 0` のような **RGB 成分のリストで持つのは禁止**（`rgba()` や `mix()` に渡すとエラーになる）。

```scss
/* OK: 色型で定義 */
$color-main: #1a73e8;
$color-text: #1f1f1f;
$color-white: #fff;

/* NG: RGBリスト（数値の羅列）で持つ */
$color-black: 0, 0, 0; // rgba($color-black, 0.28) がエラーになる
```

透明度を付けるときは `rgba()` の**第2引数**で指定する。

```scss
/* OK: 色型 + 第2引数で透明度 */
.p-hero__overlay { background-color: rgba($color-text, 0.28); }
```

---

## 4. レイアウト・装飾の実装規約

### テキスト要素の基本プロパティ

- テキスト要素には `font-size` / `font-weight` / `color` / `line-height` の**4つを必ず指定**する
- `letter-spacing` はデザインに指定がある場合のみ記述する

### ブロックの寄せ

- ブロック全体の寄せ（右寄せ・中央寄せ）は、**そのかたまりの親に1回だけ**書く。同じ寄せ指定が複数の子に重複し始めたら親に引き上げる
- 他の要素の幅を測って写した固定 `width` で寄せを再現しない。`width: fit-content` + `margin-inline: auto` 等、**関係が自動で保たれる書き方**にする
- 単一の子だけが兄弟と違う寄せを持つ場合は、その子に書いてよい（`align-self` / `justify-self` / `margin-inline: auto 0` 等）

### テキストの帯（マーカー状の背景）

実装前に「**複数行に折り返した時の帯の見え方**」をデザインで確認してから作りを選ぶ:

- 行ごとに帯・行間に余白が見えるデザイン → テキストを `display: inline` にして背景 + padding を持たせ、`box-decoration-break: clone`（`-webkit-` 併記）。行間の余白量は `line-height` で制御し、配置は外側のラッパーで行う
- 複数行でも1枚の面のデザイン → ブロック要素の背景で実装する

### 横並びレイアウトの列幅（%換算）

- 2カラム以上の横並びは、要素幅と gap をデザイン実寸から **% に換算**して指定する（固定 px は中間のビューポート幅で片方だけ太る・はみ出す）
- 換算式: `要素幅 ÷ 行全体の幅 × 100`。片側は `1fr`（flex なら `flex: 1`）で受けると端数に強い
- **ボタンは % 化の対象外**（中間幅で縮んで文字がはみ出す・折り返して崩れる）。% 化するのはカラム・画像・表などの「面」要素だけ
- 内容幅（`width: auto`）のボタン列を横に並べる flex 行には `flex-wrap: wrap` を付ける。固定幅 + `white-space: nowrap` のボタン列には付けない（付ける前に「デザイン幅でボタン合計がコンテナに収まるか」を確認する）

### ナビのクリック/タップ領域

- PC ヘッダーのナビリンクはヘッダーの高さいっぱいにする（親を `align-self: stretch` で伸ばし、リンクに `height: 100%` + flex 中央揃え）
- ドロワーメニューのリンクは横幅いっぱいにする（`display: block` + `width: 100%` + padding で範囲確保）

### 運用で増減するコンテンツ

- 注釈・リスト・カード等、運用で行数が変わり得る箇所は**1項目ずつ独立したタグ**（`<p>` / `<li>` 等）にする
- `<br>` で改行せず、親要素の `gap` で等間隔を制御する

### 背景装飾の実装分岐

- **線で描かれた装飾**（波線・飾り罫・スカイライン等）は CSS で近似せず、**SVG で書き出して置く**（CSS 近似は線が潰れる）。単色のベタ塗りだけは CSS（背景色・要素）でよい
- **グラデーションは形で分岐**する: 縦・横のまっすぐな単純グラデ（2〜3色・角度なし）のみ CSS の `linear-gradient(to bottom / to right, ...)` で書いてよい。**斜め・角度つき・多段・テクスチャ混じりは画像として書き出して `background-image` に設定する**（デザインツールのグラデは座標系が CSS と異なり、斜めは向きが逆になる事故が起きやすい）

### プロパティ記述順序

1. 表示系: `display`, `visibility`, `opacity`
2. 配置系: `position`, `top`, `right`, `bottom`, `left`, `z-index`
3. ボックスモデル: `width`, `height`, `margin`, `padding`, `border`
4. Flexbox/Grid: `flex`, `justify-content`, `align-items`, `gap`
5. タイポグラフィ: `font-size`, `font-weight`, `color`, `letter-spacing`, `line-height`, `text-align`
6. 背景・装飾: `background`, `border-radius`, `box-shadow`
7. アニメーション: `transition`, `animation`