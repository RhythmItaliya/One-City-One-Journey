---
name: one-journey
description: How the One City, One Journey planner works (data files, algorithm, fare split, commands). Use before changing plan.js, the screen, or the data in public/data/.
---

# One City, One Journey: planner guide

Work this way: read the code and data first, then change things. Check by running the app with the sample trip, plus a few more trips. If you don't understand something, stop and say so rather than guessing. Mark any made-up number as ASSUMED.

## Files
- `src/features/one-journey/plan.js`: the planner (pure JS, no React). Exports:
  - `buildIndex(bp, feeders, lines)`
  - `plan(ix, facts, from, to, t0)`
  - `fareSplit(legs)`
  - `busFare(agency, km)`
  - the constants `WALK_M_PER_MIN`, `METRO_HEADWAY`, `TRANSFER_DISCOUNT`, `CLEARING_FEE`, `OPERATORS`
- `src/features/one-journey/metro.js`: metro helpers:
  - `findRoute` (Dijkstra over the lines, `CHANGE_MIN` = 5 per change)
  - `estimateFare(km)`
  - `timeline(route, depart, facts)`: clock times, plus a status `yes | warn | no` from the first/last train of each line (estimated per station) and the Violet-line hours
  - `toMin` / `toHHMM`
- `src/features/one-journey/index.jsx`: the screen:
  - place pickers and a time input;
  - option cards and the step timeline (transfer walks in amber);
  - the fare-split bar and table.

  You can prefill it from the URL: `/?from=<place name>&to=<place name>&time=HH:MM`.
- `src/features/one-journey/About.jsx`: problem, PPP model, honest limits.

## Data (`public/data/`, all precached for offline)
- `bus_patterns.json`:
  ```
  { stops: { stop_id: [name, lat, lon] },
    patterns: [ { r: route, a: 'AMTS'|'BRTS', h: headsign, s: [stop_id…], c: [cumulative minutes…], d: [trip start minutes, sorted] } ] }
  ```
  - There is one pattern per route and direction: the most common stop order.
  - `c` comes from the median trip.
  - The departure from stop i is `d[k] + c[i]`. Find the next one with binary search.
- `station_access.json`: `[ { station, bus_stops: [ { stop_id, name, dist_m, walk_min } ] } ]`, with stops within 600 m (straight line, 75 m/min).
- `metro_lines.json`: `[ { colour, from, to, stations: [ { name, lat, lon } ] } ]` (OpenStreetMap).
- `metro_facts.json`: headways, first/last trains and fares. Each value has a tag: VERIFIED / LIKELY / ASSUMED.

## Algorithm (`plan`)
1. **Places** are metro stations (`M:<name>`) plus bus stops grouped by name (`B:<name>`).
2. **Direct bus:** any pattern that serves both places, in order. Use the next departure.
3. **Access** (`toStations`):
   - walk to any station within 1 km (straight line × 1.3);
   - or ride the next bus to a stop next to a station, then add the station walk.
   - Keep the 10 stations you can reach earliest.
4. **Egress** (`fromStations`): the same in reverse. Keep the 10 stations with the lowest estimated time to the destination.
5. For each station pair:
   - metro route (`findRoute`);
   - wait = half the headway (`METRO_HEADWAY`);
   - `timeline()` — drop the pair if its status is `no`;
   - then the last walk or the next real bus.
6. **Totals:**
   - De-duplicate by leg signature.
   - Drop near-copies: the same buses and lines (`rides`) via other stations, unless faster or cheaper.
   - Sort by minutes, then fare, then walking.
   - Keep the top 3 plus the cheapest.
   - Tags: Fastest, Cheapest, and Fewest changes (only when the options differ in changes).

## Fares and split (`fareSplit`)
- **Bus fares:**
  - AMTS slabs by km: 3/5/8/14/20 → ₹5/10/15/20/25, then ₹30.
  - BRTS slabs by km: 2/5/8/12/16/20/25 → ₹5…35, then ₹40.
  - Both are ASSUMED.
- **Metro fare:** `estimateFare(km)`, ₹5–35 (ASSUMED slabs).
- **The split:**
  - Each operator's standalone fare = the sum of its legs.
  - Discount = ₹5 × changes between operators. It is capped, so one ticket never costs less than the largest single operator fare.
  - Share = standalone − discount × (operator km ÷ total km).
  - Fee = 2% of the share, which goes to the integrator. Net = share − fee.

## Check it works
1. Run `npm run dev`, then click "Try the sample trip".
   - Expected for Naroda Gam → Shivranjani at 18:30:
     - 73 min, ₹30 (BRTS 8D-NB → Metro Blue → BRTS 9U-VM);
     - option 2: AMTS 66/3 → Metro Blue → BRTS 12U-RL, 74 min, ₹30.
   - Option 2's split is AMTS ₹10.31 / GMRC ₹10.77 / AJL ₹8.32, fee ₹0.60.
2. Also try:
   - Nikol Gam → ISKCON Cross Road (09:00)
   - Odhav Terminus → Gujarat University (08:15)
   - Chandkheda Gam → Maninagar (17:45)
   - ISKCON Cross Road → Motera Stadium (12:00)
   - Thaltej Gam → Vastral Gam at 23:30: expect "No journey found" (last train gone).
3. Run `npm run build && npm run preview`, open the page once, turn the network off, reload and plan again.

## Rebuild data
```
python3 -I tools/build_patterns.py <transit.sqlite> public/data/bus_patterns.json
python3 -I tools/slim_access.py <station_feeders.json> public/data/station_access.json
```
`transit.sqlite` and `station_feeders.json` come from `tools/build_pack.py <gtfs_dir> <osm_dir> <out_dir>`.
