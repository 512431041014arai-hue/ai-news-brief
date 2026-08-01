# ai-news-brief-chat (Cloudflare Worker) — 現在は未使用

`docs/index.html` はサイト内チャットをやめ、「AIに聞いてみる」ボタンでChromeのclaude.aiを開く方式に変更したため、このWorkerは現在どこからも呼び出されていない。参考実装としてリポジトリに残してある。

- `POST /api/chat` — （旧）記事の文脈とpreferences.mdを踏まえてAnthropic APIに問い合わせ、リアルタイムに回答を返す。
- `POST /api/save-chat` — （旧）チャット履歴をこのリポジトリの `chats/<date>/<articleId>.md` にコミットする。

詳しい経緯・削除する場合の手順はリポジトリ直下の [`SETUP.md`](../SETUP.md) を参照。

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
