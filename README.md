# CitySim

Mobile-first isometric city builder inspired by classic SimCity 2000 (SNES-era mayor loop). Build zones, power grids, water pipes, services, and grow a city in the browser — tuned for iPhone Safari.

**Original art and systems** — no Maxis/EA assets.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL on your phone (same Wi‑Fi) or use desktop Chrome device mode.

```bash
npm run build
npm run preview
```

## Controls (touch)

- **Drag** with Pan tool (or two-finger drag while painting) to move the map
- **Pinch** / mouse wheel to zoom
- **Tap / drag** with a tool to zone, pave roads, string power lines, etc.
- **Long-press** to query a tile
- **Layer** toggles underground (pipes / subway)
- **Budget / Maps / News** open full-screen sheets
- **Save** writes to `localStorage` (also auto-saves when returning to Menu)

## Classic loop

1. Place a power plant and drag power lines
2. Zone Residential / Commercial / Industrial (light or dense)
3. Connect with roads
4. Add water pumps near water + underground pipes for denser growth
5. Fund police/fire/schools; watch demand bars and the newspaper
6. Hit population milestones for reward buildings (City Hall, Stadium, TV, Rocket)

## Scenarios

Training, Megalopolis, Global Warming, Retirement City, and Space — SNES-flavored win conditions on prepared maps.

## Day 2 (not included)

Wrap the same Vite build in **Tauri** or **Electron** for a Mac desktop app. The sim/render core is framework-free canvas + TypeScript.
