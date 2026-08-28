# JavaScript規約

> 基本原則: JavaScriptは「最後の手段」として使用する

---

## 1. 最優先ルール（MUST）

### ファイル構造（初期化パターン）

DOMContentLoadedを1箇所に集約し、各機能を関数として分離:

```javascript
// ========================================
// Initialize
// ========================================
document.addEventListener("DOMContentLoaded", () => {
  initFvSlider();
  initHeaderMenu();
});

// ========================================
// FV Slider
// ========================================
function initFvSlider() {
  const element = document.querySelector(".js-fv-slider");
  if (!element) return;
  // 処理
}

// ========================================
// Header Menu
// ========================================
function initHeaderMenu() {
  const element = document.querySelector(".js-menu-toggle");
  if (!element) return;
  // 処理
}
```

- 初回: 上記構造で新規作成
- 2回目以降: 関数を末尾に追加 + Initialize内に呼び出し1行追加（DOMContentLoaded追加禁止）
- 早期リターン必須（要素が存在しない場合）

### 関数の命名規則

| パターン | 命名 |
|---|---|
| 初期化関数 | `init[機能名]`（例: `initHeaderMenu`） |
| イベントハンドラ | `handle[イベント]`（例: `handleClick`） |
| ユーティリティ | `[動詞][対象]`（例: `toggleMenu`） |

---

## 2. 必須ルール（REQUIRED）

### 生成条件

- JS生成する: デザインにインタラクション明示 + CSS/HTMLで実現不可
- JS生成しない: インタラクション不明示 or CSS/HTMLで実現可能

### 実装ルール

Vanilla JS、ES6+構文、イベントデリゲーション、最小限のDOM操作

---

## 3. CSS/HTML代替案（JS不要）

| 機能 | 実装方法 |
|------|---------|
| アコーディオン | `<details>` + `<summary>` |
| トグル表示 | Popover API |
| モーダル | `<dialog>` |
| タブ切り替え | `:target` または `<details>` |
| ホバーアニメーション | CSS `transition` |
| スムーススクロール | `scroll-behavior: smooth` |
| カルーセル（シンプル） | CSS `scroll-snap` |
| カウンター | CSS `counter()` |

## 4. JSが必要なケース

| 機能 | 理由 |
|------|------|
| フォームバリデーション（リアルタイム） | 入力中の検証が必要 |
| 外部APIとの通信 | Fetch/XHRが必要 |
| 複雑な状態管理 | 複数要素の連動 |
| 無限スクロール | Intersection Observer |
| 複雑なカルーセル | Swiper.js等 |

---

## 5. クラス命名規約（MUST）

JSが参照するクラスと、スタイルを当てるクラスを**明確に分離**する。これによりCSS改修（レイアウト用クラスのリネーム・削除）でJSが壊れる事故を防ぐ。

| 用途 | プレフィックス | 例 |
|---|---|---|
| JS操作用フック（CSSでスタイルを当てない） | `js-` | `.js-menu-toggle` |
| 状態クラス（CSS/JS両方で参照） | `is-` / `has-` | `.is-open`, `.is-active`, `.has-error` |

- DOM取得は `js-` フックを使い、**レイアウト用クラス（`c-` / `p-` / `l-`）をJSセレクタにしない**
- 状態切替は `element.classList.toggle('is-open')` で表現する（`is-` / `has-` はCSS側でスタイルを当ててよい）
- `js-` フックにはCSSでスタイルを当てない（JS操作の目印専用）

```javascript
// ハンバーガーメニューの開閉（js- フックで取得し、is- で状態表現）
function initHeaderMenu() {
  const toggle = document.querySelector(".js-menu-toggle");
  if (!toggle) return;

  const nav = document.querySelector(".js-global-nav");
  toggle.addEventListener("click", () => {
    // 状態クラスをトグル（CSS側で .is-open のスタイルを定義）
    nav.classList.toggle("is-open");
  });
}
```

> 初期化関数内の DOM 取得は、レイアウト用の `c-`/`p-`/`l-` クラスではなく `js-` フックを使う（上の初期化例も `.js-fv-slider`・`.js-menu-toggle` で統一済み）。JSが必要な要素にはHTML側で `js-` フックを付与しておく。

---

## 6. コーディング規約（MUST）

低レベルのコーディング規約を統一し、可読性と保守性を担保する。

### 変数宣言・比較

