'use strict';

/* ================================================================
   js/geometry.js
   ─────────────────────────────────────────────────────────────
   Motore geometrico degli scenari.

   DIPENDENZE (caricate prima da index.html):
     • setting_sets/scenarios.js  → SCENARIO_DECLARATIONS
     • js/state.js                → SVG_CX, SVG_CY (via _SVG_OX/_SVG_OY)

   ESPORTA (globali):
     • toSVGCoords(shape)
     • resolveScenarioImports(key, visited)
     • SCENARIOS  — Map pre-computata, lookup O(1)

   NOTE SUL SISTEMA DI COORDINATE:
     Display: origine = centro canvas, y↑
     SVG:     origine = top-left, y↓
     x_svg = x_display + 400
     y_svg = 250 − y_display
   ================================================================ */


/* ── Coordinate conversion constants ────────────────────────── */
const _SVG_OX = 400, _SVG_OY = 250;

/* ── _convertPathToSVG ───────────────────────────────────────── */
function _convertPathToSVG(pathStr) {
  const tokens = pathStr.match(/[MmCcLlZz]|[-+]?[0-9]*\.?[0-9]+/g) || [];
  const out = []; let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (/[MmCcLlZz]/.test(tok)) { out.push(tok); i++; continue; }
    const x = parseFloat(tokens[i]); i++;
    const y = parseFloat(tokens[i]); i++;
    out.push((x + _SVG_OX).toString());
    out.push((_SVG_OY - y).toString());
  }
  return out.join(' ');
}


/* ── _parabolaFromPoints ─────────────────────────────────────────────────────
 * Builds solidPath + leftTail + rightTail from a simple geometric description.
 * All inputs in display coords (origin = canvas centre, y upward).
 *
 * Required:
 *   p0  = {x,y}  a point on the left  branch (defines parabola width/depth)
 *   pm  = {x,y}  bowl bottom
 *   p2  = {x,y}  a point on the right branch
 *   height       y-level where BOTH arm tips end in the final (rotated) diagram
 *
 * Optional:
 *   rotate     = degrees (default 0)
 *   tailLength = dashed-tail length beyond each arm tip (default 60)
 *
 * ── Algorithm ─────────────────────────────────────────────────────────────────
 * 1. Fit parabola y = a·x² + pm.y through p0 and pm.
 * 2. Compute x_arm: x position at y_arm, where y_arm = height + large_margin
 *    so that AFTER any reasonable rotation, both arm tips are still above height.
 * 3. Build a symmetric Bézier from (−x_arm, y_arm) to (+x_arm, y_arm) through pm.
 * 4. Rotate all four Bézier control points around (0, height) by `rotate` degrees.
 * 5. Bisect within [0, 0.5) and (0.5, 1] to find t₀, t₁ where rotated curve
 *    crosses y = height.
 * 6. De Casteljau's algorithm extracts the exact sub-Bézier [t₀, t₁].
 * 7. Tails extend tangentially from each endpoint for `tailLength` units.
 * ─────────────────────────────────────────────────────────────────────────── */
