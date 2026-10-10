# One City, One Journey

**Road to DevFest: Metro Hacks (GDG Gandhinagar, 10 Oct 2026) · PS-08 One City, One Journey (City Public Transport track)**

Made by **Rhythm Italiya** · ritaliya2003@gmail.com

This is a journey planner for Ahmedabad. It mixes **Metro + BRTS + AMTS** in one plan. It shows real bus times, every transfer walk, **one fare** for the whole trip and a **fair split of that fare** between the three operators. It runs in the browser and **works with no network** after the first visit.

For a plain-English explanation, see **[ABOUT.md](ABOUT.md)**.
Figma prototype (matches the app): https://www.figma.com/design/wUFmSxo7M7PP4JNWRq3zzD?node-id=19-2, page **"4 One City, One Journey (PS-08)"**. Press Present (▶) to click through it.
First concept deck: https://www.figma.com/design/u4yHDk2MyfrMaMNrn98ZEo/Metro-Hacks-%E2%80%93-PS-08-One-City--One-Journey?node-id=0-1. It was made from an early plan, so its example trip (Gomtipur Darwaja → ISRO), its fare-split rule and some screens (journey card, sort options) are different from the app.

![The planner with the sample trip: Naroda Gam → Shivranjani at 18:30, three options, one fare ₹30](screens/app/app-sample-trip.png)

More screenshots: `screens/app/` (the real app, desktop and phone) and `screens/figma/` (the 6 Figma frames). All 6 frames are also in `figma/prototype.pdf`.

---

## 1. Run it

You need **Node.js 20.19 or newer** (we used Node 22).

```bash
git clone https://github.com/RhythmItaliya/One-City-One-Journey.git
cd One-City-One-Journey
npm install            # or with no internet: npm install --offline (if packages are in your npm cache)
npm run dev            # open http://localhost:5173
```

**Try it:** click **"Try the sample trip: Naroda Gam → Shivranjani at 18:30"**, or type any metro station or bus stop in From and To.
You can also open a trip straight from a link: `http://localhost:5173/?from=Naroda Gam&to=Shivranjani&time=18:30`

### Production build and the offline test
```bash
npm run build          # makes dist/ and a service worker that stores the app + data (about 1.3 MB)
npm run preview        # open the URL it prints
```
1. Open the preview once while online and wait for the planner to load.
2. Turn off Wi-Fi (or use DevTools → Network → Offline, or airplane mode on a phone).
3. Reload the page and plan a trip. It still works.

To try it on a phone on the same Wi-Fi, open the "Network" URL that `npm run dev` or `npm run preview` prints.

---

## 2. What is in this folder

```
One-City-One-Journey/
├── README.md                  ← you are here (setup, how it works, AI used)
├── ABOUT.md                   ← simple-English explanation for judges
├── CLAUDE.md                  ← rules for Claude Code when it works in this folder
├── .claude/skills/
│   ├── one-journey/SKILL.md   ← how the planner and data work (for an AI or a new developer)
│   └── figma-prototype/SKILL.md ← how we made the Figma prototype with an AI agent
├── screens/app/, screens/figma/ ← screenshots of the real app and of the 6 Figma frames
├── figma/                     ← prototype.pdf (the 6 frames) + figma-link.txt
├── index.html, vite.config.js, package.json
├── public/data/               ← the data the app loads (precached for offline)
│   ├── bus_patterns.json      ← AMTS + BRTS timetables, compact (958 route patterns, 3,161 stops, 14,030 trips)
│   ├── station_access.json    ← for each of the 53 metro stations: bus stops within 600 m + walk minutes
│   ├── metro_lines.json       ← 4 metro lines, station order
│   └── metro_facts.json       ← headways, first/last trains, fares (each tagged VERIFIED / LIKELY / ASSUMED)
├── src/
│   ├── features/one-journey/
│   │   ├── plan.js            ← THE PLANNER: routing, fares, fare split
│   │   ├── metro.js           ← metro routing (Dijkstra over the 4 lines) and metro fare estimate
│   │   ├── index.jsx          ← the planner screen
│   │   └── About.jsx          ← "About + PPP" screen
│   ├── components/, lib/      ← small UI kit (Tailwind) and helpers
│   └── App.jsx, Layout.jsx, main.jsx
└── tools/                     ← Python scripts that made public/data (already run)
    ├── build_pack.py          ← raw GTFS + OSM → transit.sqlite + metro_lines.json + station_feeders.json
    ├── build_patterns.py      ← transit.sqlite → bus_patterns.json
    └── slim_access.py         ← station_feeders.json → station_access.json
```

