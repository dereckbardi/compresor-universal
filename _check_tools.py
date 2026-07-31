import re
with open(r'C:\Users\derec\.openclaw\workspace\compresor\src\lib\tools.ts', encoding='utf-8') as f:
    content = f.read()

tools = re.findall(r'\{ id: "([^"]+)", name: "([^"]+)", desc: "([^"]*)", icon: "([^"]*)", category: "([^"]+)", available: (true|false)', content)

print("DISPONIBLES:")
for t in tools:
    if t[5] == 'true':
        print(f"  [x] {t[1]}")
print()
print("PRONTO (marcadas como no disponibles):")
for t in tools:
    if t[5] == 'false':
        print(f"  [ ] {t[1]}")
