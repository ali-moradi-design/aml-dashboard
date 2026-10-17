"""List translation keys used in the web app but missing from a locale file.

Usage: python scripts/i18n-missing-keys.py . [locale]
Literal t("a.b") keys are checked exactly; template keys t(`a.${x}.b`) are reported as patterns
with the prefix that must exist. errors.* messages from packages/shared are included.
"""
import json, os, re, sys

repo = sys.argv[1]
loc = sys.argv[2] if len(sys.argv) > 2 else "en"
web = os.path.join(repo, "apps", "web")
data = json.load(open(os.path.join(web, "src", "shared", "i18n", "locales", f"{loc}.json"), encoding="utf8"))

def flat(d, p=""):
    for k, v in d.items():
        if isinstance(v, dict):
            yield from flat(v, f"{p}{k}.")
        else:
            yield f"{p}{k}"

have = set(flat(data))
have_base = {re.sub(r"_(one|other|zero|two|few|many)$", "", k) for k in have}
prefixes = {k.rsplit(".", 1)[0] for k in have}
lit = set()
tmpl = set()
for root in [os.path.join(web, "src"), os.path.join(web, "app"), os.path.join(repo, "packages", "shared", "src")]:
    for dp, _, fs in os.walk(root):
        for f in fs:
            if not f.endswith((".ts", ".tsx")):
                continue
            s = open(os.path.join(dp, f), encoding="utf8").read()
            for m in re.finditer(r"\bt\(\s*\"([a-zA-Z][\w.]*)\"", s):
                lit.add(m.group(1))
            for m in re.finditer(r"\bt\(\s*([a-z]+ \? \"[^\"]+\" : \"[^\"]+\")", s):
                for k in re.findall(r"\"([^\"]+)\"", m.group(1)):
                    lit.add(k)
            for m in re.finditer(r"\"(errors\.[a-zA-Z0-9]+)\"", s):
                lit.add(m.group(1))
            for m in re.finditer(r"\bt\(\s*`([^`]+)`", s):
                tmpl.add(m.group(1))
missing = sorted(k for k in lit if k not in have and k not in have_base and k not in prefixes)
print(f"{len(missing)} missing literal keys in {loc}:")
for k in missing:
    print(" ", k)
print("template keys whose prefix is absent:")
for k in sorted(tmpl):
    pre = k.split("${")[0].rstrip(".")
    if pre and not any(h.startswith(pre + ".") or h == pre for h in have):
        print(" ", k)
