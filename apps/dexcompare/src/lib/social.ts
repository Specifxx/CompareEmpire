// Best-effort social posting for the daily Market Wrap bot. Each provider is
// independently env-gated and wrapped in try/catch (modeled on lib/indexnow.ts):
// a missing credential or a provider outage is a silent no-op and never blocks
// the others or the price pipeline. No third-party SDKs — plain fetch to each
// provider's public HTTP API, so there's nothing to install or keep updated.
//
// Every provider is OPTIONAL. The bot posts to whichever accounts you've set
// secrets for; set none and it's a complete no-op.

export interface SocialPost {
  text: string; // the message (already includes context; keep < 280 for X/Bluesky)
  url: string; // canonical link to the wrap edition
}

type Result = { provider: string; ok: boolean; detail?: string };

// ── Bluesky (AT Protocol) ──────────────────────────────────────────────────────
// Secrets: BLUESKY_HANDLE (e.g. dexcompare.bsky.social), BLUESKY_APP_PASSWORD
// (App Passwords → NOT your main password). Free, no approval process.
async function postBluesky(post: SocialPost): Promise<Result | null> {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) return null;
  const svc = "https://bsky.social";
  try {
    const auth = await fetch(`${svc}/xrpc/com.atproto.server.createSession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: handle, password }),
    });
    if (!auth.ok) return { provider: "bluesky", ok: false, detail: `auth ${auth.status}` };
    const { accessJwt, did } = (await auth.json()) as { accessJwt: string; did: string };

    // A link facet so the URL is clickable in the post.
    const full = post.url;
    const idx = post.text.indexOf(full);
    const facets =
      idx >= 0
        ? [
            {
              index: {
                byteStart: Buffer.byteLength(post.text.slice(0, idx)),
                byteEnd: Buffer.byteLength(post.text.slice(0, idx + full.length)),
              },
              features: [{ $type: "app.bsky.richtext.facet#link", uri: full }],
            },
          ]
        : undefined;

    const res = await fetch(`${svc}/xrpc/com.atproto.repo.createRecord`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessJwt}` },
      body: JSON.stringify({
        repo: did,
        collection: "app.bsky.feed.post",
        record: {
          $type: "app.bsky.feed.post",
          text: post.text,
          createdAt: new Date().toISOString(),
          ...(facets ? { facets } : {}),
        },
      }),
    });
    return { provider: "bluesky", ok: res.ok, detail: res.ok ? undefined : `post ${res.status}` };
  } catch (e) {
    return { provider: "bluesky", ok: false, detail: (e as Error).message };
  }
}

// ── Telegram channel ────────────────────────────────────────────────────────────
// Secrets: TELEGRAM_BOT_TOKEN (from @BotFather), TELEGRAM_CHAT_ID (the channel,
// e.g. @dexcompare, or a numeric id). Add the bot as an admin of the channel.
async function postTelegram(post: SocialPost): Promise<Result | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `${post.text}\n${post.url}`,
        disable_web_page_preview: false,
      }),
    });
    return { provider: "telegram", ok: res.ok, detail: res.ok ? undefined : `${res.status}` };
  } catch (e) {
    return { provider: "telegram", ok: false, detail: (e as Error).message };
  }
}

// ── Discord webhook ─────────────────────────────────────────────────────────────
// Secret: DISCORD_WEBHOOK_URL (Server Settings → Integrations → Webhooks →
// Copy URL). No bot account needed.
async function postDiscord(post: SocialPost): Promise<Result | null> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return null;
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `${post.text}\n${post.url}` }),
    });
    return { provider: "discord", ok: res.ok, detail: res.ok ? undefined : `${res.status}` };
  } catch (e) {
    return { provider: "discord", ok: false, detail: (e as Error).message };
  }
}

// Fire all configured providers in parallel; return the results of the ones that
// were actually configured (null = not configured, skipped).
export async function postToSocials(post: SocialPost): Promise<Result[]> {
  const settled = await Promise.all([postBluesky(post), postTelegram(post), postDiscord(post)]);
  return settled.filter((r): r is Result => r != null);
}
