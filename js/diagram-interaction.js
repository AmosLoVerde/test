'use strict';

/* ================================================================
   js/diagram-interaction.js
   ─────────────────────────────────────────────────────────────
   Interazione con il diagramma SVG: hover dimming, hit overlay
   per le classi Hard, routing dei click verso la detail view.

   DIPENDENZE:
     • js/state.js          → _overlayMap, _hoveredGroup, _mode, DOM
     • js/svg-renderer.js   → _buildHoverFillPath
     • setting_sets/class-definitions.js → CLASS_DEFINITIONS

   ESPORTA (globali):
     • _applyHoverDim(hoveredGroup)
     • _clearHoverDim()
     • initDiagramInteraction()
     • _handleDiagramClick(target, clientX, clientY)
     • _rebuildHitOverlay(root, shapes)
   ================================================================ */



/* ================================================================
   HOVER FILTER HELPERS
   ----------------------------------------------------------------
   _addHov / _removeHov centralise cls-hov toggling AND the
   JS-direct style.filter set.

   Why JS-direct instead of CSS ".cls-hov { filter: ... }":
   On Safari, having "transition: filter" in CSS causes WebKit to
   pre-allocate a compositor layer for EVERY element matching
   .cls-group -- even those never hovered. With 11+ groups that
   means 11 GPU layers open permanently. JS-direct bypasses this.

   On Safari, filter is skipped entirely: SVG filter + animated
   geometry attributes = WebKit software rendering per frame (CPU).
   ================================================================ */
function _addHov(g) {
  if (!g) return;
  g.classList.add('cls-hov');
  if (!_isSafari) g.style.filter = _isLight ? _HOV_FILTER_LIGHT : _HOV_FILTER_DARK;
}
function _removeHov(g) {
  if (!g) return;
  g.classList.remove('cls-hov');
  if (!_isSafari) g.style.filter = '';
}


/* ================================================================
   HOVER DIMMING HELPERS
   ----------------------------------------------------------------
   Instead of CSS :hover rules, we set inline opacity via JS.
   This way CSS animations (animation-fill-mode:both) are never
   interrupted -- no flickering on mouse-out.
   ================================================================ */
const _HOV_DIM    = '0.28';
const _HOV_IN_DUR = 220;   // ms — matches CSS transition

/* Pre-built CSS transition string — avoids template literal alloc per element */
const _HOV_TRANS = `opacity ${_HOV_IN_DUR}ms ease`;

function _applyHoverDim(hoveredGroup) {
  const root = _getRoot();
  for (const ch of root.children) {
    if (ch.dataset?.overlayFor) continue;
    if (ch === hoveredGroup) {
      // Ensure hovered group is fully visible (clear any pending dim)
      if (ch._hoverRestoreT) { clearTimeout(ch._hoverRestoreT); ch._hoverRestoreT = null; }
      if (ch.style.opacity !== '') { ch.style.transition = ''; ch.style.opacity = ''; }
      continue;
    }
    if (ch._hoverRestoreT) { clearTimeout(ch._hoverRestoreT); ch._hoverRestoreT = null; }
    // Skip write if already at target — avoids style recalc on unchanged elements
    if (ch.style.opacity === _HOV_DIM) continue;
    ch.style.transition = _HOV_TRANS;
    ch.style.opacity    = _HOV_DIM;
  }
}

function _clearHoverDim() {
  const root = _getRoot();
  for (const ch of root.children) {
    if (ch.dataset?.overlayFor) continue;
    const op = ch.style.opacity;
    if (op === '' || op === '1') continue;
    ch.style.transition = _HOV_TRANS;
    ch.style.opacity    = '1';
    ch._hoverRestoreT = setTimeout(() => {
      ch.style.opacity    = '';
      ch.style.transition = '';
      ch._hoverRestoreT   = null;
    }, _HOV_IN_DUR + 20);
  }
}


/* ═══════════════════════════════════════════════════════════════
   initDiagramInteraction
   ─────────────────────────────────────────────────────────────
   RAF-throttled mousemove: at 1000Hz mice, only one layout/style
   write per animation frame (~16ms). The last event wins.
════════════════════════════════════════════════════════════════ */
function initDiagramInteraction() {
  const svg = DOM.diagramSvg;
  let _mmRafPending = false;
  let _mmLastTarget = null;

  svg.addEventListener('mousemove', e => {
    if (_mode !== 'set-view') return;
    _mmLastTarget = e.target;
    if (_mmRafPending) return;
    _mmRafPending = true;
    requestAnimationFrame(() => {
      _mmRafPending = false;
      const target = _mmLastTarget;
      if (!target) return;

      let g = null;
      const ovEl = target.closest?.('[data-overlay-for]');
      if (ovEl) {
        const root = _getRoot();
        g = _overlayMap?.get(ovEl.dataset.overlayFor) || null;
        if (g && g._exiting) g = null;
      } else {
        g = target.closest?.('.cls-group, .intersection-group') || null;
        if (g && g._exiting) g = null;
      }

      if (g === _hoveredGroup) return;
      if (_hoveredGroup) _removeHov(_hoveredGroup);
      _hoveredGroup = g;
      if (_hoveredGroup) {
        _addHov(_hoveredGroup);
        _applyHoverDim(_hoveredGroup);
        svg.classList.add('has-hover');
      } else {
        _clearHoverDim();
        svg.classList.remove('has-hover');
      }
    });
  });

  svg.addEventListener('mouseleave', () => {
    _mmRafPending = false; _mmLastTarget = null;
    if (_hoveredGroup) { _removeHov(_hoveredGroup); _hoveredGroup = null; }
    _clearHoverDim();
    svg.classList.remove('has-hover');
  });
}


