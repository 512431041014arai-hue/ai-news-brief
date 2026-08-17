export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  ALLOWED_ORIGIN: string;
}

interface FavoriteItem {
  date: string;
  articleId: string;
  headline?: string;
  summary?: string;
  category?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  favoritedAt: string;
}

const FAVORITES_PATH = "docs/data/favorites.json";

function corsHeaders(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function base64DecodeUtf8(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function readFavorites(env: Env): Promise<{ items: FavoriteItem[]; sha?: string }> {
  const apiUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${FAVORITES_PATH}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`;
  const res = await fetch(apiUrl, { headers: githubHeaders(env) });
  if (!res.ok) return { items: [] };
  const meta: any = await res.json();
  try {
    const text = base64DecodeUtf8(meta.content || "");
    const data = JSON.parse(text);
    return { items: Array.isArray(data.favorites) ? data.favorites : [], sha: meta.sha };
  } catch {
    return { items: [], sha: meta.sha };
  }
}

async function writeFavorites(env: Env, items: FavoriteItem[], sha: string | undefined): Promise<Response> {
  const apiUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${FAVORITES_PATH}`;
  const content = JSON.stringify({ favorites: items }, null, 2) + "\n";
  return fetch(apiUrl, {
    method: "PUT",
    headers: githubHeaders(env),
    body: JSON.stringify({
      message: "update favorites",
      content: base64EncodeUtf8(content),
      branch: env.GITHUB_BRANCH,
      sha
    })
  });
}

async function handleFavorite(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400, cors);
  }

  const action: string = body?.action === "remove" ? "remove" : "add";
  const articleId: string = body?.articleId;
  const date: string = body?.date;
  if (!articleId || !date) {
    return json({ error: "date and articleId are required" }, 400, cors);
  }
  if (!env.GITHUB_TOKEN) {
    return json({ error: "GITHUB_TOKEN is not configured on the worker" }, 500, cors);
  }

  const { items, sha } = await readFavorites(env);
  const next = items.filter((it) => it.articleId !== articleId);

  if (action === "add") {
    next.unshift({
      date,
      articleId,
      headline: body?.headline,
      summary: body?.summary,
      category: body?.category,
      sourceLabel: body?.sourceLabel,
      sourceUrl: body?.sourceUrl,
      favoritedAt: new Date().toISOString()
    });
  }

  const putRes = await writeFavorites(env, next, sha);
  if (!putRes.ok) {
    const detail = await putRes.text();
    return json({ error: "github commit failed", detail }, 502, cors);
  }
  return json({ ok: true, count: next.length }, 200, cors);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cors = corsHeaders(env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === "/api/favorite" && request.method === "POST") {
        return await handleFavorite(request, env, cors);
      }
      return json({ error: "not found" }, 404, cors);
    } catch (err: any) {
      return json({ error: String(err?.message || err) }, 500, cors);
    }
  }
};
