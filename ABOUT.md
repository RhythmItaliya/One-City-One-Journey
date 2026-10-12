# One City, One Journey: explained simply

**Problem PS-08 · City Public Transport · Metro Hacks, 10 Oct 2026**

Made by **Rhythm Italiya** · ritaliya2003@gmail.com

## The problem
Ahmedabad has three kinds of public transport:
- the **Metro** (run by GMRC),
- **BRTS Janmarg** buses (run by AJL),
- **AMTS** city buses.

Each one has its own ticket and its own app. If you want to use a bus, then the metro, then another bus, nothing shows you the whole trip. You do not know:
- which bus to take to reach the metro,
- how far you must walk between them,
- how much the whole trip costs.

So many people give up and use a bike or a car.

## Our idea
**One app, one plan, one fare.**

You type where you start, where you want to go, and when you want to leave. The app shows you the full trip:
1. which bus to take and when it comes (real timetable),
2. how many minutes and metres you walk to the metro,
3. which metro line to take and where to get off,
4. the walk to the next bus, and that bus,
5. **one price** for the whole trip.

It gives you a few choices and marks the **fastest**, the **cheapest** and the one with the **fewest changes**.

## Example
From **Naroda Gam** to **Shivranjani**, leaving at **18:30**:

| Time | Step |
|---|---|
| 18:36 | AMTS bus 66/3 from Naroda Gam to Kalupur |
| | Walk 8 minutes (595 m) to Kalupur Railway Station metro |
| 19:19 | Metro Blue line to Gujarat University |
| | Walk 2 minutes (130 m) to the Memnagar BRTS stop |
| 19:37 | BRTS bus 12U-RL to Shivranjani |
| **19:44** | **You arrive.** |

Total time: 74 minutes. **One fare: ₹30.** Three separate tickets would cost ₹40.

This is option 2 of the 3 choices the app shows. We explain it here because it uses all three operators. The app selects option 1 first (BRTS 8D-NB → Metro → BRTS 9U-VM, 73 minutes, also ₹30), so the app screenshots show that one.

## Fair split of the money (bonus)
If you pay once, how does each operator get its money? Our rule:
1. Each operator starts with the price of its own part of the trip.
2. You get **₹5 off for every change between operators**. Each operator pays a part of this discount, by how many km you rode with it.
3. **2%** goes to the company that runs the one ticket.

For the example above:

| Who | Gets |
|---|---|
| AMTS | ₹10.31 |
| Metro (GMRC) | ₹10.77 |
| BRTS (AJL) | ₹8.32 |
| Ticket company | ₹0.60 |
| **Total** | **₹30** |

## Who pays and who runs it (PPP model)
- **A private company** builds the app and the one ticket (QR or NCMC card). It earns the 2% fee.
- **The operators** sell more trips, because people come back from bikes and cars. They pay the fee only on these shared tickets.
- **The city** (AMC and GMRC) owns the data and decides the fare rules.
- **A pilot is cheap.** The bus timetables are already public, and no new machines are needed.

## Works with no internet
Inside a metro tunnel the phone often has no signal. Our app keeps all the timetables (about 1 MB) on the phone after the first visit. Then it plans trips **with no internet at all**.

## How it works (short)
- We took the public AMTS and BRTS timetables (958 bus routes, counting each direction once, and 14,030 trips) and the 4 metro lines (53 stations).
- We made the data small enough to keep on a phone.
- The app searches for:
  - the next real bus,
  - the best metro route,
  - the walks between them.

  It answers in less than 0.1 seconds.
- It is a simple search, so it is fast and always gives the same answer.

## What is not perfect (honest limits)
- Bus times are from the **timetable**, not live GPS. A late bus is not shown.
- The bus and metro **prices are our estimates**. The official fare tables were not in the data.
- The metro waiting time is an average.
- Walks between a station and a bus stop are measured in a straight line, so the real walk can be a bit longer.
- Gandhinagar city buses are **not included**, because they have no public timetable.
- We prepared the data and the empty app before the event. We built the PS-08 planner, its screens and the Figma prototype on the train.

## Links
- **Run the app:** see [README.md](README.md).
- **In the app:** open the **Figma** page to see the Figma screens (works offline), and the **About + PPP** page for this explanation as short slides.
- **Figma prototype (same as the app):** https://www.figma.com/design/wUFmSxo7M7PP4JNWRq3zzD?node-id=19-2, page "4 One City, One Journey (PS-08)".
- **First idea in Figma (older, a different example trip):** https://www.figma.com/design/u4yHDk2MyfrMaMNrn98ZEo/Metro-Hacks-%E2%80%93-PS-08-One-City--One-Journey?node-id=0-1
- **Pictures:** `screens/app/` (the real app, on a computer and a phone), `screens/figma/` (the 6 Figma screens) and `figma/prototype.pdf`.
