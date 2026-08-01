# セットアップ手順（チャット機能を有効化する）

このリポジトリの `docs/` は今のままでもGitHub Pagesでニュースの閲覧・アーカイブ表示ができます。
「AIとチャットする」「Obsidianに保存」を使うには、以下の手順でチャット用バックエンド（Cloudflare Worker）を1回だけデプロイする必要があります。コードは `worker/` に用意済みです。

かかる費用の目安：Cloudflare Workersは無料枠で十分（個人利用なら課金は発生しない想定）。Anthropic APIは従量課金で、個人のチャット利用なら月数百円〜千円程度が目安です。

## 0. 前提

- Node.js（18以上推奨）が入っていること。無ければ https://nodejs.org/ からインストール、またはHomebrewで `brew install node`。
- GitHub Pagesが有効になっていること（リポジトリの Settings → Pages → Source を「Deploy from a branch」→ ブランチ `main` / フォルダ `/docs` に設定。既に `docs/` で公開できているなら設定済みのはず）。

## 1. Anthropic APIキーを発行する

1. https://console.anthropic.com/ にログイン（無ければ作成）。
2. 「API Keys」から新しいキーを発行し、控えておく（`sk-ant-...`）。
3. 「Billing」で少額のクレジットを設定する（従量課金)。

これはClaude Code（GitHub Actionsの日次生成）で使っているOAuthトークンとは別物です。

## 2. GitHubのPersonal Access Tokenを発行する

チャットログ（`chats/`フォルダ）をWorkerからこのリポジトリへ自動コミットするために使います。

1. GitHubの Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token。
2. Repository access を「Only select repositories」にして `ai-news-brief` のみを選択。
3. Permissions → Repository permissions → **Contents: Read and write** のみ付与。
4. 有効期限を設定して発行、トークンを控えておく（`github_pat_...`）。

## 3. Cloudflareにデプロイする

自分の端末のターミナルで実行してください（値をこのチャットに貼り付けないこと）。

```bash
cd worker
npm install
npx wrangler login          # ブラウザでCloudflareアカウントにログイン（無料アカウントでOK）
npx wrangler secret put ANTHROPIC_API_KEY   # プロンプトが出たら1.で控えたキーを入力
npx wrangler secret put GITHUB_TOKEN        # プロンプトが出たら2.で控えたトークンを入力
npx wrangler deploy
```

`wrangler deploy` の出力に表示されるURL（例: `https://ai-news-brief-chat.<あなたのサブドメイン>.workers.dev`）を控えておきます。

## 4. サイト側に設定する

1. スマホ（またはPC）で https://512431041014arai-hue.github.io/ai-news-brief/ を開く。
2. 右上の ⚙️ 設定を開く。
3. 「チャットAPIのURL」に手順3で控えたWorkerのURLを入力。
4. 「Obsidian Vault名」にObsidianアプリで表示されているVault名を入力（`Obsidian`など）。
5. 「保存先フォルダ」は初期値のままでよい（変更も可）。
6. 保存すると、この端末のブラウザだけに設定が記憶される（PCとスマホは別々に設定が必要）。

## 5. 動作確認

- 記事の詳細を開き「AIとチャットする」→ 質問を送って数秒で回答が返ってくれば成功。
- 「Obsidianに保存」を押すとObsidianアプリが開き、チャット履歴のノートが作成される。
- 「もう出さないで」を押すと、その記事のテーマがWorker経由でリポジトリの `chats/` に記録され、翌朝のワークフローが `preferences.md` の除外テーマに反映する（次回の定時実行以降に反映されます）。

## 困ったとき

- チャットで「応答を取得できませんでした」と出る → 設定のURLが正しいか、`wrangler secret put ANTHROPIC_API_KEY` を設定したか確認。
- Obsidianアプリが開かない → Vault名がObsidianアプリの表示名と完全一致しているか確認（大文字小文字・スペースも一致させる）。
- チャット履歴が翌朝の学習に反映されない → リポジトリの `chats/<date>/` にファイルがコミットされているか確認（`GITHUB_TOKEN` の権限不足だと失敗している可能性）。
