#!/usr/bin/env python3
"""
Updates navbar and footer consistently across all HTML pages in ai-ing.
1. Ensures <a href="payment.html" class="hover-purple nav-link-tab" ...>결제</a> is in the nav before '무료 상담 신청'.
2. Ensures the full business information is clearly in the footer.
"""

import os
import glob

AI_ING_DIR = "/Users/minwokim/Documents/GitHub/ai-ing"

html_files = [
    "index.html",
    "overview.html",
    "services.html",
    "cases.html",
    "about.html",
    "contact.html",
    "business.html",
    "privacy.html",
    "terms.html",
    "refund.html"
]

NAV_TARGET_OLD = '''        <a href="about.html" class="hover-purple nav-link-tab" style="padding:9px 15px;color:#c5ccda;text-decoration:none;font-size:14.5px;font-weight:500;transition:color .2s;">대표</a>
        <a href="contact.html" class="btn-gradient-hover nav-link-tab"'''

NAV_REPLACEMENT = '''        <a href="about.html" class="hover-purple nav-link-tab" style="padding:9px 15px;color:#c5ccda;text-decoration:none;font-size:14.5px;font-weight:500;transition:color .2s;">대표</a>
        <a href="payment.html" class="hover-purple nav-link-tab" style="padding:9px 15px;color:#c5ccda;text-decoration:none;font-size:14.5px;font-weight:500;transition:color .2s;">결제</a>
        <a href="contact.html" class="btn-gradient-hover nav-link-tab"'''

FOOTER_OLD_SNIPPET = '''        상호명: 에이아잉 (AI-ing) &nbsp;|&nbsp; 대표자: 김민우 &nbsp;|&nbsp; 이메일: contact@ai-ing.org<br>
        사업자등록번호: 102-36-54285 &nbsp;|&nbsp; 통신판매업신고번호: 제 2026-서울서초-2131호 (간이과세자)<br>
        사업장 주소·연락처·호스팅·서비스 제공 기간 등 상세 내역은 <a href="/business.html" class="hover-cyan" style="color:#8b93a5;text-decoration:underline;">사업자정보</a>에서 확인하실 수 있습니다.'''

FOOTER_REPLACEMENT = '''        상호명: 에이아잉 (AI-ing) &nbsp;|&nbsp; 대표자: 김민우 &nbsp;|&nbsp; 이메일: contact@ai-ing.org &nbsp;|&nbsp; 전화번호: 010-4564-4564<br>
        사업자등록번호: 102-36-54285 &nbsp;|&nbsp; 통신판매업신고번호: 제 2026-서울서초-2131호 (간이과세자)<br>
        사업장 소재지: 서울특별시 서초구 신반포로33길 15, 102동 1002호 (잠원동, 신반포청구아파트)<br>
        호스팅 서비스 제공자: Netlify / GitHub Pages &nbsp;|&nbsp; 결제대행 수탁사: 포트원(주), (주)KG이니시스<br>
        서비스 제공 기간: 디지털 교재(결제 즉시 다운로드), 1:1 컨설팅 및 멘토링(구매일로부터 협의 후 최대 1년 이내 제공)'''

updated_count = 0
for fname in html_files:
    fpath = os.path.join(AI_ING_DIR, fname)
    if not os.path.exists(fpath):
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    changed = False
    if NAV_TARGET_OLD in content and 'href="payment.html"' not in content:
        content = content.replace(NAV_TARGET_OLD, NAV_REPLACEMENT)
        changed = True

    if FOOTER_OLD_SNIPPET in content:
        content = content.replace(FOOTER_OLD_SNIPPET, FOOTER_REPLACEMENT)
        changed = True

    if changed:
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated: {fname}")
        updated_count += 1

print(f"Total files updated: {updated_count}")
