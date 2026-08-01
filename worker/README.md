# ai-news-brief-chat (Cloudflare Worker)

`docs/index.html` のチャット機能・Obsidian保存機能のバックエンド。

- `POST /api/chat` — 記事の文脈とpreferences.mdを踏まえてAnthropic APIに問い合わせ、リアルタイムに回答を返す。
- `POST /api/save-chat` — チャット履歴をこのリポジトリの `chats/<date>/<articleId>.md` にコミットする（翌朝のワークフローが学習ログとして読む）。

セットアップ・デプロイ手順はリポジトリ直下の [`SETUP.md`](../SETUP.md) を参照。

## ローカル開発

```bash
npm install
npm run dev
```

`.dev.vars` に以下を設定するとローカルでも動作確認できる（コミットしないこと）:

```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=github_pat_...
```
