#!/usr/bin/env python3
"""Generate high-res track wall PNG using svgwrite + cairosvg (vector-based, no blur)."""
import json, math, sys, os, argparse
import svgwrite
from datetime import datetime

# ── polyline decode ────────────────────────────
def decode_polyline(pl: str):
    coords = []
    i = lat = lng = 0
    while i < len(pl):
        shift = result = 0
        while True:
            b = ord(pl[i]) - 63; i += 1
            result |= (b & 0x1f) << shift; shift += 5
            if b < 0x20: break
        lat += ~(result >> 1) if (result & 1) else (result >> 1)
        shift = result = 0
        while True:
            b = ord(pl[i]) - 63; i += 1
            result |= (b & 0x1f) << shift; shift += 5
            if b < 0x20: break
        lng += ~(result >> 1) if (result & 1) else (result >> 1)
        coords.append((lng / 1e5, lat / 1e5))
    return coords

def get_color(km):
    if km >= 40: return '#a855f7'
    if km >= 20: return '#E31937'
    if km >= 10: return '#eab308'
    if km >= 5:  return '#3b82f6'
    return '#71717a'

def generate_svg(data_path, output_dir, selected_year='all'):
    with open(data_path) as f:
        all_activities = json.load(f)

    if selected_year != 'all':
        activities = [a for a in all_activities if a['start_date_local'].startswith(selected_year)]
    else:
        activities = all_activities

    routes = [a for a in activities if a.get('summary_polyline')]
    routes = routes[::-1]
    if not routes:
        print(f"No routes for {selected_year}")
        return

    # Stats
    dist = sum(a['distance'] for a in activities) / 1000
    max_dist = max((a['distance'] for a in activities), default=0) / 1000
    time_s = sum(
        sum(int(x) * [3600, 60, 1][i] for i, x in enumerate(a.get('moving_time', '0:0:0').split(':')[:3]))
        for a in activities
    )
    time_str = f"{time_s // 3600}h {(time_s % 3600) // 60}m"
    speeds = [a['average_speed'] for a in activities if a.get('average_speed')]
    if speeds:
        avg_s = sum(speeds) / len(speeds)
        pm, ps = int(1000 / avg_s / 60), int(1000 / avg_s % 60)
        pace_str = f"{pm}'{ps:02d}\""
    else:
        pace_str = '-'
    hrs_list = [a['average_heartrate'] for a in activities if a.get('average_heartrate')]
    avg_hr = int(sum(hrs_list) / len(hrs_list)) if hrs_list else 0

    # Layout
    CELL, GAP, COLS, PAD = 44, 8, 12, 40
    rows = math.ceil(len(routes) / COLS)
    TITLE_H = 50
    STATS_H = 75
    W = COLS * (CELL + GAP) - GAP + PAD * 2
    H = TITLE_H + rows * (CELL + GAP) - GAP + PAD * 2 + STATS_H

    dwg = svgwrite.Drawing(size=(W, H))
    dwg.add(dwg.rect(insert=(0, 0), size=(W, H), fill='#0a0a0a'))

    # Title
    title = f"Jingke's {selected_year} Run" if selected_year != 'all' else "Jingke's Run"
    dwg.add(dwg.text(title, insert=(PAD, 30), fill='white', font_size=20, font_family='sans-serif', font_weight='bold', font_style='italic'))

    # Grid
    for idx, r in enumerate(routes):
        pl = r.get('summary_polyline', '')
        if not pl: continue
        coords = decode_polyline(pl)
        if len(coords) < 2: continue
        col, row = idx % COLS, idx // COLS
        x0, y0 = PAD + col * (CELL + GAP), TITLE_H + PAD + row * (CELL + GAP)
        lngs = [c[0] for c in coords]; lats = [c[1] for c in coords]
        minL, maxL = min(lngs), max(lngs)
        minA, maxA = min(lats), max(lats)
        scx = (CELL - 8) / (maxL - minL or 1)
        scy = (CELL - 8) / (maxA - minA or 1)
        scale = min(scx, scy)
        ox = (CELL - (maxL - minL) * scale) / 2
        oy = (CELL - (maxA - minA) * scale) / 2
        color = get_color(r['distance'] / 1000)
        pts = [(round(x0 + ox + (l - minL) * scale, 1), round(y0 + CELL - oy - (a - minA) * scale, 1)) for l, a in coords]
        dwg.add(dwg.polyline(pts, stroke=color, fill='none', stroke_width=1.2, stroke_linecap='round', stroke_linejoin='round'))

    # Legend + Stats
    fy = TITLE_H + PAD + rows * (CELL + GAP) + 15
    # SPECIAL TRACKS legend
    dwg.add(dwg.text("SPECIAL TRACKS", insert=(PAD, fy), fill='#71717a', font_size=10, font_family='sans-serif', font_weight='bold'))
    legends = [
        ('#3b82f6', 'Over 5.0 km'), ('#eab308', 'Over 10.0 km'),
        ('#E31937', 'Over 20.0 km'), ('#a855f7', 'Over 40.0 km'),
    ]
    lx, ly = PAD, fy + 16
    for i, (clr, lbl) in enumerate(legends):
        col = i % 2; row = i // 2
        cx, cy = lx + col * 120, ly + row * 16
        dwg.add(dwg.rect(insert=(cx, cy - 9), size=(10, 10), fill=clr, rx=2))
        dwg.add(dwg.text(lbl, insert=(cx + 14, cy), fill='#a0a0a0', font_size=10, font_family='sans-serif'))

    # STATISTICS — 2 rows, 3 columns, key left / value right, compact
    dwg.add(dwg.text("STATISTICS", insert=(380, fy), fill='#71717a', font_size=10, font_family='sans-serif', font_weight='bold'))
    sd, md, tm, pc, hr = dist, max_dist, time_str, pace_str, avg_hr
    col_w, col_gap = 85, 15
    sx, sy = 380, fy + 16
    items = [
        ("Runs: ", str(len(activities))), ("Dist: ", f"{sd:.2f} km"), ("Time: ", tm),
        ("Max: ", f"{md:.2f} km"), ("Pace: ", pc), ("HR: ", f"{hr} bpm"),
    ]
    for i, (k, v) in enumerate(items):
        col = i % 3; row = i // 3
        x = sx + col * (col_w + col_gap)
        y = sy + row * 16
        dwg.add(dwg.text(k, insert=(x, y), fill='#71717a', font_size=10, font_family='sans-serif'))
        dwg.add(dwg.text(v, insert=(x + col_w, y), fill='white', font_size=10, font_family='sans-serif', text_anchor='end'))

    svg_path = f'{output_dir}/tracks-{selected_year}.svg'
    dwg.saveas(svg_path)
    print(f"Saved {svg_path}")
    return svg_path

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('data', nargs='?', default='src/static/activities.json')
    parser.add_argument('out_dir', nargs='?', default='public/tracks')
    args = parser.parse_args()
    os.makedirs(args.out_dir, exist_ok=True)

    with open(args.data) as f:
        all_data = json.load(f)
    years_set = sorted(set(a['start_date_local'][:4] for a in all_data))

    for y in ['all'] + years_set:
        generate_svg(args.data, args.out_dir, y)

    print("All SVGs generated.")
