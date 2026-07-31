// ai-ing.org 시크릿 문서 경로 하드 차단 Worker
// Worker는 Cloudflare 엣지 캐시보다 먼저 실행되므로,
// s-maxage=604800 으로 캐시된 기존 응답도 무력화한다.
export default {
  async fetch() {
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow'
      }
    });
  }
};
