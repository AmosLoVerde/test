'use strict';

/* ================================================================
   js/zoom-pan.js
   ─────────────────────────────────────────────────────────────
   Zoom, pan, auto-fit e input utente (mouse drag, wheel,
   touch pan, pinch-to-zoom).

   DIPENDENZE:
     • js/state.js          → viewState, ZOOM_*, SVG_CX/CY, DOM, _getRoot,
                               _fitRafId, _fitTimeout, _vtZ/X/Y,
                               _invalidateCTM, easeIO
     • js/geometry.js       → SCENARIOS
     • js/dependency-resolver.js → scenarioKey
     • js/diagram-interaction.js → _handleDiagramClick, _hoveredGroup,
                                    _applyHoverDim, _overlayMap, _mode

   ESPORTA (globali):
     • applyViewTransform()
     • zoomBy(delta)
     • resetView()
     • sceneBBox(shapes)
     • animateFit(tZ, tX, tY)
     • scheduleFit(shapes)
   ================================================================ */


/* ── applyViewTransform ──────────────────────────────────────── */
function applyViewTransform() {
  const {zoom, panX, panY} = viewState;
  if (zoom === _vtZ && panX === _vtX && panY === _vtY) return;
  _vtZ = zoom; _vtX = panX; _vtY = panY;
  const root = _getRoot();
  root.setAttribute('transform',
    `translate(${SVG_CX+panX},${SVG_CY+panY}) scale(${zoom}) translate(${-SVG_CX},${-SVG_CY})`
  );
  _invalidateCTM();
}

/* ── _setWillChange / _clearWillChange ───────────────────────── */
/* Promotes diagram-root to GPU compositor layer ONLY while moving.
 * A permanent will-change:transform keeps the entire SVG in VRAM
 * even at rest — avoidable VRAM waste of 50–150 MB. */
let _wcClearT = null;
function _setWillChange() {
  // Safari: Core Animation manages its own compositing; will-change:transform
  // does not give the same hint benefit as on Blink and can increase memory.
  // Firefox/WebRender: WebRender already GPU-accelerates all transforms as
  // textured GPU quads regardless of will-change -- the hint is redundant
  // and still causes an immediate layer allocation.
  // Blink (Chrome/Edge/Opera): genuine GPU layer promotion benefit.
  if (!_isBlink) return;
  if (_wcClearT) { clearTimeout(_wcClearT); _wcClearT = null; }
  _getRoot().style.willChange = 'transform';
}
function _clearWillChange(delay) {
  if (!_isBlink) return;
  if (_wcClearT) clearTimeout(_wcClearT);
  _wcClearT = setTimeout(() => {
    _getRoot().style.willChange = 'auto';
    _wcClearT = null;
  }, delay || 0);
}

function zoomBy(d) {
  // Manual zoom cancels any pending auto-fit
  if (_fitTimeout) { clearTimeout(_fitTimeout); _fitTimeout=null; }
  if (_fitRafId)   { cancelAnimationFrame(_fitRafId); _fitRafId=null; }
  viewState.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, viewState.zoom+d));
  applyViewTransform();
}

function resetView() { viewState.zoom=1; viewState.panX=0; viewState.panY=0; applyViewTransform(); }


