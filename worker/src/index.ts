export interface Env {
  ANTHROPIC_API_KEY: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  ALLOWED_ORIGIN: string;
  CHAT_MODEL: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

interface ArticleContext {
  headline?: string;
  summary?: string;
  detail?: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

function corsHeaders(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function json(obj: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...cors }
  });
}

async function getPreferencesText(env: Env, ctx: ExecutionContext): Promise<string> {
  const cache = (caches as any).default;
  const cacheKey = new Request("https://ai-news-brief-chat.internal/preferences-cache");
  const cached = await cache.match(cacheKey);
  if (cached) return await cached.text();

  const url = `https://raw.githubusercontent.com/${env.GITHUB_REPO}/${env.GITHUB_BRANCH}/preferences.md`;
  const res = await fetch(url, { cf: { cacheTtl: 600 } as any });
  const text = res.ok ? await res.text() : "";

  const cacheResponse = new Response(text, {
    headers: { "Cache-Control": "max-age=600" }
  });
  ctx.waitUntil(cache.put(cacheKey, cacheResponse));
  return text;
}

function buildSystemPrompt(article: ArticleContext, prefsText: string): string {
  const prefsExcerpt = (prefsText || "").slice(0, 4000);
  return [
    "あなたはaraiさん専属のニュース解説アシスタントです。araiさんは育休中にAI業界への転職を準備しており、毎朝ニュースをキャッチアップしています。",
    "いま表示している記事はこちらです。",
    `見出し: ${article?.headline || "(不明)"}`,
    article?.summary ? `要約: ${article.summary}` : "",
    article?.detail ? `詳細: ${article.detail}` : "",
    article?.sourceUrl ? `出典URL: ${article.sourceUrl}` : "",
    "",
    "araiさんの関心・転職準備の背景（preferences.mdより抜粋。無ければ無視してよい）:",
    prefsExcerpt,
    "",
    "この記事についてのaraiさんの質問に、背景・論点・転職準備への示唆を意識して答えてください。",
    "簡潔かつ丁寧な日本語で、要点を絞って答えること。分からないことは推測で断定せず「分からない」と述べること。",
    "スマホの小さい画面で読まれるため、長文の羅列は避け、必要なら短い箇条書きを使ってよい。"
  ]
    .filter(Boolean)
    .join("\n");
}

async function handleChat(request: Request, env: Env, ctx: ExecutionContext, cors: Record<string, string>): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400, cors);
  }

  const message: string = body?.message;
  const article: ArticleContext = body?.article || {};
  const history: ChatMessage[] = Array.isArray(body?.history) ? body.history : [];

  if (!message || typeof message !== "string") {
    return json({ error: "message is required" }, 400, cors);
  }
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY is not configured on the worker" }, 500, cors);
  }

  const prefsText = await getPreferencesText(env, ctx);
  const systemPrompt = buildSystemPrompt(article, prefsText);

  const messages = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && !m.pending)
    .map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: "user", content: message });

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: env.CHAT_MODEL || "claude-sonnet-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages
    })
  });

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text();
    return json({ error: "anthropic api error", detail }, 502, cors);
  }

  const data: any = await anthropicRes.json();
  const reply = Array.isArray(data.content)
    ? data.content.map((block: any) => block.text || "").join("").trim()
    : "";

  return json({ reply }, 200, cors);
}

function githubHeaders(env: Env): Record<string, string> {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ai-news-brief-worker",
    "X-GitHub-Api-Version": "2022-11-28",
    "content-type": "application/json"
  };
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function base64EncodeUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function sanitizeId(id: string): string {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "chat";
}

async function handleSaveChat(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400, cors);
  }

  const date: string = body?.date;
  const articleId: string = body?.articleId;
  const article: ArticleContext = body?.article || {};
  const history: ChatMessage[] = Array.isArray(body?.history) ? body.history : [];
  const feedback: string | undefined = body?.feedback;

  if (!date || !articleId || !history.length) {
    return json({ error: "date, articleId and non-empty history are required" }, 400, cors);
  }
  if (!env.GITHUB_TOKEN) {
    return json({ error: "GITHUB_TOKEN is not configured on the worker" }, 500, cors);
  }

  const path = `chats/${date}/${sanitizeId(articleId)}.md`;

  const lines: string[] = [];
  lines.push("---");
  lines.push(`created: ${date}`);
  lines.push("tags:");
  lines.push(" - AIニュースBrief/チャットログ");
  if (feedback) lines.push(`feedback: ${feedback}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${article?.headline || articleId}`);
  lines.push("");
  if (article?.summary) {
    lines.push(`> ${article.summary}`);
    lines.push("");
  }
  if (article?.sourceUrl) {
    lines.push(`出典: [${article.sourceLabel || "リンク"}](${article.sourceUrl})`);
    lines.push("");
  }
  lines.push("## チャット履歴");
  lines.push("");
  history.forEach((m) => {
    if (!m || m.pending || !m.content) return;
    lines.push(`**${m.role === "user" ? "arai" : "AI"}:** ${m.content}`);
    lines.push("");
  });
  const content = lines.join("\n");

  const apiUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${encodePath(path)}`;

  let sha: string | undefined;
  const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`, {
    headers: githubHeaders(env)
  });
  if (getRes.ok) {
    const meta: any = await getRes.json();
    sha = meta?.sha;
  }

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: githubHeaders(env),
    body: JSON.stringify({
      message: `chat log: ${path}`,
      content: base64EncodeUtf8(content),
      branch: env.GITHUB_BRANCH,
      sha
    })
  });

  if (!putRes.ok) {
    const detail = await putRes.text();
    return json({ error: "github commit failed", detail }, 502, cors);
  }

  return json({ ok: true, path }, 200, cors);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cors = corsHeaders(env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === "/api/chat" && request.method === "POST") {
        return await handleChat(request, env, ctx, cors);
      }
      if (url.pathname === "/api/save-chat" && request.method === "POST") {
        return await handleSaveChat(request, env, cors);
      }
      return json({ error: "not found" }, 404, cors);
    } catch (err: any) {
      return json({ error: String(err?.message || err) }, 500, cors);
    }
  }
};
