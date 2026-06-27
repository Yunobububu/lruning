#!/usr/bin/env python3
"""Generate Running Life grid SVG from activities data."""
import json, os, sys, argparse
import svgwrite

START_YEAR, START_MONTH = 1991, 5
TOTAL_MONTHS, COLS = 1008, 24
ROWS = TOTAL_MONTHS // COLS

def get_color(km):
    if km >= 300: return '#a855f7'
    if km >= 200: return '#E31937'
    if km >= 100: return '#eab308'
    if km > 0:    return '#3b82f6'
    return '#222'

def generate_runlife(data_path, output_path):
    with open(data_path) as f:
        activities = json.load(f)

    month_map = {}
    for a in activities:
        key = a['start_date_local'][:7]
        month_map[key] = month_map.get(key, 0) + a['distance'] / 1000

    months = []
    for i in range(TOTAL_MONTHS):
        total_months = START_YEAR * 12 + (START_MONTH - 1) + i
        y, m = divmod(total_months, 12)
        m += 1
        key = f"{y}-{m:02d}"
        months.append({'key': key, 'km': month_map.get(key, 0)})

    active = sum(1 for m in months if m['km'] > 0)

    CELL, GAP = 7, 8
    PAD = 16
    TITLE_H = 50
    LEGEND_H = 36
    grid_w = COLS * (CELL + GAP) - GAP
    grid_h = ROWS * (CELL + GAP) - GAP
    W = grid_w + PAD * 2
    H = TITLE_H + grid_h + PAD * 2 + LEGEND_H

    dwg = svgwrite.Drawing(size=(W, H))
    dwg.add(dwg.rect(insert=(0, 0), size=(W, H), fill='#0a0a0a', rx=12))
    dwg.add(dwg.rect(insert=(0, 0), size=(W, H), fill='none', stroke='#27272a', stroke_width=1, rx=12))

    # Title + stats above grid (like collapsed overlay position)
    cx = W / 2
    dwg.add(dwg.text('RUNNING', insert=(cx - 22, TITLE_H/2 - 4), fill='white', font_size=22, font_family='sans-serif', font_weight='bold', font_style='italic', text_anchor='middle'))
    dwg.add(dwg.text('.LIFE', insert=(cx + 32, TITLE_H/2 - 4), fill='#E31937', font_size=22, font_family='sans-serif', font_weight='bold', font_style='italic', text_anchor='middle'))
    pct = f"{(active / TOTAL_MONTHS * 100):.1f}"
    dwg.add(dwg.text(f'{active} / {TOTAL_MONTHS} months · {pct}%', insert=(cx, TITLE_H/2 + 16), fill='#a0a0a0', font_size=13, font_family='sans-serif', text_anchor='middle'))

    # Grid
    for r in range(ROWS):
        for c in range(COLS):
            idx = r * COLS + c
            if idx >= TOTAL_MONTHS: break
            cell = months[idx]
            x = PAD + c * (CELL + GAP)
            y = TITLE_H + PAD + r * (CELL + GAP)
            color = get_color(cell['km'])
            dwg.add(dwg.rect(insert=(x, y), size=(CELL, CELL), fill=color))

    # Legend at bottom
    legend_y = TITLE_H + grid_h + PAD * 2 + 14
    items = [('#3b82f6', '0-100'), ('#eab308', '100-200'), ('#E31937', '200-300'), ('#a855f7', '300+')]
    total_w = len(items) * 80
    sx = (W - total_w) / 2
    for i, (clr, lbl) in enumerate(items):
        x = sx + i * 80
        dwg.add(dwg.rect(insert=(x, legend_y - 7), size=(8, 8), fill=clr))
        dwg.add(dwg.text(lbl, insert=(x + 12, legend_y), fill='#a0a0a0', font_size=9, font_family='sans-serif'))

    dwg.saveas(output_path)
    print(f"Saved {output_path}")

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('data', nargs='?', default='src/static/activities.json')
    p.add_argument('out', nargs='?', default='public/running-life.svg')
    args = p.parse_args()
    os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)
    generate_runlife(args.data, args.out)
