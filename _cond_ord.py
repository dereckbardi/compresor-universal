p = r'C:\Users\derec\.openclaw\workspace\compresor\src\app\page.tsx'
with open(p, encoding='utf-8') as f:
    c = f.read()

old = '<p className="text-[10px] text-neutral-600 text-center mt-1">Arrastra para cambiar el orden</p>'
new = '{files.length > 1 && <p className="text-[10px] text-neutral-600 text-center mt-1">Arrastra para cambiar el orden</p>}'
count = c.count(old)
c = c.replace(old, new)

with open(p, 'w', encoding='utf-8') as f:
    f.write(c)
print('reemplazos:', count)
