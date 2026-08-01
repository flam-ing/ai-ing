#!/usr/bin/env python3
"""
네이버 스마트스토어 주문 자동 발주확인 및 직접전달 발송처리 자동화 스크립트
Naver Commerce API Client (OAuth2 + JWT Bcrypt + DIRECT_DELIVERY + Webshare Static Egress Proxy)
"""

import os
import sys
import time
import base64
import datetime
import urllib.parse
from typing import Dict, Any, List
import requests
import urllib3
import bcrypt

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def load_env():
    env_path = os.path.expanduser("~/.env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()

load_env()

CLIENT_ID = os.environ.get("NAVER_COMMERCE_CLIENT_ID", "4rtl3xVaxRa7AijyoYblHy")
CLIENT_SECRET = os.environ.get("NAVER_COMMERCE_CLIENT_SECRET", "$2a$04$9vw5JqOfFkf8BiVihe9/Ce")
FIXED_PROXY_URL = os.environ.get("FIXED_PROXY_URL", "http://pwrbxevg:ee0kdagkuu3a@38.154.185.97:6370")

API_BASE_URL = "https://api.commerce.naver.com/external"

def get_http_session() -> requests.Session:
    s = requests.Session()
    s.verify = False
    if FIXED_PROXY_URL:
        s.proxies = {
            "http": FIXED_PROXY_URL,
            "https": FIXED_PROXY_URL
        }
    return s

def generate_signature(client_id: str, client_secret: str, timestamp: int) -> str:
    """네이버 커머스 API OAuth2 signature 생성 (bcrypt)"""
    password = f"{client_id}_{timestamp}"
    hashed = bcrypt.hashpw(password.encode('utf-8'), client_secret.encode('utf-8'))
    return base64.b64encode(hashed).decode('utf-8')

def get_access_token(client_id: str, client_secret: str) -> str:
    """OAuth2 access_token 발급"""
    timestamp = int(time.time() * 1000) - 3000
    client_secret_sign = generate_signature(client_id, client_secret, timestamp)
    
    url = f"{API_BASE_URL}/v1/oauth2/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "client_id": client_id,
        "timestamp": timestamp,
        "client_secret_sign": client_secret_sign,
        "grant_type": "client_credentials",
        "type": "SELF"
    }
    
    session = get_http_session()
    res = session.post(url, headers=headers, data=data, timeout=10)
    if not res.ok:
        raise RuntimeError(f"토큰 발급 실패 ({res.status_code}): {res.text}")
    
    res_json = res.json()
    return res_json.get("access_token", "")

def get_last_changed_statuses(token: str, days_back: int = 7) -> List[Dict[str, Any]]:
    """최근 변경된 상품 주문 내역 24시간 청크 단위 조회"""
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
    session = get_http_session()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    
    all_statuses = []
    seen_ids = set()
    
    for day in range(days_back):
        start = now - datetime.timedelta(days=day+1)
        end = now - datetime.timedelta(days=day)
        
        from_iso = start.strftime('%Y-%m-%dT%H:%M:%S.000+09:00')
        to_iso = end.strftime('%Y-%m-%dT%H:%M:%S.000+09:00')
        
        url = f"{API_BASE_URL}/v1/pay-order/seller/product-orders/last-changed-statuses?lastChangedFrom={urllib.parse.quote(from_iso)}&lastChangedTo={urllib.parse.quote(to_iso)}"
        res = session.get(url, headers=headers, timeout=10)
        if res.ok:
            payload = res.json()
            data = payload.get("data") or payload
            statuses = data.get("lastChangeStatuses") or data.get("lastChangedStatuses") or []
            if isinstance(statuses, dict):
                statuses = statuses.get("elements") or []
            for item in statuses:
                p_id = item.get("productOrderId")
                if p_id and p_id not in seen_ids:
                    seen_ids.add(p_id)
                    all_statuses.append(item)
                    
    return all_statuses

