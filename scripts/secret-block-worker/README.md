# ai-ing-secret-block Worker

## 왜 존재하나
2026-07-27 ~ 07-31 사이 로컬에서 `wrangler pages deploy .` 를 실행해, git이 추적하지 않는
`AI_ING_SECURE_VAULT.md`(마스터 시크릿 문서)가 Pages 배포에 포함되어
`https://ai-ing.org/AI_ING_SECURE_VAULT.md` 로 누구나 다운로드 가능한 상태였다.

대응 순서:
1. 파일을 `~/.ai-ing-private/` 로 격리
2. `.gitattributes` + `scripts/deploy.sh` + GitHub Actions 를 `git archive` 기반으로 바꿔 재발 방지
3. 클린 재배포
4. 시크릿이 포함된 과거 배포 4건 삭제
5. 그런데도 해당 URL 이 `Cache-Control: public, s-maxage=604800` (7일) 로 엣지 캐시되어 계속 서비스됨.
   보유 토큰(wrangler OAuth)에 cache purge 권한이 없어 퍼지 불가.
6. `functions/_middleware.js` 로 경로 차단 + 이 Worker 를 캐시 앞단 2차 방어선으로 배치.

## 언제 지워도 되나
캐시 항목이 완전히 만료된 뒤(배포 시점 +7일 이상, 즉 2026-08-08 이후)
아래로 확인하고 삭제해도 된다.

```bash
curl -sI https://ai-ing.org/AI_ING_SECURE_VAULT.md | grep -i content-type
# text/plain(404) 이면 정상. text/markdown 이면 아직 캐시 살아있음.
```

## 삭제 방법
```bash
npx wrangler delete --name ai-ing-secret-block
```

## 재배포 방법
```bash
cd scripts/secret-block-worker && npx wrangler deploy
```

주의: 이 디렉터리는 `.gitattributes` 의 `scripts/ export-ignore` 로
Pages 배포 산출물에서 제외된다.
