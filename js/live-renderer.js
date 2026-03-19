'use strict';

/* ================================================================
   js/live-renderer.js
   ─────────────────────────────────────────────────────────────
   Renderer live: transizioni tra scenari, costruzione sidebar,
   reset, tema, toggle.

   DIPENDENZE:
     • js/state.js               → DOM, svgEl, easeIO, _lensEl, ecc.
     • js/dependency-resolver.js → resolveImplicitDependencies, scenarioKey
     • js/geometry.js            → SCENARIOS
     • js/svg-renderer.js        → buildSVGDefs, buildShapeGroup, _buildHoverFillPath
     • js/diagram-interaction.js → _rebuildHitOverlay (chiamata in transitionToScenario)
     • js/zoom-pan.js            → scheduleFit, animateFit, sceneBBox
     • setting_sets/class-definitions.js → CLASS_DEFINITIONS, CLASS_GROUPS,
                                            appState, getStyle, _isLight

   ESPORTA (globali):
     • syncCheckboxes, exitGroup, rafMorph, morphGroup
     • insertAtZOrder, insertLensAtZOrder, updateLens
     • transitionToScenario, executeUpdate, scheduleUpdate
     • buildSidebar, resetAll
     • updateToggleIcon, updateThemeIcon, setTheme, toggleSidebar
   ================================================================ */


/* ═══════════════════════════════════════════════════════════════
   32 ms DEBOUNCE
════════════════════════════════════════════════════════════════ */
let _updateTimer = null;

function scheduleUpdate() {
  // Chrome 95+: scheduler.postTask() yields to input events between tasks,
  // preventing jank when rapidly clicking multiple checkboxes.
  // All other browsers: plain setTimeout.
  clearTimeout(_updateTimer);
  _updateTimer = _schedule(executeUpdate, 32);
}


/* ═══════════════════════════════════════════════════════════════
   CHECKBOX SYNC
════════════════════════════════════════════════════════════════ */
/* ── Visual-only checkbox sync ──
   prevApplied: snapshot PRIMA dell'update — usato per diff e aggiornare
   solo i checkbox il cui stato è davvero cambiato (O(changed) vs O(all)). */
function syncCheckboxes(applied, prevApplied) {
  if (DOM.chkMap) {
    for (const [id, {chk, item}] of DOM.chkMap) {
      const isOn  = applied.has(id);
      // Skip DOM write when state unchanged — cheapest possible path
      if (prevApplied && prevApplied.has(id) === isOn) continue;
      chk.checked = isOn;
      item.classList.toggle('checked', isOn);
    }
  }
  // Keep download button in sync with selection state
  const empty = applied.size === 0;
  const dlBtn = DOM.dlBtn || (DOM.dlBtn = document.getElementById('btn-download'));
  if (dlBtn) { dlBtn.classList.toggle('dl-disabled', empty); dlBtn.disabled = empty; }
  const dlMobile = DOM.dlMobile || (DOM.dlMobile = document.getElementById('btn-mobile-download'));
  if (dlMobile) { dlMobile.classList.toggle('dl-disabled', empty); dlMobile.disabled = empty; }
}


/* ═══════════════════════════════════════════════════════════════
   EXIT GROUP
════════════════════════════════════════════════════════════════ */
/* ── Exit a group: animate out then remove from DOM ── */
function exitGroup(g) {
  if (g._exiting) return;
  g._exiting = true;
  if (g._geoRaf)   { cancelAnimationFrame(g._geoRaf);   g._geoRaf   = null; }
  if (g._curveRaf) { cancelAnimationFrame(g._curveRaf); g._curveRaf = null; }
  g.classList.remove('cls-entering');
  g.classList.add('cls-exiting');
  setTimeout(() => g.remove(), 280);
}


/* ═══════════════════════════════════════════════════════════════
   rafMorph
════════════════════════════════════════════════════════════════ */
/*
 * rafMorph(el, toVals, dur, rafKey, owner)
 * Animate SVG attributes from current to target values via RAF.
 * Reliable cross-browser; works for cx/cy/rx/ry on SVG elements.
 */
function rafMorph(el, toVals, dur, rafKey, owner) {
  const host = owner || el;
  if (host[rafKey]) cancelAnimationFrame(host[rafKey]);
  const from   = {};
  for (const k of Object.keys(toVals)) from[k] = parseFloat(el.getAttribute(k)) || 0;
  const start  = performance.now();
  const tick   = now => {
    const t = Math.min(1, (now - start) / dur);
    const e = easeIO(t);
    for (const k of Object.keys(toVals))
      el.setAttribute(k, (from[k] + (toVals[k] - from[k]) * e).toFixed(2));
    host[rafKey] = t < 1 ? requestAnimationFrame(tick) : null;
  };
  host[rafKey] = requestAnimationFrame(tick);
}