function _parabolaFromPoints(sh) {
  const {p0, pm, p2, height, rotate = 0, tailLength = 60} = sh;

  // ── 1. Parabola coefficient (vertex at pm.x) ─────────────────────────────
  const dx0 = p0.x - pm.x;
  // y = a·(x−pm.x)² + pm.y,  a = (p0.y−pm.y)/(p0.x−pm.x)²

  // ── 2. Arm y with margin so both rotated tips stay above height ──────────
  const x_approx  = Math.abs(dx0) * Math.sqrt(Math.max(0, (height - pm.y) / (p0.y - pm.y)));
  const rad        = rotate * Math.PI / 180;
  const tanAbs     = Math.abs(Math.tan(rad));
  const margin     = x_approx * (tanAbs + 1) + 100;
  const y_arm      = height + margin;
  const dx_arm     = Math.abs(dx0) * Math.sqrt(Math.max(0, (y_arm - pm.y) / (p0.y - pm.y)));
  const cpY        = (8 * pm.y - 2 * y_arm) / 6;

  // ── 3. Bézier control points symmetric around pm.x ───────────────────────
  const B0 = {x: pm.x - dx_arm, y: y_arm};
  const B1 = {x: pm.x - dx_arm, y: cpY};
  const B2 = {x: pm.x + dx_arm, y: cpY};
  const B3 = {x: pm.x + dx_arm, y: y_arm};

  // ── 4. Rotate around (pm.x, height) ──────────────────────────────────────
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const rcx = pm.x;
  function rot(pt) {
    const dx = pt.x - rcx, dy = pt.y - height;
    return {x: rcx + dx*cos - dy*sin, y: height + dx*sin + dy*cos};
  }
  const [rB0, rB1, rB2, rB3] = [B0, B1, B2, B3].map(rot);

  // ── 5. Parametric evaluation and bisection ────────────────────────────────
  function evalB(t) {
    const mt = 1-t;
    return {
      x: mt*mt*mt*rB0.x + 3*mt*mt*t*rB1.x + 3*mt*t*t*rB2.x + t*t*t*rB3.x,
      y: mt*mt*mt*rB0.y + 3*mt*mt*t*rB1.y + 3*mt*t*t*rB2.y + t*t*t*rB3.y
    };
  }
  function derivB(t) {
    const mt=1-t;
    return {
      x: 3*(mt*mt*(rB1.x-rB0.x)+2*mt*t*(rB2.x-rB1.x)+t*t*(rB3.x-rB2.x)),
      y: 3*(mt*mt*(rB1.y-rB0.y)+2*mt*t*(rB2.y-rB1.y)+t*t*(rB3.y-rB2.y))
    };
  }
  function bisect(lo, hi) {
    for (let i=0; i<64; i++) {
      if (hi-lo < 1e-10) break;
      const mid = (lo+hi)/2;
      if ((evalB(mid).y - height) * (evalB(lo).y - height) <= 0) hi=mid; else lo=mid;
    }
    return (lo+hi)/2;
  }
  const t0 = bisect(0,     0.499);
  const t1 = bisect(0.501, 1);

  // ── 6. De Casteljau's algorithm: exact sub-Bézier [t0, t1] ───────────────
  function split(P0r, P1r, P2r, P3r, t) {
    const lerp = (a,b,t) => ({x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t});
    const Q10=lerp(P0r,P1r,t), Q11=lerp(P1r,P2r,t), Q12=lerp(P2r,P3r,t);
    const Q20=lerp(Q10,Q11,t), Q21=lerp(Q11,Q12,t);
    const Q30=lerp(Q20,Q21,t);
    return {
      left:  [P0r, Q10, Q20, Q30],
      right: [Q30, Q21, Q12, P3r]
    };
  }
  const s0      = split(rB0, rB1, rB2, rB3, t0);
  const t1r     = (t1-t0) / (1-t0);
  const s1      = split(...s0.right, t1r);
  const [sA, sB, sC, sD] = s1.left;   // exact sub-Bézier from t0 to t1

  // ── 7. Tails: tangential extensions from arm endpoints ────────────────────
  const dLeft  = derivB(t0);   // tangent at left arm (points toward bowl → invert)
  const dRight = derivB(t1);   // tangent at right arm (points away from bowl)
  function normalized(v) {
    const len = Math.sqrt(v.x*v.x + v.y*v.y) || 1;
    return {x:v.x/len, y:v.y/len};
  }
  const nL  = normalized({x:-dLeft.x,  y:-dLeft.y});   // outward from left
  const nR  = normalized({x: dRight.x, y: dRight.y});   // outward from right
  const T0  = {x: Math.round(sA.x+nL.x*tailLength), y: Math.round(sA.y+nL.y*tailLength)};
  const T2  = {x: Math.round(sD.x+nR.x*tailLength), y: Math.round(sD.y+nR.y*tailLength)};

  // Default label: midpoint between arm-tip midpoint and tail-end midpoint
  const midArmX=(sA.x+sD.x)/2, midArmY=(sA.y+sD.y)/2;
  const midTailX=(T0.x+T2.x)/2, midTailY=(T0.y+T2.y)/2;
  const r = v => Math.round(v*10)/10;

  return {
    ...sh,
    solidPath:   `M ${r(sA.x)} ${r(sA.y)} C ${r(sB.x)} ${r(sB.y)} ${r(sC.x)} ${r(sC.y)} ${r(sD.x)} ${r(sD.y)}`,
    leftTail:    `M ${r(sA.x)} ${r(sA.y)} L ${T0.x} ${T0.y}`,
    rightTail:   `M ${r(sD.x)} ${r(sD.y)} L ${T2.x} ${T2.y}`,
    labelX:      sh.lx  ?? Math.round((midArmX+midTailX)/2),
    labelY:      sh.ly  ?? Math.round((midArmY+midTailY)/2),
    labelAnchor: sh.la  ?? 'middle',
  };
}


/* ── toSVGCoords ──────────────────────────────────────────────────────────────
 * 1. If an open-curve uses the simplified p0/pm/p2 format, expand it first.
 * 2. Convert all coordinates from display (origin=centre, y↑) to SVG (top-left, y↓):
 *      x_svg = x + 400      y_svg = 250 − y  ──────────────────────────── */
