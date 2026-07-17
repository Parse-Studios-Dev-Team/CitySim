import type { IsoCamera } from '../render/camera';

export interface PointerHandlers {
  onTap: (x: number, y: number) => void;
  onDragStart: (x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onLongPress: (x: number, y: number) => void;
  onPan: (dx: number, dy: number) => void;
  shouldPaintDrag: () => boolean;
}

export class PointerController {
  private pointers = new Map<number, { x: number; y: number }>();
  private mode: 'none' | 'pan' | 'paint' | 'pinch' = 'none';
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private moved = false;
  private longTimer: number | null = null;
  private pinchDist = 0;

  private el: HTMLElement;
  private camera: IsoCamera;
  private handlers: PointerHandlers;

  constructor(el: HTMLElement, camera: IsoCamera, handlers: PointerHandlers) {
    this.el = el;
    this.camera = camera;
    this.handlers = handlers;
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('pointercancel', this.onUp);
    this.el.removeEventListener('wheel', this.onWheel);
  }

  private onDown = (e: PointerEvent): void => {
    this.el.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 2) {
      this.clearLong();
      this.mode = 'pinch';
      const pts = [...this.pointers.values()];
      this.pinchDist = dist(pts[0], pts[1]);
      return;
    }

    this.startX = e.clientX;
    this.startY = e.clientY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.moved = false;
    this.mode = this.handlers.shouldPaintDrag() ? 'paint' : 'pan';

    if (this.mode === 'paint') {
      const local = this.local(e.clientX, e.clientY);
      this.handlers.onDragStart(local.x, local.y);
    }

    this.longTimer = window.setTimeout(() => {
      if (!this.moved && this.mode !== 'pinch') {
        const local = this.local(this.startX, this.startY);
        this.handlers.onLongPress(local.x, local.y);
      }
    }, 480);
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.mode === 'pinch' && this.pointers.size >= 2) {
      const pts = [...this.pointers.values()];
      const d = dist(pts[0], pts[1]);
      const factor = d / Math.max(1, this.pinchDist);
      this.pinchDist = d;
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      const local = this.local(cx, cy);
      this.camera.zoomAt(factor, local.x, local.y);
      return;
    }

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (Math.hypot(e.clientX - this.startX, e.clientY - this.startY) > 8) {
      this.moved = true;
      this.clearLong();
    }

    if (this.mode === 'pan') {
      this.handlers.onPan(dx, dy);
    } else if (this.mode === 'paint') {
      const local = this.local(e.clientX, e.clientY);
      this.handlers.onDragMove(local.x, local.y);
    }
  };

  private onUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    this.clearLong();

    if (this.mode === 'pinch') {
      if (this.pointers.size < 2) this.mode = 'none';
      return;
    }

    const local = this.local(e.clientX, e.clientY);
    if (this.mode === 'paint') {
      this.handlers.onDragEnd(local.x, local.y);
    } else if (this.mode === 'pan' && !this.moved) {
      this.handlers.onTap(local.x, local.y);
    }
    this.mode = 'none';
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const local = this.local(e.clientX, e.clientY);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    this.camera.zoomAt(factor, local.x, local.y);
  };

  private local(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.el.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private clearLong(): void {
    if (this.longTimer != null) {
      clearTimeout(this.longTimer);
      this.longTimer = null;
    }
  }
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
