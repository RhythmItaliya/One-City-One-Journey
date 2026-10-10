---
name: figma-prototype
description: How to make a clickable Figma prototype of this app (problem → plan → options → journey → fare split → impact) with one background Claude agent and the Figma MCP. Use when the pitch screens need to be made again or changed.
---

# Clickable Figma prototype with one AI agent

**What it is for:** a short pitch before the live demo, and a backup if the laptop fails.
**What it is not:** a replacement for the working app. Figma needs the internet, and the app does not. Always demo the real app first.

Our prototype: https://www.figma.com/design/wUFmSxo7M7PP4JNWRq3zzD, page "4 One City, One Journey (PS-08)", 6 frames. The short version of the prompt we used is in the README (section 5).

## How to run it
Start ONE background agent (general-purpose) with the prompt below and fill in the `<...>` parts. Keep working on the app while it runs. When it hands back, check every frame yourself with a screenshot, and send it back with exact fixes if anything is wrong.

## Agent prompt template
```
Make a clickable Figma prototype for our pitch, then hand back the link.
Rules: do deep research first (read the Figma skills and look at the existing pages), then do the task. If you get stuck or don't understand, stop and say so rather than guessing. Do NOT start sub-agents. Do NOT delete anything in the file. Check every frame with get_screenshot before you hand back, and expect the lead to send fixes.

File: <Figma file link>. Add a new page "<page name>". Copy the style of the existing pages.
Problem: <one sentence>
Who has it: <user>
Our solution: <one sentence>
The one flow: <step 1> → <step 2> → <step 3> → <result>
Real numbers to show: <e.g. "Naroda Gam → Shivranjani 18:30: AMTS 66/3 → Metro Blue → BRTS 12U-RL, 74 min, one fare ₹30">

Steps:
1. Call create_session with the file key, and pass its sessionId on every later Figma call.
2. Load the skill `figma-use` (it is required before any use_figma call). In ONE use_figma call, make the frames on the new page, left to right, 80 px apart:
   - "Problem" (1280×720): title, the problem sentence, 3 fact chips, a "See our solution" button.
   - "Plan", "Options", "Journey", "Fare split" (390×844 phone screens): the real flow with the real numbers, one main button each.
   - "Impact + PPP" (1280×720): who runs and pays for it, what it saves, honest limits.
   Use auto layout. For a fixed-size frame: set layoutMode first, then resize(w, h), then set primaryAxisSizingMode and counterAxisSizingMode to 'FIXED' (otherwise the frame shrinks to fit its content).
3. In a SECOND use_figma call, link each frame's main button to the next frame:
   await button.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: <nextFrame.id>, navigation: 'NAVIGATE', transition: { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: 0.3 }, resetScrollPosition: true }] }])
   (Use DISSOLVE, not SMART_ANIMATE, because the frames have different sizes.)
   Then set figma.currentPage.flowStartingPoints = [{ nodeId: <first frame id>, name: 'Pitch' }].
4. Take a get_screenshot of each frame. Fix any text that overlaps or is cut off.
5. Hand back: the link, the list of frames, and what is NOT done.
```

## After the agent hands back
- Open the file and press **Present** (▶). It starts at "Pitch". Do this while online and keep the tab open.
- Backup for no internet: select all frames, then Export → PDF, and save it to the laptop.
