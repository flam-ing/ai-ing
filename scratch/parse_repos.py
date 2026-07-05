import json
from datetime import datetime

with open('scratch/repos.json', 'r') as f:
    repos = json.load(f)

print(f"{'Name':<35} | {'Language':<12} | {'Size (KB)':<10} | {'Created':<12} | {'Updated':<12} | {'Description'}")
print("-" * 120)
for r in sorted(repos, key=lambda x: x['updated_at'], reverse=True):
    name = r['name']
    lang = r.get('language') or 'N/A'
    size = r['size']
    created = r['created_at'][:10]
    updated = r['updated_at'][:10]
    desc = r.get('description') or ''
    if len(desc) > 50:
        desc = desc[:47] + "..."
    print(f"{name:<35} | {lang:<12} | {size:<10} | {created:<12} | {updated:<12} | {desc}")
