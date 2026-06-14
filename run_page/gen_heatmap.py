#!/usr/bin/env python3
"""Generate heatmap SVG from activities data."""
import json, math, os, sys, argparse
import svgwrite

MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

def get_color(km):
    if km >= 42: return '#a855f7'
    if km >= 20: return '#E31937'
    if km >= 10: return '#eab308'
    if km > 0:   return '#3b82f6'
    return '#222'

def generate_heatmap(data_path, output_dir, year):
    with open(data_path) as f:
        all_data = json.load(f)

    activities = [a for a in all_data if a['start_date_local'].startswith(year)]
    marathon_dates = set(a['start_date_local'][:10] for a in activities if a.get('distance', 0) >= 42195)

    dm = {}
    for a in activities:
        d = a['start_date_local'][:10]
        dm[d] = (dm.get(d, 0) + a['distance']) / 1000

    CELL, GAP = 14, 1
    TITLE_H = 38
    LABEL_W = 22
    PAD = 8

    months = []
    total_rows = 0
    for m in range(1, 13):
        mm = f"{m:02d}"
        dim = 0
        if m in [1,3,5,7,8,10,12]: dim = 31
        elif m in [4,6,9,11]: dim = 30
        else: dim = 29 if int(year) % 4 == 0 and (int(year) % 100 != 0 or int(year) % 400 == 0) else 28
        first_day = (int(year) * 365 + sum([31,28,29,31,30,31,30,31,31,30,31,30][:m-1]) + (int(year)-1)//4 - (int(year)-1)//100 + (int(year)-1)//400 + 1) % 7
        weeks = []
        week = [None] * first_day
        for d in range(1, dim+1):
            ds = f"{d:02d}"
            date = f"{year}-{mm}-{ds}"
            km = dm.get(date, 0)
            week.append({'day': d, 'date': date, 'km': km, 'marathon': date in marathon_dates})
            if len(week) == 7 or d == dim:
                while len(week) < 7: week.append(None)
                weeks.append(week)
                week = []
        months.append({'name': MONTHS[m-1], 'weeks': weeks})
        total_rows += len(weeks)

    grid_w = len(DAYS) * (CELL + GAP) - GAP
    W = LABEL_W + grid_w + PAD * 2
    H = TITLE_H + total_rows * (CELL + GAP) + PAD * 2

    dwg = svgwrite.Drawing(size=(W, H))
    # Background matching web dark theme
    dwg.add(dwg.rect(insert=(0, 0), size=(W, H), fill='#0a0a0a', rx=12))
    # Border
    dwg.add(dwg.rect(insert=(0, 0), size=(W, H), fill='none', stroke='#27272a', stroke_width=1, rx=12))

    # Title - positioned higher, away from day headers
    dwg.add(dwg.text(f"L.RUN  Heatmap  {year}", insert=(PAD, 16), fill='white', font_size=11, font_family='sans-serif', font_weight='bold'))

    # Day headers - below title
    grid_x = PAD + LABEL_W
    for di, d in enumerate(DAYS):
        x = grid_x + di * (CELL + GAP)
        dwg.add(dwg.text(d, insert=(x + CELL/2, TITLE_H - 6), fill='#555', font_size=8, font_family='sans-serif', text_anchor='middle'))

    # Cells + month labels
    row_y = TITLE_H
    for month in months:
        # Month label - tight to grid
        dwg.add(dwg.text(month['name'], insert=(grid_x - 3, row_y + CELL/2 + 2), fill='#444', font_size=7, font_family='sans-serif', text_anchor='end'))
        for week in month['weeks']:
            for ci, cell in enumerate(week):
                if cell is None: continue
                x = grid_x + ci * (CELL + GAP)
                color = get_color(cell['km'])
                dwg.add(dwg.rect(insert=(x, row_y), size=(CELL, CELL), fill=color, rx=2))
                if cell['marathon']:
                    dwg.add(dwg.text('🏆', insert=(x + CELL/2, row_y + CELL - 1), fill='white', font_size=6, font_family='sans-serif', text_anchor='middle'))
            row_y += CELL + GAP

    path = f"{output_dir}/heatmap-{year}.svg"
    dwg.saveas(path)
    print(f"Saved {path}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('data', nargs='?', default='src/static/activities.json')
    parser.add_argument('out_dir', nargs='?', default='public/heatmaps')
    args = parser.parse_args()
    os.makedirs(args.out_dir, exist_ok=True)

    with open(args.data) as f:
        data = json.load(f)
    years = sorted(set(a['start_date_local'][:4] for a in data))

    for y in years:
        generate_heatmap(args.data, args.out_dir, y)
    print("All heatmaps generated.")
