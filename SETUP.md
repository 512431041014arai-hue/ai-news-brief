# セットアップ手順

**公開URL**: https://jisui-hack.github.io/ai-news-brief/

## 現在の使い方（追加設定は不要）

`docs/` はGitHub Pagesで公開される静的サイト。追加セットアップなしにそのまま使える。

- 一覧・アーカイブ閲覧: そのままアクセスするだけ
- **♡ お気に入り**: 記事の見出し横の♡をタップすると保存される（Worker経由で`docs/data/favorites.json`にコミットされる）。左上の★から**直近1年分**を一覧で振り返れる。翌朝のワークフローがこれを読み、関心の傾向を`preferences.md`に反映する
- **メモ**: お気に入り一覧の各記事にメモ欄があり、自分で調べたことを書き足せる。入力をやめて約1秒後、または入力欄から離れた時点で自動保存される
- **検索**: お気に入り一覧の検索欄から、見出し・要約・メモ・カテゴリを対象に絞り込める。スペース区切りで複数語のAND検索になる

チャットでAIと対話する機能・Obsidianへの保存機能は、実際にはほとんど使わなかったため2026-08-17に削除し、ニュースの提示（閲覧・アーカイブ・お気に入り）に絞った。

## スマホでの自動起動（任意）

毎朝08:00(JST)頃に生成が終わるので、iOSの「ショートカット」アプリでオートメーション（時刻トリガー・URLを開く・「実行前に確認」オフ）を組むと、決まった時刻に自動でサイトが開く。

## `worker/` について（お気に入り保存に使用中）

Cloudflare Worker（`ai-news-brief-chat`）は現在、お気に入りの永続化のためだけに使われている。Anthropic APIは使わないため、AI利用料は一切発生しない（GitHub APIの無料枠とCloudflare Workersの無料枠のみで動く）。

- `POST /api/favorite` — お気に入りの追加/削除/メモ更新を`docs/data/favorites.json`にコミットする（`GITHUB_TOKEN`を使用）。`action`は`add` / `remove` / `note` の3種類

コード変更後の再デプロイ:

```bash
cd worker
npx wrangler deploy
```

## GitHubアカウント名を変更したときにやること

2026-08-21に、GitHubアカウント名を `512431041014arai-hue` から `jisui-hack` に変更した。リポジトリのURLは自動でリダイレクトされるが、**GitHub PagesのURLはリダイレクトされない**ため、旧URLは404になる。アカウント名を変えた場合は次の3点を必ず直す。

1. **`worker/wrangler.toml` の `GITHUB_REPO` と `ALLOWED_ORIGIN`** を新しいアカウント名に更新して `npx wrangler deploy`。ここが古いままだと、CORSでブロックされてお気に入りの保存が失敗する。
2. **スマホ側のURL** — ホーム画面のアイコンを削除して新URLから追加し直す。iOSショートカットのオートメーションのURLも書き換える。
3. **Claude GitHub Appの再認可** — アカウント名変更後、毎朝のワークフローが `App token exchange failed: 401 Unauthorized - User does not have write access on this repository` で失敗する。https://github.com/settings/installations からClaudeのアプリを開き、このリポジトリへのアクセスを再設定する。
