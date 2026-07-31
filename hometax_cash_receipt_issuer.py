#!/usr/bin/env python3
"""
현금영수증 발급 보조 스크립트 (에이아잉)

⚠️ 중요: 이 스크립트는 현금영수증을 '자동 발급'하지 않는다.
국세청 홈택스는 공동인증서(NPKI)를 이용한 외부 프로그램의 현금영수증 발급을
공개 API로 제공하지 않는다. 따라서 이 스크립트가 하는 일은 다음뿐이다.

  1) 입력값(식별번호·금액·품목) 검증
  2) 공동인증서 파일 존재 확인
  3) 발급 대기 건을 로컬 CSV 원장에 기록 (감사 추적용)
  4) 실제 발급을 위한 정확한 경로 안내

이전 버전은 실제 발급 로직 없이 "발급 완료"를 출력했다. 세무 신고 누락으로
이어질 수 있는 거짓 출력이므로 제거했다.

실제 발급 방법
  A. 홈택스 수동 발급 (수수료 0원)
     https://www.hometax.go.kr → 전자(세금)계산서·현금영수증·신용카드
     → 현금영수증(가맹점) → 현금영수증 발급 → 건별 발급
  B. 프로그램 자동 발급 (유료 연동)
     팝빌(Popbill) 또는 바로빌 현금영수증 API 사용.
     연동 시 이 스크립트의 issue_via_provider()를 구현하면 된다.

사용법
  python3 hometax_cash_receipt_issuer.py <식별번호> <금액> [품목명]
  예) python3 hometax_cash_receipt_issuer.py 01012345678 700000 "AX 멘토링 컨설팅"
"""

import csv
import datetime
import re
import sys
from pathlib import Path

NPKI_DIR = Path(
    "/Users/minwokim/Library/Preferences/NPKI/yessign/USER/"
    "cn=김민우()008804120150918188000815,ou=SHB,ou=personal4IB,o=yessign,c=kr"
)
LEDGER_PATH = Path.home() / ".ai-ing" / "cash_receipt_pending.csv"
HOMETAX_ISSUE_URL = "https://www.hometax.go.kr"

# 휴대폰번호(10~11자리) 또는 사업자등록번호(10자리) 또는 현금영수증카드(13~19자리)
IDENTITY_RE = re.compile(r"^\d{10,19}$")


def check_certificate() -> tuple[bool, str, str]:
    """공동인증서 파일 존재 여부만 확인한다. 서명이나 로그인은 수행하지 않는다."""
    cert_file = NPKI_DIR / "signCert.der"
    key_file = NPKI_DIR / "signPri.key"
    if cert_file.exists() and key_file.exists():
        return True, str(cert_file), str(key_file)
    return False, "", ""


def validate(identity_num: str, amount: int) -> list[str]:
    errors: list[str] = []
    digits = re.sub(r"[^0-9]", "", identity_num)
    if not IDENTITY_RE.match(digits):
        errors.append(
            f"식별번호 형식이 올바르지 않습니다: {identity_num!r} "
            "(휴대폰번호 10~11자리, 사업자번호 10자리, 현금영수증카드 13~19자리)"
        )
    if amount <= 0:
        errors.append(f"금액은 0보다 커야 합니다: {amount}")
    if amount > 100_000_000:
        errors.append(f"금액이 비정상적으로 큽니다: {amount}")
    return errors


def record_pending(identity_num: str, amount: int, item_name: str) -> Path:
    """발급 대기 건을 로컬 CSV 원장에 append 한다."""
    LEDGER_PATH.parent.mkdir(parents=True, exist_ok=True)
    is_new = not LEDGER_PATH.exists()
    with LEDGER_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if is_new:
            writer.writerow(["기록시각", "식별번호", "금액", "품목명", "발급상태"])
        writer.writerow(
            [
                datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
                re.sub(r"[^0-9]", "", identity_num),
                amount,
                item_name,
                "PENDING_MANUAL_ISSUE",
            ]
        )
    return LEDGER_PATH


def issue_via_provider(identity_num: str, amount: int, item_name: str) -> bool:
    """
    팝빌/바로빌 등 연동 사업자를 통한 자동 발급 자리.
    아직 계약·연동이 없으므로 구현되지 않았다. 성공을 반환하지 않는다.
    """
    raise NotImplementedError(
        "자동 발급 연동이 아직 구성되지 않았습니다. "
        "팝빌 또는 바로빌 현금영수증 API 계약 후 이 함수를 구현하세요."
    )


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__.strip())
        return 1

    identity_num = sys.argv[1]
    try:
        amount = int(sys.argv[2].replace(",", ""))
    except ValueError:
        print(f"❌ 금액을 숫자로 입력해 주세요: {sys.argv[2]!r}")
        return 1
    item_name = sys.argv[3] if len(sys.argv) >= 4 else "AX 멘토링 컨설팅"

    errors = validate(identity_num, amount)
    if errors:
        for e in errors:
            print(f"❌ {e}")
        return 1

    cert_ok, cert_path, _ = check_certificate()
    print("현금영수증 발급 요청 정보")
    print(f"  - 식별 번호 : {identity_num}")
    print(f"  - 발급 금액 : {amount:,}원")
    print(f"  - 품목 명칭 : {item_name}")
    print(f"  - 공동인증서: {'확인됨 (' + cert_path + ')' if cert_ok else '찾을 수 없음'}")

    ledger = record_pending(identity_num, amount, item_name)
    print(f"\n📒 발급 대기 원장에 기록했습니다: {ledger}")

    print("\n⚠️ 이 스크립트는 현금영수증을 자동 발급하지 않습니다.")
    print("   홈택스는 외부 프로그램용 현금영수증 발급 공개 API를 제공하지 않습니다.")
    print("\n➡️ 실제 발급 방법")
    print(f"   1) {HOMETAX_ISSUE_URL} 로그인 (공동인증서)")
    print("   2) 전자(세금)계산서·현금영수증·신용카드 → 현금영수증(가맹점) → 발급 → 건별 발급")
    print(f"   3) 위 정보로 발급 후 원장의 발급상태를 ISSUED 로 변경")
    print("\n   자동화가 필요하면 팝빌/바로빌 현금영수증 API를 연동하고")
    print("   issue_via_provider() 를 구현하세요.")

    # 발급이 완료되지 않았으므로 성공(0)으로 종료하지 않는다.
    return 2


if __name__ == "__main__":
    sys.exit(main())