/* ── Bézier extremes helpers (for accurate bounding box) ──────── */
/* Evaluate cubic bezier scalar at parameter t */
function _bezAt(p0,p1,p2,p3,t){
  const u=1-t;
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

/* Expand (x1,y1,x2,y2) with the ACTUAL extremes of a cubic bezier segment.
   Solves dB/dt = 0 per axis — no control-point overshoot. */
function _bezExtremes(ex, x0,y0, cx1,cy1, cx2,cy2, x3,y3) {
  ex(x0,y0); ex(x3,y3);
  for (const [p0,p1,p2,p3,axis] of [
    [x0,cx1,cx2,x3,'x'], [y0,cy1,cy2,y3,'y']
  ]) {
    const a = -p0 + 3*p1 - 3*p2 + p3;
    const b =  2*p0 - 4*p1 + 2*p2;
    const c = -p0 + p1;
    const roots = [];
    if (Math.abs(a) < 1e-9) {
      if (Math.abs(b) > 1e-9) roots.push(-c/b);
    } else {
      const disc = b*b - 4*a*c;
      if (disc >= 0) {
        const sq = Math.sqrt(disc);
        roots.push((-b+sq)/(2*a), (-b-sq)/(2*a));
      }
    }
    for (const t of roots) {
      if (t>0 && t<1) {
        const v = _bezAt(p0,p1,p2,p3,t);
        axis==='x' ? ex(v, 0) : ex(0, v);  // ex ignores the other axis below
      }
    }
  }
}

/* Bounding box (SVG coords) — uses real bezier extremes, not control points. */
function sceneBBox(shapes) {
  let bx1=Infinity,by1=Infinity,bx2=-Infinity,by2=-Infinity;
  function ex(x,y){
    if(x<bx1)bx1=x; if(x>bx2)bx2=x;
    if(y<by1)by1=y; if(y>by2)by2=y;
  }
  function exPath(str) {
    if(!str) return;
    const tokens = str.trim().match(/[MmCcLlZz]|[-+]?[0-9]*\.?[0-9]+/g) || [];
    let cx=0,cy=0, cmd='';
    let i=0;
    function num(){ return parseFloat(tokens[i++]); }
    while(i<tokens.length){
      const tok=tokens[i];
      if(/[MmCcLlZz]/.test(tok)){ cmd=tok; i++; continue; }
      if(cmd==='M'||cmd==='m'){
        cx=num(); cy=num();
        if(cmd==='m'){cx+=0;cy+=0;}  // relative not used in our paths
        ex(cx,cy); cmd=cmd==='M'?'L':'l';
      } else if(cmd==='L'){
        cx=num(); cy=num(); ex(cx,cy);
      } else if(cmd==='C'){
        const c1x=num(),c1y=num(), c2x=num(),c2y=num(), ex3=num(),ey3=num();
        _bezExtremes(ex, cx,cy, c1x,c1y, c2x,c2y, ex3,ey3);
        cx=ex3; cy=ey3;
      } else { i++; } // skip unknowns
    }
  }
  for (const s of shapes) {
    if (s.type !== 'open-curve') {
      ex(s.cx-s.rx, s.cy-s.ry); ex(s.cx+s.rx, s.cy+s.ry);
    }
    // open-curve: excluded from auto-fit (arms extend beyond canvas)
  }
  return {x1:bx1,y1:by1,x2:bx2,y2:by2};
}


/* ── animateFit ──────────────────────────────────────────────── */
/* Smoothly animate viewState to (tZ,tX,tY) over 600ms ease-in-out. */
function animateFit(tZ,tX,tY) {
  if (_fitRafId){ cancelAnimationFrame(_fitRafId); _fitRafId=null; }
  const z0=viewState.zoom,px0=viewState.panX,py0=viewState.panY;
  const dz=tZ-z0,dpx=tX-px0,dpy=tY-py0;
  if(Math.abs(dz)<0.002&&Math.abs(dpx)<1&&Math.abs(dpy)<1) return;
  _setWillChange();
  const DUR=600, t0=performance.now();
  function step(now){
    const t=Math.min(1,(now-t0)/DUR);
    const e=easeIO(t);
    viewState.zoom=z0+dz*e; viewState.panX=px0+dpx*e; viewState.panY=py0+dpy*e;
    applyViewTransform();
    if(t<1){
      _fitRafId=requestAnimationFrame(step);
    } else {
      _fitRafId=null;
      _clearWillChange(200);  // brief pause then release GPU layer
    }
  }
  _fitRafId=requestAnimationFrame(step);
}


/* ── scheduleFit ─────────────────────────────────────────────── */
/* Schedule auto-fit AFTER all enter/morph animations finish (~700ms delay). */
function scheduleFit(shapes) {
  if (_fitTimeout){ clearTimeout(_fitTimeout); _fitTimeout=null; }
  _fitTimeout = setTimeout(()=>{
    _fitTimeout=null;
    if(!shapes||shapes.length===0){ animateFit(1,0,0); return; }

    // Use getBBox on diagram-root to get the TRUE bounding box of everything
    // rendered — ellipses, solid arcs AND dashed tails — nothing excluded.
    let x1, y1, x2, y2;
    try {
      const root = _getRoot();
      const savedTf = root.getAttribute('transform');
      root.removeAttribute('transform');
      const bb = root.getBBox();
      if (savedTf) root.setAttribute('transform', savedTf);
      x1 = bb.x; y1 = bb.y;
      x2 = bb.x + bb.width; y2 = bb.y + bb.height;
    } catch(_) {
      // Fallback to ellipse-only bbox
      const fb = sceneBBox(shapes);
      if(!isFinite(fb.x1)) return;
      x1=fb.x1; y1=fb.y1; x2=fb.x2; y2=fb.y2;
    }

    if(!isFinite(x1)||x2<=x1||y2<=y1) return;
    const MARGIN=45;
    const z=Math.min(ZOOM_MAX,Math.max(ZOOM_MIN,
      Math.min((800-2*MARGIN)/(x2-x1),(500-2*MARGIN)/(y2-y1))
    ));
    animateFit(z, -z*((x1+x2)/2-SVG_CX), -z*((y1+y2)/2-SVG_CY));
  }, 700);
}


/* ═══════════════════════════════════════════════════════════════
   DRAG-TO-PAN + TOUCH PAN + PINCH ZOOM  (IIFE)
════════════════════════════════════════════════════════════════ */
(function initPan(){
  let drag=false, sx=0,sy=0,spx=0,spy=0;
  // Precomputed scale factors — recalculated ONCE on drag-start, not on every
  // mousemove/touchmove frame (avoids getBoundingClientRect per frame).
  let scaleX=1, scaleY=1;
  const svg = DOM.diagramSvg || (DOM.diagramSvg = document.getElementById('diagram-svg'));

  function updateScales() {
    const r = svg.getBoundingClientRect();
    scaleX = 800 / r.width;
    scaleY = 500 / r.height;
  }

  /* ── Mouse ── */
  let _mdX=0,_mdY=0,_mdTarget=null;
  svg.addEventListener('mousedown',e=>{
    if(e.button!==0)return;
    updateScales();
    _setWillChange();
    drag=true; sx=e.clientX; sy=e.clientY; spx=viewState.panX; spy=viewState.panY;
    _mdX=e.clientX; _mdY=e.clientY; _mdTarget=e.target;
    e.preventDefault();
  });
  window.addEventListener('mousemove',e=>{
    if(!drag)return;
    viewState.panX=spx+(e.clientX-sx)*scaleX;
    viewState.panY=spy+(e.clientY-sy)*scaleY;
    applyViewTransform();
  });
  window.addEventListener('mouseup',e=>{
    // Click detection: if mouse moved < 6px → treat as click
    if(_mdTarget && _mode==='set-view'){
      const dx=e.clientX-_mdX, dy=e.clientY-_mdY;
      if(dx*dx+dy*dy<36) _handleDiagramClick(_mdTarget, e.clientX, e.clientY);
    }
    drag=false; _mdTarget=null;
    _clearWillChange(600);  // 600ms matches animateFit duration
  });
  svg.addEventListener('wheel',e=>{
    e.preventDefault();
    _setWillChange();
    zoomBy(e.deltaY<0?ZOOM_STEP:-ZOOM_STEP);
    _clearWillChange(800);
  },{passive:false});

  /* ── Touch pan, pinch zoom & tap-to-enter ── */
  let lastDist = null;
  let _tdX = 0, _tdY = 0, _tdTarget = null, _tdMoved = false;

  function touchDist(t1,t2){
    const dx=t1.clientX-t2.clientX, dy=t1.clientY-t2.clientY;
    return Math.sqrt(dx*dx+dy*dy);
  }

  svg.addEventListener('touchstart', e=>{
    e.preventDefault();
    const ts = e.touches;
    if(ts.length===1){
      updateScales();
      _setWillChange();
      drag=true; _tdMoved=false;
      sx=ts[0].clientX; sy=ts[0].clientY;
      spx=viewState.panX; spy=viewState.panY;
      lastDist=null;
      _tdX=ts[0].clientX; _tdY=ts[0].clientY;
      _tdTarget=e.target;

      if (_mode === 'set-view') {
        let g = null;
        const ovEl = e.target.closest?.('[data-overlay-for]');
        if (ovEl) {
          g = _overlayMap?.get(ovEl.dataset.overlayFor) || null;
          if (g && g._exiting) g = null;
        } else {
          g = e.target.closest?.('.cls-group, .intersection-group') || null;
          if (g && g._exiting) g = null;
        }
        if (g !== _hoveredGroup) {
          if (_hoveredGroup) _removeHov(_hoveredGroup);
          _hoveredGroup = g;
          if (_hoveredGroup) {
            _addHov(_hoveredGroup);
            _applyHoverDim(_hoveredGroup);
            svg.classList.add('has-hover');
          }
        }
      }
    } else if(ts.length===2){
      _setWillChange();
      drag=false; _tdTarget=null;
      lastDist=touchDist(ts[0],ts[1]);
    }
  },{passive:false});

  svg.addEventListener('touchmove', e=>{
    e.preventDefault();
    const ts=e.touches;
    if(ts.length===1 && drag){
      const dx=ts[0].clientX-_tdX, dy=ts[0].clientY-_tdY;
      if(dx*dx+dy*dy > 64) _tdMoved=true;  // moved > 8px → pan, not tap
      viewState.panX=spx+(ts[0].clientX-sx)*scaleX;
      viewState.panY=spy+(ts[0].clientY-sy)*scaleY;
      applyViewTransform();
    } else if(ts.length===2 && lastDist!==null){
      _tdMoved=true;
      const d=touchDist(ts[0],ts[1]);
      const delta=(d-lastDist)*0.012;
      zoomBy(delta);
      lastDist=d;
    }
  },{passive:false});

  svg.addEventListener('touchend', e=>{
    const wasDrag = _tdMoved;
    if(e.touches.length===0){ drag=false; lastDist=null; _clearWillChange(800); }
    else if(e.touches.length===1){ lastDist=null; }

    // Tap detection: single touch, moved < 8px → treat as click
    if(_tdTarget && _mode==='set-view' && !wasDrag){
      _handleDiagramClick(_tdTarget, _tdX, _tdY);
    }

    // Clear hover glow on lift if we didn't enter detail view
    if(!wasDrag && _mode==='set-view'){
      setTimeout(()=>{
        if(_hoveredGroup){ _removeHov(_hoveredGroup); _hoveredGroup=null; }
        _clearHoverDim();
        svg.classList.remove('has-hover');
      }, 180);
    }

    _tdTarget=null; _tdMoved=false;
  });
})();
