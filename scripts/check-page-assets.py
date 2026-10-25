#!/usr/bin/env python3
"""Check landing/overview assets in the actual export, not the working tree."""
from html.parser import HTMLParser
from pathlib import Path
import sys
from urllib.parse import unquote, urlsplit

root = Path(sys.argv[1])
missing = []

class Assets(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        refs = [attrs.get(key) for key in ('src', 'data-src', 'poster')]
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            refs.append(attrs.get('href'))
        for ref in filter(None, refs):
            url = urlsplit(ref)
            if url.scheme or url.netloc or not url.path:
                continue
            target = root / unquote(url.path).lstrip('/')
            if not target.is_file():
                missing.append(f'{page}: {ref}')

for page in ('index.html', 'overview.html'):
    Assets().feed((root / page).read_text())
if missing:
    raise SystemExit('Missing deployment assets:\n' + '\n'.join(missing))
print('Landing and overview deployment assets: OK')
