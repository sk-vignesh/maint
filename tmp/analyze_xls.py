import xlrd
import sys

wb = xlrd.open_workbook('api-docs/BulkAssign.xls')
print('Sheet count:', len(wb.sheet_names()))
print('Sheet names:', wb.sheet_names())

for i, name in enumerate(wb.sheet_names()):
    sh = wb.sheet_by_index(i)
    print(f'\n{"="*60}')
    print(f'Sheet {i}: "{name}"  ({sh.nrows} rows x {sh.ncols} cols)')
    print('='*60)
    for r in range(sh.nrows):
        row = []
        for c in range(sh.ncols):
            cell = sh.cell(r, c)
            row.append(f'[{c}]={repr(cell.value)}')
        print(f'  Row {r:02d}: {" | ".join(row)}')

print('\nDone.')
sys.stdout.flush()
