import re, os

PAGES_DIR = r"D:\workspae\gitee\techer\work-system\mini-program\src\pages"
REQUEST_FILE = r"D:\workspae\gitee\techer\work-system\mini-program\src\common\request.js"
API_PREFIX = "/api"

patterns = [
    (re.compile(r"api\.(get|getList|post|put|patch|del)\s*\(\s*'([^']+)'"), 'api'),
    (re.compile(r'api\.(get|getList|post|put|patch|del)\s*\(\s*"([^"]+)"'), 'api'),
    (re.compile(r"api\.(get|getList|post|put|patch|del)\s*\(\s*`([^`]+)`"), 'api_tpl'),
    (re.compile(r"parentApi\.(get|post|put|del)\s*\(\s*'([^']+)'"), 'parentApi'),
    (re.compile(r'parentApi\.(get|post|put|del)\s*\(\s*"([^"]+)"'), 'parentApi'),
    (re.compile(r"parentApi\.(get|post|put|del)\s*\(\s*`([^`]+)`"), 'parentApi_tpl'),
    (re.compile(r"streamChat\s*\(\s*'([^']+)'"), 'streamChat'),
    (re.compile(r'streamChat\s*\(\s*"([^"]+)"'), 'streamChat'),
    (re.compile(r"streamChat\s*\(\s*`([^`]+)`"), 'streamChat_tpl'),
    (re.compile(r"request\s*\(\s*'([^']+)'"), 'request'),
    (re.compile(r'request\s*\(\s*"([^"]+)"'), 'request'),
    (re.compile(r"request\s*\(\s*`([^`]+)`"), 'request_tpl'),
]

def normalize_path(path):
    p = path.strip()
    # Remove query string
    base = p.split('?')[0]
    # Normalize template variables
    base = re.sub(r'\$\{[^}]+\}', ':id', base)
    # Normalize string concatenation like '/exams/' + id -> '/exams/:id'
    base = re.sub(r"'\s*\+\s*\w+\s*\+\s*'", '', base)
    base = re.sub(r"\"\s*\+\s*\w+\s*\+\s*\"", '', base)
    # Clean up double slashes
    base = re.sub(r'/+', '/', base)
    # Remove trailing slash if it looks like an ID placeholder
    if base.endswith('/') and not base.endswith('/:'):
        base = base.rstrip('/')
    return base

def extract(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Warning: {filepath}: {e}")
        return []
    results = set()
    for pat, caller in patterns:
        for m in pat.finditer(content):
            if caller.startswith('api'):
                path = m.group(2)
                method = m.group(1)
                results.add(('api', path, method))
            elif caller.startswith('parentApi'):
                path = m.group(2)
                method = m.group(1)
                results.add(('parentApi', path, method))
            elif caller.startswith('streamChat'):
                path = m.group(1)
                results.add(('streamChat', path, 'POST'))
            elif caller.startswith('request'):
                path = m.group(1)
                results.add(('request', path, 'GET'))
    return results

out = []
out.append("## 小程序 API 调用清单")
out.append("")
out.append("### common/request.js")
out.append("- （无直接调用，仅封装实现）")
out.append("")

page_files = []
for root, dirs, files in os.walk(PAGES_DIR):
    for f in files:
        if f.endswith('.vue'):
            page_files.append(os.path.join(root, f))

page_map = {}
for fp in page_files:
    rel = os.path.relpath(fp, PAGES_DIR).replace(os.sep, '/')
    apis = extract(fp)
    if apis:
        page_map[rel] = apis

for page in sorted(page_map.keys()):
    out.append("### pages/" + page)
    seen = set()
    items = sorted(page_map[page], key=lambda x: (x[1], x[2] or ''))
    for caller, path, method in items:
        norm = normalize_path(path)
        if caller == 'api' and method == 'getList':
            m = 'GET'
        elif caller == 'api' and method:
            m = method.upper()
        elif caller == 'streamChat':
            m = 'POST'
        elif caller == 'request':
            m = 'GET'
        elif caller == 'parentApi':
            m = method.upper() if method else 'GET'
        else:
            m = 'GET'
        key = (norm, m)
        if key in seen:
            continue
        seen.add(key)
        out.append("- `" + m + " " + API_PREFIX + norm + "`")
    out.append("")

with open(r"D:\workspae\gitee\techer\work-system\mini-program\src\API_LIST.md", 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('Done')