/* ═══════════════════════════════════════════════════════════════
   _handleDiagramClick
   ─────────────────────────────────────────────────────────────
   Route a click on the SVG to the correct classId — passes
   screen coords for zoom target.
════════════════════════════════════════════════════════════════ */
function _handleDiagramClick(target, clientX, clientY) {
  if (_mode !== 'set-view') return;
  const ovEl = target.closest?.('[data-overlay-for]');
  if (ovEl) { enterDetailView(ovEl.dataset.overlayFor, clientX, clientY); return; }

  let el = target;
  while (el && el !== DOM.diagramSvg) {
    if (el._exiting) return;
    if (el.classList?.contains('intersection-group')) {
      // Complete lenses have data-class-id (NP-c, co-NP-c, PSPACE-c).
      // The NP∩co-NP lens does NOT have data-class-id -- use fallback.
      const cid = el.dataset?.classId;
      enterDetailView(cid || 'NP∩co-NP', clientX, clientY);
      return;
    }
    if (el.dataset?.classId && !el.dataset.overlayFor) { enterDetailView(el.dataset.classId, clientX, clientY); return; }
    el = el.parentElement;
  }
}


/* ═══════════════════════════════════════════════════════════════
   _rebuildHitOverlay
   ─────────────────────────────────────────────────────────────
   For open-curve (Hard) classes, inserts invisible hit-area paths
   at the correct z-position — immediately after the Hard group in
   DOM order. Higher-priority elements intercept pointer events
   first, so only clicks NOT intercepted by overlapping ellipses
   will reach these hit areas. Correct, z-aware hit testing.
   ─────────────────────────────────────────────────────────────
   Each hard curve gets:
     1. fillHit   — closed arc (solidPath + Z), pointer-events:all
     2. strokeHit — wide (22px) transparent stroke on arc
     3. tailHit×2 — wide (18px) strokes on dashed tails
════════════════════════════════════════════════════════════════ */
function _rebuildHitOverlay(root, shapes) {
  root.querySelectorAll('[data-overlay-for]').forEach(el => el.remove());
  _overlayMap = new Map();
  // Pre-populate map with all real groups (needed for O(1) hover lookup).
  // Skip complete-lens groups (data-complete-for) -- they are intersection
  // overlays, not hard-curve shape groups; they handle their own click/hover.
  for (const ch of root.children) {
    if (ch.dataset?.classId && !ch.dataset?.overlayFor && !ch.dataset?.completeFor) {
      _overlayMap.set(ch.dataset.classId, ch);
    }
  }

  // Sort Hard shapes by renderPriority so PSPACE-h overlays are inserted
  // after NP-h/co-NP-h overlays, preserving correct stacking
  const hardShapes = shapes
    .filter(s => s.type === 'open-curve')
    .sort((a,b) =>
      (CLASS_DEFINITIONS[a.id]?.renderPriority ?? 0) -
      (CLASS_DEFINITIONS[b.id]?.renderPriority ?? 0)
    );

  for (const shape of hardShapes) {
    const sp = shape.solidPath;
    if (!sp) continue;

    const grp = root.querySelector(`[data-class-id="${shape.id}"]`);
    const anchor = grp ? grp.nextSibling : null;

    const ins = (el) => anchor ? root.insertBefore(el, anchor) : root.appendChild(el);

    const fillOv = svgEl('path', {
      d: _buildHoverFillPath(shape), fill: 'none', stroke: 'none',
      'pointer-events': 'all', 'data-overlay-for': shape.id,
    });
    const arcOv = svgEl('path', {
      d: sp, fill: 'none', stroke: 'transparent',
      'stroke-width': '22', 'stroke-linecap': 'round',
      'pointer-events': 'stroke', 'data-overlay-for': shape.id,
    });
    const tailOvs = [];
    for (const tailPath of [shape.leftTail, shape.rightTail]) {
      if (!tailPath) continue;
      const tv = svgEl('path', {
        d: tailPath, fill: 'none', stroke: 'transparent',
        'stroke-width': '18', 'stroke-linecap': 'round',
        'pointer-events': 'stroke', 'data-overlay-for': shape.id,
      });
      ins(tv); tailOvs.push(tv);
    }
    ins(fillOv); ins(arcOv);
    // Cache refs on the real group for O(1) RAF sync
    if (grp) grp._ovEls = [fillOv, arcOv, ...tailOvs];
    _overlayMap.set(shape.id, grp || null);
  }
}
