/**
 * 시크릿 문서 경로 하드 차단 (Cloudflare Pages Function)
 *
 * 배경: 2026-07-27 ~ 07-31 사이, 로컬에서 `wrangler pages deploy .` 를 실행해
 * git이 추적하지 않는 AI_ING_SECURE_VAULT.md(마스터 시크릿)가 배포에 포함되어
 * https://ai-ing.org/AI_ING_SECURE_VAULT.md 로 공개 다운로드 가능한 상태였다.
 *
 * 파일 격리 + 노출 배포 삭제 + 클린 재배포까지 완료했으나 Cloudflare 내부
 * 캐시에 응답 사본이 남아 계속 서비스되었고, 사용 가능한 토큰에 캐시 퍼지
 * 권한이 없었다. 이 Function 은 해당 경로를 요청 단계에서 가로채 404 를
 * 반환하고 캐시를 무효화한다.
 *
 * 이 파일은 지워도 무방해질 때까지(캐시 완전 만료 확인 후) 유지한다.
 */

const BLOCKED = new Set([
  '/ai_ing_secure_vault.md',
  '/ai_ing_full_secure_vault.md',
]);

function blockedResponse() {
  return new Response('Not Found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // 엣지/브라우저 캐시에 남지 않도록, 그리고 기존 캐시 항목을 덮어쓰도록
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
      Pragma: 'no-cache',
      Expires: '0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function onRequest(context) {
  try {
    const path = new URL(context.request.url).pathname.toLowerCase();
    if (BLOCKED.has(path)) return blockedResponse();
    // .md 파일은 이 사이트에서 서비스할 이유가 없다. 전부 차단.
    if (path.endsWith('.md')) return blockedResponse();
  } catch {
    // URL 파싱 실패 시에도 사이트가 죽지 않도록 통과시킨다.
  }
  return context.next();
}