/* ═══════════════════════════════════════════════════════════════
   morphGroup
════════════════════════════════════════════════════════════════ */
/* ── Smooth geometry morph for an existing group ── */
function morphGroup(g, shape, allShapes) {
  // Ellipse shapes in SCENARIO_DECLARATIONS have no 'type' field (undefined).
  // Open-curves have type:'open-curve'. Use !== to distinguish correctly.
  if (shape.type !== 'open-curve') {
    // Use cached refs (set at build time) — avoids querySelector on every morph call.
    const el  = g._ellipseEl  || g.querySelector('ellipse');
    const txt = g._textEl     || g.querySelector('text');
    const targetRot = shape.rotation || 0;

    if (el) {
      if (g._geoRaf) { cancelAnimationFrame(g._geoRaf); g._geoRaf = null; }
      // SVGAnimatedLength.baseVal.value: direct numeric access, no string parse/serialize.
      const fromCx  = el.cx.baseVal.value;
      const fromCy  = el.cy.baseVal.value;
      const fromRx  = el.rx.baseVal.value;
      const fromRy  = el.ry.baseVal.value;
      const curTf   = el.getAttribute('transform') || '';
      const rotM    = curTf.match(/rotate\(\s*([^,\s)]+)/);
      const fromRot = rotM ? parseFloat(rotM[1]) : 0;
      const start   = performance.now();
      // Duration comes from state.js: per-engine (_MORPH_DUR).
      const dur = _MORPH_DUR;

      // Per-engine filter strategy during geometry animation:
      //   Blink/Skia and Gecko/WebRender: feDropShadow is GPU-accelerated even
      //   during RAF geometry changes -- no need to pause. Skipping the
      //   getAttribute/removeAttribute round-trip saves 2 DOM mutations per morph.
      //   Safari/WebKit: no filter attribute is set (see buildEllipseGroup +
      //   _FILTER_CFG=null), so savedFilter is always null and this is a no-op.
      //   Result: filter stays visible during animation on Blink/Gecko (better UX),
      //   and the overhead on Safari is zero.
      const savedFilter = _FILTER_CFG ? el.getAttribute('filter') : null;
      // (No removeAttribute here: Blink/Gecko handle filter during animation fine)

        const tick = now => {
        const t   = Math.min(1, (now - start) / dur);
        const e   = easeIO(t);
        const cx  = fromCx + (shape.cx - fromCx) * e;
        const cy  = fromCy + (shape.cy - fromCy) * e;
        const rx  = fromRx + (shape.rx - fromRx) * e;
        const ry  = fromRy + (shape.ry - fromRy) * e;
        const rot = fromRot + (targetRot - fromRot) * e;

        // Chrome/Firefox: direct SVGAnimatedLength.baseVal.value assignment --
        // avoids string allocation and triggers no CSS recalc.
        // Safari: setAttribute is required -- baseVal.value mutation on an
        // animated SVG element bypasses the compositor and forces a software
        // render pass. setAttribute goes through the correct invalidation path.
        if (_isSafari) {
          el.setAttribute('cx', cx.toFixed(2));
          el.setAttribute('cy', cy.toFixed(2));
          el.setAttribute('rx', rx.toFixed(2));
          el.setAttribute('ry', ry.toFixed(2));
        } else {
          el.cx.baseVal.value = cx;
          el.cy.baseVal.value = cy;
          el.rx.baseVal.value = rx;
          el.ry.baseVal.value = ry;
        }
        if (Math.abs(rot) > 0.01 || Math.abs(fromRot) > 0.01)
          el.setAttribute('transform', `rotate(${rot.toFixed(2)},${cx.toFixed(2)},${cy.toFixed(2)})`);
        else
          el.removeAttribute('transform');
        // Fused label update -- no extra RAF
        if (g._txtEl && g._txtTarget) {
          g._txtEl.setAttribute('x', (g._txtStart.x + (g._txtTarget.x - g._txtStart.x)*e).toFixed(1));
          g._txtEl.setAttribute('y', (g._txtStart.y + (g._txtTarget.y - g._txtStart.y)*e).toFixed(1));
        }
        if (t < 1) {
          g._geoRaf = requestAnimationFrame(tick);
        } else {
          g._geoRaf = null;
          // Restore filter if it was paused (Safari path -- currently no-op
          // since Safari has no filter, but kept for future safety).
          if (savedFilter && _isSafari) el.setAttribute('filter', savedFilter);
        }
      };
      g._geoRaf = requestAnimationFrame(tick);
    }
    if (txt) {
      // Label position comes from scenario descriptor (lx/ly/la).
      const tlx = shape.lx ?? shape.cx;
      const tly = shape.ly ?? shape.cy;
      const tla = shape.la ?? 'middle';
      txt.setAttribute('text-anchor', tla);
      txt.setAttribute('font-size', '15');
      g._txtTarget = { x: tlx, y: tly };
      g._txtStart  = { x: parseFloat(txt.getAttribute('x')) || tlx,
                       y: parseFloat(txt.getAttribute('y')) || tly };
      g._txtEl     = txt;
    }
  } else {
    // open-curve: smooth interpolation of all 12 Bezier + tail parameters via RAF.
    // Use cached path refs — avoids 3 querySelectorAll calls on every morph.
    const p0  = g._solidArc  || g.querySelector('path[data-role="solid-arc"]')  || null;
    const p1  = g._leftTail  || g.querySelector('path[data-role="left-tail"]')  || null;
    const p2  = g._rightTail || g.querySelector('path[data-role="right-tail"]') || null;
    const txt = g._textEl    || g.querySelector('text');

    const solidPath   = shape.solidPath;
    const leftTail    = shape.leftTail;
    const rightTail   = shape.rightTail;
    const labelX      = shape.labelX;
    const labelY      = shape.labelY;
    const labelAnchor = shape.labelAnchor;

    // No change → update label only, skip animation
    if (p0 && p1 && p2
      && p0.getAttribute('d') === solidPath
      && p1.getAttribute('d') === leftTail
      && p2.getAttribute('d') === rightTail) {
      if (txt) {
        txt.setAttribute('x', labelX); txt.setAttribute('y', labelY);
        txt.setAttribute('text-anchor', labelAnchor);
        txt.setAttribute('font-size', '15');
      }
      return;
    }

    /*
     * Smooth bowl morph: interpolate all 8 Bezier + 4 tail params.
     * Regex: M x0 y0 C cx0 yc1 cx1 yc2 x1 y1
     */
    const BOWL_RE = /^M\s*([\d.-]+)\s+([\d.-]+)\s+C\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)$/;
    const TAIL_RE = /^M\s*([\d.-]+)\s+([\d.-]+)\s+L\s*([\d.-]+)\s+([\d.-]+)$/;

    const curSolid = p0 ? p0.getAttribute('d') : '';
    const ms = curSolid.match(BOWL_RE);
    const ns = solidPath.match(BOWL_RE);
    const ml = p1 ? p1.getAttribute('d').match(TAIL_RE) : null;
    const nl = leftTail.match(TAIL_RE);
    const mr = p2 ? p2.getAttribute('d').match(TAIL_RE) : null;
    const nr = rightTail.match(TAIL_RE);

    const canSmooth = ms && ns && ml && nl && mr && nr;

    // ── Fast path: use pre-parsed numeric arrays (_arc8/_lt4/_rt4) ──────────
    const fromArc = (g._curShape?._arc8) || (ms ? [+ms[1],+ms[2],+ms[3],+ms[4],+ms[5],+ms[6],+ms[7],+ms[8]] : null);
    const toArc   = shape._arc8 || (ns ? [+ns[1],+ns[2],+ns[3],+ns[4],+ns[5],+ns[6],+ns[7],+ns[8]] : null);
    const fromLT  = (g._curShape?._lt4)  || (ml ? [+ml[1],+ml[2],+ml[3],+ml[4]] : null);
    const toLT    = shape._lt4  || (nl ? [+nl[1],+nl[2],+nl[3],+nl[4]] : null);
    const fromRT  = (g._curShape?._rt4)  || (mr ? [+mr[1],+mr[2],+mr[3],+mr[4]] : null);
    const toRT    = shape._rt4  || (nr ? [+nr[1],+nr[2],+nr[3],+nr[4]] : null);

    if (fromArc && toArc && fromLT && toLT && fromRT && toRT) {
      if (g._curveRaf) cancelAnimationFrame(g._curveRaf);

      const [fx0,fy0,fcx0,fyc1,fcx1,fyc2,fx1,fy1] = fromArc;
      const [fl_x0,fl_y0,fl_xt,fl_yt] = fromLT;
      const [fr_x0,fr_y0,fr_xt,fr_yt] = fromRT;
      const [tx0,ty0,tcx0,tyc1,tcx1,tyc2,tx1,ty1] = toArc;
      const [tl_x0,tl_y0,tl_xt,tl_yt] = toLT;
      const [tr_x0,tr_y0,tr_xt,tr_yt] = toRT;
      const lblXStart = txt ? (parseFloat(txt.getAttribute('x')) || labelX) : 0;
      const lblYStart = txt ? (parseFloat(txt.getAttribute('y')) || labelY) : 0;

      const dur = _MORPH_DUR;
      const start = performance.now();
      const lerp  = (a, b, e) => (a + (b-a)*e).toFixed(2);

      const tickCurve = now => {
        const t = Math.min(1, (now - start) / dur);
        const e = easeIO(t);
        const newSolid = `M ${lerp(fx0,tx0,e)} ${lerp(fy0,ty0,e)} C ${lerp(fcx0,tcx0,e)} ${lerp(fyc1,tyc1,e)} ${lerp(fcx1,tcx1,e)} ${lerp(fyc2,tyc2,e)} ${lerp(fx1,tx1,e)} ${lerp(fy1,ty1,e)}`;
        const newLeft  = `M ${lerp(fl_x0,tl_x0,e)} ${lerp(fl_y0,tl_y0,e)} L ${lerp(fl_xt,tl_xt,e)} ${lerp(fl_yt,tl_yt,e)}`;
        const newRight = `M ${lerp(fr_x0,tr_x0,e)} ${lerp(fr_y0,tr_y0,e)} L ${lerp(fr_xt,tr_xt,e)} ${lerp(fr_yt,tr_yt,e)}`;
        if (p0) p0.setAttribute('d', newSolid);
        if (p1) p1.setAttribute('d', newLeft);
        if (p2) p2.setAttribute('d', newRight);
        // Compute hover-fill once and reuse for both hover-fill and overlay — avoids
        // calling _buildHoverFillPath twice per frame (each call does string parsing).
        if (g._hoverFill || (g._ovEls && g._ovEls[0])) {
          const newFill = _buildHoverFillPath({solidPath:newSolid,leftTail:newLeft,rightTail:newRight});
          if (g._hoverFill) g._hoverFill.setAttribute('d', newFill);
          if (g._ovEls) {
            const oe = g._ovEls;
            if (oe[0]) oe[0].setAttribute('d', newFill);
            if (oe[1]) oe[1].setAttribute('d', newSolid);
            if (oe[2]) oe[2].setAttribute('d', newLeft);
            if (oe[3]) oe[3].setAttribute('d', newRight);
          }
        }
        if (txt) {
          txt.setAttribute('x', lerp(lblXStart, labelX, e));
          txt.setAttribute('y', lerp(lblYStart, labelY, e));
        }
        g._curveRaf = t < 1 ? requestAnimationFrame(tickCurve) : null;
      };
      if (txt) {
        txt.setAttribute('text-anchor', labelAnchor);
        txt.setAttribute('font-size', '15');
      }
      g._curveRaf = requestAnimationFrame(tickCurve);
      g._curShape = shape;  // cache for next morph
    } else {
      // Fallback: cross-fade when paths aren't parseable bowls
      g.style.transition = 'opacity .22s ease';
      g.style.opacity    = '0';
      setTimeout(() => {
        if (p0) p0.setAttribute('d', solidPath);
        if (p1) p1.setAttribute('d', leftTail);
        if (p2) p2.setAttribute('d', rightTail);
        if (txt) {
          txt.setAttribute('x', labelX); txt.setAttribute('y', labelY);
          txt.setAttribute('text-anchor', labelAnchor);
          txt.setAttribute('font-size', '15');
        }
        _syncExtraLabel(g, shape);
        g.style.transition = 'opacity .22s ease';
        g.style.opacity    = '1';
      }, 240);
    }
    _syncExtraLabel(g, shape);
  }
}


