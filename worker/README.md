# ai-news-brief-chat (Cloudflare Worker)

`docs/index.html` の「お気に入り」永続化を担うバックエンド。AI関連のAPIは使わないため、呼び出してもAI利用料は発生しない。

- `POST /api/favorite` — `docs/data/favorites.json` を更新する（`GITHUB_TOKEN` を使用）。`action` で挙動が変わる:
  - `add` — お気に入りに追加する（以前書いたメモが残っていれば引き継ぐ）
  - `remove` — お気に入りから外す
  - `note` — メモ（`note`）だけを更新する

同じファイルへの書き込みが重なるとGitHubが409を返すため、最新の内容を読み直して最大3回までやり直す。

必要なシークレットは `GITHUB_TOKEN` のみ。詳しくはリポジトリ直下の [`SETUP.md`](../SETUP.md) を参照。

## ローカル開発

```bash
npm install
npm run dev
```

`.dev.vars` に以下を設定するとローカルでも動作確認できる（コミットしないこと）:

```
GITHUB_TOKEN=github_pat_...
```
