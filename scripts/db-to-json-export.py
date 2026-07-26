#!/usr/bin/env python3
"""Export SQLite data.db to src/static/activities.json with proper time format conversion.

CRITICAL: SQLite stores moving_time/elapsed_time as "1970-01-01 00:34:32.000000"
but SVG generation scripts expect bare "00:34:32". This script handles the conversion.
"""

import sqlite3, json, os, re

DB_PATH = "run_page/data.db"
OUTPUT_PATH = "src/static/activities.json"


def extract_time(val):
    """Convert '1970-01-01 00:34:32.000000' -> '00:34:32'"""
    if not val:
        return "0:00:00"
    m = re.search(r'(\d{2}:\d{2}:\d{2})', str(val))
    return m.group(1) if m else "0:00:00"


def main():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        SELECT run_id, name, distance, moving_time, elapsed_time,
               type, start_date, start_date_local, location_country,
               summary_polyline, average_heartrate, average_speed
        FROM activities
        ORDER BY start_date_local
    """)
    rows = c.fetchall()
    conn.close()

    activities = []
    for r in rows:
        activities.append({
            "run_id": r[0],
            "name": r[1],
            "distance": r[2],
            "moving_time": extract_time(r[3]),
            "elapsed_time": extract_time(r[4]),
            "type": r[5],
            "start_date": r[6],
            "start_date_local": r[7],
            "location_country": r[8],
            "summary_polyline": r[9],
            "average_heartrate": r[10],
            "average_speed": r[11],
        })

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(activities, f, ensure_ascii=False, indent=2)

    print(f"Exported {len(activities)} activities to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