Stack: Vite 8, React 19, Tailwind CSS 4, react-router 7, lucide-react icons, vite-plugin-pwa (offline). There is no server and no login. Everything runs in the browser.

---

## 3. How it works

**Data (prepared on the laptop, then shipped with the app):**
1. `build_pack.py` loads the public AMTS + BRTS GTFS feed into SQLite. It also takes metro lines and stations from OpenStreetMap, and finds the bus stops within 600 m of each station.
2. `build_patterns.py` makes the timetable small enough for a phone (58 MB SQLite → about 1 MB JSON). For each route and direction it keeps:
   - the most common stop order;
   - the running minutes between stops;
   - the start time of every trip.

   Trips with broken times are dropped (times going backwards, or a gap over 90 min).

**Planning a trip (in the browser, in under 70 ms; `plan.js`):**
1. **First part:** walk to a metro station, or take a bus to a stop near a station. The bus is the next real departure from the timetable, found with binary search.
2. **Metro part:** the best route over the 4 lines (Dijkstra, +5 min per line change). Waiting time = half the average headway.
3. **Last part:** walk, or the next real bus from a stop near the exit station.
4. It also checks direct buses (one bus, no metro). It combines the 10 best start stations with the 10 best end stations. It drops trips the metro cannot make: before the first train, after the last train, or outside Violet-line hours.
5. It removes near-copies (the same buses and lines via another station, but not faster or cheaper). It keeps up to 4 options, tagged **Fastest**, **Cheapest** and **Fewest changes** (when they differ).

**One fare and the fair split (bonus):**
- **Separate tickets:** AMTS fare + BRTS fare + metro fare, each by km.
- **One ticket:** the same, minus **₹5 for every change between operators**.
- **The split:**
  - Each operator starts from its own standalone fare.
  - It pays its km-share of the discount.
  - Then **2%** goes to the integrator who runs the one ticket (the PPP partner).
- **Sample (Naroda Gam → Shivranjani, 18:30, option 2):** ₹40 separately → **₹30 with one ticket**. AMTS gets ₹10.31, GMRC ₹10.77 and AJL (BRTS) ₹8.32. The integrator gets ₹0.60.

---

## 4. Data sources and assumptions

