import { BUILDINGS } from '../data/buildings';
import { BULLDOZE_COST, STARTING_FUNDS, TERRAIN_COST, TREE_COST, WATER_PLACE_COST } from '../data/costs';
import { PointerController } from '../input/PointerController';
import { CITY_TEMPLATES, buildCity } from '../map/cities';
import { TERRAIN_TEMPLATES, type TerrainId } from '../map/terrain';
import { TileMap } from '../map/TileMap';
import type { OverlayMode, ViewLayer } from '../map/layers';
import {
  exportCity,
  hasSave,
  hydrateFromSave,
  importCity,
  loadCity,
  saveCity,
  type SaveData,
} from '../persist/save';
import { IsoCamera } from '../render/camera';
import { IsoRenderer } from '../render/IsoRenderer';
import { pickTileAtScreen } from '../render/picking';
import { clockLabel } from '../render/sky';
import { Sfx } from '../audio/sfx';
import { createBudget } from '../sim/budget';
import { advise } from '../sim/advisor';
import { moodFace } from '../sim/mood';
import { SCENARIOS, startScenario } from '../sim/scenarios';
import { advanceMonster } from '../sim/disasters';
import { Simulation, type GameSpeed } from '../sim/Simulation';
import {
  TOOLS,
  TOOL_CATEGORIES,
  buildingFootprint,
  buildingForTool,
  getTool,
  roadForTool,
  zoneForTool,
  type ToolDef,
  type ToolId,
} from './tools';

export class GameApp {
  private menuEl: HTMLElement;
  private gameEl: HTMLElement;
  private canvas: HTMLCanvasElement;
  private toastEl: HTMLElement;
  private queryEl: HTMLElement;
  private layerBadge: HTMLElement;
  private hudEls: {
    funds: HTMLElement;
    date: HTMLElement;
    pop: HTMLElement;
    tool: HTMLElement;
    demandR: HTMLElement;
    demandC: HTMLElement;
    demandI: HTMLElement;
    mood: HTMLElement;
    clock: HTMLElement;
  };
  private dockEl: HTMLElement;
  private dockCatsEl: HTMLElement;
  private advisorEl: HTMLElement;
  private advisorText: HTMLElement;
  private tickerEl: HTMLElement;
  private minimap: HTMLCanvasElement;
  private sfx = new Sfx();
  private toolGroup: ToolDef['group'] = 'transit';
  private timeOfDay = 0.38;
  private visualTime = 0;
  private lastAdvice = '';
  private lastDisaster: string | null = null;
  private keysBound = false;
  private sheets: Record<string, HTMLElement>;

  private camera = new IsoCamera();
  private renderer: IsoRenderer;
  private pointer: PointerController | null = null;
  private sim: Simulation | null = null;
  private cityName = 'New City';
  private tool: ToolId = 'road';
  private overlay: OverlayMode = 'none';
  private view: ViewLayer = 'surface';
  private hover: { x: number; y: number } | null = null;
  private dragOrigin: { x: number; y: number } | null = null;
  private dragCurrent: { x: number; y: number } | null = null;
  private painted = new Set<string>();
  private raf = 0;
  private lastTs = 0;
  private running = false;

  constructor(root: HTMLElement) {
    root.innerHTML = buildDom();
    this.menuEl = root.querySelector('#menu-screen')!;
    this.gameEl = root.querySelector('#game-shell')!;
    this.canvas = root.querySelector('#game-canvas')!;
    this.toastEl = root.querySelector('#toast')!;
    this.queryEl = root.querySelector('#query-chip')!;
    this.layerBadge = root.querySelector('#layer-badge')!;
    this.dockEl = root.querySelector('#dock-scroll')!;
    this.dockCatsEl = root.querySelector('#dock-cats')!;
    this.advisorEl = root.querySelector('#advisor')!;
    this.advisorText = root.querySelector('#advisor-text')!;
    this.tickerEl = root.querySelector('#ticker')!;
    this.minimap = root.querySelector('#minimap')!;
    this.hudEls = {
      funds: root.querySelector('#hud-funds')!,
      date: root.querySelector('#hud-date')!,
      pop: root.querySelector('#hud-pop')!,
      tool: root.querySelector('#hud-tool')!,
      demandR: root.querySelector('#demand-r')!,
      demandC: root.querySelector('#demand-c')!,
      demandI: root.querySelector('#demand-i')!,
      mood: root.querySelector('#hud-mood')!,
      clock: root.querySelector('#hud-clock')!,
    };
    this.sheets = {
      budget: root.querySelector('#sheet-budget')!,
      maps: root.querySelector('#sheet-maps')!,
      news: root.querySelector('#sheet-news')!,
      scenarios: root.querySelector('#sheet-scenarios')!,
      terrain: root.querySelector('#sheet-terrain')!,
      cities: root.querySelector('#sheet-cities')!,
    };

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unsupported');
    this.renderer = new IsoRenderer(this.canvas, ctx);

    this.bindMenu();
    this.buildDockCats();
    this.buildDock();
    this.bindHud();
    this.bindSheets();
    this.bindKeys();
    this.renderScenarioList();
    this.renderTerrainList();
    this.renderCityList();

    const loadBtn = root.querySelector('#btn-load') as HTMLButtonElement;
    loadBtn.disabled = !hasSave();

    window.addEventListener('resize', () => this.resize());
  }

  private bindMenu(): void {
    this.menuEl.querySelector('#btn-new')!.addEventListener('click', () => {
      this.openSheet('terrain');
    });
    this.menuEl.querySelector('#btn-cities')!.addEventListener('click', () => {
      this.openSheet('cities');
    });
    this.menuEl.querySelector('#btn-load')!.addEventListener('click', () => {
      const data = loadCity();
      if (!data) {
        this.toast('No save found');
        return;
      }
      this.loadFromSave(data);
    });
    this.menuEl.querySelector('#btn-scenarios')!.addEventListener('click', () => {
      this.openSheet('scenarios');
    });
  }

