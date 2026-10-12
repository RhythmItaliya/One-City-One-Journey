"""Build the offline data pack (SQLite + small JSON/GeoJSON) from raw GTFS + OSM.

usage: python3 -I build_pack.py <gtfs_dir> <osm_dir> <out_dir>
"""
import csv, json, math, os, sqlite3, sys
from collections import defaultdict

gtfs, osm, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)


def rows(name):
    with open(os.path.join(gtfs, name + ".txt"), newline="", encoding="utf-8-sig") as f:
        yield from csv.DictReader(f)


def hav(a, b, c, d):
    r = 6371000
    p1, p2 = math.radians(a), math.radians(c)
    dp, dl = p2 - p1, math.radians(d - b)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def secs(t):
    h, m, s = (int(x) for x in t.split(":"))
    return h * 3600 + m * 60 + s


def hhmm(s):
    s %= 86400
    return f"{s // 3600:02d}:{s % 3600 // 60:02d}"


# ---------- SQLite: full GTFS ----------
db_path = os.path.join(out, "transit.sqlite")
if os.path.exists(db_path):
    os.remove(db_path)
db = sqlite3.connect(db_path)
for name in ["agency", "routes", "stops", "trips", "stop_times", "calendar", "areas", "stop_areas"]:
    it = rows(name)
    first = next(it)
    cols = list(first.keys())
    db.execute(f"CREATE TABLE {name} ({', '.join(c + ' TEXT' for c in cols)})")
    q = f"INSERT INTO {name} VALUES ({','.join('?' * len(cols))})"
    db.execute(q, [first[c] for c in cols])
    db.executemany(q, ([r[c] for c in cols] for r in it))
db.executescript("""
CREATE INDEX st_stop ON stop_times(stop_id);
CREATE INDEX st_trip ON stop_times(trip_id);
CREATE INDEX tr_route ON trips(route_id);
""")

routes = {r["route_id"]: r for r in rows("routes")}
stops = {r["stop_id"]: r for r in rows("stops")}
trips = {r["trip_id"]: r for r in rows("trips")}

# ---------- Metro lines from OSM ----------
rel = json.load(open(os.path.join(osm, "routes_raw.json")))["elements"]
mem = {(e["type"], e["id"]): e for e in json.load(open(os.path.join(osm, "route_members.json")))["elements"]}
lines, stations = [], {}
for r in rel:
    if r["type"] != "relation":
        continue
    seq = []
    for m in r["members"]:
        if m["role"] != "stop":
            continue
        e = mem.get((m["type"], m["ref"]))
        if not e:
            continue
        t = e.get("tags", {})
        name = t.get("name:en") or t.get("name")
        lat = e.get("lat") or e.get("center", {}).get("lat")
        lon = e.get("lon") or e.get("center", {}).get("lon")
        if not name or lat is None:
            continue
        seq.append({"name": name, "name_gu": t.get("name:gu", ""), "lat": lat, "lon": lon})
    tags = r["tags"]
    colour = {"#FFFF00": "yellow"}.get(tags.get("colour"), tags.get("colour"))
    lines.append({"osm_id": r["id"], "ref": tags.get("ref"), "name": tags.get("name"), "colour": colour,
                  "from": tags.get("from"), "to": tags.get("to"), "stations": seq})
    for i, s in enumerate(seq):
        st = stations.setdefault(s["name"], {**s, "lines": set()})
        st["lines"].add(colour)

json.dump(lines, open(os.path.join(out, "metro_lines.json"), "w"), ensure_ascii=False, indent=1)

db.execute("CREATE TABLE metro_stations (name TEXT PRIMARY KEY, name_gu TEXT, lat REAL, lon REAL, lines TEXT)")
db.execute("CREATE TABLE metro_line_stops (line TEXT, direction TEXT, seq INTEGER, station TEXT)")
for s in stations.values():
    db.execute("INSERT INTO metro_stations VALUES (?,?,?,?,?)",
               (s["name"], s["name_gu"], s["lat"], s["lon"], ",".join(sorted(s["lines"]))))
