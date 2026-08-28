# Claude Code Windows セットアップガイド（sandbox対応）

## はじめに

Claude Code はWindows上でネイティブ動作しますが、**`/sandbox` 機能はネイティブWindowsでは非対応**です。  
sandbox を使うには **WSL 2（Windows Subsystem for Linux 2）** が必要です。

| 環境 | Claude Code | /sandbox |
|---|---|---|
| Windows ネイティブ | ✅ 動作する | ❌ 非対応 |
| WSL 2 | ✅ 動作する | ✅ 対応 |
| WSL 1 | ✅ 動作する | ❌ 非対応 |

---

## 1. ネイティブWindows へのインストール（sandboxなし）

sandbox不要であれば、ネイティブインストールだけで十分です。

### 前提条件

| 要件 | 詳細 |
|---|---|
| Windows バージョン | Windows 10 1809+ / Windows Server 2019+ |
| ハードウェア | 4GB+ RAM、x64 または ARM64 |
| Node.js | ネイティブインストールなら不要 |
| Git for Windows | 推奨（なければ PowerShell にフォールバック） |

### インストール方法（3通り）

**方法A: PowerShell（推奨）**

```powershell
irm https://claude.ai/install.ps1 | iex
```

**方法B: CMD**

```batch
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

**方法C: WinGet**

```powershell
winget install Anthropic.ClaudeCode
```

> WinGet版は自動更新されないため、手動で `winget upgrade Anthropic.ClaudeCode` が必要です。

### 動作確認

```bash
claude --version
claude doctor
```

---

## 2. WSL 2 セットアップ（sandbox を使う場合）

sandbox を使いたい場合は、以下の手順で WSL 2 環境を構築します。

### Step 1: WSL 2 のインストール

PowerShell を**管理者として実行**し、以下を実行：

```powershell
wsl --install
```

完了後、PCを再起動します。

既にWSLがインストール済みの場合は、バージョンを確認：

```powershell
wsl --list --verbose
```

`VERSION` が `2` であることを確認してください。`1` の場合：

```powershell
wsl --set-version <ディストリビューション名> 2
```

### Step 2: WSL 2 上に Claude Code をインストール

WSL のターミナルを開き：

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

インストール後、ターミナルを再起動して：

```bash
claude --version
```

### Step 3: sandbox の有効化を確認

```bash
claude
```

Claude Code が起動したら：

```
/sandbox
```

メニューが表示されれば sandbox が利用可能です。

---

## 3. sandbox の設定

### 設定ファイルの場所

| スコープ | パス | 用途 |
|---|---|---|
| ユーザー設定 | `~/.claude/settings.json` | 全プロジェクト共通 |
| プロジェクト設定 | `.claude/settings.json` | リポジトリごと |
| ローカル設定 | `.claude/settings.local.json` | gitignore対象 |

### 設定例

`~/.claude/settings.json`:

```json
{
  "sandbox": {
    "enabled": true,
    "filesystem": {
      "allowWrite": ["~/.kube", "/tmp/build"],
      "denyRead": ["~/.aws/credentials"],
      "denyWrite": ["~/sensitive"]
    },
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org"]
    }
  }
}
```

### パスの書き方

| 記法 | 意味 | 例 |
|---|---|---|
| `/` | 絶対パス | `/tmp/build` |
| `~/` | ホームディレクトリ相対 | `~/.kube` |
| `./` | プロジェクトルート相対 | `./output` |

---

## 4. Windows 固有の注意点

### Git for Windows の設定

Git for Windows がインストール済みなのに検出されない場合：

`~/.claude/settings.json` に追加：

```json
{
  "env": {
    "CLAUDE_CODE_GIT_BASH_PATH": "C:\\Program Files\\Git\\bin\\bash.exe"
  }
}
```

### PowerShell 実行ポリシー

インストール時にエラーが出る場合：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### JSON 内のパス記法

JSON ファイル内では、バックスラッシュはエスケープが必要：

```json
// ✅ 正しい
"C:\\Program Files\\Git\\bin\\bash.exe"

// ✅ フォワードスラッシュも可
"C:/Program Files/Git/bin/bash.exe"

// ❌ エスケープなしはエラー
"C:\Program Files\Git\bin\bash.exe"
```

---

## まとめ

- **sandbox が不要** → ネイティブ Windows にインストールするだけでOK
- **sandbox が必要** → WSL 2 をセットアップし、WSL 内に Claude Code をインストール
- WSL 2 内の sandbox は Linux と同等に動作する（bubblewrap ベース）
- ネイティブ Windows での sandbox 対応は Anthropic が開発中
