# HTMLコーディング規約

## 1. 最優先ルール（MUST）

- 必ず `</body>` の直前に追記
- 既存のセクションを削除・変更しない

### テキストの正確性

- **1文字1文字正確に**: 推測・意訳・言い換え禁止
- **絵文字・記号（テキスト内のみ）**: デザイン画像のテキストに含まれる絵文字・記号を正確に記録
- **改行位置**: デザイン通りに再現
- **テキストの順序**: 上下・左右の順序を正確に再現
- **禁止**: デザインにない文章を追加

### br の使い方

- `<br>` は意味的な改行（住所・電話番号・詩など、改行そのものに意味がある箇所）にのみ使う。
- レイアウト目的（余白調整・見た目の行送り）で `<br>` を使わない。
- 段落の区切りは `<br>` ではなく別々の `<p>` で表現し、余白は CSS（`margin`）で作る。

---

## 2. 必須ルール（REQUIRED）

### 初回生成時の `<head>` ひな型（Write時のみ）

初回に `index.html` を Write で新規作成するときは、次の `<head>` を土台にする。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no"><!-- iOSの電話番号自動リンク化を無効化 -->
  <title>[ページタイトル]</title>
  <meta name="description" content="[ページ説明。無ければ空で用意しユーザーに確認]">
  <!-- Webフォント使用時のみ。preconnectをセットで付ける -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=...&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="[config.mdのCSS出力先]">
</head>
```

- `preconnect` は2本セット。`fonts.gstatic.com` には `crossorigin` を必ず付ける。
- Webフォントの `<link>` は `display=swap` を付ける（フォント読み込み中もテキストを表示）。
- **2ページ目以降の Edit 追記では `<head>` を触らない**（この節は初回 Write 時のみ適用。例外: JS ファイルを初めて作成したときの `<script defer>` 1行追加——後述「script の配置」参照）。

#### title の決め方

- TOP ページ: `サイト名 | キャッチコピーまたは業種`
- 下層ページ: `ページ名｜サイト名`（全角パイプ `｜` を使う）
- デザインに明示がない場合は、ヘッダーロゴのテキストやフッターのコピーライト表記をサイト名として使う。

### セマンティックHTML

```html
<!-- 正しい -->
<section>
  <h2>サービス紹介</h2>
  <article>
    <h3>Webサイト制作</h3>
    <p>説明文</p>
  </article>
</section>

<!-- 間違い: div濫用 -->
<div>
  <div>サービス紹介</div>
</div>
```

推奨タグ: `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`, `<main>`, `<aside>`, `<address>`

#### 見出し構造

- `<h1>` はページに1つだけ（0個・複数はNG）。
- 見出しレベルをスキップしない（`<h2>` の次に `<h4>` を使わない）。
- すべての `<section>` には見出し（`<h1>`〜`<h6>`）を1つ置く。FVセクション等でページの `<h1>` を section 内に置くのは正当（`<h1>` はページ内で1回のみ）。見出しを持てない意味の無い塊は `<section>` ではなく `<div>` にする。

#### h1 の割り当てとキャッチコピー

- **TOP ページの `<h1>` はロゴ（サイト名）**にする。下層ページの `<h1>` はページタイトル。
- **キャッチコピー（タグライン）を `<h1>` にしない**（検索キーワードを含まないコピーは SEO 上弱い）。キャッチコピーは見出しではなく `<p>` で書く。
- 判断基準: 「そのテキストが直後に続くコンテンツのラベルとして機能しているか？」— FV のキャッチはタグ・ボタン・写真を束ねるラベルではないので `<p>` になる。
- キャッチが `<p>` になり、セクションに見出しが無くなる場合は `<section>` ではなく `<div>` にする。

### コンテンツ幅の制御

すべてのセクションで `.inner` を使用:

```html
<section>
  <div class="inner">
    <h2>見出し</h2>
    <p>本文</p>
  </div>
</section>
```

例外: 全画面背景画像セクション（FV等）、画面いっぱいのスライダー、ヒーローセクション

### 画像の実装

alt, width, height, loading="lazy" 必須:

```html
<picture>
  <source srcset="./images/service/service-01.webp" type="image/webp" />
  <img src="./images/service/service-01.jpg" alt="Webサイト制作サービスの例" width="420" height="315" loading="lazy" />
</picture>
```

#### 画像フォルダ構成（セクション別）

ローカル画像は**セクション別フォルダ**に置く（config.md の画像命名規則）:

```
images/
├── service/
│   ├── service-01.jpg
│   └── service-02.jpg
├── about/
│   └── about-01.jpg
└── common/
    └── logo.svg
