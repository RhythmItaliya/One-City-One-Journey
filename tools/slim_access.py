# Builds public/data/station_access.json from the data pack's station_feeders.json.
# Keeps only what the planner needs: each metro station's nearby bus stops with distance and walk minutes.
# usage: python3 -I tools/slim_access.py <station_feeders.json> <station_access.json>
import json, sys

src, out = sys.argv[1:3]
feeders = json.load(open(src, encoding='utf-8'))
slim = [{'station': f['station'],
         'bus_stops': [{k: s[k] for k in ('stop_id', 'name', 'dist_m', 'walk_min')} for s in f['bus_stops']]}
        for f in feeders]
json.dump(slim, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'{out}: {len(slim)} stations, {sum(len(s["bus_stops"]) for s in slim)} stop links')