/* ── _syncExtraLabel ─────────────────────────────────────────── */
/* Sync or remove the extra-label text in an open-curve group. */
function _syncExtraLabel(g, shape) {
  const existing = g.querySelector('[data-role="extra-label"]');
  if (shape.extraLabel) {
    const el = existing || (() => {
      const el = svgEl('text', {
        'data-role': 'extra-label', 'dominant-baseline': 'middle',
        'font-family': 'EB Garamond, Georgia, serif', 'font-style': 'italic',
        'font-size': '13', 'font-weight': '700', 'pointer-events': 'none',
      });
      g.appendChild(el); return el;
    })();
    el.setAttribute('x', shape.extraLabel.x);
    el.setAttribute('y', shape.extraLabel.y);
    el.setAttribute('text-anchor', shape.extraLabel.anchor || 'middle');
    el.setAttribute('fill', getStyle(CLASS_DEFINITIONS[shape.id]).stroke);
    el.setAttribute('fill-opacity', '0.78');
    el.textContent = shape.extraLabel.text;
  } else if (existing) {
    existing.remove();
  }
}


/* ═══════════════════════════════════════════════════════════════
   Z-ORDER INSERTION
════════════════════════════════════════════════════════════════ */
/*
 * insertAtZOrder(root, g, id)
 * Place new group at the correct SVG z-position without moving existing groups.
 * Lower renderPriority = earlier in DOM (behind).
 * Higher renderPriority = later (in front, e.g. P=30 is always on top).
 */
function insertAtZOrder(root, g, id) {
  const pri = CLASS_DEFINITIONS[id]?.renderPriority ?? 50;
  // Iterate direct children — skip exiting groups AND hit-overlay elements
  for (const sib of root.children) {
    if (sib._exiting) continue;
    if (sib.dataset?.overlayFor) continue;   // skip hit-overlay elements
    const sibPri = CLASS_DEFINITIONS[sib.dataset?.classId]?.renderPriority ?? 50;
    if (sibPri > pri) { root.insertBefore(g, sib); return; }
  }
  // Insert before the first overlay element so real groups always precede overlays
  const firstOverlay = root.querySelector('[data-overlay-for]');
  if (firstOverlay) root.insertBefore(g, firstOverlay);
  else root.appendChild(g);
}

/* ── Insert lens BEFORE P so P is always on top for mouse events ── */
function insertLensAtZOrder(root, lensEl) {
  const P = root.querySelector('[data-class-id="P"]:not(.cls-exiting)');
  if (P) root.insertBefore(lensEl, P);
  else   root.appendChild(lensEl);
}


/* ═══════════════════════════════════════════════════════════════
   updateLens  — NP∩co-NP intersection overlay
════════════════════════════════════════════════════════════════ */
/*
 * Uses SVG clipPath approach: the intersection zone is rendered as an NP-shaped
 * ellipse (with its rotation) clipped to the co-NP region. This handles both
 * axis-aligned and rotated ellipses exactly. The clipPath is stored in #svg-defs
 * and updated live in sync with the ongoing RAF morphs via lensAnimTick.
 */
