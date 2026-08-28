# Claude Code 導入ガイド（2026年4月版）

## Claude Codeとは

Anthropic公式のAIコーディングアシスタント。ターミナル上でAI（Claude）と対話しながら、コード編集・ファイル操作・Git操作・デバッグなどを実行できる。

**導入経路は5つ：**

| 経路 | 特徴 | Node.js |
|---|---|---|
| ネイティブインストーラー（推奨） | ワンコマンド。自動アップデート付き | 不要 |
| npm | 従来方式 | 18以上必要 |
| デスクトップアプリ | GUIで操作 | 不要 |
| VS Code / JetBrains 拡張 | IDE内で使える | 不要（拡張が内包） |
| Web版（claude.ai/code） | ブラウザで使う。ローカル環境不要 | 不要 |

**課金（いずれか必須）：**

| 方式 | 料金 |
|---|---|
| Claude Pro プラン | $20/月（レート制限あり） |
| Claude Max 5x プラン | $100/月 |
| Claude Max 20x プラン | $200/月 |
| APIキー（従量課金） | トークン消費量ベース |

※ Freeプランでは利用不可

---

## Mac 向け導入手順

### 方法1: ネイティブインストーラー（推奨）

Node.js不要。ターミナルで以下を実行：

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

### 方法2: npm

Node.js 18以上が必要。未インストールの場合は先にNode.jsを入れる：

```bash
# Homebrewがない場合、先にHomebrewをインストール
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.jsインストール
brew install node

# Claude Codeインストール
npm install -g @anthropic-ai/claude-code
```

### 方法3: デスクトップアプリ

1. https://claude.com/download にアクセス
2. Mac版をダウンロード
3. アプリケーションフォルダにドラッグ＆ドロップ
4. 起動してログイン

### 方法4: VS Code拡張

1. VS Codeで `Cmd+Shift+X`（拡張機能パネル）
2. 「Claude Code」で検索
3. Installをクリック

---

## Windows 向け導入手順

### 方法1: ネイティブインストーラー（推奨）

**PowerShellで実行：**

```powershell
irm https://claude.ai/install.ps1 | iex
```

**コマンドプロンプトで実行：**

```cmd
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

※ Windowsネイティブ対応済み。WSL2は不要。  
※ ただしサンドボックス機能はWindows非対応。フル機能が必要な場合はWSL2推奨。

### 方法2: npm

```powershell
# Node.js 18以上が必要（https://nodejs.org からLTS版をインストール）
npm install -g @anthropic-ai/claude-code
```

### 方法3: WSL2経由（フル機能向け）

```powershell
# 1. WSL2 + Ubuntuをインストール（PowerShellを管理者で実行）
wsl --install

# 2. PCを再起動後、Ubuntuを開いて以下を実行
curl -fsSL https://claude.ai/install.sh | bash
```

### 方法4: デスクトップアプリ

1. https://claude.com/download にアクセス
2. Windows版をダウンロード
3. インストーラーを実行

### 方法5: VS Code拡張

1. VS Codeで `Ctrl+Shift+X`（拡張機能パネル）
2. 「Claude Code」で検索
3. Installをクリック

---

## 認証（Mac / Windows共通）

インストール後、ターミナル（またはPowerShell）で以下を実行：

```bash
claude
```

初回起動時にブラウザが自動で開く → Anthropicアカウントでログイン → 認証完了。

**APIキーを使う場合：**

```bash
export ANTHROPIC_API_KEY="sk-ant-xxxxx"   # Mac/Linux
# または
$env:ANTHROPIC_API_KEY="sk-ant-xxxxx"     # Windows PowerShell
```

**注意：** 環境変数 `ANTHROPIC_API_KEY` が設定されていると、Pro/Maxプランではなく従量課金のAPIキーが優先される。Proプランで使いたい場合は環境変数を削除すること。

---

## 初期設定・動作確認

1. **起動確認：** `claude` と入力してClaude Codeが起動することを確認
2. **バージョン確認：** `claude --version` で正常にバージョンが表示されること
3. **プロジェクトで使う：** 任意のフォルダに `cd` して `claude` を起動すれば、そのフォルダのファイルを操作できる

---

## よくあるトラブルと対処法

### 「Node.js version 18 or higher required」

→ ネイティブインストーラーに切り替える（Node.js不要）。またはNode.js 18以上をインストール。

### npm権限エラー（Mac）

```bash
sudo chown -R $(whoami) ~/.npm
```

### `claude` コマンドが見つからない（Windows）

→ PowerShell / コマンドプロンプトを完全に閉じて再起動。それでもダメならPATHにインストールディレクトリを手動追加。

### APIキーとプラン認証の混在

```bash
unset ANTHROPIC_API_KEY    # Mac
# Remove-Item Env:ANTHROPIC_API_KEY  # Windows PowerShell

claude logout
claude login
```

### WSL2でWindowsのnpmを参照してしまう

→ WSL2内でLinux用のNode.jsを別途インストールし、`which node` でLinux側のパスが返ることを確認。