| Data | Source | Notes |
|---|---|---|
| AMTS + BRTS (Janmarg) timetables | Community GTFS feed [croyla/amd-gtfs](https://github.com/croyla/amd-gtfs) | Scheduled times, not live GPS. The licence is set by that repo (we did not confirm it). |
| Metro lines, stations, entrances | OpenStreetMap (© OpenStreetMap contributors, ODbL) | 4 lines, 53 stations |
| Metro headways, first/last trains, fares | GMRC public information, copied by hand from our research notes into `metro_facts.json` | Each value is tagged VERIFIED / LIKELY / ASSUMED |

**Assumptions** (they are also shown on the app's About page):
- **Bus fares:**
  - AMTS fare slabs by km: ≤3 km ₹5, ≤5 ₹10, ≤8 ₹15, ≤14 ₹20, ≤20 ₹25, then ₹30.
  - BRTS fare slabs by km: ≤2 ₹5, ≤5 ₹10, ≤8 ₹15, ≤12 ₹20, ≤16 ₹25, ≤20 ₹30, ≤25 ₹35, then ₹40 (BRTS publishes a ₹5–₹50 range).
- **Metro:**
  - The fare is estimated from km, between ₹5 and ₹35.
  - Waiting time is half the average headway (Blue 10, Red 12, Yellow 20, Violet 53 min).
- **Walking:**
  - Speed is 75 m/min.
  - Station ↔ bus stop walks use straight-line distance (stops within 600 m).
  - Other walks use straight line × 1.3, up to 1 km.
- **Our proposals (not existing rules):** the ₹5 discount per change and the 2% clearing fee.
- **Not included:** Gandhinagar GGTSL buses, because they have no public timetable.

### Rebuild the data (optional)
The scripts need the raw GTFS and OSM files, which are not in this folder. Run Python with `-I`:
```bash
python3 -I tools/build_pack.py <gtfs_dir> <osm_dir> <pack_dir>          # makes transit.sqlite, metro_lines.json, station_feeders.json
python3 -I tools/build_patterns.py <pack_dir>/transit.sqlite public/data/bus_patterns.json
python3 -I tools/slim_access.py <pack_dir>/station_feeders.json public/data/station_access.json
```
`metro_facts.json` was written by hand.

---

## 5. AI we used (and how)

**There is no AI model inside the app.** The planner is a normal algorithm (timetable search plus Dijkstra), so it is fast, works offline and always gives the same answer. We did not use Gemini or Gemma in the app.

We used AI as a **coding assistant**:

| Tool | What it did |
|---|---|
| **Claude Code** (Anthropic's coding agent in the terminal), model **Claude Opus 5.5** | Read the problem brief, wrote the data scripts, the planner, the screens and these docs. It also tested the app in a headless browser with the network blocked. |
| **Claude agent + Figma MCP** (Figma's official connector for AI tools) | Built the clickable Figma prototype: 6 frames, with the real numbers from the sample trip. |

A person checked the AI's work by running the app and looking at screenshots. The numbers in this README come from running the real planner.

### The prompts we used (in simple words)
These are short summaries of what we asked, not the exact words.

Before the event (preparing the base):
1. *"Collect the public data for Ahmedabad metro, BRTS and AMTS, and build an offline data pack (SQLite + small JSON files) with a script."* → `build_pack.py`.
2. *"Make a Vite + React + Tailwind app shell that works offline as a PWA."* → the app shell (`src/components`, `src/lib`, `Layout.jsx`).

On the train:

3. *"Read our Metro-Hacks-Participant-Brief.pdf, pick a problem and build it now, fully ready to submit, in under 30 minutes, with a Figma prototype."* → Claude picked PS-08. It then:
   - wrote `build_patterns.py`, `plan.js` and the screen;
   - started one background agent for Figma.
4. Figma agent prompt (short version): *"Add a page 'One City, One Journey (PS-08)' to our Figma file with 6 frames: Problem, Plan, Options, Journey, Fare split, Impact + PPP. Copy the style of the existing pages. Link the buttons so it clicks through. Use the real sample-trip numbers. Check every frame with a screenshot. Don't delete anything."* The full template is in `.claude/skills/figma-prototype/SKILL.md`.
5. *"Make a clean submission folder: the app, a README with how to run it, one simple-English file, the prompts and the skill files, and check all the text."* → this folder.

### Skill files
Skill files are short instruction files that Claude Code reads before it works on a task:
- `.claude/skills/one-journey/SKILL.md`: the data shapes, the planner algorithm and the commands. Use it to change or extend the planner.
- `.claude/skills/figma-prototype/SKILL.md`: how to make a clickable Figma prototype with one background AI agent.
- `CLAUDE.md`: the project rules, e.g. "keep it offline", "use real data and mark assumptions".

---

## 6. Honest limits
- Bus times come from the published timetable. They are not live bus GPS, so a late bus is not shown.
- Bus fare slabs and the metro fare are estimates (see the assumptions above).
- The fare-split shares use the exact km; the table shows km rounded to 0.1.
- The data pipeline and app shell were prepared before the ride. The PS-08 planner, its screens, the Figma page and this folder were built on the train.
