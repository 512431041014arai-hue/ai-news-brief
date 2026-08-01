# ai-news-brief-chat (Cloudflare Worker)

`docs/index.html` の「お気に入り」永続化と、「AIに聞いてみる」のリダイレクト中継を担うバックエンド。Anthropic APIは使わないため、呼び出してもAI利用料は発生しない。

- `POST /api/favorite` — お気に入りの追加/削除を `docs/data/favorites.json` にコミットする（`GITHUB_TOKEN` を使用）。
- `GET /goto?u=<claude.aiのURL>` — claude.aiへの直接遷移がiOSのUniversal LinksでClaudeアプリに奪われるのを避けるための302リダイレクト中継。

必要なシークレットは `GITHUB_TOKEN` のみ（`ANTHROPIC_API_KEY` はチャット機能廃止に伴い不要）。詳しくはリポジトリ直下の [`SETUP.md`](../SETUP.md) を参照。

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
