# Builds app/public/data/bus_patterns.json for the PS-08 journey planner.
# One pattern per (route, direction): the most common stop sequence, its running minutes from a mid-day trip,
# and the start times of every trip that uses it. AMTS + BRTS only (GTSL feed is stale).
import json, sqlite3, sys
from collections import Counter, defaultdict

db = sqlite3.connect(sys.argv[1] if len(sys.argv) > 1 else 'data/pack/transit.sqlite')
out = sys.argv[2] if len(sys.argv) > 2 else 'app/public/data/bus_patterns.json'

def mins(t):
    h, m, s = map(int, t.split(':'))
    return h * 60 + m + s / 60

routes = {r[0]: r[1:] for r in db.execute("select route_id, agency_id, route_short_name, route_long_name from routes where agency_id in ('AMTS','AJL')")}
trips = defaultdict(list)  # trip_id -> [(seq, stop_id, dep)]
for trip_id, stop_id, seq, dep in db.execute(
        "select st.trip_id, st.stop_id, cast(st.stop_sequence as int), st.departure_time from stop_times st join trips t using(trip_id) join routes r using(route_id) where r.agency_id in ('AMTS','AJL')"):
    trips[trip_id].append((seq, stop_id, dep))
meta = {t: (r, d, h) for t, r, d, h in db.execute('select trip_id, route_id, direction_id, trip_headsign from trips')}

groups = defaultdict(list)  # (route, dir, stop tuple) -> [(start, trip_id, deps)]
for tid, rows in trips.items():
    rows.sort()
    try:
        deps = [mins(r[2]) for r in rows]
    except ValueError:
        continue
    if any(b < a or b - a > 90 for a, b in zip(deps, deps[1:])):  # drops the known '71:55' glitch
        continue
    r, d, h = meta[tid]
    groups[(r, d, tuple(r_[1] for r_ in rows))].append((deps[0], tid, deps, h))

best = {}
for (r, d, seq), g in groups.items():
    if (r, d) not in best or len(g) > len(best[(r, d)][1]):
        best[(r, d)] = (seq, g)

patterns = []
for (r, d), (seq, g) in best.items():
    if r not in routes or len(seq) < 2:
        continue
    g.sort()
    mid = g[len(g) // 2][2]
    agency, short, long_ = routes[r]
    patterns.append({'r': short or long_, 'a': 'BRTS' if agency == 'AJL' else 'AMTS', 'h': g[0][3] or long_,
                     's': list(seq), 'c': [round(x - mid[0], 1) for x in mid], 'd': [round(x[0], 1) for x in g]})

used = {s for p in patterns for s in p['s']}
stops = {sid: [name, round(float(lat), 5), round(float(lon), 5)] for sid, name, lat, lon in db.execute('select stop_id, stop_name, stop_lat, stop_lon from stops') if sid in used}
json.dump({'stops': stops, 'patterns': patterns}, open(out, 'w'), separators=(',', ':'))
print(len(patterns), 'patterns,', len(stops), 'stops,', sum(len(p['d']) for p in patterns), 'trips')