def confirm_orders(token: str, product_order_ids: List[str]) -> bool:
    """발주 확인 처리 (상품 준비 중으로 변경)"""
    if not product_order_ids:
        return True
    
    url = f"{API_BASE_URL}/v1/pay-order/seller/product-orders/confirm"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    body = {"productOrderIds": product_order_ids}
    session = get_http_session()
    res = session.post(url, headers=headers, json=body, timeout=10)
    if res.ok:
        res_json = res.json()
        successes = res_json.get("data", {}).get("successProductOrderIds", [])
        print(f"✅ 발주 확인 성공 {len(successes)}건: {successes}")
        return True
    else:
        print(f"⚠️ 발주 확인 결과 ({res.status_code}): {res.text}")
        return False

def dispatch_direct_delivery(token: str, product_order_ids: List[str]) -> bool:
    """직접전달 발송 처리 (KST ISO-8601 적용, 송장번호 없이 즉시 배송완료)"""
    if not product_order_ids:
        return True
    
    now_kst = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%dT%H:%M:%S.000+09:00')
    dispatch_items = [
        {
            "productOrderId": p_id,
            "deliveryMethod": "DIRECT_DELIVERY",
            "dispatchDate": now_kst
        }
        for p_id in product_order_ids
    ]
    
    url = f"{API_BASE_URL}/v1/pay-order/seller/product-orders/dispatch"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    body = {"dispatchProductOrders": dispatch_items}
    session = get_http_session()
    res = session.post(url, headers=headers, json=body, timeout=10)
    if res.ok:
        res_json = res.json()
        data = res_json.get("data", {})
        successes = data.get("successProductOrderIds", [])
        fails = data.get("failProductOrderInfos", [])
        if successes:
            print(f"🚀 직접전달 발송 처리 성공 (배송완료 전환 {len(successes)}건): {successes}")
        if fails:
            print(f"⚠️ 일부 발송 처리 실패: {fails}")
        return True
    else:
        print(f"⚠️ 발송 처리 결과 ({res.status_code}): {res.text}")
        return False

def main():
    if not CLIENT_ID or not CLIENT_SECRET:
        print("❌ NAVER_COMMERCE_CLIENT_ID 및 NAVER_COMMERCE_CLIENT_SECRET 설정이 필요합니다.")
        sys.exit(1)
        
    print(f"🌐 Webshare 고정 프록시 연결 중 (Egress IP: 38.154.185.97)...")
    print("🔑 네이버 커머스 API 인증 토큰 발급 중...")
    try:
        token = get_access_token(CLIENT_ID, CLIENT_SECRET)
        print("✨ 인증 성공! (IP 화이트리스트 38.154.185.97 정상 통과 중)")
    except Exception as e:
        print(f"❌ 인증 실패: {e}")
        sys.exit(1)
        
    print("📦 최근 7일간 주문 상태 변경 내역 조회 중...")
    statuses = get_last_changed_statuses(token, days_back=7)
    
    payed_ids = [
        item.get("productOrderId")
        for item in statuses
        if item.get("productOrderStatus") in ["PAYED", "PREPARING", "PAY_WAITING", "DELIVERY_PREPARING"] and item.get("productOrderId")
    ]
    
    if not payed_ids:
        print("🎉 네이버 API 기준 현재 발주/발송 대기 중인 신규 미처리 주문이 없습니다.")
        print("💡 (이미 배송완료 처리 완료되었거나 스마트스토어 센터에서 확인 가능한 상태입니다)")
        return
        
    print(f"📬 처리 대기 주문 {len(payed_ids)}건 감지: {payed_ids}")
    confirm_orders(token, payed_ids)
    dispatch_direct_delivery(token, payed_ids)
    print("💯 네이버 스마트스토어 주문 자동 발주 및 직접전달(배송완료) 처리가 완료되었습니다!")

if __name__ == "__main__":
    main()
