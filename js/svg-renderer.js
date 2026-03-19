'use strict';

/* ================================================================
   js/svg-renderer.js
   ─────────────────────────────────────────────────────────────
   Costruttori SVG: crea i gruppi <g> per ogni forma del diagramma.

   DIPENDENZE:
     • setting_sets/class-definitions.js → CLASS_DEFINITIONS, getStyle, _isLight
     • js/state.js                       → SVG_NS, svgEl, DOM

   ESPORTA (globali):
     • buildSVGDefs()
     • renderDiagram(shapes)
     • buildShapeGroup(shape, allShapes)
     • buildEllipseGroup(shape, allShapes)
     • buildOpenCurveGroup(shape)
     • _buildHoverFillPath(shape)
   ================================================================ */


/* ── _buildHoverFillPath ──────────────────────────────────────────────────────
 * Build the hover-fill path for an open-curve shape.
 * The filled region spans from the left tail endpoint, along the arc,
 * to the right tail endpoint, then closes with a straight line.
 * This covers the full parabola area including the dashed tails.
 *
 * leftTail  = "M ax ay L bx by"   →  endpoint is (bx, by)
 * solidPath = "M x0 y0 C ... x1 y1"
 * rightTail = "M cx cy L dx dy"   →  endpoint is (dx, dy)
 *
 * Result: "M bx by L x0 y0 C ... x1 y1 L dx dy Z"
 */
function _buildHoverFillPath(shape) {
  try {
    // Parse left tail end point: "M ax ay L bx by"
    const ltNums = (shape.leftTail || '').match(/([\d.-]+)/g)?.map(Number);
    const rtNums = (shape.rightTail || '').match(/([\d.-]+)/g)?.map(Number);
    if (!ltNums || ltNums.length < 4 || !rtNums || rtNums.length < 4) {
      return shape.solidPath + ' Z';
    }
    const ltEx = ltNums[2], ltEy = ltNums[3];  // left tail END
    const rtEx = rtNums[2], rtEy = rtNums[3];  // right tail END

    // solidPath = "M x0 y0 C ..."  → strip leading "M x0 y0 " to get arc data
    const sp = shape.solidPath;
    const mMatch = sp.match(/^M\s*([\d.-]+)\s+([\d.-]+)\s*/);
    if (!mMatch) return sp + ' Z';
    const arcData = sp.slice(mMatch[0].length);  // everything after "M x0 y0 "

    return `M ${ltEx} ${ltEy} L ${mMatch[1]} ${mMatch[2]} ${arcData} L ${rtEx} ${rtEy} Z`;
  } catch(_) {
    return shape.solidPath + ' Z';
  }
}


/* ── buildSVGDefs ─────────────────────────────────────────────────────────────
 * Creates per-class glow filters in <defs>.
 * Guard: _defsTheme prevents unnecessary rebuilds on theme switch only.
 *
 * MEMORY BUDGET:
 *   Previous: feGaussianBlur(stdDeviation:3.5) + feMerge → 3 GPU surfaces
 *             region x:-30% y:-30% width:160% = 2.56× element area per surface
 *             PSPACE ellipse @ DPR 2 → 18.9 MB × 3 = 56.7 MB per class
 *             11 classes → ~624 MB GPU filter memory
 *
 *   Current:  feDropShadow(stdDeviation:1.5) → 1-2 GPU surfaces
 *             region x:-5% y:-5% width:110% = 1.21× element area
 *             PSPACE ellipse @ DPR 2 → 3.5 MB × 2 = 7 MB per class
 *             11 classes → ~77 MB GPU filter memory  (8× reduction)
 *
 * feDropShadow blurs only the alpha channel (4× cheaper than full-RGBA blur)
 * and browsers optimise it as a hardware-accelerated single render pass.
 * Visual result: colored halo around stroke — visually equivalent to bloom glow.
 */
