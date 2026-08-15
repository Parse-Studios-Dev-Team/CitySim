# CitySim

Mobile-first isometric city builder inspired by classic SimCity 2000 (SNES-era mayor loop). Build zones, power grids, water pipes, services, and grow a city in the browser — tuned for iPhone Safari.

**Original art and systems** — no Maxis/EA assets.

## Play (one tap)

Open this link on your phone — no install, no terminal:

**[▶ Play CitySim](https://parse-studios-dev-team.github.io/CitySim/)**

Tap **New City** and start zoning. (Safari → Share → Add to Home Screen for fullscreen.)

Streets match the calendar: packed dirt and wagons in 1901, automobiles after 1908, painted lanes in the 1920s. The site is GitHub Pages and republishes when `main` updates.

## Run locally (optional, developers)

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## Controls (touch)

- **Drag** with Pan tool (or two-finger drag while painting) to move the map
- **Pinch** / mouse wheel to zoom
- **Tap / drag** with a tool to zone, pave roads, string power lines, etc.
- **Long-press** to query a tile
- **Tool categories** (Zone / Roads / Power / Water / Civic / Land) keep the dock short
- **Layer** toggles underground (pipes / subway)
- **Budget / Maps / News** open full-screen sheets — Maps includes a tap-to-jump minimap
- **Save** writes to `localStorage` (also auto-saves when returning to Menu)

Desktop extras: `WASD` / arrows pan, `1`–`3` speed, `Space` pause, `R` road, `B` bulldoze, `Q` query.

## Classic loop

1. Place a power plant and drag power lines
2. Zone Residential / Commercial / Industrial (light or dense)
3. Connect with roads
4. Add water pumps near water + underground pipes for denser growth
5. Fund police/fire/schools; watch demand bars, approval, and the newspaper
6. Hit population milestones for reward buildings (City Hall, Stadium, TV, Rocket)

Power and water **capacity now matter** — overbuild the grid and you'll get blackouts. Seaports boost industry; airports boost commercial demand. Keep citizens happy with parks, schools, and sane taxes.

## Scenarios

Training, Megalopolis, Global Warming, Retirement City, and Space — SNES-flavored win conditions on prepared maps.

## Day 2 (not included)

Wrap the same Vite build in **Tauri** or **Electron** for a Mac desktop app. The sim/render core is framework-free canvas + TypeScript.
