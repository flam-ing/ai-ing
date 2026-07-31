#!/usr/bin/env bash
#
# ai-ing.org 안전 배포 스크립트
#
# 왜 필요한가:
#   `wrangler pages deploy .` 를 레포 디렉터리에서 직접 실행하면 git이 추적하지 않는
#   파일까지 전부 업로드된다. 과거 이 방식으로 AI_ING_SECURE_VAULT.md(마스터 시크릿),
#   drafts/, models/ 가 https://ai-ing.org/ 에 공개 노출됐다.
#
# 이 스크립트는 `git archive` 로 커밋된 파일만 임시 디렉터리에 추출해 배포하므로
# 추적되지 않은 파일이 절대 배포에 포함되지 않는다.
#
# 사용법:
#   ./scripts/deploy.sh              # 현재 HEAD 배포
#   ./scripts/deploy.sh --dry-run    # 배포 없이 포함될 파일 목록만 출력
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="ai-ing"
DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

cd "$REPO_ROOT"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "⚠️  커밋되지 않은 변경이 있습니다. 커밋된 내용만 배포됩니다."
  git status --short --untracked-files=no
  echo
  read -r -p "계속하시겠습니까? (y/N) " reply
  [[ "$reply" == "y" || "$reply" == "Y" ]] || { echo "중단했습니다."; exit 1; }
fi

STAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ai-ing-deploy.XXXXXX")"
trap 'rm -rf "$STAGE_DIR"' EXIT

git archive HEAD | tar -x -C "$STAGE_DIR"

echo "배포 대상 파일 수: $(find "$STAGE_DIR" -type f | wc -l | tr -d ' ')"

# 시크릿이 섞여 들어갔는지 마지막 방어선
if find "$STAGE_DIR" -type f \( -iname "*vault*" -o -iname "*secret*" -o -name ".env*" -o -name ".dev.vars" \) | grep -q .; then
  echo "❌ 배포 대상에 시크릿 의심 파일이 포함되어 있습니다. 배포를 중단합니다:"
  find "$STAGE_DIR" -type f \( -iname "*vault*" -o -iname "*secret*" -o -name ".env*" -o -name ".dev.vars" \)
  exit 1
fi

if $DRY_RUN; then
  echo "--- dry-run: 배포될 파일 목록 ---"
  (cd "$STAGE_DIR" && find . -type f | sort)
  exit 0
fi

npx wrangler pages deploy "$STAGE_DIR" --project-name="$PROJECT_NAME" --branch=main
echo "✅ 배포 완료"