function buildSVGDefs() {
  const theme = _isLight ? 'light' : 'dark';
  if (_defsTheme === theme) return;
  _defsTheme = theme;

  // _FILTER_CFG is null on Safari -- SVG filters on animated SVG elements
  // cause WebKit to fall back to CPU software rasterisation every RAF frame.
  if (!_FILTER_CFG) return;

  const defs = DOM.svgDefs || (DOM.svgDefs = document.getElementById('svg-defs'));
  const savedClipNP   = defs.querySelector('#lens-np-clip');
  const savedClipCoNP = defs.querySelector('#lens-conp-clip');
  defs.innerHTML = '';
  if (savedClipNP)   defs.appendChild(savedClipNP);
  if (savedClipCoNP) defs.appendChild(savedClipCoNP);

  const cfg = _FILTER_CFG;
  for (const cls of Object.values(CLASS_DEFINITIONS)) {
    const sid = cls.sid;
    const f = svgEl('filter', {
      id: `glow-${sid}`,
      x: cfg.x, y: cfg.y, width: cfg.w, height: cfg.h,
    });
    if (_isLight) {
      // Light mode: subtle shadow. Blink slightly heavier than Gecko due to
      // Skia's gamma correction making shadows appear lighter.
      const drop = svgEl('feDropShadow', {
        dx: '0', dy: '1',
        stdDeviation: String(cfg.deviationLight),
        'flood-color': '#000000',
        'flood-opacity': String(cfg.opacityLight),
      });
      f.appendChild(drop);
    } else {
      // Dark mode: colored glow halo. Alpha-only blur = 4x cheaper than
      // full-RGBA feGaussianBlur. dx=dy=0 centres the shadow as a halo.
      const drop = svgEl('feDropShadow', {
        dx: '0', dy: '0',
        stdDeviation: String(cfg.deviationDark),
        'flood-color': cls.styleDark.stroke,
        'flood-opacity': String(cfg.opacityDark),
      });
      f.appendChild(drop);
    }
    defs.appendChild(f);
  }
}