function updateLens(root, shapes, hasNewEntrants) {
  const np   = shapes.find(s => s.id === 'NP'    && s.type !== 'open-curve');
  const conp = shapes.find(s => s.id === 'co-NP' && s.type !== 'open-curve');

  if (_lensRebuildT) { clearTimeout(_lensRebuildT); _lensRebuildT = null; }
  if (_lensRafId)   { cancelAnimationFrame(_lensRafId); _lensRafId = null; }

  if (!np || !conp) {
    if (_lensEl) {
      const dying = _lensEl; _lensEl = null; _lensNPKey = null;
      dying.style.transition = 'opacity .22s ease';
      dying.style.opacity    = '0';
      setTimeout(() => dying.remove(), 250);
    }
    return;
  }

  const npRot   = np.rotation   || 0;
  const conpRot = conp.rotation || 0;
  const npKey   = `${np.cx},${np.cy},${np.rx},${np.ry},${npRot}`;

  const lensStroke = _isLight ? '#9095FB' : '#c9a84c';
  const lensFill   = _isLight ? '#9095FB' : '#8a7530';
  const lensLblClr = _isLight ? '#3D3DB8' : '#e0c060';
  const lensFillOp = _isLight ? '0.18'    : '0.11';
  const lensStrkOp = _isLight ? '0.50'    : '0.28';

  /* Sync an ellipse-based clipPath in svg-defs */
  const _defsEl = DOM.svgDefs || (DOM.svgDefs = document.getElementById('svg-defs'));
  function syncClipEl(id, cx, cy, rx, ry, rot) {
    let cp = _defsEl.querySelector(`#${id}`);
    if (!cp) { cp = svgEl('clipPath', { id }); _defsEl.appendChild(cp); }
    let cel = cp.querySelector('ellipse');
    if (!cel) { cel = svgEl('ellipse'); cp.appendChild(cel); }
    cel.setAttribute('cx', cx); cel.setAttribute('cy', cy);
    cel.setAttribute('rx', rx); cel.setAttribute('ry', ry);
    if (rot) cel.setAttribute('transform', `rotate(${rot},${cx},${cy})`);
    else     cel.removeAttribute('transform');
  }

  function computeLabelY() {
    if (np.rotation) return Math.round((np.cy + conp.cy) / 2 - 50);
    const pSh = shapes.find(s => s.id === 'P' && s.type !== 'open-curve');
    if (pSh) return Math.round(np.cy - np.ry * 0.55);
    return Math.round((np.cy + conp.cy) / 2);
  }

  function buildLensEl() {
    syncClipEl('lens-np-clip',   np.cx,   np.cy,   np.rx,   np.ry,   npRot);
    syncClipEl('lens-conp-clip', conp.cx, conp.cy, conp.rx, conp.ry, conpRot);

    const g    = svgEl('g', { class:'intersection-group' });
    const gNP  = svgEl('g', { 'clip-path':'url(#lens-np-clip)' });
    const gCNP = svgEl('g', { 'clip-path':'url(#lens-conp-clip)' });

    const fillRect = svgEl('rect', {
      x:'-20', y:'-20', width:'840', height:'540',
      fill: lensFill, 'fill-opacity': lensFillOp,
      stroke:'none',
    });
    gCNP.appendChild(fillRect);
    gNP.appendChild(gCNP);
    g.appendChild(gNP);

    const lbl = svgEl('text', {
      x:'400', y: computeLabelY(),
      'text-anchor':'middle', 'dominant-baseline':'middle',
      fill: lensLblClr, 'fill-opacity':'1',
      'font-family':'EB Garamond, Georgia, serif',
      'font-style':'italic', 'font-size':'13',
      'font-weight':'700',
      'pointer-events':'none',
    });
    lbl.textContent = 'NP ∩ co-NP';
    g.appendChild(lbl);
    return g;
  }

  function placeLens(g) {
    const P = root.querySelector('[data-class-id="P"]:not(.cls-exiting)');
    if (P) root.insertBefore(g, P); else root.appendChild(g);
  }

  if (!_lensEl || !_lensEl.isConnected) {
    const delay = hasNewEntrants ? 420 : 0;
    _lensRebuildT = setTimeout(() => {
      _lensRebuildT = null;
      const g = buildLensEl();
      g.style.opacity = '0'; g.style.transition = 'opacity .40s ease';
      _lensEl = g; _lensNPKey = npKey;
      placeLens(g);
      requestAnimationFrame(() => requestAnimationFrame(() => { g.style.opacity = '1'; }));
    }, delay);

  } else {
    // Lens already visible — sync BOTH clip paths to the live morphing ellipses each RAF frame.
    const lbl      = _lensEl.querySelector('text');
    const lblYStart = lbl ? (parseFloat(lbl.getAttribute('y')) || 0) : 0;
    const lblYEnd   = computeLabelY();
    const ANIM_DUR  = 540;
    const start     = performance.now();

    const _svgDefs  = DOM.svgDefs || (DOM.svgDefs = document.getElementById('svg-defs'));
    const _cpNPel   = _svgDefs.querySelector('#lens-np-clip ellipse');
    const _cpCoNPel = _svgDefs.querySelector('#lens-conp-clip ellipse');

    const _npLiveEl  = root.querySelector('[data-class-id="NP"]:not(.cls-exiting) ellipse');
    const _conpLiveEl= root.querySelector('[data-class-id="co-NP"]:not(.cls-exiting) ellipse');

    function lensAnimTick(now) {
      if (!_lensEl || !_lensEl.isConnected) { _lensRafId = null; return; }
      const t = Math.min(1, (now - start) / ANIM_DUR);
      const e = easeIO(t);

      // Use setAttribute with string values for clipPath children in <defs>.
      // Safari/WebKit does not reliably propagate baseVal.value mutations on
      // elements inside <defs> during RAF -- setAttribute forces a layout-clean
      // style recalc that WebKit needs to re-clip correctly each frame.
      if (_cpNPel && _npLiveEl) {
        const cx = _npLiveEl.cx.baseVal.value;
        const cy = _npLiveEl.cy.baseVal.value;
        _cpNPel.setAttribute('cx', cx.toFixed(2));
        _cpNPel.setAttribute('cy', cy.toFixed(2));
        _cpNPel.setAttribute('rx', _npLiveEl.rx.baseVal.value.toFixed(2));
        _cpNPel.setAttribute('ry', _npLiveEl.ry.baseVal.value.toFixed(2));
        const tf = _npLiveEl.getAttribute('transform');
        if (tf) _cpNPel.setAttribute('transform', tf); else _cpNPel.removeAttribute('transform');
      }

      if (_cpCoNPel && _conpLiveEl) {
        const cx = _conpLiveEl.cx.baseVal.value;
        const cy = _conpLiveEl.cy.baseVal.value;
        _cpCoNPel.setAttribute('cx', cx.toFixed(2));
        _cpCoNPel.setAttribute('cy', cy.toFixed(2));
        _cpCoNPel.setAttribute('rx', _conpLiveEl.rx.baseVal.value.toFixed(2));
        _cpCoNPel.setAttribute('ry', _conpLiveEl.ry.baseVal.value.toFixed(2));
        const ctf = _conpLiveEl.getAttribute('transform');
        if (ctf) _cpCoNPel.setAttribute('transform', ctf); else _cpCoNPel.removeAttribute('transform');
      }

      if (lbl) lbl.setAttribute('y', Math.round(lblYStart + (lblYEnd - lblYStart) * e));
      _lensRafId = t < 1 ? requestAnimationFrame(lensAnimTick) : null;
    }

    _lensNPKey = npKey;
    syncClipEl('lens-np-clip',   np.cx,   np.cy,   np.rx,   np.ry,   npRot);
    syncClipEl('lens-conp-clip', conp.cx, conp.cy, conp.rx, conp.ry, conpRot);
    placeLens(_lensEl);
    _lensRafId = requestAnimationFrame(lensAnimTick);
  }
}


/* ═══════════════════════════════════════════════════════════════
   transitionToScenario
════════════════════════════════════════════════════════════════ */

/* ================================================================
   COMPLETE LENSES — NP-c, co-NP-c, PSPACE-c
   ----------------------------------------------------------------
   Gli insiemi completi sono l'intersezione geometrica di:
     NP-c    = area interna di NP-h (solid arc, no code) INTERSECT NP
     co-NP-c = area interna di co-NP-h                  INTERSECT co-NP
     PSPACE-c= area interna di PSPACE-h                 INTERSECT PSPACE

   Tecnica: doppio <clipPath> in <defs>:
     1. clipPath con l'ellisse del parent
     2. clipPath con il path "sopra l'arco" (area interna della parabola)
   Un <rect> pieno viene clipPato da entrambi in cascata.

   Il risultato visivo e' esattamente l'area di intersezione.
   La label e' centrata nell'area risultante.
   Il colore e' la media cromatica tra il colore del Hard e del parent.
   ================================================================ */