```

- フォルダ名 = セクション名（クラスの Block 名と一致させる）。ファイル名 = `セクション名-連番.拡張子`
- `common/` にはロゴ・アイコン等のサイト共通画像を置く
- 複数ページで同名セクションがある場合のみ `ページ名-セクション名/` にする（例: `top-service/`）

Placeholder（画像ファイルがない場合）:

```html
<!-- コンテンツ画像 -->
<img src="https://picsum.photos/seed/1/420/315" alt="[デザインから画像の説明を読み取る]" width="420" height="315" loading="lazy" />

<!-- 装飾画像 -->
<img src="https://picsum.photos/seed/2/420/315" alt="" width="420" height="315" loading="lazy" />
```

#### loading の例外（ファーストビュー）

- `loading="lazy"` は原則すべてのコンテンツ画像に付ける。
- 例外: FV（初期表示で画面内に入る主要画像・ヒーロー画像）には付けない（LCP悪化を防ぐ）。
  必要に応じ `fetchpriority="high"` を付与する。

```html
<!-- ファーストビューの主要画像: lazy を付けず、必要なら fetchpriority="high" -->
<img src="./images/fv/fv-01.jpg" alt="メインビジュアル" width="1280" height="720" fetchpriority="high" />
```

#### コンテンツ画像は `<figure>` で囲む

- 意味のあるコンテンツ画像は `<figure>` で囲む。キャプションが必要なら `<figcaption>` を添える。
- 装飾画像（背景・飾り）は `<figure>` で囲まない。

```html
<!-- コンテンツ画像は figure で囲む（必要なら figcaption を付ける） -->
<figure class="c-figure">
  <picture>
    <source srcset="./images/works/works-01.webp" type="image/webp" />
    <img src="./images/works/works-01.jpg" alt="制作実績の例" width="420" height="315" loading="lazy" />
  </picture>
  <figcaption class="c-figure__caption">コーポレートサイト制作</figcaption>
</figure>
```

### アイコンの実装

**絶対禁止**: デザインのアイコンを絵文字で実装

```html
<!-- 禁止 -->
<a href="/detail">詳しく見る ➔</a>

<!-- 正しい: CSS疑似要素 -->
<a href="/detail" class="link">
  詳しく見る
  <span class="link__icon" aria-hidden="true"></span>
</a>
```

| アイコンの種類 | 推奨実装 |
|---|---|
| 矢印・三角などシンプルな図形 | CSS疑似要素（::after等） |
| ロゴ・複雑なアイコン | SVG画像 |
| 写真的なアイコン | PNG/WebP画像 |

例外: テキストの一部として絵文字がデザインに含まれている場合のみHTML記述OK

#### SVG の使い分け

- `<img src="*.svg">`: ロゴ・イラスト等の固定画像（大半のケースはこれ）
- `mask-image`: ホバーや状態で**色を変えたい**アイコン（SNS アイコン・矢印等）。外部ファイルのまま CSS で色を制御できる
- インライン `<svg>`: mask-image で対応できない複雑なアニメーション・多色制御が必要な場合のみ
- `background-image`: 装飾的な背景パターン・繰り返しアイコン
- SVG ファイルは `images/common/` に配置する

```css
/* ホバーで色が変わるアイコン → mask-image */
.c-sns-link__icon {
  display: block;
  width: 24px;
  height: 24px;
  background-color: var(--color-text);
  mask-image: url("./images/common/icon-x.svg");
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
}

@media (any-hover: hover) {
  .c-sns-link:hover .c-sns-link__icon {
    background-color: var(--color-accent);
  }
}
```

### アクセシビリティ

```html
<!-- テキストのないボタン → aria-label必須 -->
<button aria-label="メニューを開く">
  <span></span>
</button>

<!-- テキスト + 装飾アイコン → アイコンにaria-hidden -->
<a href="/detail" class="link">
  詳しく見る
  <span class="link__icon" aria-hidden="true"></span>
</a>
```

### UI状態切り替えボタン

**絶対禁止**: 開閉・展開・切り替えボタンを2つ作ること

```html
<!-- 禁止: 2つのボタン -->
<button>開く</button>
<button>閉じる</button>

<!-- 正しい: 1つのボタンをJSで制御 -->
<button aria-label="メニューを開く" aria-expanded="false">
  <span></span><span></span><span></span>
