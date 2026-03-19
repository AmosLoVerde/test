'use strict';

/* ================================================================
   js/tooltip.js
   ─────────────────────────────────────────────────────────────
   Tooltip del diagramma SVG + hit-testing geometrico per il lens
   NP∩co-NP.

   DIPENDENZE:
     • js/state.js          → _getCtm, _getRoot, _lensEl, _mode, DOM
     • setting_sets/class-definitions.js → CLASS_DEFINITIONS, getStyle

   ESPORTA (globali):
     • _invalidateLensCache()  ← chiamata da transitionToScenario
   ================================================================ */


/* ═══════════════════════════════════════════════════════════════
   LENS CACHE  — invalidata da transitionToScenario
   ─────────────────────────────────────────────────────────────
   Dichiarate qui fuori dall'IIFE così _invalidateLensCache è
   accessibile globalmente da live-renderer.js.
════════════════════════════════════════════════════════════════ */
let _cachedNPEl      = null;
let _cachedCoNPEl    = null;
let _cachedHigherEls = null;
let _lensScenarioKey = null;

function _invalidateLensCache() {
  _cachedNPEl = null; _cachedCoNPEl = null; _cachedHigherEls = null;
  _lensScenarioKey = null;
}


/* ═══════════════════════════════════════════════════════════════
   TOOLTIP IIFE
════════════════════════════════════════════════════════════════ */
(function initTooltip() {
  const tip  = document.getElementById('diagram-tooltip');
  const tLbl = tip.querySelector('.tip-label');
  const tSub = tip.querySelector('.tip-sub');
  let   hideT = null;
  let   curId = null;

  /* Cached SVGPoint — created once, reused on every mousemove.
     svg.createSVGPoint() allocates a new object; this avoids that. */
  let _svgPt = null;

  /* Cached tip dimensions — reading offsetWidth/offsetHeight forces a synchronous
     layout reflow. Dimensions only change when content changes, so we read them
     once per content update and cache until the next change. */
  let _tipW = 220, _tipH = 56, _tipContentKey = '';

  function reposition(x, y) {
    const vw = window.innerWidth, vh = window.innerHeight;
    tip.style.left = (x+14+_tipW>vw ? x-_tipW-10 : x+14) + 'px';
    tip.style.top  = (y+10+_tipH>vh ? y-_tipH-6  : y+10) + 'px';
  }

  function showTip(label, sub, color, x, y) {
    clearTimeout(hideT);
    const key = color + label;
    if (key !== _tipContentKey) {
      _tipContentKey = key;
      tLbl.innerHTML = color
        ? `<span class="tip-dot" style="background:${color};box-shadow:0 0 6px ${color}99"></span>${label}`
        : label;
      tSub.textContent = sub;
      tip.classList.add('visible');
      reposition(x, y);
      // Read actual dimensions once after layout settles, cache for future moves.
      requestAnimationFrame(() => {
        _tipW = tip.offsetWidth  || 220;
        _tipH = tip.offsetHeight || 56;
      });
    } else {
      tip.classList.add('visible');
      reposition(x, y);
    }
  }

  function hideTip() {
    hideT = setTimeout(() => { tip.classList.remove('visible'); curId = null; }, 90);
  }

  /*
   * Geometric hit-test: is screen point (cx,cy) inside a (possibly rotated) ellipse?
   * Uses the diagram-root CTM to convert screen → diagram coordinates.
   */
  function getDiagramPt(svg, clientX, clientY) {
    const ctm = _getCtm();
    if (!ctm) return null;
    if (!_svgPt) _svgPt = svg.createSVGPoint();
    _svgPt.x = clientX; _svgPt.y = clientY;
    return _svgPt.matrixTransform(ctm.inverse());
  }

  function insideEllipse(dpx, dpy, el) {
    const cx  = el.cx?.baseVal.value ?? 0;
    const cy  = el.cy?.baseVal.value ?? 0;
    const rx  = el.rx?.baseVal.value ?? 0;
    const ry  = el.ry?.baseVal.value ?? 0;
    const tf  = el.getAttribute('transform') || '';
    const m   = tf.match(/rotate\(\s*([\d.-]+)/);
    const rot = m ? parseFloat(m[1]) * Math.PI / 180 : 0;
    const dx  = dpx - cx, dy = dpy - cy;
    const dx2 =  dx*Math.cos(rot) + dy*Math.sin(rot);
    const dy2 = -dx*Math.sin(rot) + dy*Math.cos(rot);
    return (dx2*dx2/(rx*rx) + dy2*dy2/(ry*ry)) < 1;
  }

  // Constant array hoisted out of isInLens — avoids re-allocation on every mousemove
  const _lensHigherIds = ['NP-c','co-NP-c','P'];

  function _ensureLensCache(root) {
    if (_cachedNPEl && _cachedNPEl.isConnected && _cachedCoNPEl && _cachedCoNPEl.isConnected) return;
    _cachedNPEl   = root.querySelector('[data-class-id="NP"]:not(.cls-exiting) ellipse');
    _cachedCoNPEl = root.querySelector('[data-class-id="co-NP"]:not(.cls-exiting) ellipse');
    _cachedHigherEls = _lensHigherIds.map(id =>
      root.querySelector(`[data-class-id="${id}"]:not(.cls-exiting) ellipse`)
    );
  }

  function isInLens(svg, clientX, clientY) {
    if (!_lensEl || !_lensEl.isConnected) return false;
    const dp = getDiagramPt(svg, clientX, clientY);
    if (!dp) return false;

    const root = _getRoot();
    _ensureLensCache(root);
    if (!_cachedNPEl || !_cachedCoNPEl) return false;
    if (!insideEllipse(dp.x, dp.y, _cachedNPEl) || !insideEllipse(dp.x, dp.y, _cachedCoNPEl)) return false;

    for (const el of _cachedHigherEls) {
      if (el && insideEllipse(dp.x, dp.y, el)) return false;
    }
    return true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const svg = DOM.diagramSvg || (DOM.diagramSvg = document.getElementById('diagram-svg'));

    svg.addEventListener('mousemove', e => {
      // Suppress tooltip when not in set-view
      if (_mode !== 'set-view') { hideTip(); return; }
      // Geometric lens check first (robust against clip-path pointer-events quirks)
      if (isInLens(svg, e.clientX, e.clientY)) {
        clearTimeout(hideT);
        if (curId !== '__lens') { curId = '__lens'; showTip('NP ∩ co-NP', 'Intersection of NP and co-NP', '#c9a84c', e.clientX, e.clientY); }
        else reposition(e.clientX, e.clientY);
        return;
      }

      // Walk up from actual target to find a labelled group.
      // Hard (open-curve) shapes use invisible hit-overlay elements
      // (data-overlay-for) — check those first before the walk-up.
      let el = e.target;
      const ovEl = el.closest?.('[data-overlay-for]');
      if (ovEl) {
        const cid = ovEl.dataset.overlayFor;
        const cls = CLASS_DEFINITIONS[cid];
        if (cls) {
          clearTimeout(hideT);
          const color = getStyle(cls).stroke;
          if (curId !== cid) { curId = cid; showTip(cls.id, cls.fullName, color, e.clientX, e.clientY); }
          else reposition(e.clientX, e.clientY);
          return;
        }
      }

      while (el && el !== svg) {
        if (el._exiting) { hideTip(); return; }

        if (el.classList?.contains('intersection-group')) {
          // Complete lenses have data-class-id; NP∩co-NP lens does not.
          if (el.dataset?.classId) {
            const cls = CLASS_DEFINITIONS[el.dataset.classId];
            if (cls) {
              clearTimeout(hideT);
              const color = getStyle(cls).stroke;
              if (curId !== cls.id) { curId = cls.id; showTip(cls.id, cls.fullName, color, e.clientX, e.clientY); }
              else reposition(e.clientX, e.clientY);
              return;
            }
          }
          clearTimeout(hideT);
          if (curId !== '__lens') { curId = '__lens'; showTip('NP ∩ co-NP', 'Intersection of NP and co-NP', '#c9a84c', e.clientX, e.clientY); }
          else reposition(e.clientX, e.clientY);
          return;
        }

        if (el.dataset?.classId && !el.classList?.contains('intersection-group')) {
          const cls = CLASS_DEFINITIONS[el.dataset.classId];
          if (cls) {
            clearTimeout(hideT);
            const color = getStyle(cls).stroke;
            if (curId !== cls.id) { curId = cls.id; showTip(cls.id, cls.fullName, color, e.clientX, e.clientY); }
            else reposition(e.clientX, e.clientY);
            return;
          }
        }

        el = el.parentElement;
      }
      hideTip();
    });

    svg.addEventListener('mouseleave', hideTip);
    svg.addEventListener('mousedown',  hideTip);
  });
})();
