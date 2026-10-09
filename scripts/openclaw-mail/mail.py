#!/usr/bin/env python3
"""Private OpenClaw mailbox client. Config stays outside source control."""
import argparse
import json
import os
from pathlib import Path
import urllib.request
import uuid

parser = argparse.ArgumentParser()
parser.add_argument('action', choices=['list', 'read', 'send', 'reply'])
parser.add_argument('--id')
parser.add_argument('--to')
parser.add_argument('--subject')
parser.add_argument('--text')
parser.add_argument('--request-id', help='Reuse the same ID when retrying a send')
args = parser.parse_args()
config = json.loads(Path(os.environ.get('OPENCLAW_MAIL_CONFIG', str(Path.home()/'.ai-ing-private/openclaw-mail.json'))).read_text())
url = config['url']
data = None
if args.action == 'read':
    if not args.id or len(args.id)!=64 or any(c not in '0123456789abcdef' for c in args.id):
        parser.error('Valid --id required')
    url += '?id='+args.id
elif args.action in ['send', 'reply']:
    if not args.text: parser.error('--text required')
    request_id = args.request_id or uuid.uuid4().hex
    print('Request ID (reuse on retry): '+request_id, file=__import__('sys').stderr)
    data = json.dumps(dict(action=args.action,id=args.id,to=args.to,subject=args.subject,text=args.text,requestId=request_id)).encode()
request = urllib.request.Request(url, data=data, headers={'Authorization':'Bearer '+config['token'],'Content-Type':'application/json'})
with urllib.request.urlopen(request, timeout=30) as response:
    print(json.dumps(json.load(response),ensure_ascii=False,indent=2))