/* ── renderDiagram ────────────────────────────────────────────── */
function renderDiagram(shapes) {
  const root  = DOM.root  || (DOM.root  = document.getElementById('diagram-root'));
  const empty = DOM.empty || (DOM.empty = document.getElementById('empty-state'));
  root.innerHTML = '';

  if (shapes.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  buildSVGDefs();

  for (const sh of shapes) root.appendChild(buildShapeGroup(sh, shapes));
}


/* ── buildShapeGroup ──────────────────────────────────────────── */
function buildShapeGroup(shape, allShapes) {
  return shape.type === 'open-curve'
    ? buildOpenCurveGroup(shape)
    : buildEllipseGroup(shape, allShapes);
}


/* ── buildEllipseGroup ────────────────────────────────────────── */
function buildEllipseGroup(shape, allShapes) {
  const cls = CLASS_DEFINITIONS[shape.id];
  const st  = getStyle(cls);
  const sid = cls.sid;   // precomputed — no regex

  // Label position comes directly from the scenario descriptor (lx/ly/la).
  const lx = shape.lx ?? shape.cx;
  const ly = shape.ly ?? shape.cy;
  const la = shape.la ?? 'middle';

  const g = svgEl('g',{class:`cls-group cls-${sid}`,'data-class-id':shape.id});
  const t = svgEl('title'); t.textContent=`${cls.fullName} (${cls.id})`; g.appendChild(t);

  const ellipseEl = svgEl('ellipse', Object.assign({
    cx:shape.cx, cy:shape.cy, rx:shape.rx, ry:shape.ry,
    fill:st.fill, 'fill-opacity':st.fillOpacity,
    stroke:st.stroke, 'stroke-opacity':st.strokeOpacity,
    'stroke-width':st.strokeWidth,
    'shape-rendering': _SVG_SHAPE_RENDERING,
    // Safari: omit filter attribute -- SVG filters on animated elements
    // force WebKit into CPU software rendering on every geometry change.
    ...(_FILTER_CFG ? { filter:`url(#glow-${sid})` } : {}),
  }, shape.rotation ? { transform:`rotate(${shape.rotation},${shape.cx},${shape.cy})` } : {}));
  g.appendChild(ellipseEl);
  g._ellipseEl = ellipseEl;   // cached ref — avoids querySelector in morphGroup

  const txt = svgEl('text',{
    x:lx, y:ly,
    'text-anchor':la, 'dominant-baseline':'middle',
    fill:st.stroke, 'fill-opacity':'0.95',
    'font-family':'EB Garamond, Georgia, serif',
    'font-style':'italic', 'font-size':'15', 'font-weight':'700',
    'text-rendering': _SVG_TEXT_RENDERING,
    'pointer-events':'none',
  });
  txt.textContent = cls.label;
  g.appendChild(txt);
  g._textEl = txt;             // cached ref — avoids querySelector in morphGroup
  return g;
}


/* ── buildOpenCurveGroup ──────────────────────────────────────────────────────
 * Open-curve for NP-h / co-NP-h / PSPACE-h.
 * Three paths: solid main arc + two dashed tails.
 * Shape fields: solidPath, leftTail, rightTail, labelX, labelY, labelAnchor.
 */
function buildOpenCurveGroup(shape) {
  const cls = CLASS_DEFINITIONS[shape.id];
  const st  = getStyle(cls);
  const sid = cls.sid;
  const clr = st.stroke;
  const sw  = st.strokeWidth;

  const g = svgEl('g',{class:`cls-group cls-${sid}`,'data-class-id':shape.id});
  const t = svgEl('title'); t.textContent=`${cls.fullName} (${cls.id})`; g.appendChild(t);

  // Hover fill: invisible normally, CSS fades it in on .cls-hov.
  // Area = from left tail tip → arc → right tail tip → straight line back across.
  // This covers the full parabola region including the dashed tails.
  const hoverFillEl = svgEl('path', {
    d: _buildHoverFillPath(shape),
    fill: clr, 'fill-opacity': '0',
    stroke: 'none', 'pointer-events': 'none',
    'data-role': 'hover-fill',
  });
  g.appendChild(hoverFillEl);
  g._hoverFill = hoverFillEl;

  const arcEl = svgEl('path',{
    d:shape.solidPath, fill:'none',
    stroke:clr, 'stroke-opacity':st.strokeOpacity,
    'stroke-width':sw, 'stroke-linecap':'round',
    'data-role':'solid-arc',
  });
  const ltEl = svgEl('path',{
    d:shape.leftTail, fill:'none',
    stroke:clr, 'stroke-opacity':'0.48',
    'stroke-width':sw, 'stroke-dasharray':'5 4', 'stroke-linecap':'round',
    'data-role':'left-tail',
  });
  const rtEl = svgEl('path',{
    d:shape.rightTail, fill:'none',
    stroke:clr, 'stroke-opacity':'0.48',
    'stroke-width':sw, 'stroke-dasharray':'5 4', 'stroke-linecap':'round',
    'data-role':'right-tail',
  });
  g.appendChild(arcEl); g.appendChild(ltEl); g.appendChild(rtEl);
  g._solidArc = arcEl;  g._leftTail = ltEl;  g._rightTail = rtEl;  // cached refs

  const lbl = svgEl('text',{
    x:shape.labelX, y:shape.labelY,
    'text-anchor':shape.labelAnchor, 'dominant-baseline':'middle',
    fill:clr, 'fill-opacity':'0.92',
    'font-family':'EB Garamond, Georgia, serif',
    'font-style':'italic', 'font-size':'15', 'font-weight':'700',
    'text-rendering': _SVG_TEXT_RENDERING,
    'pointer-events':'none',
  });
  lbl.textContent = cls.label;
  g.appendChild(lbl);
  g._textEl = lbl;  // cached ref

  if (shape.extraLabel) {
    const el2 = svgEl('text', {
      x: shape.extraLabel.x, y: shape.extraLabel.y,
      'text-anchor': shape.extraLabel.anchor || 'middle',
      'dominant-baseline': 'middle', 'data-role': 'extra-label',
      fill: clr, 'fill-opacity': '0.78',
      'font-family': 'EB Garamond, Georgia, serif',
      'font-style': 'italic', 'font-size': '13', 'font-weight': '700',
      'pointer-events': 'none',
    });
    el2.textContent = shape.extraLabel.text;
    g.appendChild(el2);
  }
  return g;
}
