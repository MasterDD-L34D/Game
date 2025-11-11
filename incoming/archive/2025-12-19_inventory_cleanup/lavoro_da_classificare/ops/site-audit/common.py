
import re

def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r'[^a-z0-9\-\s_]+', '', s)
    s = s.replace('_','-').replace(' ','-')
    s = re.sub(r'-{2,}', '-', s)
    return s.strip('-')

def guess_title_from_yaml_text(text: str) -> str | None:
    # naive: look for 'name:' or 'title:' at beginning of a line
    for line in text.splitlines():
        line = line.strip()
        if line.lower().startswith("name:") or line.lower().startswith("title:") or line.lower().startswith("nome:") or line.lower().startswith("titolo:") or line.lower().startswith("label:"):
            val = line.split(":",1)[1].strip().strip('"').strip("'")
            if val:
                return val
    return None

def safe_read_text(path):
    for enc in ("utf-8","latin-1","cp1252"):
        try:
            with open(path, encoding=enc) as f:
                return f.read()
        except Exception:
            continue
    return ""
