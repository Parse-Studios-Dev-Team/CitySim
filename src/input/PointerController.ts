import type { IsoCamera } from '../render/camera';

export interface PointerHandlers {
  onTap: (x: number, y: number) => void;
  onDragStart: (x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onLongPress: (x: number, y: number) => void;
  onPan: (dx: number, dy: number) => void;
  shouldPaintDrag: () => boolean;
  onHover?: (x: number, y: number) => void;
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
    // iOS Safari sometimes delivers touch events more reliably than pointer for canvas
    el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    el.addEventListener('touchend', this.onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('pointercancel', this.onUp);
    this.el.removeEventListener('wheel', this.onWheel);
    this.el.removeEventListener('touchstart', this.onTouchStart);
    this.el.removeEventListener('touchmove', this.onTouchMove);
    this.el.removeEventListener('touchend', this.onTouchEnd);
    this.el.removeEventListener('touchcancel', this.onTouchEnd);
  }

  /** Always use client coordinates — Safari canvas offsetX can be wrong on retina. */
  private localFromEvent(e: PointerEvent | MouseEvent): { x: number; y: number } {
    return this.local(e.clientX, e.clientY);
  }

  private localFromTouch(t: Touch): { x: number; y: number } {
    return this.local(t.clientX, t.clientY);
  }

  private local(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.el.getBoundingClientRect();
    const scaleX = rect.width > 0 ? this.el.clientWidth / rect.width : 1;
    const scaleY = rect.height > 0 ? this.el.clientHeight / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  private onDown = (e: PointerEvent): void => {
    // Prefer pointer path; touch fallback ignores if pointer already active
    if (e.pointerType === 'touch' && this.pointers.size > 0 && !this.pointers.has(e.pointerId)) {
      // allow multi-touch
    }
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      /* older Safari */
    }
    e.preventDefault();
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.beginGesture(e.clientX, e.clientY, this.localFromEvent(e));
  };

  private onTouchStart = (e: TouchEvent): void => {
    // If pointer events are working, skip duplicate touch handling
    if (window.PointerEvent && this.pointers.size > 0) return;
    e.preventDefault();
    if (e.touches.length >= 2) {
      this.clearLong();
      this.mode = 'pinch';
      this.pinchDist = distTouch(e.touches[0], e.touches[1]);
      return;
    }
    const t = e.changedTouches[0];
    this.beginGesture(t.clientX, t.clientY, this.localFromTouch(t));
  };

  private beginGesture(clientX: number, clientY: number, local: { x: number; y: number }): void {
    if (this.pointers.size >= 2) {
      this.clearLong();
      this.mode = 'pinch';
      const pts = [...this.pointers.values()];
      this.pinchDist = dist(pts[0], pts[1]);
      return;
    }

    this.startX = clientX;
    this.startY = clientY;
    this.lastX = clientX;
    this.lastY = clientY;
    this.moved = false;
    this.mode = this.handlers.shouldPaintDrag() ? 'paint' : 'pan';

    if (this.mode === 'paint') {
      this.handlers.onDragStart(local.x, local.y);
    }

    this.longTimer = window.setTimeout(() => {
      if (!this.moved && this.mode !== 'pinch') {
        this.handlers.onLongPress(local.x, local.y);
      }
    }, 500);
  }

  private onMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) {
      if (e.pointerType === 'mouse') {
        this.handlers.onHover?.(this.localFromEvent(e).x, this.localFromEvent(e).y);
      }
      return;
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.preventDefault();

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

    this.moveGesture(e.clientX, e.clientY, this.localFromEvent(e));
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (window.PointerEvent && this.pointers.size > 0) return;
    e.preventDefault();
    if (this.mode === 'pinch' && e.touches.length >= 2) {
      const d = distTouch(e.touches[0], e.touches[1]);
      const factor = d / Math.max(1, this.pinchDist);
      this.pinchDist = d;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const local = this.local(cx, cy);
      this.camera.zoomAt(factor, local.x, local.y);
      return;
    }
    const t = e.touches[0];
    if (!t) return;
    this.moveGesture(t.clientX, t.clientY, this.localFromTouch(t));
  };

  private moveGesture(clientX: number, clientY: number, local: { x: number; y: number }): void {
    const dx = clientX - this.lastX;
    const dy = clientY - this.lastY;
    this.lastX = clientX;
    this.lastY = clientY;

    if (Math.hypot(clientX - this.startX, clientY - this.startY) > 10) {
      this.moved = true;
      this.clearLong();
    }

    if (this.mode === 'pan') {
      this.handlers.onPan(dx, dy);
    } else if (this.mode === 'paint') {
      this.handlers.onDragMove(local.x, local.y);
    }
  }

  private onUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    this.clearLong();
    e.preventDefault();

    if (this.mode === 'pinch') {
      if (this.pointers.size < 2) this.mode = 'none';
      return;
    }

    const local = this.localFromEvent(e);
    this.endGesture(local);
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (window.PointerEvent && this.pointers.size > 0) return;
    e.preventDefault();
    if (this.mode === 'pinch') {
      if (e.touches.length < 2) this.mode = 'none';
      return;
    }
    const t = e.changedTouches[0];
    this.endGesture(this.localFromTouch(t));
  };

  private endGesture(local: { x: number; y: number }): void {
    if (this.mode === 'paint') {
      this.handlers.onDragEnd(local.x, local.y);
    } else if (this.mode === 'pan' && !this.moved) {
      this.handlers.onTap(local.x, local.y);
    }
    this.mode = 'none';
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const local = this.localFromEvent(e);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    this.camera.zoomAt(factor, local.x, local.y);
  };

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

function distTouch(a: Touch, b: Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
