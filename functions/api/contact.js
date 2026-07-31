/**
 * 에이아잉 문의 접수 API (Cloudflare Pages Function)
 *
 * 필수 환경변수 (Cloudflare Pages > Settings > Environment variables)
 *   RESEND_API_KEY : Resend 트랜잭셔널 메일 API 키  (코드에 절대 하드코딩하지 않는다)
 * 선택 환경변수
 *   CONTACT_TO      : 수신 메일 주소 (기본 contact@ai-ing.org)
 *   RESEND_FROM     : 발신 표기 (기본 onboarding@resend.dev — 도메인 인증 후 교체 권장)
 *   TURNSTILE_SECRET: 설정 시 Cloudflare Turnstile 토큰 검증 활성화
 * 선택 바인딩
 *   CONTACT_RL      : KV Namespace. 바인딩 시 IP당 레이트리밋 활성화
 */

const ALLOWED_ORIGINS = [
  'https://ai-ing.org',
  'https://www.ai-ing.org',
  'http://localhost:8788',
  'http://127.0.0.1:8788',
];

const MAX_CONTACT_LEN = 200;
const MAX_CONTENT_LEN = 5000;
const RATE_LIMIT_MAX = 5; // 창당 최대 제출 횟수
const RATE_LIMIT_WINDOW_SEC = 600; // 10분

function resolveOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(request),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** 메일 본문에 사용자 입력을 넣기 전 HTML 이스케이프 (메일 HTML 인젝션 차단) */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(01[016789]-?\d{3,4}-?\d{4}|\d{2,3}-?\d{3,4}-?\d{4})$/;

/** 동일 오리진에서 온 요청인지 확인 (외부 사이트의 대량 호출 차단) */
function isAllowedRequest(request) {
  const origin = request.headers.get('Origin');
  if (origin) return ALLOWED_ORIGINS.includes(origin);
  // Origin 헤더가 없는 클라이언트를 위한 폴백
  const referer = request.headers.get('Referer') || '';
  return ALLOWED_ORIGINS.some((o) => referer.startsWith(o + '/'));
}

/** KV 바인딩이 있을 때만 동작하는 IP 레이트리밋 */
async function checkRateLimit(env, request) {
  if (!env.CONTACT_RL) return { ok: true };
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `contact:${ip}`;
  const current = Number((await env.CONTACT_RL.get(key)) || 0);
  if (current >= RATE_LIMIT_MAX) return { ok: false };
  await env.CONTACT_RL.put(key, String(current + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SEC,
  });
  return { ok: true };
}

/** TURNSTILE_SECRET 설정 시에만 동작하는 봇 검증 */
async function verifyTurnstile(env, request, token) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: request.headers.get('CF-Connecting-IP') || undefined,
    }),
  });
  const data = await res.json().catch(() => ({ success: false }));
  return data.success === true;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!isAllowedRequest(request)) {
    return json(request, { error: '허용되지 않은 요청 출처입니다.' }, 403);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return json(request, { error: 'Content-Type은 application/json이어야 합니다.' }, 415);
  }

  const resendApiKey = env.RESEND_API_KEY;
  if (!resendApiKey) {
    // 키가 없으면 조용히 성공시키지 않고 명확히 실패시킨다.
    return json(
      request,
      { error: '서버 설정 오류로 문의를 접수할 수 없습니다. contact@ai-ing.org로 직접 연락해 주세요.' },
      500
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: '요청 본문을 해석할 수 없습니다.' }, 400);
  }

  // 허니팟: 사람은 채우지 않는 필드. 값이 있으면 봇으로 간주하고 조용히 성공 응답.
  if (body.company_website) {
    return json(request, { success: true });
  }

  const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';

  if (!contact || !content) {
    return json(request, { error: '연락처/이메일 정보와 문의 내용을 입력해 주세요.' }, 400);
  }
  if (contact.length > MAX_CONTACT_LEN || content.length > MAX_CONTENT_LEN) {
    return json(request, { error: '입력 길이가 허용 범위를 초과했습니다.' }, 413);
  }

  const isEmail = EMAIL_RE.test(contact);
  if (!isEmail && !PHONE_RE.test(contact)) {
    return json(request, { error: '올바른 이메일 주소 또는 전화번호를 입력해 주세요.' }, 400);
  }

  if (!(await verifyTurnstile(env, request, body.turnstileToken))) {
    return json(request, { error: '봇 검증에 실패했습니다. 새로고침 후 다시 시도해 주세요.' }, 403);
  }

  const rate = await checkRateLimit(env, request);
  if (!rate.ok) {
    return json(
      request,
      { error: '문의가 너무 많이 접수되었습니다. 잠시 후 다시 시도해 주세요.' },
      429
    );
  }

  const safeContact = escapeHtml(contact);
  const safeContent = escapeHtml(content);
  const receivedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM || 'AI-ing Contact <onboarding@resend.dev>',
        to: env.CONTACT_TO || 'contact@ai-ing.org',
        ...(isEmail ? { reply_to: contact } : {}),
        subject: '[에이아잉 문의] 새로운 문의가 접수되었습니다.',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e3e5ea; border-radius: 8px;">
            <h2 style="color: #3b33a5; margin-bottom: 20px; border-bottom: 2px solid #3b33a5; padding-bottom: 10px;">에이아잉 새로운 문의 접수</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #5c6573; width: 120px;">연락처 / 이메일</td>
                <td style="padding: 8px 0; color: #0c0e14; font-size: 15px;">${safeContact}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #5c6573; width: 120px;">접수 시각</td>
                <td style="padding: 8px 0; color: #5c6573; font-size: 14px;">${escapeHtml(receivedAt)}</td>
              </tr>
            </table>
            <div style="background: #f4f5f7; padding: 15px; border-radius: 4px; border: 1px solid #e3e5ea; margin-top: 10px;">
              <h4 style="margin-top: 0; color: #0c0e14;">문의 내용</h4>
              <p style="white-space: pre-wrap; line-height: 1.6; color: #333; margin-bottom: 0;">${safeContent}</p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      // 외부 API의 원문 오류를 클라이언트에 그대로 노출하지 않는다.
      console.error('Resend API error', emailResponse.status, await emailResponse.text());
      return json(
        request,
        { error: '문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
        502
      );
    }

    return json(request, { success: true });
  } catch (err) {
    console.error('contact handler error', err);
    return json(request, { error: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
  }
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequest(context) {
  const method = context.request.method.toUpperCase();
  if (method === 'POST') return onRequestPost(context);
  if (method === 'OPTIONS') return onRequestOptions(context);
  return json(context.request, { error: 'Method Not Allowed' }, 405);
}
