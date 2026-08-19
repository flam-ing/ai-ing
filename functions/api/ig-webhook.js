/**
 * Instagram comments webhook (Cloudflare Pages Function)
 * URL: https://ai-ing.org/api/ig-webhook
 *
 * Cloudflare Pages > Settings > Environment variables
 *   WEBHOOK_VERIFY_TOKEN : Meta 앱 대시보드와 같은 verify token
 *   META_APP_SECRET      : 서명 검증 (있으면 검사)
 *   IG_USER_ACCESS_TOKEN : Instagram Login 유저 토큰
 *   IG_GRAPH_USER_ID     : 내 계정 id (자기 댓글 스킵, 없으면 /me)
 */
const GRAPH = 'https://graph.instagram.com/v25.0';
const COMMENT_REPLY = 'DM 드렸습니다!';
const DM_TEXT = '방법을 알고 싶으면 https://ai-ing.org 를 확인해 주세요.';
const seen = new Set();

function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function graphPost(path, token, body) {
  const params = new URLSearchParams({ ...body, access_token: token });
  const res = await fetch(`${GRAPH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`graph ${res.status} ${err.slice(0, 200)}`);
  }
}

async function handleComment(env, commentId, fromId, fromUsername) {
  const me = String(env.IG_GRAPH_USER_ID || '');
  if (!commentId) return 'skip';
  if (fromUsername === 'flam__ing') return 'self';
  if (me && String(fromId) === me) return 'self';
  if (seen.has(commentId)) return 'dup';
  seen.add(commentId);
  const token = env.IG_USER_ACCESS_TOKEN;
  if (!token) return 'no_token';
  await graphPost(`/${commentId}/replies`, token, { message: COMMENT_REPLY });
  const ig = env.IG_GRAPH_USER_ID || 'me';
  try {
    await graphPost(`/${ig}/messages`, token, {
      recipient: JSON.stringify({ id: String(fromId) }),
      message: JSON.stringify({ text: DM_TEXT }),
    });
  } catch {
    return 'replied_dm_err';
  }
  return 'ok';
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode') || '';
  const token = url.searchParams.get('hub.verify_token') || '';
  const challenge = url.searchParams.get('hub.challenge') || '';
  if (mode === 'subscribe' && token && token === env.WEBHOOK_VERIFY_TOKEN) {
    return text(challenge);
  }
  return text('forbidden', 403);
}

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  const secret = env.META_APP_SECRET || '';
  const sig = request.headers.get('X-Hub-Signature-256') || '';
  if (secret) {
    if (!sig.startsWith('sha256=')) return json({ ok: false }, 403);
    const expect = await hmacHex(secret, raw);
    if (expect !== sig.slice(7)) return json({ ok: false }, 403);
  }
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    return json({ ok: false }, 400);
  }
  const results = [];
  for (const entry of payload.entry || []) {
    for (const ch of entry.changes || []) {
      const val = ch.value || {};
      const cid = String(val.id || '');
      const from = val.from || {};
      results.push(
        await handleComment(env, cid, from.id, from.username).catch((e) => `err:${e.message}`),
      );
    }
  }
  return json({ ok: true, results });
}
