import re

path = r'C:\Users\derec\.openclaw\workspace\compresor\src\app\page.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# Replace flex-1 py-2.5 button patterns with centered versions
replacements = [
    (r'className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition',
     r'className={`flex flex-1 items-center justify-center py-2.5 rounded-lg border text-sm font-medium transition'),
    (r'className={`flex-1 py-2.5 rounded-lg border text-sm font-medium capitalize transition',
     r'className={`flex flex-1 items-center justify-center py-2.5 rounded-lg border text-sm font-medium capitalize transition'),
]

count = 0
for pat, rep in replacements:
    new_content, n = re.subn(pat, rep, content)
    count += n
    content = new_content

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Reemplazos hechos: {count}")