/* ── _mixHex ──────────────────────────────────────────────────── */
function _mixHex(h1, h2) {
  if (!h1 || !h1.startsWith('#') || h1.length < 7) return h2 || '#888888';
  if (!h2 || !h2.startsWith('#') || h2.length < 7) return h1;
  const p = v => parseInt(v, 16);
  const r = n => Math.round(n).toString(16).padStart(2,'0');
  return '#'
    + r((p(h1.slice(1,3)) + p(h2.slice(1,3)))/2)
    + r((p(h1.slice(3,5)) + p(h2.slice(3,5)))/2)
    + r((p(h1.slice(5,7)) + p(h2.slice(5,7)))/2);
}

/* ── _arcAboveClipPath ────────────────────────────────────────────
 * Dato il solidPath dell'arco (M ax ay C cp1x cp1y cp2x cp2y dx dy),
 * costruisce il path chiuso che copre l'area SOPRA l'arco in SVG
 * (y < arco_y), cioe' l'interno della parabola Hard.
 *
 * Chiude:  sinistra -> salita off-canvas -> traversata -> discesa -> arco inverso
 * ─────────────────────────────────────────────────────────────── */
function _arcAboveClipPath(solidPath) {
  const m = solidPath && solidPath.match(
    /^M\s*([\d.-]+)\s+([\d.-]+)\s+C\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/
  );
  if (!m) return null;
  const [, ax, ay, cp1x, cp1y, cp2x, cp2y, dx, dy] = m;
  // Go from left arm up off-canvas, across, down to right arm, then reversed arc back.
  return `M ${ax} ${ay} L ${ax} -200 L ${dx} -200 L ${dx} ${dy} C ${cp2x} ${cp2y} ${cp1x} ${cp1y} ${ax} ${ay} Z`;
}

/* ── _computeCompleteLabelPos ────────────────────────────────────
 * Stima la posizione della label nell'area di intersezione:
 *   x = centro orizzontale tra i due bracci dell'arco
 *   y = 40% tra il top dell'ellisse parent e il midpoint dell'arco
 * ─────────────────────────────────────────────────────────────── */
function _computeCompleteLabelPos(parentEllEl, solidPath) {
  const m = solidPath && solidPath.match(
    /^M\s*([\d.-]+)\s+([\d.-]+)\s+C\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/
  );
  const ellCy = parentEllEl.cy.baseVal.value;
  const ellRy = parentEllEl.ry.baseVal.value;
  if (!m) return { x: Math.round(parentEllEl.cx.baseVal.value), y: Math.round(ellCy) };
  const [, ax, ay, cp1x, cp1y, cp2x, cp2y, dx, dy] = m.map(Number);
  // Horizontal center of the arc
  const labelX = Math.round((ax + dx) / 2);
  // Approximate midpoint of bezier arc at t=0.5
  const arcMidY = 0.125*ay + 0.375*cp1y + 0.375*cp2y + 0.125*dy;
  // Ellipse top in SVG (lower y value)
  const ellTop = ellCy - ellRy;
  // Place label 40% of the way from ellipse top toward arc midpoint
  const labelY = Math.round(ellTop + (arcMidY - ellTop) * 0.40);
  return { x: labelX, y: labelY };
}

/* ── updateCompleteLenses ─────────────────────────────────────────
 * Crea / aggiorna / rimuove i tre overlay di intersezione.
 * Chiamata da transitionToScenario() dopo ogni cambio di scenario.
 *
 * applied: il set corrente (appState.applied) — determina quali
 *          insiemi completi sono attivi.
 * shapes:  array di forme correnti — determina se Hard e Parent
 *          sono visibili nel diagramma.
 * ─────────────────────────────────────────────────────────────── */
function updateCompleteLenses(root, shapes, applied) {
  for (const [cid, def] of Object.entries(_COMPLETE_MAP)) {
    _updateOneCompleteLens(root, shapes, applied, cid, def);
  }
}

function _updateOneCompleteLens(root, shapes, applied, cid, def) {
  const isActive    = applied.has(cid);
  const hardShape   = shapes.find(s => s.id === def.hardId && s.type === 'open-curve');
  const parentShape = shapes.find(s => s.id === def.parentId && s.type !== 'open-curve');

  // Cancel any running sync RAF
  const raf = _completeLensRafs.get(cid);
  if (raf) { cancelAnimationFrame(raf); _completeLensRafs.delete(cid); }

  const existing = _completeLensEls.get(cid);

  if (!isActive || !hardShape || !parentShape) {
    if (existing && existing.isConnected) {
      existing.style.transition = 'opacity .25s ease';
      existing.style.opacity    = '0';
      setTimeout(() => { if (existing.isConnected) existing.remove(); }, 280);
    }
    _completeLensEls.delete(cid);
    return;
  }

  // Live SVG elements -- re-queried fresh on every call so stale refs
  // from a previous morph are never used.
  const hardG   = root.querySelector(`[data-class-id="${def.hardId}"]:not(.cls-exiting)`);
  const parentG = root.querySelector(`[data-class-id="${def.parentId}"]:not(.cls-exiting)`);
  if (!hardG || !parentG) {
    // Elements may still be animating in (morphGroup RAF in progress).
    // Retry after morph settles.
    const retryRaf = requestAnimationFrame(() => {
      const hg2 = root.querySelector(`[data-class-id="${def.hardId}"]:not(.cls-exiting)`);
      const pg2 = root.querySelector(`[data-class-id="${def.parentId}"]:not(.cls-exiting)`);
      if (hg2 && pg2) _updateOneCompleteLens(root, shapes, applied, cid, def);
    });
    _completeLensRafs.set(cid + '_retry', retryRaf);
    return;
  }

  const hardArcEl  = hardG._solidArc || hardG.querySelector('path[data-role="solid-arc"]');
  const parentEll  = parentG._ellipseEl || parentG.querySelector('ellipse');
  if (!hardArcEl || !parentEll) return;

  // Colors
  const hardColor   = getStyle(CLASS_DEFINITIONS[def.hardId]).stroke;
  const parentColor = getStyle(CLASS_DEFINITIONS[def.parentId]).stroke;
  const blendColor  = _mixHex(hardColor, parentColor);
  const fillOp      = _isLight ? '0.22' : '0.15';
  const strokeOp    = _isLight ? '0.55' : '0.38';

  const defsEl      = DOM.svgDefs || (DOM.svgDefs = document.getElementById('svg-defs'));
  const clipEllId   = `cls-clip-${cid}-parent`;
  const clipArcId   = `cls-clip-${cid}-arc`;

  function ensureClipPath(id) {
    let cp = defsEl.querySelector(`#${CSS.escape ? CSS.escape(id) : id}`);
    if (!cp) { cp = svgEl('clipPath', {id}); defsEl.appendChild(cp); }
    return cp;
  }

  function syncEllipseClip() {
    const cp = ensureClipPath(clipEllId);
    let el = cp.querySelector('ellipse');
    if (!el) { el = svgEl('ellipse'); cp.appendChild(el); }
    el.setAttribute('cx', parentEll.cx.baseVal.value.toFixed(2));
    el.setAttribute('cy', parentEll.cy.baseVal.value.toFixed(2));
    el.setAttribute('rx', parentEll.rx.baseVal.value.toFixed(2));
    el.setAttribute('ry', parentEll.ry.baseVal.value.toFixed(2));
    const tf = parentEll.getAttribute('transform');
    if (tf) el.setAttribute('transform', tf); else el.removeAttribute('transform');
  }

  function syncArcClip() {
    const arcPath   = hardArcEl.getAttribute('d');
    const abovePath = _arcAboveClipPath(arcPath);
    if (!abovePath) return;
    const cp = ensureClipPath(clipArcId);
    let el = cp.querySelector('path');
    if (!el) { el = svgEl('path'); cp.appendChild(el); }
    el.setAttribute('d', abovePath);
  }

  syncEllipseClip();
  syncArcClip();

  let g = existing;

  if (!g || !g.isConnected) {
    // Build the lens group
    g = svgEl('g', {
      class: 'intersection-group',
      'data-complete-for': cid,
      'data-class-id': cid,
    });

    // Double clip: outer=parent ellipse, inner=arc above region
    const gEll  = svgEl('g', {'clip-path': `url(#${clipEllId})`});
    const gArc  = svgEl('g', {'clip-path': `url(#${clipArcId})`});
    const fill  = svgEl('rect', {
      x:'-20', y:'-200', width:'840', height:'740',
      fill: blendColor, 'fill-opacity': fillOp, stroke: 'none',
    });
    gArc.appendChild(fill);
    gEll.appendChild(gArc);
    g.appendChild(gEll);
    g._fillRect = fill;

    // Label
    const lbl = svgEl('text', {
      'text-anchor':'middle', 'dominant-baseline':'middle',
      fill: blendColor, 'fill-opacity': '0.95',
      'font-family': 'EB Garamond, Georgia, serif',
      'font-style': 'italic', 'font-size': '12',
      'font-weight': '700', 'pointer-events': 'none',
    });
    lbl.textContent = CLASS_DEFINITIONS[cid].label;
    g.appendChild(lbl);
    g._lbl = lbl;

    // Position label
    const pos = _computeCompleteLabelPos(parentEll, hardArcEl.getAttribute('d'));
    lbl.setAttribute('x', pos.x);
    lbl.setAttribute('y', pos.y);

    // Insert before P (highest z-priority = in front of everything else)
    const P = root.querySelector('[data-class-id="P"]:not(.cls-exiting)');
    if (P) root.insertBefore(g, P); else root.appendChild(g);

    g.style.opacity    = '0';
    g.style.transition = 'opacity .35s ease';
    requestAnimationFrame(() => requestAnimationFrame(() => { g.style.opacity = '1'; }));
    _completeLensEls.set(cid, g);
  } else {
    // Update colors in place (e.g. theme change)
    if (g._fillRect) {
      g._fillRect.setAttribute('fill', blendColor);
      g._fillRect.setAttribute('fill-opacity', fillOp);
    }
    if (g._lbl) {
      g._lbl.setAttribute('fill', blendColor);
    }
  }

  // Start sync RAF loop for the duration of the morph animation
  // so clip paths track the morphing ellipse and arc in real time.
  const syncDur = _MORPH_DUR + 120;
  const start   = performance.now();

  function syncTick(now) {
    if (!g || !g.isConnected) { _completeLensRafs.delete(cid); return; }
    syncEllipseClip();
    syncArcClip();
    if (g._lbl) {
      const pos = _computeCompleteLabelPos(parentEll, hardArcEl.getAttribute('d'));
      g._lbl.setAttribute('x', pos.x);
      g._lbl.setAttribute('y', pos.y);
    }
    if (now - start < syncDur) {
      _completeLensRafs.set(cid, requestAnimationFrame(syncTick));
    } else {
      _completeLensRafs.delete(cid);
    }
  }
  _completeLensRafs.set(cid, requestAnimationFrame(syncTick));
}