- **`const` を優先**し、再代入が必要な場合のみ `let` を使う
- **`var` は禁止**（関数スコープ・巻き上げによる不具合を避ける）
- 比較は必ず **`===` / `!==`**（型変換を伴う `==` / `!=` は禁止）

```javascript
// ✅ 正しい
const items = document.querySelectorAll(".js-tab");
let currentIndex = 0;           // 再代入するので let
if (currentIndex === 0) { /* ... */ }

// ❌ 間違い
var items = document.querySelectorAll(".js-tab");  // var 禁止
if (currentIndex == 0) { /* ... */ }               // == 禁止
```

### イベント登録・DOM取得

- イベントは **`addEventListener` で登録**する（HTML属性の **inline `onclick` 等は禁止**）
- DOM取得は **`querySelector` / `querySelectorAll`** を使う

```html
<!-- ❌ 間違い: inline イベント禁止 -->
<button onclick="openModal()">開く</button>

<!-- ✅ 正しい: js- フック + addEventListener -->
<button class="js-modal-open">開く</button>
```

### クラス操作・文字列

- クラスの付け外しは **`classList`**（`add` / `remove` / `toggle`）を使う。`className` を直接書き換えない（他のクラスを消す事故のもと）
- 文字列クォートはファイル内で統一する（本スキルのコード例はダブルクォートで統一）

```javascript
// ✅ 正しい
menu.classList.add("is-open");
menu.classList.toggle("is-active");

// ❌ 間違い: className を直接書き換える
menu.className = "menu is-open";
```

### 納品前クリーンアップ

- **`console.log` 等のデバッグ出力は納品時に必ず削除する**（`console.warn` / `console.error` / `debugger` 等も同様）

---

## 7. ハンバーガーメニュー実装レシピ（MUST）

開閉は「1つのトグルパーツ」で行う（html.md の UI状態切り替えボタン参照）。実装時は以下をすべて満たす:

- **閉じる処理は `closeDrawer()` として共通化**し、以下をすべてリセットする:
  - `is-open` クラスの除去（ボタンとドロワーの両方）
  - `aria-expanded` / `aria-hidden` の復元
  - `body` の `overflow` 解除（スクロールロック解除）
- **ドロワー内のリンククリック時にも `closeDrawer()` を実行**する（ページ内アンカー遷移でドロワーが開きっぱなしになるのを防ぐ）
- **PC 幅リサイズ対策の2重防御**:
  1. CSS: PC 幅でドロワーを `display: none !important`
  2. JS: `matchMedia` の `change` イベントで PC 幅になったら `closeDrawer()`
  - 忘れた場合の症状: SP でドロワーを開いたまま PC 幅に広げると、ドロワーは見えなくなるのに**スクロールロックだけが残ってページが操作不能**になる
- ハンバーガーボタンには `aria-label` / `aria-expanded` / `aria-controls`、ドロワーには `aria-hidden` を付ける
- ドロワーには CSS で `overflow-y: auto` を指定する（メニュー項目が多い場合にスクロール可能にする）
- ドロワーの現れ方（フェード / スライド左右 / スライド上下）がデザインから判断できない場合は、実装前にユーザーへ確認する

```javascript
// ========================================
// Header Menu（ハンバーガー）
// ========================================
function initHeaderMenu() {
  const toggle = document.querySelector(".js-menu-toggle");
  if (!toggle) return;

  const drawer = document.querySelector(".js-drawer");
  const mql = window.matchMedia("(min-width: 768px)"); // config.md のブレークポイントに合わせる

  const closeDrawer = () => {
    toggle.classList.remove("is-open");
    drawer.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  toggle.addEventListener("click", () => {
    const isOpen = drawer.classList.toggle("is-open");
    toggle.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    drawer.setAttribute("aria-hidden", String(!isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  // ドロワー内リンクで閉じる
  drawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });

  // PC幅リサイズ対策（スクロールロック残留の防止）
  mql.addEventListener("change", (e) => {
    if (e.matches) closeDrawer();
  });
}
```

---

## 8. スライダーライブラリ使用時（Swiper / Splide 等）

- `breakpoints` の数値は CSS のブレークポイント（config.md）と必ず一致させる
- JS 参照用クラスは `js-` フック（例: `.js-fv-slider`）
- CDN の読み込みは `<head>` 内に `defer` 付きで配置する（html.md の script 配置に従う）