  private bindHud(): void {
    this.gameEl.querySelectorAll('[data-speed]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = Number((btn as HTMLElement).dataset.speed) as GameSpeed;
        if (!this.sim) return;
        this.sim.speed = speed;
        this.gameEl.querySelectorAll('[data-speed]').forEach((b) => {
          b.classList.toggle('active', Number((b as HTMLElement).dataset.speed) === speed);
        });
      });
    });
    this.gameEl.querySelector('#btn-budget')!.addEventListener('click', () => this.openSheet('budget'));
    this.gameEl.querySelector('#btn-maps')!.addEventListener('click', () => this.openSheet('maps'));
    this.gameEl.querySelector('#btn-news')!.addEventListener('click', () => this.openSheet('news'));
    this.gameEl.querySelector('#btn-save')!.addEventListener('click', () => {
      this.persist();
      this.toast('City saved');
    });
    this.gameEl.querySelector('#btn-menu')!.addEventListener('click', () => {
      this.persist();
      this.stopLoop();
      this.teardownInput();
      this.gameEl.classList.remove('active');
      this.menuEl.classList.remove('hidden');
      const loadBtn = this.menuEl.querySelector('#btn-load') as HTMLButtonElement;
      loadBtn.disabled = !hasSave();
    });
    this.gameEl.querySelector('#btn-sound')!.addEventListener('click', () => {
      const on = this.sfx.toggle();
      (this.gameEl.querySelector('#btn-sound') as HTMLElement).textContent = on ? '🔊' : '🔇';
    });
    this.gameEl.querySelector('#btn-view')!.addEventListener('click', () => {
      this.view = this.view === 'surface' ? 'underground' : 'surface';
      this.layerBadge.textContent =
        this.view === 'underground' ? 'Underground' : this.overlayLabel();
      this.layerBadge.classList.toggle('show', this.view === 'underground' || this.overlay !== 'none');
      this.toast(this.view === 'underground' ? 'Underground view' : 'Surface view');
    });
  }

  private bindSheets(): void {
    Object.entries(this.sheets).forEach(([name, el]) => {
      el.querySelector('.sheet-close')?.addEventListener('click', () => this.closeSheet(name));
      el.addEventListener('click', (e) => {
        if (e.target === el) this.closeSheet(name);
      });
    });

    const budget = this.sheets.budget;
    budget.querySelectorAll('input[data-budget]').forEach((input) => {
      input.addEventListener('input', () => {
        if (!this.sim) return;
        const key = (input as HTMLInputElement).dataset.budget!;
        const val = Number((input as HTMLInputElement).value);
        const label = budget.querySelector(`[data-budget-val="${key}"]`);
        if (label) label.textContent = `${val}`;
        switch (key) {
          case 'taxR':
            this.sim.budget.taxR = val;
            break;
          case 'taxC':
            this.sim.budget.taxC = val;
            break;
          case 'taxI':
            this.sim.budget.taxI = val;
            break;
          case 'fundPolice':
            this.sim.budget.fundPolice = val;
            break;
          case 'fundFire':
            this.sim.budget.fundFire = val;
            break;
          case 'fundHealth':
            this.sim.budget.fundHealth = val;
            break;
          case 'fundEducation':
            this.sim.budget.fundEducation = val;
            break;
          case 'fundTransit':
            this.sim.budget.fundTransit = val;
            break;
          default:
            break;
        }
      });
    });

    budget.querySelectorAll('input[data-ord]').forEach((input) => {
      input.addEventListener('change', () => {
        if (!this.sim) return;
        const key = (input as HTMLInputElement).dataset.ord as keyof typeof this.sim.budget.ordinances;
        this.sim.budget.ordinances[key] = (input as HTMLInputElement).checked;
      });
    });

    const disasterToggle = budget.querySelector('#disaster-toggle') as HTMLInputElement;
    disasterToggle.addEventListener('change', () => {
      if (!this.sim) return;
      this.sim.disasters.enabled = disasterToggle.checked;
    });

    this.sheets.maps.querySelectorAll('[data-overlay]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.overlay as OverlayMode;
        this.overlay = this.overlay === mode ? 'none' : mode;
        this.sheets.maps.querySelectorAll('[data-overlay]').forEach((b) => {
          b.classList.toggle('active', (b as HTMLElement).dataset.overlay === this.overlay);
        });
        this.layerBadge.textContent = this.overlayLabel();
        this.layerBadge.classList.toggle(
          'show',
          this.view === 'underground' || this.overlay !== 'none',
        );
      });
    });

    this.minimap.addEventListener('click', (e) => {
      if (!this.sim) return;
      const rect = this.minimap.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * this.sim.map.size);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * this.sim.map.size);
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      this.camera.centerOn(x, y, w, h, this.sim.map.get(x, y)?.height ?? 2);
    });

    this.sheets.news.querySelector('#btn-export')!.addEventListener('click', () => {
      const data = this.toSaveData();
      if (!data) return;
      const blob = new Blob([exportCity(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.cityName.replace(/\s+/g, '_')}.citysim.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    this.sheets.news.querySelector('#btn-import')!.addEventListener('click', async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        const data = importCity(text);
        if (!data) {
          this.toast('Invalid city file');
          return;
        }
        this.closeSheet('news');
        this.loadFromSave(data);
      };
      input.click();
    });
  }

  private renderScenarioList(): void {
    const list = this.sheets.scenarios.querySelector('.scenario-list')!;
    list.innerHTML = '';
    for (const s of SCENARIOS) {
      const btn = document.createElement('button');
      btn.className = 'btn scenario-card';
      btn.innerHTML = `<strong>${s.title}</strong><span>${s.description}</span>`;
      btn.addEventListener('click', () => {
        this.closeSheet('scenarios');
        this.startScenario(s.id);
      });
      list.appendChild(btn);
    }
  }

  private renderTerrainList(): void {
    const list = this.sheets.terrain.querySelector('.scenario-list')!;
    list.innerHTML = '';
    for (const t of TERRAIN_TEMPLATES) {
      const btn = document.createElement('button');
      btn.className = 'btn scenario-card';
      btn.innerHTML = `<strong>${t.title}</strong><span>${t.description}</span>`;
      btn.addEventListener('click', () => {
        this.closeSheet('terrain');
        const input = this.menuEl.querySelector('#city-name') as HTMLInputElement;
        this.startNewCity(input.value.trim() || t.title, t.id);
      });
      list.appendChild(btn);
    }
  }

  private renderCityList(): void {
    const list = this.sheets.cities.querySelector('.scenario-list')!;
    list.innerHTML = '';
    for (const c of CITY_TEMPLATES) {
      const btn = document.createElement('button');
      btn.className = 'btn scenario-card';
      btn.innerHTML = `<em class="era">${c.era}</em><strong>${c.title}</strong><span>${c.description}</span>`;
      btn.addEventListener('click', () => {
        this.closeSheet('cities');
        this.startCityTemplate(c.id);
      });
      list.appendChild(btn);
    }
  }

  private bindKeys(): void {
    if (this.keysBound) return;
    this.keysBound = true;
    window.addEventListener('keydown', (e) => {
      if (!this.gameEl.classList.contains('active') || !this.sim) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          this.sim.speed = this.sim.speed === 0 ? 1 : 0;
          this.syncSpeedButtons();
          break;
        case '1':
          this.sim.speed = 1;
          this.syncSpeedButtons();
          break;
        case '2':
          this.sim.speed = 2;
          this.syncSpeedButtons();
          break;
        case '3':
          this.sim.speed = 3;
          this.syncSpeedButtons();
          break;
        case 'r':
        case 'R':
          this.setToolGroup('transit');
          this.setTool('road');
          break;
        case 'b':
        case 'B':
          this.setToolGroup('nav');
          this.setTool('bulldoze');
          break;
        case 'q':
        case 'Q':
          this.setToolGroup('nav');
          this.setTool('query');
          break;
        case 'Escape':
          Object.entries(this.sheets).forEach(([name, el]) => {
            if (el.classList.contains('open')) this.closeSheet(name);
          });
          break;
        case 'ArrowLeft':
        case 'a':
          this.camera.pan(28, 0);
          break;
        case 'ArrowRight':
        case 'd':
          this.camera.pan(-28, 0);
          break;
        case 'ArrowUp':
        case 'w':
          this.camera.pan(0, 28);
          break;
        case 'ArrowDown':
        case 's':
          this.camera.pan(0, -28);
          break;
        default:
          break;
      }
    });
  }

  private syncSpeedButtons(): void {
    if (!this.sim) return;
    const speed = this.sim.speed;
    this.gameEl.querySelectorAll('[data-speed]').forEach((b) => {
      b.classList.toggle('active', Number((b as HTMLElement).dataset.speed) === speed);
    });
  }

  private buildDockCats(): void {
    this.dockCatsEl.innerHTML = '';
    for (const cat of TOOL_CATEGORIES) {
      const btn = document.createElement('button');
      btn.className = 'cat-btn';
      btn.dataset.group = cat.id;
      btn.innerHTML = `<span>${cat.glyph}</span>${cat.label}`;
      btn.addEventListener('click', () => {
        this.sfx.play('click');
        this.setToolGroup(cat.id);
      });
      this.dockCatsEl.appendChild(btn);
    }
    this.setToolGroup('transit');
  }

  private setToolGroup(id: ToolDef['group']): void {
    this.toolGroup = id;
    this.dockCatsEl.querySelectorAll('.cat-btn').forEach((b) => {
      b.classList.toggle('active', (b as HTMLElement).dataset.group === id);
    });
    this.buildDock();
  }

  private buildDock(): void {
    this.dockEl.innerHTML = '';
    for (const tool of TOOLS) {
      if (tool.group === 'reward') continue;
      if (tool.group !== this.toolGroup) continue;
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.dataset.tool = tool.id;
      btn.innerHTML = `<span class="glyph">${tool.glyph}</span><span>${tool.label}</span>${
        tool.cost ? `<span class="cost">$${tool.cost}</span>` : ''
      }`;
      btn.addEventListener('click', () => {
        this.sfx.play('click');
        this.setTool(tool.id);
      });
      this.dockEl.appendChild(btn);
    }
    const current = TOOLS.find((t) => t.id === this.tool && t.group === this.toolGroup);
    if (!current) {
      const first = TOOLS.find((t) => t.group === this.toolGroup);
      if (first) this.setTool(first.id);
    } else {
      this.setTool(this.tool);
    }
    this.refreshRewardTools();
  }

  private refreshRewardTools(): void {
    if (!this.sim) return;
    // Remove old reward buttons
    this.dockEl.querySelectorAll('[data-reward]').forEach((el) => el.remove());
    const pending = this.sim.rewards.pending;
    for (const r of pending) {
      const id: ToolId =
        r === 'city_hall'
          ? 'reward_city_hall'
          : r === 'tv_station'
            ? 'reward_tv'
            : r === 'rocket'
              ? 'reward_rocket'
              : 'stadium';
      const tool = getTool(id === 'stadium' ? 'stadium' : id);
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.dataset.tool = tool.id;
      btn.dataset.reward = '1';
      btn.innerHTML = `<span class="glyph">${tool.glyph}</span><span>${tool.label}</span><span class="cost">FREE</span>`;
      btn.addEventListener('click', () => this.setTool(tool.id));
      this.dockEl.appendChild(btn);
    }
  }

  private setTool(id: ToolId): void {
    this.tool = id;
    this.dockEl.querySelectorAll('.tool-btn').forEach((b) => {
      b.classList.toggle('active', (b as HTMLElement).dataset.tool === id);
    });
    const t = getTool(id);
    this.hudEls.tool.textContent = t.cost ? `${t.label} ($${t.cost})` : t.label;
  }

  private startNewCity(name = 'New City', terrain: TerrainId = 'valley'): void {
    const tpl = TERRAIN_TEMPLATES.find((t) => t.id === terrain) ?? TERRAIN_TEMPLATES[0];
    const map = new TileMap(undefined, tpl.id, tpl.seed);
    const budget = createBudget(STARTING_FUNDS);
    this.cityName = name;
    this.sim = new Simulation(map, budget, 1900);
    this.sim.pushNews(
      `Welcome to ${name}, Mayor. Map: ${tpl.title}. Power, roads, then zones — the city will grow.`,
    );
    this.timeOfDay = 0.38;
    this.cameraReady = false;
    this.enterGame();
  }

  private startCityTemplate(id: string): void {
    const tpl = CITY_TEMPLATES.find((c) => c.id === id);
    if (!tpl) return;
    const map = buildCity(tpl);
    const budget = createBudget(tpl.funds);
    this.cityName = tpl.title;
    this.sim = new Simulation(map, budget, tpl.year);
    this.sim.disasters.enabled = false;
    this.sim.rewards.cityHall = true;
    this.sim.rewards.tvStation = true;
    this.sim.rewards.rocket = true;
    this.sim.rewards.stadium = true;
    this.sim.pushNews(
      `Creative mode: ${tpl.title} (${tpl.era}). Treasury is open. Disasters are off. Wander and rebuild.`,
    );
    this.timeOfDay = tpl.id === 'farfuture' ? 0.72 : tpl.id === 'industrial' ? 0.32 : 0.42;
    this.cameraReady = false;
    this.enterGame();
    this.toast(`${tpl.title} — creative sandbox`);
  }

  private startScenario(id: string): void {
    const started = startScenario(id);
    if (!started) return;
    this.cityName = started.runtime.def?.title ?? 'Scenario';
    this.sim = new Simulation(started.map, started.budget, started.year);
    this.sim.scenario = started.runtime;
    this.sim.pushNews(`Scenario: ${started.runtime.def?.title}. ${started.runtime.def?.goal}`);
    this.timeOfDay = 0.38;
    this.cameraReady = false;
    this.enterGame();
  }

  private loadFromSave(data: SaveData): void {
    const h = hydrateFromSave(data);
    this.cityName = h.cityName;
    this.sim = new Simulation(h.map, h.budget, h.year);
    this.sim.month = h.month;
    this.sim.disasters = h.disasters;
    this.sim.rewards = h.rewards;
    this.sim.newspaper = h.newspaper;
    this.sim.scenario = h.scenario;
    this.sim.stepMonth();
    this.cameraReady = false;
    this.enterGame();
    this.toast('City loaded');
  }

  private enterGame(): void {
    this.menuEl.classList.add('hidden');
    Object.values(this.sheets).forEach((s) => s.classList.remove('open'));
    this.gameEl.classList.add('active');
    this.overlay = 'none';
    this.view = 'surface';
    this.layerBadge.classList.remove('show');
    // Layout may not be ready the same frame display flips on iOS — resize twice
    this.layoutAndCenter();
    requestAnimationFrame(() => this.layoutAndCenter());
    window.setTimeout(() => this.layoutAndCenter(), 100);

    this.teardownInput();
    this.pointer = new PointerController(this.canvas, this.camera, {
      shouldPaintDrag: () => this.tool !== 'pan' && this.tool !== 'query',
      onPan: (dx, dy) => this.camera.pan(dx, dy),
      onTap: (x, y) => this.handleTap(x, y),
      onDragStart: (x, y) => this.handleDragStart(x, y),
      onDragMove: (x, y) => this.handleDragMove(x, y),
      onDragEnd: (x, y) => this.handleDragEnd(x, y),
      onLongPress: (x, y) => this.showQuery(x, y),
      onHover: (x, y) => {
        this.hover = this.screenToTile(x, y);
      },
    });
    this.sfx.resume();
    this.renderer.life.reset();
    this.syncBudgetForm();
    this.refreshRewardTools();
    this.updateHud();
    this.startLoop();
  }

  private layoutAndCenter(): void {
    this.resize();
    if (!this.sim) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w < 32 || h < 32) return;
    // Only hard-center when camera has never been placed (or after fresh enter)
    if (!this.cameraReady) {
      this.camera.zoom = 0.9;
      this.camera.x = 0;
      this.camera.y = 0;
      this.camera.centerOn(this.sim.map.size / 2, this.sim.map.size / 2, w, h, 2);
      this.cameraReady = true;
    }
  }

  private cameraReady = false;

  private resize(): void {
    const wrap = this.canvas.parentElement!;
    const w = wrap.clientWidth || window.innerWidth;
    const h = wrap.clientHeight || Math.max(200, window.innerHeight - 160);
    this.renderer.resize(w, h);
  }

  private startLoop(): void {
    // Stop the animation frame only — do NOT dispose map pointer input here.
    // (Previously stopLoop() cleared the PointerController, so map taps did nothing.)
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.running = true;
    this.lastTs = performance.now();
    const loop = (ts: number) => {
      if (!this.running || !this.sim) return;
      const dt = ts - this.lastTs;
      this.lastTs = ts;
      this.visualTime += dt;
      const scale =
        this.sim.speed === 0
          ? 0.000004
          : this.sim.speed === 1
            ? 0.000025
            : this.sim.speed === 2
              ? 0.00005
              : 0.00009;
      this.timeOfDay = (this.timeOfDay + dt * scale) % 1;
      this.hudEls.clock.textContent = clockLabel(this.timeOfDay);
      advanceMonster(this.sim.map, this.sim.disasters, dt);
      const stepped = this.sim.tick(dt);
      if (stepped) {
        this.updateHud();
        this.refreshRewardTools();
        this.refreshAdvisor();
        const d = this.sim.disasters.active;
        if (d !== 'none' && d !== this.lastDisaster) {
          if (d === 'fire') this.sfx.play('fire');
          else if (d === 'monster') this.sfx.play('monster');
        }
        this.lastDisaster = d;
        if (this.sim.scenario.won) {
          this.sfx.play('win');
          this.openSheet('news');
        } else if (this.sim.scenario.lost) {
          this.openSheet('news');
        }
      }
      this.draw(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private teardownInput(): void {
    this.pointer?.dispose();
    this.pointer = null;
  }

  private draw(dt = 16): void {
    if (!this.sim) return;
    const drag =
      this.dragOrigin && this.dragCurrent
        ? {
            x0: this.dragOrigin.x,
            y0: this.dragOrigin.y,
            x1: this.dragCurrent.x,
            y1: this.dragCurrent.y,
          }
        : null;
    const building = buildingForTool(this.tool);
    let ghost: { x: number; y: number; w: number; h: number; ok: boolean } | null = null;
    if (building && this.hover) {
      const fp = buildingFootprint(building);
      ghost = {
        x: this.hover.x,
        y: this.hover.y,
        w: fp.w,
        h: fp.h,
        ok: this.sim.map.canPlaceBuilding(this.hover.x, this.hover.y, fp.w, fp.h),
      };
    }
    const m = this.sim.disasters.monster;
    this.renderer.render(this.sim.map, this.camera, this.overlay, this.view, this.hover, drag, {
      time: this.visualTime,
      dt,
      timeOfDay: this.timeOfDay,
      ghost,
      monster: m ? { px: m.px, py: m.py } : null,
    });
  }

  private screenToTile(sx: number, sy: number): { x: number; y: number } | null {
    if (!this.sim) return null;
    return pickTileAtScreen(this.sim.map, this.camera, sx, sy);
  }

  private handleTap(sx: number, sy: number): void {
    const tile = this.screenToTile(sx, sy);
    this.hover = tile;
    if (!tile) {
      this.toast('Tap the terrain');
      return;
    }
    if (this.tool === 'pan') return;
    if (this.tool === 'query') {
      this.showQueryAtTile(tile.x, tile.y, sx, sy);
      return;
    }
    this.applyTool(tile.x, tile.y);
    this.updateHud();
  }

  private handleDragStart(sx: number, sy: number): void {
    const tile = this.screenToTile(sx, sy);
    this.hover = tile;
    this.painted.clear();
    if (!tile) return;
    this.dragOrigin = tile;
    this.dragCurrent = tile;
    // Zone tools wait for drag end; everything else paints on contact
    if (!zoneForTool(this.tool)) {
      this.applyTool(tile.x, tile.y);
      this.painted.add(`${tile.x},${tile.y}`);
      this.updateHud();
    }
  }

  private handleDragMove(sx: number, sy: number): void {
    const tile = this.screenToTile(sx, sy);
    this.hover = tile;
    if (!tile || !this.dragOrigin) return;
    this.dragCurrent = tile;
    if (zoneForTool(this.tool)) return;
    // Single-tile buildings: don't smear while dragging
    if (!getTool(this.tool).drag) return;
    const key = `${tile.x},${tile.y}`;
    if (this.painted.has(key)) return;
    this.applyTool(tile.x, tile.y);
    this.painted.add(key);
    this.updateHud();
  }

  private handleDragEnd(sx: number, sy: number): void {
    const tile = this.screenToTile(sx, sy);
    if (tile) {
      this.dragCurrent = tile;
      this.hover = tile;
    }
    if (this.dragOrigin && this.dragCurrent && zoneForTool(this.tool)) {
      this.applyZoneRect(this.dragOrigin.x, this.dragOrigin.y, this.dragCurrent.x, this.dragCurrent.y);
    } else if (this.dragOrigin && this.painted.size === 0 && tile && !zoneForTool(this.tool)) {
      // Recover missed contact placement
      this.applyTool(tile.x, tile.y);
    }
    this.dragOrigin = null;
    this.dragCurrent = null;
    this.painted.clear();
    this.updateHud();
  }

  private showQuery(sx: number, sy: number): void {
    const tile = this.screenToTile(sx, sy);
    if (!tile) return;
    this.showQueryAtTile(tile.x, tile.y, sx, sy);
  }

  private showQueryAtTile(x: number, y: number, sx: number, sy: number): void {
    if (!this.sim) return;
    const t = this.sim.map.get(x, y)!;
    const b = BUILDINGS[t.building];
    const issues: string[] = [];
    if (t.zone !== 'none' && !t.powered) issues.push('no power');
    if (t.zone !== 'none' && !t.roadAccess) issues.push('no road');
    if (t.buildingStage >= 2 && !t.watered) issues.push('needs water');
    if (t.onFire) issues.push('ON FIRE');
    const issueLine = issues.length ? `<br/><em>${issues.join(' · ')}</em>` : '';
    this.queryEl.innerHTML = `
      <strong>${x},${y}</strong> · ${t.water ? 'Water' : `Ht ${t.height}`}${t.trees ? ' · Trees' : ''}<br/>
      Zone: ${t.zone}${t.building !== 'none' ? ` · ${b.label} s${t.buildingStage}` : ''}<br/>
      ${t.powered ? '⚡' : '⚡✗'} ${t.watered ? '💧' : '💧✗'} ${t.roadAccess ? '🛣️' : '🛣️✗'}
      ${issueLine}<br/>
      Land ${t.landValue | 0} · Pol ${t.pollution | 0} · Crime ${t.crime | 0}
    `;
    this.queryEl.style.left = `${Math.min(sx + 12, this.canvas.clientWidth - 180)}px`;
    this.queryEl.style.top = `${Math.max(8, sy - 40)}px`;
    this.queryEl.classList.add('show');
    window.setTimeout(() => this.queryEl.classList.remove('show'), 3200);
  }

  private spend(amount: number): boolean {
    if (!this.sim) return false;
    if (amount <= 0) return true;
    if (this.sim.budget.funds < amount) {
      this.toast('Not enough funds');
      this.sfx.play('error');
      return false;
    }
    this.sim.budget.funds -= amount;
    return true;
  }

  private applyZoneRect(x0: number, y0: number, x1: number, y1: number): void {
    if (!this.sim) return;
    const zone = zoneForTool(this.tool);
    if (!zone) return;
    const costEach = getTool(this.tool).cost;
    // Estimate tiles
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    let estimate = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const t = this.sim.map.get(x, y);
        if (t && !t.water && t.building === 'none') estimate++;
      }
    }
    if (!this.spend(estimate * costEach)) return;
    const n = this.sim.map.setZoneRect(x0, y0, x1, y1, zone);
    if (n === 0) {
      this.sim.budget.funds += estimate * costEach;
      this.toast("Can't zone there");
    } else {
      this.sfx.play('zone');
    }
  }

  private applyTool(x: number, y: number): void {
    if (!this.sim) return;
    const map = this.sim.map;
    const tile = map.get(x, y);
    if (!tile) return;

    const tool = this.tool;

    if (tool === 'bulldoze') {
      if (!this.spend(BULLDOZE_COST)) return;
      this.sfx.play('bulldoze');
      this.renderer.burst(x, y, tile.height, 'dust');
      // Clear multi-tile footprints if this is part of one
      if (tile.building !== 'none') {
        const kind = tile.building;
        const def = BUILDINGS[kind];
        // Search nearby origin
        for (let dy = 0; dy < def.height; dy++) {
          for (let dx = 0; dx < def.width; dx++) {
            const ox = x - dx;
            const oy = y - dy;
            const origin = map.get(ox, oy);
            if (origin && origin.building === kind && !origin.footprint) {
              for (let fy = 0; fy < def.height; fy++) {
                for (let fx = 0; fx < def.width; fx++) {
                  const ft = map.get(ox + fx, oy + fy);
                  if (ft && ft.building === kind) {
                    ft.building = 'none';
                    ft.buildingStage = 0;
                    ft.footprint = false;
                    ft.population = 0;
                  }
                }
              }
              tile.zone = 'none';
              tile.road = 'none';
              tile.powerLine = false;
              tile.pipe = false;
              tile.subway = false;
              tile.onFire = false;
              return;
            }
          }
        }
      }
      tile.building = 'none';
      tile.buildingStage = 0;
      tile.footprint = false;
      tile.zone = 'none';
      tile.road = 'none';
      tile.powerLine = false;
      tile.pipe = false;
      tile.subway = false;
      tile.onFire = false;
      tile.population = 0;
      return;
    }

    if (tool === 'raise') {
      if (tile.water) return;
      if (!this.spend(TERRAIN_COST)) return;
      tile.height = Math.min(6, tile.height + 1);
      this.sfx.play('place');
      return;
    }
    if (tool === 'lower') {
      if (!this.spend(TERRAIN_COST)) return;
      tile.height = Math.max(0, tile.height - 1);
      if (tile.height === 0 && Math.random() < 0.15) {
        tile.water = true;
        this.renderer.burst(x, y, 0, 'splash');
      } else {
        this.sfx.play('place');
      }
      return;
    }
    if (tool === 'trees') {
      if (tile.water || tile.building !== 'none') return;
      if (!this.spend(TREE_COST)) return;
      tile.trees = true;
      this.sfx.play('place');
      return;
    }
    if (tool === 'water') {
      if (!this.spend(WATER_PLACE_COST)) return;
      tile.water = true;
      tile.height = 0;
      tile.trees = false;
      tile.zone = 'none';
      tile.building = 'none';
      tile.road = 'none';
      this.renderer.burst(x, y, 0, 'splash');
      this.sfx.play('place');
      return;
    }

    const road = roadForTool(tool);
    if (road) {
      if (!this.spend(getTool(tool).cost)) return;
      if (!map.paintRoad(x, y, road)) {
        this.sim.budget.funds += getTool(tool).cost;
        this.toast("Can't place road");
      } else {
        this.sfx.play('place');
      }
      return;
    }

    if (tool === 'power_line') {
      if (tile.water) return;
      if (!this.spend(getTool(tool).cost)) return;
      tile.powerLine = true;
      this.sfx.play('place');
      return;
    }

    if (tool === 'pipe') {
      if (!this.spend(getTool(tool).cost)) return;
      tile.pipe = true;
      this.sfx.play('place');
      return;
    }

    if (tool === 'subway') {
      if (!this.spend(getTool(tool).cost)) return;
      tile.subway = true;
      this.sfx.play('place');
      return;
    }

    const building = buildingForTool(tool);
    if (building) {
      // Reward gating
      if (building === 'city_hall' && !this.sim.rewards.pending.includes('city_hall')) {
        this.toast('City Hall not unlocked');
        return;
      }
      if (building === 'tv_station' && !this.sim.rewards.pending.includes('tv_station')) {
        this.toast('TV Station not unlocked');
        return;
      }
      if (building === 'rocket' && !this.sim.rewards.pending.includes('rocket')) {
        this.toast('Rocket not unlocked');
        return;
      }
      if (building === 'stadium' && this.sim.rewards.pending.includes('stadium')) {
        // free reward placement
      }

      const fp = buildingFootprint(building);
      const cost = getTool(tool).cost;
      const rewardPending =
        (building === 'city_hall' && this.sim.rewards.pending.includes('city_hall')) ||
        (building === 'tv_station' && this.sim.rewards.pending.includes('tv_station')) ||
        (building === 'rocket' && this.sim.rewards.pending.includes('rocket')) ||
        (building === 'stadium' && this.sim.rewards.pending.includes('stadium'));
      const charge = rewardPending ? 0 : cost;
      if (charge > 0 && !this.spend(charge)) return;
      if (!map.placeBuilding(x, y, building, fp.w, fp.h)) {
        if (charge > 0) this.sim.budget.funds += charge;
        this.toast("Can't place building");
        return;
      }
      if (rewardPending) {
        this.sim.rewards.pending = this.sim.rewards.pending.filter((p) => {
          if (building === 'city_hall') return p !== 'city_hall';
          if (building === 'tv_station') return p !== 'tv_station';
          if (building === 'rocket') return p !== 'rocket';
          if (building === 'stadium') return p !== 'stadium';
          return true;
        });
        this.refreshRewardTools();
        this.sfx.play('reward');
        this.toast(`${BUILDINGS[building].label} placed!`);
      } else {
        this.sfx.play('place');
      }
      this.renderer.burst(x, y, tile.height, 'dust');
    }
  }

  private updateHud(): void {
    if (!this.sim) return;
    this.hudEls.funds.textContent = `$${this.sim.budget.funds.toLocaleString()}`;
    this.hudEls.date.textContent = this.sim.dateLabel();
    this.hudEls.pop.textContent = `${this.sim.stats.population.toLocaleString()} pop`;
    this.hudEls.mood.textContent = `${moodFace(this.sim.stats.happiness)} ${this.sim.stats.happiness}`;
    this.setDemandBar(this.hudEls.demandR, this.sim.demand.r);
    this.setDemandBar(this.hudEls.demandC, this.sim.demand.c);
    this.setDemandBar(this.hudEls.demandI, this.sim.demand.i);
    this.refreshAdvisor();
    this.refreshTicker();
    this.drawMinimap();

    const newsBody = this.sheets.news.querySelector('.news-body')!;
    const lines = this.sim.newspaper.slice(0, 12);
    const banner = this.sim.scenario.won
      ? '<div class="win-banner">Victory</div>'
      : this.sim.scenario.lost
        ? '<div class="lose-banner">Scenario Failed</div>'
        : '';
    newsBody.innerHTML = `${banner}<h3>${this.cityName} Times</h3>${
      lines.length
        ? lines.map((l) => `<p>${l}</p>`).join('')
        : '<p>No headlines yet. Grow your city!</p>'
    }`;

    const summary = this.sheets.budget.querySelector('#budget-summary')!;
    summary.innerHTML = `
      <div class="budget-line"><span>Income (last mo.)</span><strong>$${this.sim.budget.lastIncome}</strong></div>
      <div class="budget-line"><span>Expenses (last mo.)</span><strong>$${this.sim.budget.lastExpenses}</strong></div>
      <div class="budget-line"><span>Power</span><strong>${this.sim.stats.powerUsed}/${this.sim.stats.powerCapacity}</strong>
        <span class="muted">Water ${this.sim.stats.waterUsed}/${this.sim.stats.waterCapacity} · Jobs ${this.sim.stats.jobs} · Approval ${this.sim.stats.happiness}%</span></div>
    `;
  }

  private refreshAdvisor(): void {
    if (!this.sim) return;
    const line = advise(this.sim);
    if (line !== this.lastAdvice) {
      this.lastAdvice = line;
      this.advisorText.textContent = line;
      this.advisorEl.classList.add('show');
    }
  }

  private refreshTicker(): void {
    if (!this.sim) return;
    const head = this.sim.newspaper[0];
    this.tickerEl.textContent = head
      ? `${this.cityName} Times — ${head}`
      : `${this.cityName} Times — Awaiting the first headline.`;
  }

  private drawMinimap(): void {
    if (!this.sim) return;
    const size = this.sim.map.size;
    if (this.minimap.width !== size) {
      this.minimap.width = size;
      this.minimap.height = size;
    }
    const ctx = this.minimap.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(size, size);
    this.sim.map.forEach((t, x, y) => {
      const i = (y * size + x) * 4;
      let r = 40;
      let g = 80;
      let b = 50;
      if (t.water) {
        r = 58;
        g = 124;
        b = 165;
      } else if (t.zone.startsWith('r')) {
        r = 74;
        g = 158;
        b = 92;
      } else if (t.zone.startsWith('c')) {
        r = 74;
        g = 126;
        b = 196;
      } else if (t.zone.startsWith('i')) {
        r = 196;
        g = 160;
        b = 58;
      } else if (t.road !== 'none') {
        r = 90;
        g = 90;
        b = 90;
      } else if (t.building !== 'none') {
        r = 200;
        g = 180;
        b = 80;
      }
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    });
    ctx.putImageData(img, 0, 0);
  }

  private setDemandBar(el: HTMLElement, value: number): void {
    const bar = el.querySelector('.bar') as HTMLElement;
    const mag = Math.min(100, Math.abs(value));
    const pct = (mag / 100) * 50;
    bar.style.height = `${pct}%`;
    bar.classList.toggle('pos', value >= 0);
    bar.classList.toggle('neg', value < 0);
  }

  private syncBudgetForm(): void {
    if (!this.sim) return;
    const b = this.sim.budget;
    const set = (key: string, val: number) => {
      const input = this.sheets.budget.querySelector(
        `input[data-budget="${key}"]`,
      ) as HTMLInputElement | null;
      if (input) input.value = String(val);
      const label = this.sheets.budget.querySelector(`[data-budget-val="${key}"]`);
      if (label) label.textContent = `${val}`;
    };
    set('taxR', b.taxR);
    set('taxC', b.taxC);
    set('taxI', b.taxI);
    set('fundPolice', b.fundPolice);
    set('fundFire', b.fundFire);
    set('fundHealth', b.fundHealth);
    set('fundEducation', b.fundEducation);
    set('fundTransit', b.fundTransit);

    (this.sheets.budget.querySelector('#disaster-toggle') as HTMLInputElement).checked =
      this.sim.disasters.enabled;

    for (const [k, v] of Object.entries(b.ordinances)) {
      const input = this.sheets.budget.querySelector(
        `input[data-ord="${k}"]`,
      ) as HTMLInputElement | null;
      if (input) input.checked = v;
    }
  }

  private openSheet(name: string): void {
    if (name === 'budget') this.syncBudgetForm();
    if (name === 'news') this.updateHud();
    if (name === 'maps') this.drawMinimap();
    this.sheets[name]?.classList.add('open');
  }

  private closeSheet(name: string): void {
    this.sheets[name]?.classList.remove('open');
  }

  private overlayLabel(): string {
    switch (this.overlay) {
      case 'power':
        return 'Map: Power';
      case 'water':
        return 'Map: Water';
      case 'pollution':
        return 'Map: Pollution';
      case 'landValue':
        return 'Map: Land Value';
      case 'crime':
        return 'Map: Crime';
      case 'traffic':
        return 'Map: Traffic';
      case 'none':
        return '';
      default: {
        const _exhaustive: never = this.overlay;
        return _exhaustive;
      }
    }
  }

  private toast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    window.setTimeout(() => this.toastEl.classList.remove('show'), 1800);
  }

  private toSaveData(): SaveData | null {
    if (!this.sim) return null;
    return {
      version: 1,
      cityName: this.cityName,
      year: this.sim.year,
      month: this.sim.month,
      map: this.sim.map.serialize(),
      budget: this.sim.budget,
      disasters: this.sim.disasters,
      rewards: this.sim.rewards,
      newspaper: this.sim.newspaper,
      scenarioId: this.sim.scenario.def?.id ?? null,
      scenarioWon: this.sim.scenario.won,
      scenarioLost: this.sim.scenario.lost,
    };
  }

  private persist(): void {
    const data = this.toSaveData();
    if (data) saveCity(data);
  }
}