function transitionToScenario(newShapes) {
  const root  = DOM.root  || (DOM.root  = document.getElementById('diagram-root'));
  const empty = DOM.empty || (DOM.empty = document.getElementById('empty-state'));
  // Invalidate tooltip lens cache — new shapes may move/remove NP, co-NP ellipses.
  if (typeof _invalidateLensCache === 'function') _invalidateLensCache();

  if (newShapes.length === 0) {
    root.querySelectorAll('.cls-group').forEach(exitGroup);
    root.querySelectorAll('[data-overlay-for]').forEach(el => el.remove());
    // Clear all complete lenses (NP-c, co-NP-c, PSPACE-c)
    for (const [cid, el] of _completeLensEls) {
      if (el && el.isConnected) { el.style.opacity = '0'; setTimeout(() => el.remove(), 280); }
    }
    _completeLensEls.clear();
    for (const r of _completeLensRafs.values()) cancelAnimationFrame(r);
    _completeLensRafs.clear();
    if (_lensEl) {
      _lensEl.style.opacity = '0';
      setTimeout(() => { _lensEl?.remove(); _lensEl = null; _lensNPKey = null; }, 280);
    }
    if (_lensRebuildT) { clearTimeout(_lensRebuildT); _lensRebuildT = null; }
    setTimeout(() => { root.innerHTML = ''; _lensEl = null; _lensNPKey = null; }, 300);
    empty.classList.remove('hidden');
    scheduleFit([]);
    return;
  }

  empty.classList.add('hidden');
  buildSVGDefs();

  const newById = new Map(newShapes.map(s => [s.id, s]));

  const live = new Map();
  for (const ch of root.children) {
    // Skip complete-lens groups -- they are not part of the shape layer
    // and must not be morphed or exited by the shape transition logic.
    if (!ch._exiting && ch.dataset?.classId && !ch.dataset?.completeFor) {
      live.set(ch.dataset.classId, ch);
    }
  }

  for (const [id, g] of live) {
    // Skip complete-lens overlay groups (NP-c, co-NP-c, PSPACE-c) --
    // they are not in newShapes (which only contains the base geometry)
    // but they must persist if the class is still in appState.applied.
    // updateCompleteLenses() handles their lifecycle separately.
    if (g.dataset?.completeFor) continue;
    if (!newById.has(id)) exitGroup(g);
  }

  let enterIdx       = 0;
  let hasNewEntrants = false;
  for (const shape of newShapes) {
    const existing = live.get(shape.id);
    if (existing && !existing._exiting) {
      const wasOpenCurve = !!existing.querySelector('path[d]');
      const isOpenCurve  = shape.type === 'open-curve';
      if (wasOpenCurve !== isOpenCurve) {
        exitGroup(existing);
        const ng = buildShapeGroup(shape, newShapes);
        ng.classList.add('cls-entering');
        ng.style.animationDelay = (enterIdx++ * 52) + 'ms';
        insertAtZOrder(root, ng, shape.id);
      } else {
        morphGroup(existing, shape, newShapes);
      }
    } else {
      const ng = buildShapeGroup(shape, newShapes);
      ng.classList.add('cls-entering');
      ng.style.animationDelay = (enterIdx++ * 52) + 'ms';
      insertAtZOrder(root, ng, shape.id);
      hasNewEntrants = true;
    }
  }

  updateLens(root, newShapes, hasNewEntrants);
  // Complete lenses must be in DOM before _rebuildHitOverlay so that
  // _overlayMap correctly includes their data-class-id entries.
  updateCompleteLenses(root, newShapes, appState.applied);
  _rebuildHitOverlay(root, newShapes);
  scheduleFit(newShapes);
}


/* ═══════════════════════════════════════════════════════════════
   executeUpdate  — dispatcher principale
════════════════════════════════════════════════════════════════ */
function executeUpdate() {
  const res = resolveImplicitDependencies(appState.explicit);

  // Promote: auto-resolved parents become independent explicit selections.
  for (const id of res) appState.explicit.add(id);
  const prevApplied = appState.applied;
  appState.applied = res;
  syncCheckboxes(res, prevApplied);

  if (res.size === 0) {
    transitionToScenario([]);
    return;
  }

  const key       = scenarioKey(res);
  const newShapes = SCENARIOS.get(key);
  if (!newShapes) {
    console.warn('[Complexity] Unknown scenario key:', key);
    return;
  }

  transitionToScenario(newShapes);
}


