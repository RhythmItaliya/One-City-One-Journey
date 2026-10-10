# One City, One Journey: rules for Claude Code

This is a journey planner for Ahmedabad (Metro + BRTS + AMTS, one fare, a fair split). It was built for Metro Hacks, PS-08.
Read `.claude/skills/one-journey/SKILL.md` before you change the planner or the data.

## Rules
1. **It must work offline.** Everything runs in the browser. Do not add a server, CDN, web font or remote image. The data in `public/data/` is precached by the service worker (`vite.config.js`).
2. **Use real data.** Timetables come from `public/data/`. If you make up a number (a fare, a speed, a wait), mark it "ASSUMED" in the code comment and on the About page.
3. **Keep it small.** No login, accounts or settings. Add no new npm packages unless they work offline.
4. **Check by running it.** Use `npm run dev`, click the sample trip and look at the result. Before you hand back, run `npm run build && npm run preview` and test with the network off.
5. **Be honest.** If you are not sure, or something is not checked, say so. Do not guess.

## Commands
- `npm run dev`: dev server on http://localhost:5173
- `npm run build && npm run preview`: production build and the offline test
- `python3 -I tools/build_patterns.py <transit.sqlite> public/data/bus_patterns.json`: rebuild the bus timetable (see the README for the full data steps)