function buildDom(): string {
  return `
  <section id="menu-screen" class="screen">
    <div class="menu-skyline" aria-hidden="true"></div>
    <h1 class="brand">CitySim</h1>
    <p class="tagline">Mayor of the isometric age</p>
    <label class="city-name-field">
      <span>City name</span>
      <input id="city-name" type="text" maxlength="24" placeholder="New City" autocomplete="off" />
    </label>
    <div class="menu-actions">
      <button class="btn primary" id="btn-new">New City</button>
      <button class="btn" id="btn-cities">City Templates</button>
      <button class="btn" id="btn-load">Load City</button>
      <button class="btn" id="btn-scenarios">Scenarios</button>
    </div>
    <p class="menu-hint">Pick a map, or wander a finished city in creative mode.</p>
  </section>

  <div id="game-shell" class="game-shell">
    <header class="hud">
      <div class="hud-left">
        <span class="stat">Funds <strong id="hud-funds">$0</strong></span>
        <span class="stat" id="hud-date">Jan 1900</span>
        <span class="stat" id="hud-pop">0 pop</span>
        <span class="stat mood" id="hud-mood">🙂 55</span>
      </div>
      <div class="hud-center">
        <div class="demand-bars">
          <div class="demand-col r" id="demand-r"><span>R</span><div class="bar-track"><div class="bar pos"></div></div></div>
          <div class="demand-col c" id="demand-c"><span>C</span><div class="bar-track"><div class="bar pos"></div></div></div>
          <div class="demand-col i" id="demand-i"><span>I</span><div class="bar-track"><div class="bar pos"></div></div></div>
        </div>
      </div>
      <div class="hud-right">
        <span class="stat" id="hud-clock">9:00 AM</span>
        <span class="stat" id="hud-tool">Road</span>
      </div>
    </header>
    <div id="ticker" class="ticker">${'Awaiting the first headline.'}</div>

    <div class="canvas-wrap">
      <canvas id="game-canvas"></canvas>
      <div id="layer-badge" class="layer-badge"></div>
      <div id="query-chip" class="query-chip"></div>
      <div id="advisor" class="advisor show">
        <div class="advisor-face" aria-hidden="true">🎩</div>
        <p id="advisor-text">Place a power plant, pave roads, then zone R / C / I.</p>
      </div>
      <div id="toast" class="toast"></div>
    </div>

    <footer class="dock">
      <div id="dock-cats" class="dock-cats"></div>
      <div id="dock-scroll" class="dock-scroll"></div>
      <div class="dock-meta">
        <div class="speed-group">
          <button class="btn" data-speed="0">❚❚</button>
          <button class="btn active" data-speed="1">▶</button>
          <button class="btn" data-speed="2">▶▶</button>
          <button class="btn" data-speed="3">▶▶▶</button>
        </div>
        <button class="btn" id="btn-view">Layer</button>
        <button class="btn" id="btn-budget">Budget</button>
        <button class="btn" id="btn-maps">Maps</button>
        <button class="btn" id="btn-news">News</button>
        <button class="btn" id="btn-save">Save</button>
        <button class="btn icon" id="btn-sound" title="Sound">🔊</button>
        <button class="btn ghost" id="btn-menu">Menu</button>
      </div>
    </footer>
  </div>

  <div id="sheet-budget" class="sheet">
    <div class="sheet-panel">
      <div class="sheet-header"><h2>Budget</h2><button class="sheet-close" aria-label="Close">✕</button></div>
      <div class="budget-grid" id="budget-summary"></div>
      ${budgetSlider('taxR', 'Residential Tax %', 0, 20)}
      ${budgetSlider('taxC', 'Commercial Tax %', 0, 20)}
      ${budgetSlider('taxI', 'Industrial Tax %', 0, 20)}
      ${budgetSlider('fundPolice', 'Police Funding', 0, 100)}
      ${budgetSlider('fundFire', 'Fire Funding', 0, 100)}
      ${budgetSlider('fundHealth', 'Health Funding', 0, 100)}
      ${budgetSlider('fundEducation', 'Education Funding', 0, 100)}
      ${budgetSlider('fundTransit', 'Transit Funding', 0, 100)}
      <div class="field-row"><label>Disasters</label><input id="disaster-toggle" type="checkbox" checked /></div>
      <div class="field-row"><label>Sales Tax ordinance</label><input data-ord="salesTax" type="checkbox" /></div>
      <div class="field-row"><label>Legalized Gambling</label><input data-ord="legalizedGambling" type="checkbox" /></div>
      <div class="field-row"><label>Pollution Controls</label><input data-ord="pollutionControl" type="checkbox" /></div>
      <div class="field-row"><label>Neighborhood Watch</label><input data-ord="neighborhoodWatch" type="checkbox" /></div>
    </div>
  </div>

  <div id="sheet-maps" class="sheet">
    <div class="sheet-panel">
      <div class="sheet-header"><h2>Maps</h2><button class="sheet-close" aria-label="Close">✕</button></div>
      <div class="map-toggles">
        <button class="btn" data-overlay="power">Power</button>
        <button class="btn" data-overlay="water">Water</button>
        <button class="btn" data-overlay="pollution">Pollution</button>
        <button class="btn" data-overlay="landValue">Land Value</button>
        <button class="btn" data-overlay="crime">Crime</button>
        <button class="btn" data-overlay="traffic">Traffic</button>
      </div>
      <p class="minimap-label">Tap the map to jump the camera</p>
      <canvas id="minimap" class="minimap" width="64" height="64"></canvas>
    </div>
  </div>

  <div id="sheet-news" class="sheet">
    <div class="sheet-panel">
      <div class="sheet-header"><h2>Newspaper</h2><button class="sheet-close" aria-label="Close">✕</button></div>
      <div class="news-body"></div>
      <div class="menu-actions" style="margin-top:1rem">
        <button class="btn" id="btn-export">Export City JSON</button>
        <button class="btn" id="btn-import">Import City JSON</button>
      </div>
    </div>
  </div>

  <div id="sheet-scenarios" class="sheet">
    <div class="sheet-panel">
      <div class="sheet-header"><h2>Scenarios</h2><button class="sheet-close" aria-label="Close">✕</button></div>
      <div class="scenario-list"></div>
    </div>
  </div>

  <div id="sheet-terrain" class="sheet">
    <div class="sheet-panel">
      <div class="sheet-header"><h2>Choose a Map</h2><button class="sheet-close" aria-label="Close">✕</button></div>
      <p class="sheet-lead">Blank land. Same mayor rules — pick the terrain you want to tame.</p>
      <div class="scenario-list"></div>
    </div>
  </div>

  <div id="sheet-cities" class="sheet">
    <div class="sheet-panel">
      <div class="sheet-header"><h2>City Templates</h2><button class="sheet-close" aria-label="Close">✕</button></div>
      <p class="sheet-lead">Finished cities with an open treasury. Disasters off. Rebuild, experiment, get ideas.</p>
      <div class="scenario-list"></div>
    </div>
  </div>
  `;
}

function budgetSlider(key: string, label: string, min: number, max: number): string {
  const def = key.startsWith('tax') ? 7 : 100;
  return `<div class="field-row">
    <label>${label}</label>
    <input data-budget="${key}" type="range" min="${min}" max="${max}" value="${def}" />
    <span class="val" data-budget-val="${key}">${def}</span>
  </div>`;
}
