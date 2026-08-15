import re, os

PAGES_DIR = r"D:\workspae\gitee\techer\work-system\mini-program\src\pages"
OUTPUT_FILE = r"D:\workspae\gitee\techer\work-system\mini-program\src\API_LIST.md"

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

def has_api_calls(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return False
    for pat, _ in patterns:
        if pat.search(content):
            return True
    return False

files_with_apis = []
for root, dirs, files in os.walk(PAGES_DIR):
    for f in files:
        if f.endswith('.vue'):
            fp = os.path.join(root, f)
            if has_api_calls(fp):
                rel = os.path.relpath(fp, PAGES_DIR).replace(os.sep, '/')
                files_with_apis.append(rel)

with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
    output = f.read()

missing = []
for rel in sorted(files_with_apis):
    if '### pages/' + rel not in output:
        missing.append(rel)

print('Files with APIs:', len(files_with_apis))
print('Missing from output:', len(missing))
for m in missing:
    print(' -', m)