/* ═══════════════════════════════════════════════════════════════
   buildSidebar
════════════════════════════════════════════════════════════════ */
function buildSidebar() {
  const list = DOM.classList || (DOM.classList = document.getElementById('class-list'));
  list.innerHTML = '';

  /* ── Single delegated change-listener on the container (replaces N per-item
     listeners). No closure-per-item allocation; one handler for all checkboxes. ── */
  if (!list._delegated) {
    list._delegated = true;
    list.addEventListener('change', e => {
      const chk = e.target;
      if (!chk.classList.contains('cls-check')) return;
      const id = chk.dataset.classId;
      if (chk.checked) appState.explicit.add(id);
      else             cascadeDeselect(id, appState.explicit);
      scheduleUpdate();
    });
  }

  // Build into a DocumentFragment — single reflow when appended to DOM
  const frag = document.createDocumentFragment();
  DOM.chkMap = DOM.chkMap || new Map();

  for (const group of CLASS_GROUPS) {
    const gl = document.createElement('div');
    gl.className = 'class-group-label'; gl.textContent = group.label;
    frag.appendChild(gl);
    for (const id of group.ids) {
      const cls = CLASS_DEFINITIONS[id]; if (!cls) continue;
      const st    = getStyle(cls);
      const color = st.stroke;

      const item = document.createElement('label');
      item.className = 'class-item'; item.htmlFor = `chk-${id}`;
      item.style.setProperty('--cls-color', color);

      const chk = document.createElement('input');
      chk.type = 'checkbox'; chk.id = `chk-${id}`;
      chk.className = 'cls-check'; chk.dataset.classId = id;
      chk.style.setProperty('--cls-color', color);
      chk.checked = appState.explicit.has(id);

      const sw2 = document.createElement('div');
      sw2.className = 'cls-swatch';
      sw2.style.background = color;
      sw2.style.boxShadow  = `0 0 5px ${color}88`;

      const wrap = document.createElement('div'); wrap.className = 'cls-label-wrap';
      const ml   = document.createElement('span'); ml.className = 'cls-label-main'; ml.textContent = cls.label;
      const sl   = document.createElement('span'); sl.className = 'cls-label-sub';  sl.textContent = cls.fullName;
      wrap.appendChild(ml); wrap.appendChild(sl);

      item.appendChild(chk); item.appendChild(sw2); item.appendChild(wrap);
      frag.appendChild(item);
      if (appState.explicit.has(id)) item.classList.add('checked');
      DOM.chkMap.set(id, {chk, item});
    }
  }
  list.appendChild(frag);  // single reflow
}


/* ═══════════════════════════════════════════════════════════════
   resetAll
════════════════════════════════════════════════════════════════ */
function resetAll() {
  const prevApplied = new Set(appState.applied);
  appState.explicit.clear(); appState.applied = new Set();
  syncCheckboxes(appState.applied, prevApplied);

  const dlBtn = DOM.dlBtn || (DOM.dlBtn = document.getElementById('btn-download'));
  if (dlBtn) { dlBtn.disabled = true; dlBtn.classList.add('dl-disabled'); }
  const dlMobile = DOM.dlMobile || (DOM.dlMobile = document.getElementById('btn-mobile-download'));
  if (dlMobile) { dlMobile.disabled = true; dlMobile.classList.add('dl-disabled'); }

  if (_fitTimeout) { clearTimeout(_fitTimeout); _fitTimeout = null; }
  if (_lensRebuildT) { clearTimeout(_lensRebuildT); _lensRebuildT = null; }
  if (_lensRafId)   { cancelAnimationFrame(_lensRafId); _lensRafId = null; }

  const root = _getRoot();

  const groups = Array.from(root.children).filter(g =>
    !g._exiting &&
    !g.classList.contains('cls-reset-exit') &&
    g.dataset?.classId &&
    !g.dataset?.completeFor   // complete lenses are cleaned up separately below
  );
  groups.sort((a,b) => {
    const pa = CLASS_DEFINITIONS[a.dataset.classId]?.renderPriority ?? 50;
    const pb = CLASS_DEFINITIONS[b.dataset.classId]?.renderPriority ?? 50;
    return pb - pa;
  });

  const STEP = 55;
  // Use _MORPH_DUR so the remove timeout matches the per-engine animation
  // duration. The CSS cls-reset-exit animation-duration is also overridden
  // inline below so both stay in sync.
  const DUR  = _MORPH_DUR;

  groups.forEach((g, i) => {
    const delay = i * STEP;
    if (g._geoRaf)   { cancelAnimationFrame(g._geoRaf);   g._geoRaf   = null; }
    if (g._txtRaf)   { cancelAnimationFrame(g._txtRaf);   g._txtRaf   = null; }
    if (g._curveRaf) { cancelAnimationFrame(g._curveRaf); g._curveRaf = null; }
    g.classList.remove('cls-entering');
    g.style.animationDelay = delay + 'ms';
    g.classList.add('cls-reset-exit');
    setTimeout(() => g.remove(), delay + DUR + 80);
  });

  if (_lensEl) {
    const npIndex = groups.findIndex(g =>
      g.dataset.classId === 'NP' || g.dataset.classId === 'co-NP'
    );
    const lensDelay = (npIndex >= 0 ? npIndex : Math.min(1, groups.length)) * STEP;
    _lensEl.style.animationDelay    = lensDelay + 'ms';
    _lensEl.style.animationDuration = (DUR / 1000).toFixed(2) + 's';
    _lensEl.style.animationTimingFunction = 'cubic-bezier(0.4,0,0.6,1)';
    _lensEl.style.animationFillMode = 'both';
    _lensEl.style.animationName     = 'cls-disappear';
    setTimeout(() => { _lensEl?.remove(); _lensEl = null; _lensNPKey = null; }, lensDelay + 600);
  }

  const totalDur = groups.length * STEP + DUR + 150;
  setTimeout(() => {
    root.innerHTML = ''; _lensEl = null; _lensNPKey = null;
    const emptyEl = DOM.empty || (DOM.empty = document.getElementById('empty-state'));
    emptyEl.classList.remove('hidden');
  }, totalDur);


  // Clear complete lenses during reset
  for (const [cid, el] of _completeLensEls) {
    if (!el || !el.isConnected) continue;
    el.style.animationDelay    = '0ms';
    el.style.animationDuration = (DUR / 1000).toFixed(2) + 's';
    el.style.animationTimingFunction = 'cubic-bezier(0.4,0,0.6,1)';
    el.style.animationFillMode = 'both';
    el.style.animationName     = 'cls-disappear';
    setTimeout(() => { if (el.isConnected) el.remove(); }, DUR + 80);
  }
  _completeLensEls.clear();
  for (const r of _completeLensRafs.values()) cancelAnimationFrame(r);
  _completeLensRafs.clear();

    scheduleFit([]);
}


/* ═══════════════════════════════════════════════════════════════
   THEME + SIDEBAR TOGGLE
════════════════════════════════════════════════════════════════ */