for l in lines:
    for i, s in enumerate(l["stations"]):
        db.execute("INSERT INTO metro_line_stops VALUES (?,?,?,?)", (l["colour"], f'{l["from"]} -> {l["to"]}', i, s["name"]))

json.dump({"type": "FeatureCollection", "features": [
    {"type": "Feature", "geometry": {"type": "Point", "coordinates": [s["lon"], s["lat"]]},
     "properties": {"name": n, "name_gu": s["name_gu"], "lines": sorted(s["lines"])}}
    for n, s in sorted(stations.items())]}, open(os.path.join(out, "stations.geojson"), "w"), ensure_ascii=False)

# ---------- Bus stops + routes ----------
stop_routes = defaultdict(set)
route_trips = defaultdict(list)
dep_by_stop = defaultdict(list)
first_stop = {}
for r in rows("stop_times"):
    tr = trips[r["trip_id"]]
    ro = routes[tr["route_id"]]
    stop_routes[r["stop_id"]].add(ro["route_short_name"])
    t = secs(r["departure_time"] or r["arrival_time"])
    dep_by_stop[r["stop_id"]].append((t, ro["route_short_name"], tr["trip_headsign"], ro["agency_id"]))
    if r["stop_sequence"] == "1":
        route_trips[tr["route_id"]].append(t)

json.dump({"type": "FeatureCollection", "features": [
    {"type": "Feature", "geometry": {"type": "Point", "coordinates": [float(s["stop_lon"]), float(s["stop_lat"])]},
     "properties": {"id": sid, "name": s["stop_name"], "agency": sid.split("_")[0], "routes": sorted(stop_routes[sid])}}
    for sid, s in stops.items() if s["stop_lat"]]}, open(os.path.join(out, "bus_stops.geojson"), "w"), ensure_ascii=False)

bus_routes = []
for rid, ro in routes.items():
    ts = sorted(route_trips.get(rid, []))
    bus_routes.append({"id": rid, "agency": ro["agency_id"], "short": ro["route_short_name"], "long": ro["route_long_name"],
                       "trips_per_day": len(ts), "first": hhmm(ts[0]) if ts else None, "last": hhmm(ts[-1]) if ts else None,
                       "avg_headway_min": round((ts[-1] - ts[0]) / 60 / (len(ts) - 1)) if len(ts) > 1 else None})
json.dump(bus_routes, open(os.path.join(out, "bus_routes.json"), "w"), ensure_ascii=False)

# ---------- Station feeders: bus stops within 600 m of each metro station + their departures ----------
feeders = []
for n, s in sorted(stations.items()):
    near = []
    for sid, b in stops.items():
        if not b["stop_lat"]:
            continue
        d = hav(s["lat"], s["lon"], float(b["stop_lat"]), float(b["stop_lon"]))
        if d <= 600:
            deps = sorted(dep_by_stop[sid])
            near.append({"stop_id": sid, "name": b["stop_name"], "agency": sid.split("_")[0], "dist_m": round(d),
                         "walk_min": max(1, round(d / 75)), "lat": float(b["stop_lat"]), "lon": float(b["stop_lon"]),
                         "departures": [[hhmm(t), rt, hs] for t, rt, hs, _ in deps]})
    near.sort(key=lambda x: x["dist_m"])
    feeders.append({"station": n, "lat": s["lat"], "lon": s["lon"], "lines": sorted(s["lines"]), "bus_stops": near})
json.dump(feeders, open(os.path.join(out, "station_feeders.json"), "w"), ensure_ascii=False)

db.commit()
db.close()

print("lines", len(lines), [(l["colour"], len(l["stations"])) for l in lines])
print("stations", len(stations), "bus_stops", len(stops), "bus_routes", len(bus_routes))
print("stations with >=1 bus stop within 600m:", sum(1 for f in feeders if f["bus_stops"]), "/", len(feeders))
print("no bus stop within 600m:", [f["station"] for f in feeders if not f["bus_stops"]])
