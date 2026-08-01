# セットアップ手順

## 現在の使い方（追加設定は不要）

`docs/` はGitHub Pagesで公開される静的サイト。基本的な閲覧・アーカイブ表示は追加セットアップなしにそのまま使える。

- 一覧・アーカイブ閲覧: そのままアクセスするだけ
- **♡ お気に入り**: 記事の見出し横の♡をタップすると保存される（Worker経由で`docs/data/favorites.json`にコミットされる）。左上の★から直近30日分を一覧で振り返れる。翌朝のワークフローがこれを読み、関心の傾向を`preferences.md`に反映する
- **AIに聞いてみる**: 記事の見出し・要約・詳細をコンテキストとして、Chromeで https://claude.ai/new を開く（無ければクリップボードにコピーされた内容を手動で貼り付ける）。Claude側の会話はaraiさん自身のClaudeアカウント経由なので、このサイト側でのAPI課金は発生しない
- **Obsidianに保存**: 記事内容と「Claudeとの会話をここに貼り付け」という見出しを持つノートを、`obsidian://` リンクでObsidianアプリに直接作成する

Obsidian保存を使う場合は、サイト右上の⚙️設定で以下だけ入力しておく（この端末のブラウザにのみ保存される）。

- Obsidian Vault名（Obsidianアプリに表示されている名前と完全一致させること）
- 保存先フォルダ（初期値: `99_情報ソース/AIニュースBrief`）

## スマホでの自動起動（任意）

毎朝08:00(JST)頃に生成が終わるので、iOSの「ショートカット」アプリでオートメーション（時刻トリガー・URLを開く・「実行前に確認」オフ）を組むと、決まった時刻に自動でサイトが開く。

## `worker/` について（お気に入り保存とリダイレクトに使用中）

Cloudflare Worker（`ai-news-brief-chat`）は現在、次の2つの軽量なエンドポイントだけを提供している。どちらもAnthropic APIは使わないため、AI利用料は一切発生しない（GitHub APIの無料枠とCloudflare Workersの無料枠のみで動く）。

- `POST /api/favorite` — お気に入りの追加/削除を`docs/data/favorites.json`にコミットする（`GITHUB_TOKEN`を使用）
- `GET /goto?u=<claude.aiのURL>` — 「AIに聞いてみる」タップ時に、claude.aiへ直接遷移するとiOSのUniversal LinksでClaudeアプリに自動的に持っていかれてしまう問題を避けるため、一度自ドメインを経由してから302でclaude.aiへリダイレクトする中継役

以前サイト内チャットで使っていた`ANTHROPIC_API_KEY`シークレットは今は不要。設定済みなら削除して構わない:

```bash
cd worker
npx wrangler secret delete ANTHROPIC_API_KEY
```

コード変更後の再デプロイ:

```bash
cd worker
npx wrangler deploy
```