function updateToggleIcon() {
  const isOpen = _sidebarOpen;
  const btn    = DOM.btnToggle || (DOM.btnToggle = document.getElementById('btn-toggle'));
  btn.innerHTML       = isOpen ? SVG_CHEVRON_LEFT : SVG_CHEVRON_RIGHT;
  btn.title           = isOpen ? 'Collapse sidebar' : 'Expand sidebar';
  btn.setAttribute('aria-label', btn.title);

  const mIcon  = DOM.mIcon  || (DOM.mIcon  = document.getElementById('mobile-toggle-icon'));
  const mLabel = DOM.mLabel || (DOM.mLabel = document.getElementById('mobile-toggle-label'));
  const inDetail = _mode === 'detail-view';
  if (mIcon)  mIcon.innerHTML = isOpen ? SVG_CHEVRON_DOWN : SVG_CHEVRON_UP;
  if (mLabel) mLabel.textContent = isOpen ? 'Hide menu' : 'Show menu';
}

function updateThemeIcon() {
  const btn = DOM.themeBtn || (DOM.themeBtn = document.getElementById('btn-theme'));
  if (!btn) return;
  const icon  = _isLight ? SVG_MOON : SVG_SUN;
  const title = _isLight ? 'Switch to night mode' : 'Switch to day mode';
  btn.innerHTML = icon;
  btn.title     = title;
  // Keep detail-view theme button in sync
  const btnDet = document.getElementById('btn-theme-detail');
  if (btnDet) { btnDet.innerHTML = icon; btnDet.title = title; }
}

function setTheme(light) {
  _isLight = light;
  _defsTheme = null;           // force SVG filter rebuild for new theme
  document.body.classList.toggle('light', light);
  updateThemeIcon();

  // Update sidebar colors in-place (no DOM rebuild)
  if (DOM.chkMap) {
    for (const [id, {chk, item}] of DOM.chkMap) {
      const newColor = getStyle(CLASS_DEFINITIONS[id]).stroke;
      item.style.setProperty('--cls-color', newColor);
      chk.style.setProperty('--cls-color', newColor);
      const sw = item.querySelector('.cls-swatch');
      if (sw) { sw.style.background = newColor; sw.style.boxShadow = `0 0 5px ${newColor}88`; }
    }
  } else {
    buildSidebar();
  }

  // Rebuild SVG filter defs (theme-aware colors) -- only touches <defs>, not shapes.
  buildSVGDefs();

  // If a group is currently hovered, refresh its JS-direct style.filter for the
  // new theme (hover filter color differs between dark and light mode).
  if (_hoveredGroup && !_isSafari) {
    _hoveredGroup.style.filter = _isLight ? _HOV_FILTER_LIGHT : _HOV_FILTER_DARK;
  }
  // Refresh complete lens fill colors for new theme
  for (const [cid, g] of _completeLensEls) {
    const def = _COMPLETE_MAP[cid];
    if (!def) continue;
    const hardColor   = getStyle(CLASS_DEFINITIONS[def.hardId]).stroke;
    const parentColor = getStyle(CLASS_DEFINITIONS[def.parentId]).stroke;
    const blendColor  = _mixHex(hardColor, parentColor);
    const fillOp      = _isLight ? '0.22' : '0.15';
    if (g._fillRect) { g._fillRect.setAttribute('fill', blendColor); g._fillRect.setAttribute('fill-opacity', fillOp); }
    if (g._lbl)      { g._lbl.setAttribute('fill', blendColor); }
  }

  if (appState.applied.size > 0) {
    // Update each existing shape's stroke/fill colors in-place instead of
    // destroying and recreating the entire DOM tree.
    // root.innerHTML = '' forces 11 shape groups to be re-created + re-uploaded
    // to the GPU — avoidable on a theme switch.
    const root = DOM.root || (DOM.root = document.getElementById('diagram-root'));
    const shapes = SCENARIOS.get(scenarioKey(appState.applied)) || [];

    for (const sh of shapes) {
      const g = root.querySelector(`[data-class-id="${sh.id}"]`);
      if (!g || g._exiting) continue;
      const cls = CLASS_DEFINITIONS[sh.id];
      if (!cls) continue;
      const st = getStyle(cls);

      if (sh.type !== 'open-curve') {
        // Ellipse group: update ellipse fill/stroke + filter reference
        const el = g._ellipseEl || g.querySelector('ellipse');
        if (el) {
          el.setAttribute('fill', st.fill);
          el.setAttribute('fill-opacity', st.fillOpacity);
          el.setAttribute('stroke', st.stroke);
          el.setAttribute('stroke-opacity', st.strokeOpacity);
        }
        const txt = g._textEl || g.querySelector('text');
        if (txt) txt.setAttribute('fill', st.stroke);
      } else {
        // Open-curve group: update stroke color on all three paths + label
        const clr = st.stroke;
        const paths = [g._solidArc, g._leftTail, g._rightTail];
        for (const p of paths) {
          if (p) p.setAttribute('stroke', clr);
        }
        if (g._hoverFill) g._hoverFill.setAttribute('fill', clr);
        const txt = g._textEl || g.querySelector('text');
        if (txt) txt.setAttribute('fill', clr);
      }
    }

    // Lens fill/stroke color depends on theme — cheapest to rebuild
    if (_lensRafId) { cancelAnimationFrame(_lensRafId); _lensRafId = null; }
    if (_lensEl) { _lensEl.remove(); _lensEl = null; _lensNPKey = null; }
    updateLens(root, shapes);
    _rebuildHitOverlay(root, shapes);
  }

  try { localStorage.setItem('cx-theme', light ? 'light' : 'dark'); } catch(_){}
}

function toggleSidebar() {
  const sidebar  = DOM.sidebar  || (DOM.sidebar  = document.getElementById('sidebar'));
  const themeBtn = DOM.themeBtn || (DOM.themeBtn = document.getElementById('btn-theme'));
  sidebar.classList.toggle('collapsed');
  _sidebarOpen = !_sidebarOpen;
  document.body.classList.toggle('sidebar-open', _sidebarOpen);
  themeBtn.style.display = _sidebarOpen ? '' : 'none';
  updateToggleIcon();

  // Re-fit after sidebar CSS transition finishes (~550ms) so viewport is stable
  if (appState.applied.size > 0) {
    if (_fitTimeout) { clearTimeout(_fitTimeout); _fitTimeout = null; }
    _fitTimeout = setTimeout(() => {
      _fitTimeout = null;
      let x1, y1, x2, y2;
      try {
        const root = _getRoot();
        const savedTf = root.getAttribute('transform');
        root.removeAttribute('transform');
        const bb = root.getBBox();
        if (savedTf) root.setAttribute('transform', savedTf);
        x1=bb.x; y1=bb.y; x2=bb.x+bb.width; y2=bb.y+bb.height;
      } catch(_) {
        const fb = sceneBBox(SCENARIOS.get(scenarioKey(appState.applied)) || []);
        if (!isFinite(fb.x1)) return;
        x1=fb.x1; y1=fb.y1; x2=fb.x2; y2=fb.y2;
      }
      if(!isFinite(x1)||x2<=x1||y2<=y1) return;
      const MARGIN = 45;
      const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN,
        Math.min((800-2*MARGIN)/(x2-x1), (500-2*MARGIN)/(y2-y1))
      ));
      animateFit(z, -z*((x1+x2)/2-SVG_CX), -z*((y1+y2)/2-SVG_CY));
    }, 620);
  }
}