function toSVGCoords(shape) {
  // Expand simplified parabola format before coordinate conversion
  const s = (shape.type === 'open-curve' && ('p0' in shape || 'p0x' in shape))
    ? _parabolaFromPoints(
        // Support legacy p0x/p2x/armY/tailLength format transparently
        'p0x' in shape
          ? { ...shape,
              p0: {x: shape.p0x, y: shape.armY},
              p2: {x: shape.p2x, y: shape.armY},
              height: shape.armY + (shape.tailLength ?? 80) }
          : shape
      )
    : Object.assign({}, shape);
  if (s.type === 'open-curve') {
    s.solidPath  = _convertPathToSVG(s.solidPath);
    s.leftTail   = _convertPathToSVG(s.leftTail);
    s.rightTail  = _convertPathToSVG(s.rightTail);
    s.labelX     = s.labelX + _SVG_OX;
    s.labelY     = _SVG_OY - s.labelY;
  } else {
    s.cx = s.cx + _SVG_OX;  s.cy = _SVG_OY - s.cy;
    s.lx = s.lx + _SVG_OX;  s.ly = _SVG_OY - s.ly;
  }
  return s;
}


/* ── resolveScenarioImports ───────────────────────────────────────────────────
 * Expands all {'import-scenario': 'key'} entries inside a scenario array into
 * the actual shape descriptors they reference, following chains recursively.
 *
 * Override semantics — last-write-wins per id:
 *   import BEFORE local → local wins (appears later in flat array)
 *   import AFTER  local → import appends new shapes
 *
 * Circular imports are detected and skipped with a console warning.
 * ─────────────────────────────────────────────────────────────────────────── */
function resolveScenarioImports(key, visited) {
  if (!visited) visited = new Set();

  // Guard: circular reference
  if (visited.has(key)) {
    console.warn('[Scenarios] Circular import-scenario detected for key:', key);
    return [];
  }
  visited.add(key);

  const raw = SCENARIO_DECLARATIONS[key];
  if (!raw) {
    console.warn('[Scenarios] import-scenario: unknown key:', JSON.stringify(key));
    return [];
  }

  // ── Phase 1: flatten — expand all import directives recursively ──────────
  const flat = [];
  for (const entry of raw) {
    if ('import-scenario' in entry) {
      // Recurse — pass a *copy* of visited so sibling imports don't block each other
      const imported = resolveScenarioImports(entry['import-scenario'], new Set(visited));
      for (const shape of imported) flat.push(shape);
    } else {
      // Normal shape descriptor — pass through as-is
      flat.push(entry);
    }
  }

  // ── Phase 2: deduplicate by id — last-write-wins ─────────────────────────
  // Scan in reverse to find the index of the LAST occurrence of each id.
  // Then filter forward, keeping only entries at their last-seen index.
  const lastIdx = new Map();   // id → last index in flat[]
  for (let i = 0; i < flat.length; i++) {
    if (flat[i].id !== undefined) lastIdx.set(flat[i].id, i);
  }
  return flat.filter((entry, i) =>
    entry.id === undefined || lastIdx.get(entry.id) === i
  );
}


/* ── Pre-parse regex ──────────────────────────────────────────────────────── */
const _BOWL_RE_PARSE = /^M\s*([\d.-]+)\s+([\d.-]+)\s+C\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)$/;
const _TAIL_RE_PARSE = /^M\s*([\d.-]+)\s+([\d.-]+)\s+L\s*([\d.-]+)\s+([\d.-]+)$/;

/* PERF: open-curve shapes get pre-parsed numeric arrays (_arc8, _lt4, _rt4)
 * so the morphGroup RAF loop never runs regex or string ops in the hot path. */
function _preParseCurveShape(shape) {
  if (shape.type !== 'open-curve') return shape;
  const ms = shape.solidPath?.match(_BOWL_RE_PARSE);
  const ml = shape.leftTail?.match(_TAIL_RE_PARSE);
  const mr = shape.rightTail?.match(_TAIL_RE_PARSE);
  if (ms && ml && mr) {
    // Store as plain arrays (V8 array of doubles — no boxing overhead)
    shape._arc8 = [+ms[1],+ms[2],+ms[3],+ms[4],+ms[5],+ms[6],+ms[7],+ms[8]];
    shape._lt4  = [+ml[1],+ml[2],+ml[3],+ml[4]];
    shape._rt4  = [+mr[1],+mr[2],+mr[3],+mr[4]];
  }
  return shape;
}


/* ── SCENARIOS Map ────────────────────────────────────────────────────────────
 * O(1) lookup map. Shapes converted to SVG coords once at startup.
 * resolveScenarioImports() expands any {'import-scenario':'KEY'} entries before
 * toSVGCoords() runs, so the rest of the engine never sees import directives.
 * SCENARIO_DECLARATIONS is nulled immediately after — frees all raw descriptors.
 * ─────────────────────────────────────────────────────────────────────────── */
const SCENARIOS = new Map(
  Object.keys(SCENARIO_DECLARATIONS).map(key =>
    [key, resolveScenarioImports(key).map(toSVGCoords).map(_preParseCurveShape)]
  )
);
SCENARIO_DECLARATIONS = null;   // ← free raw source data; SCENARIOS is the only consumer