</button>
```

ハンバーガーメニュー、ドロップダウン、アコーディオン: 必ず1つの要素のみ

### 外部リンク

`target="_blank"` で別タブを開くリンクには `rel="noopener noreferrer"` を必ずセットで付ける。

```html
<!-- 別タブで開く外部リンク → rel="noopener noreferrer" 必須 -->
<a href="https://example.com" target="_blank" rel="noopener noreferrer">外部サイト</a>
```

- `noopener`: 遷移先から `window.opener` 経由で元ページを操作される脆弱性を防ぐ。
- `noreferrer`: リファラ（遷移元URL）を送らない。

### script の配置（head + defer 固定）

`<script>` は **`<head>` 内に `defer` 付き**で置く（`</body>` 直前には置かない）。CDN ライブラリ（スライダー等）も同様。ES Modules（`type="module"`）にも明示的に `defer` を付ける。

```html
<head>
  ...
  <script src="./js/script.js" defer></script>
  <!-- CDNライブラリも head 内 + defer -->
  <script src="https://cdn.jsdelivr.net/npm/@splidejs/splide@4/dist/js/splide.min.js" defer></script>
  <!-- ES Modules を使う場合も defer を付ける -->
  <script type="module" src="./js/main.js" defer></script>
</head>
```

- 理由: HTML のパースと並行してダウンロードされ、DOM 構築完了後に記述順どおり実行される。body 末尾方式より読み込みが速い。
- **HTMLセクションの追記アンカーは `</body>` タグ自身（の直前）**。body 末尾に `<script>` が無いため、最優先ルールの「`</body>` の直前に追記」がそのまま成立する。
- JS ファイルを**初めて作成した**タイミングで、`<head>` に `<script defer>` タグを追記する（「2ページ目以降は `<head>` を触らない」原則の唯一の例外として、この追記のみ許可）。

### 装飾用の重複テキスト（背景文字）

同じ文言が「装飾の背景文字（大きな英字など）」と「見出し」で2回登場する場合、装飾側は DOM に二重に書かず、`data-*` 属性 + `content: attr()` の疑似要素で描画する。

```html
<!-- 同じ文言が「装飾の背景英字」と「見出し」で2回出る場合、装飾側はDOMに二重に書かない -->
<h2 class="c-section-title" data-text="ABOUT">私たちについて</h2>
```

```scss
.c-section-title::before {
  content: attr(data-text) / ""; /* 「/ ""」で読み上げ対象から除外 */
  /* 位置・色・サイズなどの装飾スタイルを指定 */
}
```

理由: 同一文言を DOM に二度書くと、スクリーンリーダーが重複して読み上げる。`content: attr()` **単独では読み上げられることがある**ため、必ず `/ ""`（代替テキストの空指定）を付けて除外する。判断基準は「読み上げだけで聞いたとき、同じ意味が2回聞こえるか？」。

例外: 装飾の英字がそのセクション**唯一の見出し**として機能している場合は隠さない（隠すと見出しが消える）。

### 連絡先情報

住所・電話番号・メールアドレスなどの連絡先は `<address>` でマークアップする。

```html
<!-- 住所・電話番号・メールなどの連絡先は address でマークアップ -->
<address class="c-address">
  〒000-0000 東京都〇〇区〇〇1-2-3<br>
  TEL: <a href="tel:0300000000">03-0000-0000</a><br>
  <a href="mailto:info@example.com">info@example.com</a>
</address>
```

- `<address>` は「近くの `<article>` または文書全体の連絡先」に使う。
- 上記の `<br>` は住所表記の意味的な改行なので使用OK（`br の使い方` の許容ケース）。

### 電話番号リンク（tel:）は PC で発信無効化

`tel:` リンクは PC 幅では `pointer-events: none` で発信を無効化する（PC の誤クリックで FaceTime 等が起動するのを防ぐ。番号の表示はそのまま残す）。**サイト共通スタイルとして1回だけ書く**（各セクションに書かない）。

```css
/* CSS 選択時 */
@media (min-width: 768px) {
  a[href^="tel:"] { pointer-events: none; }
}
```

```scss
// SCSS 選択時（mq mixin 利用）
a[href^="tel:"] {
  @include mq-up(md) { pointer-events: none; }
}
```

### 日付のマークアップ（time）

日付には `<time>` タグを使い、`datetime` 属性を ISO 形式で指定する。

```html
<time datetime="2026-04-01">2026年4月1日</time>
```
