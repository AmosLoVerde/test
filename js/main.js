/* ================================================================
   js/main.js
   Tutto il JavaScript dell'applicazione in un unico file.
   Il codice è organizzato in sezioni numerate — usa Ctrl+F
   per trovare: "SECTION 9" "SECTION 5" "SECTION 6" ecc.
   SEZIONI PRINCIPALI:
     SECTION 9   — Content loader e vista dettaglio
     SECTION 9c  — Hover e click sul diagramma
     SECTION 9d  — Animazioni di immersione/emersione
     SECTION 5   — Costruzione SVG e animazioni morph
     SECTION 6   — Renderer live e transizioni scenari
     SECTION 6b  — Download diagramma SVG/PDF
     SECTION 7   — Zoom, pan, touch
     SECTION 8   — Inizializzazione (DOMContentLoaded)
   ================================================================ */


/* ═══════════════════════════════════════════════════════════════
   SECTION 9 — DETAIL VIEW — CONTENT LOADER
   ─────────────────────────────────────────────────────────────
   I config.js di ogni classe (caricati come <script>) definiscono
   la struttura in window._CLASS_MANIFEST[classId].
   I contenuti testuali vengono fetchati dai file .md indicati
   nel manifest al primo accesso, poi cachati in memoria.

   ⚠️  fetch() richiede un server — per i test locali usa:
       VS Code → tasto destro sul file → "Open with Live Server"
       oppure: python3 -m http.server 8080
════════════════════════════════════════════════════════════════ */

const _CONTENT_FOLDER_MAP = { 'NP∩co-NP': 'NP-intersect-co-NP' };
function _contentFolder(id) { return _CONTENT_FOLDER_MAP[id] || id; }

const _contentCache = new Map();

function loadClassContent(classId) {
  if (_contentCache.has(classId)) return Promise.resolve(_contentCache.get(classId));

  const manifest = (window._CLASS_MANIFEST || {})[classId];
  if (!manifest) {
    const fallback = {
      fullLabel: CLASS_DEFINITIONS[classId]?.fullName || classId,
      definition: '<p>Nessun manifest trovato per questa classe.</p>',
      problems: [],
    };
    _contentCache.set(classId, fallback);
    return Promise.resolve(fallback);
  }

  const base = `complexity_sets/${_contentFolder(classId)}`;

  // Carica definizione + tutti i .md in parallelo con una sola Promise.all
  const defPromise = fetch(`${base}/${manifest.definition}`).then(r => r.text());

  const probPromises = (manifest.problems || []).map(prob => {
    const pb = `${base}/${prob.folder}`;
    const descPromise = fetch(`${pb}/${prob.description}`).then(r => r.text());
    const exPromises  = (prob.examples || []).map(ex =>
      fetch(`${pb}/${ex.file}`).then(r => r.text())
    );
    return Promise.all([descPromise, Promise.all(exPromises)]).then(([desc, exContents]) => ({
      name:        prob.name,
      description: desc,
      examples:    prob.examples.map((ex, i) => ({ name: ex.name, content: exContents[i] })),
    }));
  });

  return Promise.all([defPromise, Promise.all(probPromises)])
    .then(([defHtml, problems]) => {
      const content = { fullLabel: manifest.fullLabel, definition: defHtml, problems };
      _contentCache.set(classId, content);
      return content;
    })
    .catch(err => {
      console.warn('[content] Impossibile caricare', classId, '—', err.message);
      const fallback = {
        fullLabel:  manifest.fullLabel || classId,
        definition: '<p>Contenuto non disponibile. Avvia un server locale per i test.</p>',
        problems:   [],
      };
      _contentCache.set(classId, fallback);
      return fallback;
    });
}


/* ═══════════════════════════════════════════════════════════════
   SECTION 9b — DETAIL VIEW COLOR HELPER
════════════════════════════════════════════════════════════════ */
function _dvColor(classId) {
  if (classId === 'NP∩co-NP') return _isLight ? '#9095FB' : '#c9a84c';
  const cls = CLASS_DEFINITIONS[classId];
  return cls ? getStyle(cls).stroke : 'var(--accent)';
}


/* ═══════════════════════════════════════════════════════════════
   SECTION 9c — DIAGRAM INTERACTION (hover + click routing)
════════════════════════════════════════════════════════════════ */

/* ── Hover dimming helpers (pure JS — no CSS animation interference) ────────
 * Instead of CSS has-hover rules, we set inline opacity via JS.
 * This way CSS animations are never interrupted → no flickering on mouse-out.
 * On hover-in:  all non-hovered groups get opacity 0.28 inline (smooth fade).
 * On hover-out: groups transition back to opacity 1, then inline style is
 *               removed (after the transition) so CSS animations resume cleanly.
 * ─────────────────────────────────────────────────────────────────────────── */
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

function initDiagramInteraction() {
  const svg = DOM.diagramSvg;
  let _mmRafPending = false;
  let _mmLastTarget = null;

  /* RAF-throttled mousemove: at 1000Hz mice, only one layout/style write per
   * animation frame (~16ms). The last event wins — no stale positions. */
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
        // Direct Map lookup via _overlayMap instead of querySelectorAll
        g = _overlayMap?.get(ovEl.dataset.overlayFor) || null;
        if (g && g._exiting) g = null;
      } else {
        g = target.closest?.('.cls-group, .intersection-group') || null;
        if (g && g._exiting) g = null;
      }

      if (g === _hoveredGroup) return;
      if (_hoveredGroup) _hoveredGroup.classList.remove('cls-hov');
      _hoveredGroup = g;
      if (_hoveredGroup) {
        _hoveredGroup.classList.add('cls-hov');
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
    if (_hoveredGroup) { _hoveredGroup.classList.remove('cls-hov'); _hoveredGroup = null; }
    _clearHoverDim();
    svg.classList.remove('has-hover');
  });
}

/* Route a click on the SVG to the correct classId — passes screen coords for zoom target */
function _handleDiagramClick(target, clientX, clientY) {
  if (_mode !== 'set-view') return;
  const ovEl = target.closest?.('[data-overlay-for]');
  if (ovEl) { enterDetailView(ovEl.dataset.overlayFor, clientX, clientY); return; }

  let el = target;
  while (el && el !== DOM.diagramSvg) {
    if (el._exiting) return;
    if (el.classList?.contains('intersection-group')) { enterDetailView('NP∩co-NP', clientX, clientY); return; }
    if (el.dataset?.classId && !el.dataset.overlayFor) { enterDetailView(el.dataset.classId, clientX, clientY); return; }
    el = el.parentElement;
  }
}

/* ── _rebuildHitOverlay ───────────────────────────────────────────────────────
 * For open-curve (Hard) classes, inserts invisible hit-area paths at the
 * correct z-position — immediately after the Hard group in DOM order.
 * This means higher-priority elements (inserted after) naturally receive
 * pointer events first, so only clicks/hovers NOT intercepted by overlapping
 * ellipses will reach these hit areas.  Correct, z-aware hit testing.
 *
 * Each hard curve gets:
 *   1. fillHit   — closed arc (solidPath + Z), pointer-events:all → interior area
 *   2. strokeHit — wide (22px) transparent stroke on arc → line area
 *   3. tailHit×2 — wide (18px) strokes on dashed tails → tail area
 * ─────────────────────────────────────────────────────────────────────────── */
/* _overlayMap: Maps classId → real SVG group element.
 * Used by the hover handler for O(1) lookup instead of querySelectorAll. */
let _overlayMap = new Map();

function _rebuildHitOverlay(root, shapes) {
  root.querySelectorAll('[data-overlay-for]').forEach(el => el.remove());
  _overlayMap = new Map();
  // Pre-populate map with all real groups (needed for O(1) hover lookup)
  for (const ch of root.children) {
    if (ch.dataset?.classId && !ch.dataset?.overlayFor) {
      _overlayMap.set(ch.dataset.classId, ch);
    }
  }

  // Sort Hard shapes by renderPriority so PSPACE-h (3) overlays are inserted
  // after NP-h/co-NP-h (1) overlays, preserving correct stacking
  const hardShapes = shapes
    .filter(s => s.type === 'open-curve')
    .sort((a,b) =>
      (CLASS_DEFINITIONS[a.id]?.renderPriority ?? 0) -
      (CLASS_DEFINITIONS[b.id]?.renderPriority ?? 0)
    );

  for (const shape of hardShapes) {
    const sp = shape.solidPath;
    if (!sp) continue;

    // Find the real group — overlay elements are inserted RIGHT AFTER it.
    // Elements with higher renderPriority are later in DOM, so they naturally
    // intercept pointer events before these overlays do.
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


/* ═══════════════════════════════════════════════════════════════
   SECTION 9d — IMMERSION / EMERGE ANIMATIONS
════════════════════════════════════════════════════════════════ */

/* Custom zoom animation with completion callback */
function _animateZoomTo(tZ, tX, tY, dur, onDone) {
  if (_immRafId) { cancelAnimationFrame(_immRafId); _immRafId = null; }
  const z0=viewState.zoom, px0=viewState.panX, py0=viewState.panY;
  const dz=tZ-z0, dpx=tX-px0, dpy=tY-py0;
  const t0=performance.now();
  function step(now) {
    const t = Math.min(1, (now-t0)/dur);
    const e = t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
    viewState.zoom = z0+dz*e;
    viewState.panX = px0+dpx*e;
    viewState.panY = py0+dpy*e;
    applyViewTransform();
    if (t < 1) { _immRafId = requestAnimationFrame(step); }
    else { _immRafId = null; if (onDone) onDone(); }
  }
  _immRafId = requestAnimationFrame(step);
}

function enterDetailView(classId, clientX, clientY) {
  if (_mode !== 'set-view') return;
  if (!CLASS_DEFINITIONS[classId] && classId !== 'NP∩co-NP') return;

  _mode = 'detail-view';
  _activeClsId = classId;
  _savedVS = { zoom: viewState.zoom, panX: viewState.panX, panY: viewState.panY };

  // Cancel any pending fit / morph animations
  if (_fitTimeout) { clearTimeout(_fitTimeout); _fitTimeout = null; }
  if (_fitRafId)   { cancelAnimationFrame(_fitRafId); _fitRafId = null; }

  // Clear hover state
  if (_hoveredGroup) { _hoveredGroup.classList.remove('cls-hov'); _hoveredGroup = null; }
  _clearHoverDim();
  DOM.diagramSvg.classList.remove('has-hover');
  document.body.classList.remove('set-view');
  document.body.classList.add('detail-view');

  // Enable download button for content export
  const dlBtn = DOM.dlBtn || (DOM.dlBtn = document.getElementById('btn-download'));
  if (dlBtn) { dlBtn.disabled = false; dlBtn.classList.remove('dl-disabled'); }

  // ── Compute zoom target ──────────────────────────────────────────
  // Prefer the exact click position in SVG coords (diagram-space).
  // Fallback: shape geometric center.
  let zoomCx = SVG_CX, zoomCy = SVG_CY;
  if (clientX !== undefined && clientY !== undefined) {
    // Convert screen click → SVG viewBox coords → diagram coords
    const svg  = DOM.diagramSvg;
    const rect = svg.getBoundingClientRect();
    const svgX = (clientX - rect.left)  / rect.width  * 800;
    const svgY = (clientY - rect.top)   / rect.height * 500;
    // Invert current zoom/pan transform to get diagram coords
    zoomCx = SVG_CX + (svgX - SVG_CX - viewState.panX) / viewState.zoom;
    zoomCy = SVG_CY + (svgY - SVG_CY - viewState.panY) / viewState.zoom;
  } else {
    // Fallback: shape center
    const shapes = SCENARIOS.get(scenarioKey(appState.applied)) || [];
    if (classId === 'NP∩co-NP') {
      const np   = shapes.find(s => s.id === 'NP'    && s.type !== 'open-curve');
      const conp = shapes.find(s => s.id === 'co-NP' && s.type !== 'open-curve');
      if (np && conp) { zoomCx = (np.cx + conp.cx) / 2; zoomCy = (np.cy + conp.cy) / 2; }
    } else {
      const sh = shapes.find(s => s.id === classId && s.type !== 'open-curve');
      if (sh) { zoomCx = sh.cx; zoomCy = sh.cy; }
    }
  }

  const IMMERSE_Z = Math.min(ZOOM_MAX, 5.0);
  const tX = -IMMERSE_Z * (zoomCx - SVG_CX);
  const tY = -IMMERSE_Z * (zoomCy - SVG_CY);

  const root = _getRoot();

  // ── Smooth immersion: ALL shapes fade out gently over 750ms ──────
  // Simultaneously, zoom slowly toward the click point (900ms).
  // Everything overlaps for a fluid, cinematic feel.

  // Phase 1 (0ms): start long gentle fade on every shape
  for (const ch of root.children) {
    ch.style.transition = 'opacity 750ms cubic-bezier(0.4,0,0.6,1)';
    ch.style.opacity = '0';
  }

  // Phase 2 (80ms): begin zoom animation — slightly delayed so fade starts first
  setTimeout(() => {
    _animateZoomTo(IMMERSE_Z, tX, tY, 900, null);
  }, 80);

  // Phase 3 (700ms): start sidebar + content transition once shapes are mostly gone
  setTimeout(async () => {
    await buildDetailSidebar(classId);

    const scv = document.getElementById('sidebar-class-view');
    const sdv = document.getElementById('sidebar-detail-view');
    const dw  = document.getElementById('diagram-wrapper');
    const cp  = document.getElementById('content-panel');

    if (scv) scv.classList.add('sv-out');
    if (dw)  dw.classList.add('dw-out');

    setTimeout(() => {
      if (sdv) sdv.classList.add('dv-in');
      setTimeout(() => {
        if (cp) cp.classList.add('cp-in');
        showContent(classId, 'definition', -1, -1);
        // Mobile bar
        // Mobile bar text update (listener is mode-aware, no need to reassign)
        const mReset = document.getElementById('btn-mobile-reset');
        if (mReset) mReset.textContent = '← Back to diagram';
        updateToggleIcon();  // refresh label: "menu" → "content"
      }, 100);
    }, 60);
  }, 700);
}

function exitDetailView() {
  if (_mode !== 'detail-view') return;

  const cp  = document.getElementById('content-panel');
  const dw  = document.getElementById('diagram-wrapper');
  const scv = document.getElementById('sidebar-class-view');
  const sdv = document.getElementById('sidebar-detail-view');

  // Phase 1 (0ms): fade out content + start sidebar swap
  if (cp)  cp.classList.remove('cp-in');
  if (sdv) sdv.classList.remove('dv-in');

  setTimeout(() => {
    if (scv) scv.classList.remove('sv-out');

    // Phase 2 (280ms): reveal diagram wrapper
    if (dw) dw.classList.remove('dw-out');
    const root = _getRoot();

    // Phase 3: restore shapes with a gentle fade-in (matches the fade-out duration)
    for (const ch of root.children) {
      ch.style.transition = 'opacity 600ms cubic-bezier(0.4,0,0.2,1)';
      ch.style.opacity = '1';
    }

    // Phase 4 (280ms): zoom back smoothly (800ms)
    if (_savedVS) {
      _animateZoomTo(_savedVS.zoom, _savedVS.panX, _savedVS.panY, 800, () => {
        // Clean up inline styles after zoom settles
        for (const ch of root.children) {
          ch.style.transition = '';
          ch.style.opacity = '';
        }
      });
    }

    // Restore download button state
    const dlBtn = DOM.dlBtn || (DOM.dlBtn = document.getElementById('btn-download'));
    if (dlBtn) {
      const empty = appState.applied.size === 0;
      dlBtn.disabled = empty;
      dlBtn.classList.toggle('dl-disabled', empty);
    }

    // Phase 5 (350ms): restore body mode classes
    setTimeout(() => {
      _mode = 'set-view';
      _activeClsId = null;
      document.body.classList.remove('detail-view');
      document.body.classList.add('set-view');
      // Mobile bar
      // Mobile bar text update (listener is mode-aware, no need to reassign)
      const mReset = document.getElementById('btn-mobile-reset');
      if (mReset) mReset.textContent = 'Reset selection';
      updateToggleIcon();  // refresh label: "content" → "menu"
    }, 350);

  }, 280);
}


/* ═══════════════════════════════════════════════════════════════
   SECTION 9e — DETAIL SIDEBAR BUILDER
════════════════════════════════════════════════════════════════ */

/* Active nav state: { type: 'definition'|'problem'|'example', pIdx, eIdx } */
let _dvActiveNav = { type: 'definition', pIdx: -1, eIdx: -1 };
/* Cached array of .dv-subitems containers — rebuilt in buildDetailSidebar */
let _dvSubCache = null;

async function buildDetailSidebar(classId) {
  const content = await loadClassContent(classId);
  if (!content) return;

  const color = _dvColor(classId);

  // Update header
  const titleEl = document.getElementById('detail-class-title');
  if (titleEl) titleEl.textContent = content.fullLabel;

  // Build nav list
  const list = document.getElementById('detail-nav-list');
  if (!list) return;
  list.innerHTML = '';

  // ── Definition item ──────────────────────────────────────────
  const defItem = _makeDvItem('definition', '§', 'Definizione', color, -1, -1, classId);
  defItem.classList.add('definition');
  list.appendChild(defItem);

  // ── Problems ─────────────────────────────────────────────────
  content.problems.forEach((prob, pi) => {
    const probSection = document.createElement('div');
    probSection.className = 'dv-section';
    probSection.id = `dv-prob-${pi}`;

    const probItem = _makeDvItem('problem', '•', prob.name, color, pi, -1, classId);
    probSection.appendChild(probItem);

    // Sub-items (examples) — closed initially, opened with CSS max-height accordion
    const subList = document.createElement('div');
    subList.className = 'dv-subitems';
    subList.id = `dv-sub-${pi}`;

    prob.examples.forEach((ex, ei) => {
      const subItem = _makeDvItem('example', '', ex.name, color, pi, ei, classId);
      subItem.classList.add('dv-subitem');
      subList.appendChild(subItem);
    });
    probSection.appendChild(subList);
    list.appendChild(probSection);
  });

  // Set default active: definition
  _dvActiveNav = { type: 'definition', pIdx: -1, eIdx: -1 };
  // Cache subitem container refs to avoid querySelectorAll on every accordion click
  _dvSubCache = list ? Array.from(list.querySelectorAll('.dv-subitems')) : null;
  _syncDvActiveClass(classId);
}

function _makeDvItem(type, bullet, label, color, pIdx, eIdx, classId) {
  const item = document.createElement('div');
  item.className = type === 'example' ? 'dv-subitem' : 'dv-item ' + type;
  item.style.setProperty('--dv-color', color);
  if (type !== 'example') {
    const bul = document.createElement('span');
    bul.className = 'dv-bullet'; bul.textContent = bullet;
    item.appendChild(bul);
  }
  const lbl = document.createElement('span');
  lbl.textContent = label;
  item.appendChild(lbl);

  item.addEventListener('click', () => {
    _dvActiveNav = { type, pIdx, eIdx };
    showContent(classId, type, pIdx, eIdx);
    _syncDvActiveClass(classId);

    // ── Exclusive accordion: only one problem's submenu open at a time ──
    if (type === 'problem') {
      // Use cached subitem container refs if available (set by buildDetailSidebar)
      const subs = _dvSubCache || document.querySelectorAll('.dv-subitems');
      for (const s of subs) {
        if (s.id !== `dv-sub-${pIdx}`) s.classList.remove('open');
      }
      const sub = document.getElementById(`dv-sub-${pIdx}`);
      if (sub) sub.classList.toggle('open');
    } else if (type === 'definition') {
      const subs = _dvSubCache || document.querySelectorAll('.dv-subitems');
      for (const s of subs) s.classList.remove('open');
    }
    // For 'example': keep its parent submenu open (already handled by _syncDvActiveClass)
  });
  return item;
}

function _syncDvActiveClass(classId) {
  const list = document.getElementById('detail-nav-list');
  if (!list) return;
  // Remove active only from elements that have it — O(active) not O(all)
  const actives = list.getElementsByClassName('active');
  // getElementsByClassName is live — iterate backwards when removing
  for (let i = actives.length - 1; i >= 0; i--) actives[i].classList.remove('active');
  const { type, pIdx, eIdx } = _dvActiveNav;

  if (type === 'definition') {
    const first = list.querySelector('.dv-item.definition');
    if (first) first.classList.add('active');
  } else if (type === 'problem') {
    const section = document.getElementById(`dv-prob-${pIdx}`);
    if (section) {
      const item = section.querySelector('.dv-item.problem');
      if (item) item.classList.add('active');
    }
  } else if (type === 'example') {
    const sub = document.getElementById(`dv-sub-${pIdx}`);
    if (sub) {
      const items = sub.querySelectorAll('.dv-subitem');
      if (items[eIdx]) items[eIdx].classList.add('active');
    }
    // Also keep parent problem highlighted
    const section = document.getElementById(`dv-prob-${pIdx}`);
    if (section) {
      const item = section.querySelector('.dv-item.problem');
      if (item) item.classList.add('active');
    }
    // Ensure sub-list is visible via CSS class
    const subList = document.getElementById(`dv-sub-${pIdx}`);
    if (subList) subList.classList.add('open');
  }
}


/* ═══════════════════════════════════════════════════════════════
   SECTION 9g — CONTENT PDF DOWNLOAD
════════════════════════════════════════════════════════════════ */
async function downloadContent() {
  const titleEl = document.getElementById('content-title');
  const textEl  = document.getElementById('content-text');
  if (!titleEl || !textEl) return;

  const title   = titleEl.textContent.trim() || 'content';
  const bodyTxt = textEl.innerText.trim()    || '';

  const btn = DOM.dlBtn || (DOM.dlBtn = document.getElementById('btn-download'));
  if (btn) btn.disabled = true;

  try {
    // Build Markdown string
    const md = [
      `# ${title}`,
      '',
      bodyTxt
        .split('\n')
        .map(l => l.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n'),  // collapse excess blank lines
      '',
      '---',
      '*Complexity Classes — Set Diagram*',
    ].join('\n');

    const safeName = title
      .replace(/[^a-zA-Z0-9\s\-–—∩]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'content';

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

  } catch (err) {
    console.error('[downloadContent]', err);
  } finally {
    if (btn) btn.disabled = false;
  }
}



async function showContent(classId, type, pIdx, eIdx) {
  const content = await loadClassContent(classId);
  if (!content) return;

  const cp = document.getElementById('content-panel');
  const titleEl = document.getElementById('content-title');
  const textEl  = document.getElementById('content-text');
  if (!cp || !titleEl || !textEl) return;

  const color = _dvColor(classId);
  cp.style.setProperty('--cp-color', color);

  let title = '', html = '';

  if (type === 'definition') {
    title = `Definizione — ${content.fullLabel}`;
    html  = content.definition;
  } else if (type === 'problem') {
    const prob = content.problems[pIdx];
    if (!prob) return;
    title = prob.name;
    html  = prob.description;
  } else if (type === 'example') {
    const prob = content.problems[pIdx];
    if (!prob) return;
    const ex = prob.examples[eIdx];
    if (!ex) return;
    title = `${prob.name} — ${ex.name}`;
    html  = ex.content;
  }

  // Crossfade: dim → update → brighten
  titleEl.style.transition = 'opacity .18s ease';
  textEl.style.transition  = 'opacity .18s ease';
  titleEl.style.opacity = '0';
  textEl.style.opacity  = '0';
  setTimeout(() => {
    titleEl.textContent = title;
    textEl.innerHTML    = html;
    titleEl.style.opacity = '1';
    textEl.style.opacity  = '1';
  }, 180);
}

'use strict';

/* ═══════════════════════════════════════════════════════════════
   SECTION 1 — DATA LAYER
   Each class is a typed relational entity.
   To extend: add an entry here, then declare all new scenarios
   in SECTION 3 — SCENARIO DECLARATIONS.
════════════════════════════════════════════════════════════════ */
/* CLASS_DEFINITIONS e CLASS_GROUPS sono caricati da:
   setting_sets/class-definitions.js          */
let _updateTimer = null;
let _lensEl      = null;  // persistent lens DOM element
let _lensNPKey   = null;  // fingerprint of last NP geometry used for lens
let _lensRebuildT= null;  // pending lens rebuild timeout
let _lensRafId   = null;  // RAF handle for smooth lens sync animation



/* ═══════════════════════════════════════════════════════════════
   SECTION 2b — DEPENDENCY RESOLVER
   Chain example: NP-h → NP-c → NP  (all auto-added)
════════════════════════════════════════════════════════════════ */

/* Pre-computed transitive parent sets — built once at parse time, O(1) lookup.
   Eliminates live BFS on every cascadeDeselect call. */
const _TRANSITIVE_PARENTS = (() => {
  const m = new Map();
  for (const id of Object.keys(CLASS_DEFINITIONS)) {
    const out = new Set();
    const q = [id]; let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++];
      for (const p of (CLASS_DEFINITIONS[cur]?.implicitParents ?? [])) {
        if (!out.has(p)) { out.add(p); q.push(p); }
      }
    }
    m.set(id, out);
  }
  return m;
})();

/* BFS: expands sel with all transitive implicitParents.
   Uses index pointer instead of shift() — O(1) dequeue vs O(n). */
function resolveImplicitDependencies(sel) {
  const out = new Set(sel);
  const q   = [...sel]; let qi = 0;
  while (qi < q.length) {
    const id = q[qi++];
    for (const pid of (CLASS_DEFINITIONS[id]?.implicitParents ?? [])) {
      if (!out.has(pid)) { out.add(pid); q.push(pid); }
    }
  }
  return out;
}

/* O(1) lookup from pre-computed Map — no live BFS. */
function getTransitiveParents(id) { return _TRANSITIVE_PARENTS.get(id) ?? new Set(); }

/* Remove removedId and any class whose implicitParents chain includes it. */
function cascadeDeselect(removedId, explicit) {
  explicit.delete(removedId);
  for (const id of [...explicit]) {
    if (getTransitiveParents(id).has(removedId)) explicit.delete(id);
  }
}

/* ── Detail-view mode state ── */
let _mode         = 'set-view';   // 'set-view' | 'detail-view'
let _savedVS      = null;         // saved {zoom,panX,panY} before immersion
let _activeClsId  = null;         // classId currently drilled into
let _hoveredGroup = null;         // currently hovered SVG group
let _immRafId     = null;         // RAF handle for immersion zoom animation

/* 32 ms debounce */
function scheduleUpdate() {
  clearTimeout(_updateTimer);
  _updateTimer = setTimeout(executeUpdate, 32);
}



/* ═══════════════════════════════════════════════════════════════
   SECTION 3 — SCENARIO DECLARATIONS
   ─────────────────────────────────────────────────────────────
   Scenarios ordered by: (1) number of sets, (2) containment order.
   Within same length, P-first sets come before NP-first, etc.
   Containment order: P | NP | co-NP | NP-c | co-NP-c | NP-h | co-NP-h | PSPACE | PSPACE-c | PSPACE-h

   IDs: P, NP, co-NP, NP-c, co-NP-c, NP-h, co-NP-h, PSPACE, PSPACE-c, PSPACE-h

   ── COORDINATE SYSTEM ───────────────────────────────────────────
   Origin (0,0) = centre of canvas.
     x > 0 → right   x < 0 → left
     y > 0 → up      y < 0 → down
   Canvas range: approx ±400 x, ±250 y.
   toSVGCoords() converts at startup: x_svg=x+400, y_svg=250−y

   ── ELLIPSE FIELDS ───────────────────────────────────────────────
   { id, cx, cy, rx, ry, rotation?, lx, ly, la }
     cx,cy   = centre  |  rx,ry = semi-axes  |  rotation = degrees
     lx,ly   = label position  |  la = 'middle'|'start'|'end'

   ── OPEN-CURVE FIELDS — format A (simplified, recommended) ──────
   { id, type:'open-curve',
     p0x, p2x, armY, pm:{x,y}, tailLength,
     rotate?, labelX?, labelY?, labelAnchor? }
     p0         = {x,y} left  arm tip
     pm         = {x,y} bowl bottom
     p2         = {x,y} right arm tip
     height     = y-level BOTH tails reach after rotation (same for both)
     rotate     = degrees around arm midpoint  (default 0)
                  → tails extend tangentially, both stop at y = height

   ── OPEN-CURVE FIELDS — format B (manual, for asymmetric shapes) ─
   { id, type:'open-curve', solidPath, leftTail, rightTail,
     labelX, labelY, labelAnchor }
     solidPath         = 'M x0 y0 C cx1 cy1 cx2 cy2 x1 y1'
     leftTail/rightTail = 'M x y L x2 y2'

   ── HOW TO ADD A NEW CLASS ─────────────────────────────────────
   1. Add to CLASS_DEFINITIONS (Section 1).
   2. Add its position in the ORDER array in scenarioKey().
   3. Declare all scenarios it participates in below.
   4. Done — runtime picks up new keys automatically.
   ═══════════════════════════════════════════════════════════════ */

/* SCENARIO_DECLARATIONS è caricato da:
   setting_sets/scenarios.js                  */

/* ── scenarioKey ───────────────────────────────────────────────────────────────
 * Canonical scenario key: IDs sorted by containment order, joined with '|'. */
const _SCENARIO_ORDER = ['P','NP','co-NP','NP-c','co-NP-c','NP-h','co-NP-h','PSPACE','PSPACE-c','PSPACE-h'];
const _SCENARIO_ORDER_MAP = new Map(_SCENARIO_ORDER.map((id, i) => [id, i]));

function scenarioKey(activeSet) {
  if (!activeSet || activeSet.size === 0) return '';
  return [...activeSet]
    .sort((a, b) => (_SCENARIO_ORDER_MAP.get(a) ?? 99) - (_SCENARIO_ORDER_MAP.get(b) ?? 99))
    .join('|');
}

/* ── _parabolaFromPoints ──────────────────────────────────────────────────────
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
 *    Margin = x_arm_approx · 2 + 100  (guarantees t0,t1 ∈ [0,1] for |rotate|<63°)
 * 3. Build a symmetric Bézier from (−x_arm, y_arm) to (+x_arm, y_arm) through pm:
 *    cpY = (8·pm.y − 2·y_arm) / 6  (vertical tangents, exact bowl depth)
 * 4. Rotate all four Bézier control points around (0, height) by `rotate` degrees.
 * 5. Bisect within [0, 0.5) and (0.5, 1] to find t₀, t₁ where rotated curve
 *    crosses y = height.  Both ts are always inside [0,1] by design.
 * 6. De Casteljau's algorithm extracts the exact sub-Bézier [t₀, t₁].
 *    Both endpoints are at y = height. ✓
 * 7. Tails extend tangentially from each endpoint for `tailLength` units.
 * ────────────────────────────────────────────────────────────────────────── */
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
const _SVG_OX = 400, _SVG_OY = 250;
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
 * Rules:
 *   • An entry { 'import-scenario': 'KEY' } is replaced by the fully-resolved
 *     shapes of SCENARIO_DECLARATIONS['KEY'] (import-entries in that list are
 *     expanded too, and so on down the chain).
 *   • Normal shape descriptors (objects with an `id` field) are passed through
 *     unchanged.
 *   • Circular imports are detected via a `visited` Set and produce a console
 *     warning; the offending import is silently skipped (safe degradation).
 *   • An import referencing an unknown key also warns and is skipped.
 *
 * Override semantics — last-write-wins per id:
 *   • import-scenario BEFORE local {...} descriptors:
 *     The local descriptors appear later in the flat array, so they win.
 *     Any id present in both the import and the local block is resolved
 *     to the local descriptor (the imported one is discarded).
 *     Example: [{'import-scenario':'A'}, {id:'NP-h', ...new geometry...}]
 *     → NP-h uses the local geometry, all other shapes come from A.
 *
 *   • import-scenario AFTER local {...} descriptors:
 *     The import appears later in the flat array. Used when there are no
 *     shared ids — the import simply appends shapes not already declared.
 *     Example: [{id:'PSPACE-c',...}, {'import-scenario':'A'}]
 *     → PSPACE-c is local, everything else from A; no id overlap expected.
 *
 * Deduplication: after full expansion, the flat array is deduplicated by id
 * using last-write-wins (a reverse scan keeps only the final occurrence of
 * each id, in its original array position). This guarantees the renderer
 * always receives exactly one descriptor per id — no stacked SVG elements.
 *
 * Usage (internal — called once at parse-time to build SCENARIOS):
 *   resolveScenarioImports('P|NP|PSPACE', new Set())
 *   → returns the flat, deduplicated array of shape descriptors in display coords
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
  // Entries without an id (shouldn't occur, but safe) are always kept.
  const lastIdx = new Map();   // id → last index in flat[]
  for (let i = 0; i < flat.length; i++) {
    if (flat[i].id !== undefined) lastIdx.set(flat[i].id, i);
  }
  return flat.filter((entry, i) =>
    entry.id === undefined || lastIdx.get(entry.id) === i
  );
}

/* SCENARIOS — O(1) lookup map. Shapes converted to SVG coords once at startup.
 * resolveScenarioImports() expands any {'import-scenario':'KEY'} entries before
 * toSVGCoords() runs, so the rest of the engine never sees import directives.
 * SCENARIO_DECLARATIONS is nulled immediately after — frees all raw descriptors.
 *
 * PERF: open-curve shapes also get pre-parsed numeric arrays (_arc8, _lt4, _rt4)
 * so the morphGroup RAF loop never runs regex or string ops in the hot path. */
const _BOWL_RE_PARSE = /^M\s*([\d.-]+)\s+([\d.-]+)\s+C\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)$/;
const _TAIL_RE_PARSE = /^M\s*([\d.-]+)\s+([\d.-]+)\s+L\s*([\d.-]+)\s+([\d.-]+)$/;

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

const SCENARIOS = new Map(
  Object.keys(SCENARIO_DECLARATIONS).map(key =>
    [key, resolveScenarioImports(key).map(toSVGCoords).map(_preParseCurveShape)]
  )
);
SCENARIO_DECLARATIONS = null;   // ← free raw source data; SCENARIOS is the only consumer




/* ═══════════════════════════════════════════════════════════════
   SECTION 5 — SVG RENDERER
════════════════════════════════════════════════════════════════ */
const SVG_NS = 'http://www.w3.org/2000/svg';
/* Shared ease-in-out (quadratic). Used by all RAF morphs. */
const easeIO = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
const svgEl = (tag, attrs={}) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
  return el;
};

/* Cached sidebar-open state — mirrors body.sidebar-open class.
   Set/unset in toggleSidebar(); read O(1) in updateToggleIcon(). */
let _sidebarOpen = true;   // body starts with class="sidebar-open"

/* Guard: buildSVGDefs() is called on every executeUpdate(); without this guard it
   recreates 10 feGaussianBlur/feMerge/feDropShadow filter elements on every
   checkbox click even when nothing changed. Cost: O(1) check → early return. */
let _defsTheme = null;
function buildSVGDefs() {
  const theme = _isLight ? 'light' : 'dark';
  if (_defsTheme === theme) return;   // filters already correct for this theme
  _defsTheme = theme;
  const defs = DOM.svgDefs || (DOM.svgDefs = document.getElementById('svg-defs'));
  // Preserve BOTH lens clip-paths across rebuilds (clearing them causes the artifact).
  const savedClipNP   = defs.querySelector('#lens-np-clip');
  const savedClipCoNP = defs.querySelector('#lens-conp-clip');
  defs.innerHTML = '';
  if (savedClipNP)   defs.appendChild(savedClipNP);
  if (savedClipCoNP) defs.appendChild(savedClipCoNP);
  for (const cls of Object.values(CLASS_DEFINITIONS)) {
    const sid = cls.sid;   // precomputed in CLASS_DEFINITIONS — no regex at runtime
    const f   = svgEl('filter', { id:`glow-${sid}`, x:'-30%', y:'-30%', width:'160%', height:'160%' });
    if (_isLight) {
      // Light mode: very subtle drop-shadow, no glow bloom
      const drop = svgEl('feDropShadow', {
        dx:'0', dy:'1', stdDeviation:'2',
        'flood-color': cls.styleDark.stroke,   // use dark colour for contrast
        'flood-opacity':'0.18',
      });
      f.appendChild(drop);
    } else {
      // Dark mode: soft glow bloom
      const b = svgEl('feGaussianBlur', { in:'SourceGraphic', stdDeviation:'3.5', result:'blurred' });
      const m = svgEl('feMerge');
      m.appendChild(svgEl('feMergeNode', { in:'blurred' }));
      m.appendChild(svgEl('feMergeNode', { in:'SourceGraphic' }));
      f.appendChild(b); f.appendChild(m);
    }
    defs.appendChild(f);
  }
}

function renderDiagram(shapes) {
  const root  = DOM.root  || (DOM.root  = document.getElementById('diagram-root'));
  const empty = DOM.empty || (DOM.empty = document.getElementById('empty-state'));
  root.innerHTML = '';

  if (shapes.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  buildSVGDefs();

  for (const sh of shapes) root.appendChild(buildShapeGroup(sh, shapes));
}

function buildShapeGroup(shape, allShapes) {
  return shape.type === 'open-curve'
    ? buildOpenCurveGroup(shape)
    : buildEllipseGroup(shape, allShapes);
}

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
    filter:`url(#glow-${sid})`,
  }, shape.rotation ? { transform:`rotate(${shape.rotation},${shape.cx},${shape.cy})` } : {}));
  g.appendChild(ellipseEl);
  g._ellipseEl = ellipseEl;   // cached ref — avoids querySelector in morphGroup

  const txt = svgEl('text',{
    x:lx, y:ly,
    'text-anchor':la, 'dominant-baseline':'middle',
    fill:st.stroke, 'fill-opacity':'0.95',
    'font-family':'EB Garamond, Georgia, serif',
    'font-style':'italic', 'font-size':'15', 'font-weight':'700',
    'pointer-events':'none',
  });
  txt.textContent = cls.label;
  g.appendChild(txt);
  g._textEl = txt;             // cached ref — avoids querySelector in morphGroup
  return g;
}

/**
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

/**
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




/* ═══════════════════════════════════════════════════════════════
   SECTION 6 — SIDEBAR + DYNAMIC LIVE RENDERER
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
      const dur     = 520;
      const tick = now => {
        const t   = Math.min(1, (now - start) / dur);
        const e   = easeIO(t);
        const cx  = fromCx + (shape.cx - fromCx) * e;
        const cy  = fromCy + (shape.cy - fromCy) * e;
        const rx  = fromRx + (shape.rx - fromRx) * e;
        const ry  = fromRy + (shape.ry - fromRy) * e;
        const rot = fromRot + (targetRot - fromRot) * e;
        // Direct numeric assignment — no string allocation, no DOM attribute parsing.
        el.cx.baseVal.value = cx;
        el.cy.baseVal.value = cy;
        el.rx.baseVal.value = rx;
        el.ry.baseVal.value = ry;
        if (Math.abs(rot) > 0.01 || Math.abs(fromRot) > 0.01)
          el.setAttribute('transform', `rotate(${rot.toFixed(2)},${cx.toFixed(2)},${cy.toFixed(2)})`);
        else
          el.removeAttribute('transform');
        // Fused label update — no extra RAF
        if (g._txtEl && g._txtTarget) {
          g._txtEl.setAttribute('x', (g._txtStart.x + (g._txtTarget.x - g._txtStart.x)*e).toFixed(1));
          g._txtEl.setAttribute('y', (g._txtStart.y + (g._txtTarget.y - g._txtStart.y)*e).toFixed(1));
        }
        g._geoRaf = t < 1 ? requestAnimationFrame(tick) : null;
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

    // All field names come directly from SCENARIO_DECLARATIONS (no aliasing needed)
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
    // This avoids re-running regex and .map(Number) on every morph call.
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

      const dur = 520;
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
        // Sync hover-fill (full area: tail-end → arc → tail-end → close)
        if (g._hoverFill) g._hoverFill.setAttribute('d', _buildHoverFillPath({
          solidPath: newSolid, leftTail: newLeft, rightTail: newRight,
        }));
        // Sync overlay hit elements via cached refs (avoids querySelectorAll per frame)
        if (g._ovEls) {
          const oe = g._ovEls;
          if (oe[0]) oe[0].setAttribute('d', _buildHoverFillPath({solidPath:newSolid,leftTail:newLeft,rightTail:newRight}));
          if (oe[1]) oe[1].setAttribute('d', newSolid);
          if (oe[2]) oe[2].setAttribute('d', newLeft);
          if (oe[3]) oe[3].setAttribute('d', newRight);
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

/*
 * insertAtZOrder(root, g, id)
 * Place new group at the correct SVG z-position without moving existing groups.
 * Lower renderPriority = earlier in DOM (behind).
 * Higher renderPriority = later (in front, e.g. P=30 is always on top).
 */
function insertAtZOrder(root, g, id) {
  const pri = CLASS_DEFINITIONS[id]?.renderPriority ?? 50;
  // Iterate direct children — skip exiting groups AND hit-overlay elements
  // (overlays have data-overlay-for and must never influence z-order of real groups)
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

/* ── Persistent lens: create once, morph in-place forever ── */
/*
 * updateLens(root, shapes, hasNewEntrants)
 *
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

  /* Compute label Y for NP∩co-NP:
     - dualMode+hard (rotated): centre of the two ellipses minus 50
     - no P, no NP-C, no co-NP-C: at mid-height (cy) for visual coherence with NP/co-NP labels
     - has P: 30px above P (rises out of the way)
     - no P: always mid-height (cy), even if NP-C/co-NP-C are present
     - has P: 30px above P's top border */
  function computeLabelY() {
    if (np.rotation) return Math.round((np.cy + conp.cy) / 2 - 50);
    // Rise only when P is selected — align with NP/co-NP label height
    const pSh = shapes.find(s => s.id === 'P' && s.type !== 'open-curve');
    if (pSh) return Math.round(np.cy - np.ry * 0.55);
    return Math.round((np.cy + conp.cy) / 2);
  }

  function buildLensEl() {
    // Dual nested clipping: rect clipped by NP, then by co-NP → exactly NP∩co-NP
    syncClipEl('lens-np-clip',   np.cx,   np.cy,   np.rx,   np.ry,   npRot);
    syncClipEl('lens-conp-clip', conp.cx, conp.cy, conp.rx, conp.ry, conpRot);

    const g    = svgEl('g', { class:'intersection-group' });
    const gNP  = svgEl('g', { 'clip-path':'url(#lens-np-clip)' });
    const gCNP = svgEl('g', { 'clip-path':'url(#lens-conp-clip)' });

    // Full-canvas rect — clipped to NP∩co-NP by the nested groups
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

    // Cache clip ellipse refs once (stable for the duration of this morph)
    const _svgDefs  = DOM.svgDefs || (DOM.svgDefs = document.getElementById('svg-defs'));
    const _cpNPel   = _svgDefs.querySelector('#lens-np-clip ellipse');
    const _cpCoNPel = _svgDefs.querySelector('#lens-conp-clip ellipse');

    // Cache live ellipse refs ONCE before entering the RAF loop —
    // avoids two querySelector calls (each touching DOM) on every 60fps frame.
    const _npLiveEl  = root.querySelector('[data-class-id="NP"]:not(.cls-exiting) ellipse');
    const _conpLiveEl= root.querySelector('[data-class-id="co-NP"]:not(.cls-exiting) ellipse');

    function lensAnimTick(now) {
      if (!_lensEl || !_lensEl.isConnected) { _lensRafId = null; return; }
      const t = Math.min(1, (now - start) / ANIM_DUR);
      const e = easeIO(t);

      // Track live NP ellipse → update #lens-np-clip
      // SVGAnimatedLength.baseVal.value: direct numeric r/w, no string parse/serialize.
      if (_cpNPel && _npLiveEl) {
        _cpNPel.cx.baseVal.value = _npLiveEl.cx.baseVal.value;
        _cpNPel.cy.baseVal.value = _npLiveEl.cy.baseVal.value;
        _cpNPel.rx.baseVal.value = _npLiveEl.rx.baseVal.value;
        _cpNPel.ry.baseVal.value = _npLiveEl.ry.baseVal.value;
        const tf = _npLiveEl.getAttribute('transform');
        if (tf) _cpNPel.setAttribute('transform', tf); else _cpNPel.removeAttribute('transform');
      }

      // Track live co-NP ellipse → update #lens-conp-clip
      if (_cpCoNPel && _conpLiveEl) {
        _cpCoNPel.cx.baseVal.value = _conpLiveEl.cx.baseVal.value;
        _cpCoNPel.cy.baseVal.value = _conpLiveEl.cy.baseVal.value;
        _cpCoNPel.rx.baseVal.value = _conpLiveEl.rx.baseVal.value;
        _cpCoNPel.ry.baseVal.value = _conpLiveEl.ry.baseVal.value;
        const ctf = _conpLiveEl.getAttribute('transform');
        if (ctf) _cpCoNPel.setAttribute('transform', ctf); else _cpCoNPel.removeAttribute('transform');
      }

      if (lbl) lbl.setAttribute('y', Math.round(lblYStart + (lblYEnd - lblYStart) * e));
      _lensRafId = t < 1 ? requestAnimationFrame(lensAnimTick) : null;
    }

    _lensNPKey = npKey;
    // Immediately sync both clip paths to target geometry
    syncClipEl('lens-np-clip',   np.cx,   np.cy,   np.rx,   np.ry,   npRot);
    syncClipEl('lens-conp-clip', conp.cx, conp.cy, conp.rx, conp.ry, conpRot);
    placeLens(_lensEl);
    _lensRafId = requestAnimationFrame(lensAnimTick);
  }
}

/* ═══ SCENARIO TRANSITION ═══════════════════════════════════════
 * transitionToScenario(newShapes)
 *
 * Pure animation layer — takes a pre-computed shape array and
 * animates from the current DOM state to it.
 *
 * Responsibilities:
 *   • Exit groups whose ID is no longer in newShapes
 *   • Morph existing groups to their new geometry in-place
 *   • Enter new groups with staggered animation
 *   • Update/rebuild the NP∩co-NP lens overlay
 *   • Schedule auto-fit after animations settle
 *
 * This function has NO knowledge of user input, dependency
 * resolution, or scenario lookup — it only animates shapes.
 * Decoupling it from executeUpdate() makes both testable and
 * makes adding new animation styles straightforward.
 */
function transitionToScenario(newShapes) {
  const root  = DOM.root  || (DOM.root  = document.getElementById('diagram-root'));
  const empty = DOM.empty || (DOM.empty = document.getElementById('empty-state'));
  // Invalidate tooltip lens cache — new shapes may move/remove NP, co-NP ellipses.
  if (typeof _invalidateLensCache === 'function') _invalidateLensCache();

  if (newShapes.length === 0) {
    root.querySelectorAll('.cls-group').forEach(exitGroup);
    // Remove all hit-overlay elements
    root.querySelectorAll('[data-overlay-for]').forEach(el => el.remove());
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

  // Snapshot currently live (non-exiting) groups.
  // root.children is a live HTMLCollection — no querySelectorAll allocation.
  const live = new Map();
  for (const ch of root.children) {
    if (!ch._exiting && ch.dataset?.classId) live.set(ch.dataset.classId, ch);
  }

  // Exit groups that are no longer in the new scenario
  for (const [id, g] of live) {
    if (!newById.has(id)) exitGroup(g);
  }

  // Morph existing groups in-place; enter new ones with stagger
  let enterIdx       = 0;
  let hasNewEntrants = false;
  for (const shape of newShapes) {
    const existing = live.get(shape.id);
    if (existing && !existing._exiting) {
      const wasOpenCurve = !!existing.querySelector('path[d]');
      const isOpenCurve  = shape.type === 'open-curve';
      if (wasOpenCurve !== isOpenCurve) {
        // Type changed (rare): exit old, enter new
        exitGroup(existing);
        const ng = buildShapeGroup(shape, newShapes);
        ng.classList.add('cls-entering');
        ng.style.animationDelay = (enterIdx++ * 52) + 'ms';
        insertAtZOrder(root, ng, shape.id);
      } else {
        // Smooth in-place RAF morph — no DOM movement, no animation restart
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

  // Update lens — only rebuilds if NP/co-NP geometry actually changed
  updateLens(root, newShapes, hasNewEntrants);

  // Rebuild hit overlay for Hard-curve shapes (must run after all groups are in place
  // so overlay elements are appended last = topmost z-order in the root)
  _rebuildHitOverlay(root, newShapes);

  // Auto-fit: after animations finish, smoothly zoom/pan to show full scene
  scheduleFit(newShapes);
}


/* ═══ CORE LIVE UPDATE ══════════════════════════════════════════
 * executeUpdate()
 *
 * Dispatcher: resolves user input → scenario key → shapes →
 * hands off to transitionToScenario().
 *
 * This function owns:
 *   • Dependency resolution  (resolveImplicitDependencies)
 *   • Parent promotion       (explicit ← applied)
 *   • State mutation         (appState.applied)
 *   • Checkbox sync          (syncCheckboxes)
 *   • Scenario lookup        (SCENARIOS.get)
 *
 * It does NOT own animation — that belongs to transitionToScenario().
 */
function executeUpdate() {
  const res = resolveImplicitDependencies(appState.explicit);

  // Promote: auto-resolved parents become independent explicit selections.
  // Effect: deselecting NP-Hard will NOT auto-remove NP-C / NP if the user
  // had also selected them directly before.
  for (const id of res) appState.explicit.add(id);
  const prevApplied = appState.applied;   // snapshot for O(changed) checkbox diff
  appState.applied = res;
  syncCheckboxes(res, prevApplied);

  // Empty selection — clear the diagram immediately, no scenario lookup needed.
  // (scenarioKey returns '' for an empty set; SCENARIOS has no '' entry, so the
  //  lookup below would return undefined and the old guard silently returned
  //  without clearing the canvas — that was the bug.)
  if (res.size === 0) {
    transitionToScenario([]);
    return;
  }

  // O(1) scenario lookup — geometry is pre-declared in SCENARIO_DECLARATIONS
  const key       = scenarioKey(res);
  const newShapes = SCENARIOS.get(key);
  if (!newShapes) {
    // This should never happen — all valid combinations are pre-declared.
    console.warn('[Complexity] Unknown scenario key:', key);
    return;
  }

  transitionToScenario(newShapes);
}

// Cached CTM for tooltip hit-testing.
// getScreenCTM() forces a synchronous layout recalc — very expensive on mousemove.
// We cache it and invalidate only when zoom/pan changes (applyViewTransform).
let _ctmCache = null;
function _invalidateCTM() { _ctmCache = null; }
function _getCtm() {
  if (!_ctmCache) _ctmCache = _getRoot().getScreenCTM();
  return _ctmCache;
}
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
     once per content update and cache until the next change.
     Conservative max-width estimate: 220px; fixed 2-line height: 56px. */
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
    // Reuse cached SVGPoint — avoids per-mousemove object allocation.
    if (!_svgPt) _svgPt = svg.createSVGPoint();
    _svgPt.x = clientX; _svgPt.y = clientY;
    return _svgPt.matrixTransform(ctm.inverse());
  }

  function insideEllipse(dpx, dpy, el) {
    // SVGAnimatedLength.baseVal.value: direct number, no string parse
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

  // Cached ellipse refs for lens hit-testing — invalidated when transitionToScenario fires.
  // Avoids up to 5 querySelectorAll calls per mousemove when the lens is visible.
  let _cachedNPEl = null, _cachedCoNPEl = null, _cachedHigherEls = null;
  let _lensScenarioKey = null;

  function _invalidateLensCache() {
    _cachedNPEl = null; _cachedCoNPEl = null; _cachedHigherEls = null;
    _lensScenarioKey = null;
  }

  function _ensureLensCache(root) {
    const key = _lensEl ? _lensEl.dataset?.sceneKey || '' : '';  // invalidated by reference
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

    // Prefer labeled foreground elements if cursor is inside them.
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

      // Walk up from actual target to find a labelled group
      let el = e.target;
      while (el && el !== svg) {
        if (el._exiting) { hideTip(); return; }

        if (el.classList?.contains('intersection-group')) {
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

/* ═══ SIDEBAR ════════════════════════════════════════════════════ */
function buildSidebar() {
  const list = DOM.classList || (DOM.classList = document.getElementById('class-list'));
  list.innerHTML = '';

  /* ── Single delegated change-listener on the container (replaces N per-item
     listeners). No closure-per-item allocation; one handler for all checkboxes.
     Benchmark: 10 addEventListener calls → 1. ── */
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

function resetAll() {
  const prevApplied = new Set(appState.applied);  // snapshot for diff
  appState.explicit.clear(); appState.applied = new Set();
  syncCheckboxes(appState.applied, prevApplied);   // only clears what was on

  const dlBtn = DOM.dlBtn || (DOM.dlBtn = document.getElementById('btn-download'));
  if (dlBtn) { dlBtn.disabled = true; dlBtn.classList.add('dl-disabled'); }
  const dlMobile = DOM.dlMobile || (DOM.dlMobile = document.getElementById('btn-mobile-download'));
  if (dlMobile) { dlMobile.disabled = true; dlMobile.classList.add('dl-disabled'); }

  if (_fitTimeout) { clearTimeout(_fitTimeout); _fitTimeout = null; }
  if (_lensRebuildT) { clearTimeout(_lensRebuildT); _lensRebuildT = null; }
  if (_lensRafId)   { cancelAnimationFrame(_lensRafId); _lensRafId = null; }

  const root = _getRoot();

  // Collect live groups ordered by renderPriority descending (inner → outer)
  // so the smallest/innermost shapes fade first, PSPACE last — most elegant visually
  // root.children: no querySelectorAll, no NodeList allocation.
  const groups = Array.from(root.children).filter(g => !g._exiting && !g.classList.contains('cls-reset-exit') && g.dataset?.classId);
  groups.sort((a,b) => {
    const pa = CLASS_DEFINITIONS[a.dataset.classId]?.renderPriority ?? 50;
    const pb = CLASS_DEFINITIONS[b.dataset.classId]?.renderPriority ?? 50;
    return pb - pa; // descending: P (30) first, PSPACE (2) last
  });

  const STEP = 55;   // ms between each shape's exit start
  const DUR  = 520;  // total duration of a single exit animation (ms)

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

  // Lens (NP∩co-NP) fades in sync with NP/co-NP shapes (priority 10),
  // i.e. after P and NP-C/co-NP-C but before Hard curves and PSPACE.
  if (_lensEl) {
    const npIndex = groups.findIndex(g =>
      g.dataset.classId === 'NP' || g.dataset.classId === 'co-NP'
    );
    const lensDelay = (npIndex >= 0 ? npIndex : Math.min(1, groups.length)) * STEP;
    // Use the same CSS animation as the other shapes so the fade is identical
    _lensEl.style.animationDelay    = lensDelay + 'ms';
    _lensEl.style.animationDuration = '0.52s';
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
  // Note: DOM.empty may not be cached yet during reset cascade, defensive fallback kept
  }, totalDur);

  // Smooth pan back to center after everything has faded
  scheduleFit([]);
}

/* ═══════════════════════════════════════════════════════════════
   THEME + SIDEBAR TOGGLE ICONS
════════════════════════════════════════════════════════════════ */

const SVG_CHEVRON_LEFT = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 3 5 8 10 13"/></svg>`;
const SVG_CHEVRON_RIGHT= `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 3 11 8 6 13"/></svg>`;
const SVG_SUN  = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="2.5"/><line x1="8" y1="13.5" x2="8" y2="15"/><line x1="1" y1="8" x2="2.5" y2="8"/><line x1="13.5" y1="8" x2="15" y2="8"/><line x1="3.1" y1="3.1" x2="4.2" y2="4.2"/><line x1="11.8" y1="11.8" x2="12.9" y2="12.9"/><line x1="12.9" y1="3.1" x2="11.8" y2="4.2"/><line x1="4.2" y1="11.8" x2="3.1" y2="12.9"/></svg>`;
const SVG_MOON = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12.5 10.5A6 6 0 0 1 5.5 3.5a6 6 0 1 0 7 7z"/></svg>`;

const SVG_CHEVRON_UP   = `<polyline points="3 10 8 5 13 10"/>`;
const SVG_CHEVRON_DOWN = `<polyline points="3 6 8 11 13 6"/>`;

function updateToggleIcon() {
  const isOpen = _sidebarOpen;
  const btn    = DOM.btnToggle || (DOM.btnToggle = document.getElementById('btn-toggle'));
  btn.innerHTML       = isOpen ? SVG_CHEVRON_LEFT : SVG_CHEVRON_RIGHT;
  btn.title           = isOpen ? 'Collapse sidebar' : 'Expand sidebar';
  btn.setAttribute('aria-label', btn.title);

  // Mobile bar: chevron down = hide, chevron up = show
  // In detail-view the sidebar contains the nav list → label says "content" not "menu"
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
  _isLight = light;          // update cached flag — read O(1) everywhere
  _defsTheme = null;         // force SVG filter rebuild for new theme
  document.body.classList.toggle('light', light);
  updateThemeIcon();
  // Update sidebar colors without destroying and rebuilding DOM nodes.
  // Only --cls-color custom properties and swatch inline styles need updating.
  if (DOM.chkMap) {
    for (const [id, {chk, item}] of DOM.chkMap) {
      const newColor = getStyle(CLASS_DEFINITIONS[id]).stroke;
      item.style.setProperty('--cls-color', newColor);
      chk.style.setProperty('--cls-color', newColor);
      const sw = item.querySelector('.cls-swatch');
      if (sw) { sw.style.background = newColor; sw.style.boxShadow = `0 0 5px ${newColor}88`; }
    }
  } else {
    buildSidebar();  // first-time fallback (chkMap not yet populated)
  }
  if (appState.applied.size > 0) {
    buildSVGDefs();
    // Rebuild all shape groups with new colors (full re-render)
    const root  = DOM.root || (DOM.root = document.getElementById('diagram-root'));
    // Lookup shapes from pre-declared SCENARIOS — no computeLayout needed
    const shapes = SCENARIOS.get(scenarioKey(appState.applied)) || [];
    root.innerHTML = '';
    if (_lensRafId) { cancelAnimationFrame(_lensRafId); _lensRafId = null; }
    if (_lensEl) _lensEl = null;
    _lensNPKey = null;
    for (const sh of shapes) root.appendChild(buildShapeGroup(sh, shapes));
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
  // Show/hide theme button with sidebar state
  themeBtn.style.display = _sidebarOpen ? '' : 'none';
  const isOpen = _sidebarOpen;
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

/* ═══════════════════════════════════════════════════════════════
   SECTION 6b — DOWNLOAD (PDF / SVG vector fallback)
════════════════════════════════════════════════════════════════ */

/**
 * Export the current diagram as a full-scene SVG (vector).
 *
 * Core fix: the live SVG has viewBox="0 0 800 500" with overflow:visible,
 * so shapes with negative coordinates (Hard arms, PSPACE tails reaching y≈-160)
 * are visible on screen but get clipped when exported with the original viewBox.
 *
 * Solution: use sceneBBox() — which already computes real Bézier extremes —
 * to derive a tight viewBox that wraps every visible shape, then export that.
 *
 * Output: always SVG (pure vector, universally supported).
 * PDF via jsPDF+svg2pdf is attempted first if the CDN libraries loaded;
 * SVG fallback is automatic and produces identical visual output.
 */
async function downloadDiagram() {
  if (appState.applied.size === 0) return;

  const btn = DOM.dlBtn || (DOM.dlBtn = document.getElementById('btn-download'));
  if (btn) { btn.disabled = true; btn.classList.add('dl-disabled'); }

  try {
    /* ── 1. Compute TRUE bounding box using getBBox() on the live SVG ─ */
    const PAD = 50;
    let vx, vy, vw, vh;

    try {
      const liveRoot = DOM.root || (DOM.root = document.getElementById('diagram-root'));
      // Temporarily remove the zoom/pan transform so getBBox is in SVG coords
      const savedTf = liveRoot.getAttribute('transform');
      liveRoot.removeAttribute('transform');
      const bb = liveRoot.getBBox();
      liveRoot.setAttribute('transform', savedTf || '');
      if (!savedTf) liveRoot.removeAttribute('transform');

      vx = Math.floor(bb.x - PAD);
      vy = Math.floor(bb.y - PAD);
      vw = Math.ceil(bb.width  + PAD * 2);
      vh = Math.ceil(bb.height + PAD * 2);
    } catch (_) {
      // Fallback: derive bbox from pre-declared scenario shapes
      const shapes = SCENARIOS.get(scenarioKey(appState.applied)) || [];
      if (shapes.length === 0) {
        vx = 0; vy = 0; vw = 800; vh = 500;
      } else {
        const bb2 = sceneBBox(shapes);
        vx = Math.floor(bb2.x1 - PAD);
        vy = Math.floor(bb2.y1 - PAD);
        vw = Math.ceil(bb2.x2 - bb2.x1 + PAD * 2);
        vh = Math.ceil(bb2.y2 - bb2.y1 + PAD * 2);
      }
    }

    /* ── 2. Clone the live SVG ───────────────────────────────────── */
    const origSVG  = DOM.diagramSvg || (DOM.diagramSvg = document.getElementById('diagram-svg'));
    const svgClone = origSVG.cloneNode(true);
    svgClone.setAttribute('xmlns',       'http://www.w3.org/2000/svg');
    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    /* Apply the tight viewBox so the entire scene is visible. */
    svgClone.setAttribute('viewBox',  `${vx} ${vy} ${vw} ${vh}`);
    svgClone.setAttribute('width',    String(vw));
    svgClone.setAttribute('height',   String(vh));
    svgClone.removeAttribute('preserveAspectRatio');
    svgClone.style.cssText = '';

    /* ── 3. Reset zoom / pan: diagram-root must have no transform ─── */
    const rootG = svgClone.querySelector('#diagram-root');
    if (rootG) rootG.removeAttribute('transform');

    /* ── 4. Remove SVG filter effects (glow / drop-shadow). ─────── */
    svgClone.querySelectorAll('filter').forEach(f => f.remove());
    svgClone.querySelectorAll('[filter]').forEach(el => el.removeAttribute('filter'));

    /* ── 5. Background rect ──────────────────────────────────────── */
    const bgColor = _isLight ? '#f5f7fc' : '#080d18';
    const bgRect  = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x',      String(vx));
    bgRect.setAttribute('y',      String(vy));
    bgRect.setAttribute('width',  String(vw));
    bgRect.setAttribute('height', String(vh));
    bgRect.setAttribute('fill',   bgColor);
    const defsInClone = svgClone.querySelector('defs');
    if (defsInClone) defsInClone.after(bgRect);
    else             svgClone.prepend(bgRect);

    /* ── 6. Try vector PDF via jsPDF + svg2pdf (CDN libraries) ──────
       Temporarily attach clone to real DOM: svg2pdf needs computed styles. */
    if (window.jspdf && window.svg2pdf) {
      svgClone.style.cssText =
        'position:absolute;opacity:0;pointer-events:none;left:-40000px;top:-40000px;';
      document.body.appendChild(svgClone);
      try {
        const { jsPDF } = window.jspdf;
        const landscape = vw >= vh;
        const doc = new jsPDF({
          orientation: landscape ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [vw, vh],
          compress: false,
        });
        await window.svg2pdf(svgClone, doc, { x: 0, y: 0, width: vw, height: vh });
        doc.save('snapshot_complexity_sets.pdf');
        return; // ✓ PDF success
      } catch (pdfErr) {
        console.warn('[download] PDF failed, falling back to SVG:', pdfErr);
      } finally {
        if (svgClone.parentNode) svgClone.parentNode.removeChild(svgClone);
      }
    }

    /* ── 7. Fallback: pure SVG (always vector, no external libs) ─── */
    const serializer = new XMLSerializer();
    const svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n'
                 + serializer.serializeToString(svgClone);
    const blob   = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url    = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href     = url;
    anchor.download = 'snapshot_complexity_sets.svg';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

  } catch (err) {
    console.error('[download] Unexpected error:', err);
  } finally {
    if (btn) {
      const empty = appState.applied.size === 0;
      btn.disabled = empty;
      btn.classList.toggle('dl-disabled', empty);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 7 — ZOOM & PAN
════════════════════════════════════════════════════════════════ */
const viewState = { zoom:1, panX:0, panY:0 };
const ZOOM_STEP=0.18, ZOOM_MIN=0.28, ZOOM_MAX=5;
const SVG_CX=400, SVG_CY=250;
let _fitRafId=null, _fitTimeout=null;

// Cached hot DOM references (populated after DOMContentLoaded)
const DOM = {};
function _getRoot(){ return DOM.root || (DOM.root = document.getElementById('diagram-root')); }

/* Last-written transform values — skip setAttribute when unchanged.
 * Avoids string alloc + DOM write on frames where view hasn't moved. */
let _vtZ = null, _vtX = null, _vtY = null;

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
function zoomBy(d) {
  // Manual zoom cancels any pending auto-fit
  if (_fitTimeout) { clearTimeout(_fitTimeout); _fitTimeout=null; }
  if (_fitRafId)   { cancelAnimationFrame(_fitRafId); _fitRafId=null; }
  viewState.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, viewState.zoom+d));
  applyViewTransform();
}
function resetView() { viewState.zoom=1; viewState.panX=0; viewState.panY=0; applyViewTransform(); }

/* Parse all (x,y) pairs from a path string (M/L/C commands). */
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
    // Tokenise path into commands + coordinate runs
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

/* Smoothly animate viewState to (tZ,tX,tY) over 520ms ease-in-out. */
function animateFit(tZ,tX,tY) {
  if (_fitRafId){ cancelAnimationFrame(_fitRafId); _fitRafId=null; }
  const z0=viewState.zoom,px0=viewState.panX,py0=viewState.panY;
  const dz=tZ-z0,dpx=tX-px0,dpy=tY-py0;
  if(Math.abs(dz)<0.002&&Math.abs(dpx)<1&&Math.abs(dpy)<1) return;
  const DUR=600, t0=performance.now();
  function step(now){
    const t=Math.min(1,(now-t0)/DUR);
    // Cubic ease-in-out: smoother start/end than quadratic
    const e=easeIO(t);  // shared ease fn — avoids per-frame closure re-eval
    viewState.zoom=z0+dz*e; viewState.panX=px0+dpx*e; viewState.panY=py0+dpy*e;
    applyViewTransform();
    if(t<1) _fitRafId=requestAnimationFrame(step);
  }
  _fitRafId=requestAnimationFrame(step);
}

/* Schedule auto-fit AFTER all enter/morph animations finish (~900ms delay). */
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

// Drag-to-pan + touch pan + pinch zoom
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
  });
  svg.addEventListener('wheel',e=>{
    e.preventDefault();
    zoomBy(e.deltaY<0?ZOOM_STEP:-ZOOM_STEP);
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
      drag=true; _tdMoved=false;
      sx=ts[0].clientX; sy=ts[0].clientY;
      spx=viewState.panX; spy=viewState.panY;
      lastDist=null;
      // Record tap origin for tap detection
      _tdX=ts[0].clientX; _tdY=ts[0].clientY;
      _tdTarget=e.target;

      // Brief hover glow so user gets visual feedback before lifting finger
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
          if (_hoveredGroup) _hoveredGroup.classList.remove('cls-hov');
          _hoveredGroup = g;
          if (_hoveredGroup) {
            _hoveredGroup.classList.add('cls-hov');
            _applyHoverDim(_hoveredGroup);
            svg.classList.add('has-hover');
          }
        }
      }
    } else if(ts.length===2){
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
    if(e.touches.length===0){ drag=false; lastDist=null; }
    else if(e.touches.length===1){ lastDist=null; }

    // Tap detection: single touch, moved < 8px → treat as click
    if(_tdTarget && _mode==='set-view' && !wasDrag){
      _handleDiagramClick(_tdTarget, _tdX, _tdY);
    }

    // Clear hover glow on lift if we didn't enter detail view
    if(!wasDrag && _mode==='set-view'){
      setTimeout(()=>{
        if(_hoveredGroup){ _hoveredGroup.classList.remove('cls-hov'); _hoveredGroup=null; }
        _clearHoverDim();
        svg.classList.remove('has-hover');
      }, 180);  // slight delay so glow is visible before fading
    }

    _tdTarget=null; _tdMoved=false;
  });
})();


/* ═══════════════════════════════════════════════════════════════
   SECTION 8 — INITIALIZATION
════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Pre-populate DOM cache for all hot-path nodes
  DOM.root       = document.getElementById('diagram-root');
  DOM.empty      = document.getElementById('empty-state');
  DOM.svgDefs    = document.getElementById('svg-defs');
  DOM.diagramSvg = document.getElementById('diagram-svg');
  DOM.sidebar    = document.getElementById('sidebar');
  DOM.btnToggle  = document.getElementById('btn-toggle');
  DOM.themeBtn   = document.getElementById('btn-theme');
  DOM.dlBtn      = document.getElementById('btn-download');
  DOM.mIcon      = document.getElementById('mobile-toggle-icon');
  DOM.mLabel     = document.getElementById('mobile-toggle-label');
  DOM.dlMobile   = document.getElementById('btn-mobile-download');

  // ── Time-based default theme ──────────────────────────────
  // 07:00–19:00 → light (day), otherwise dark (night)
  let preferLight = false;
  try {
    const saved = localStorage.getItem('cx-theme');
    if (saved) {
      preferLight = saved === 'light';
    } else {
      const h = new Date().getHours();
      preferLight = (h >= 7 && h < 19);
    }
  } catch(_) {
    const h = new Date().getHours();
    preferLight = (h >= 7 && h < 19);
  }
  setTheme(preferLight);
  updateToggleIcon();

  // On mobile: start with sidebar collapsed so diagram fills the screen
  if (window.innerWidth <= 600) {
    DOM.sidebar.classList.add('collapsed');
    document.body.classList.remove('sidebar-open');
    _sidebarOpen = false;
    if (DOM.themeBtn) DOM.themeBtn.style.display = 'none';
    updateToggleIcon();
  }

  // SCENARIOS is already built as a const from SCENARIO_DECLARATIONS at parse time.
  // No startup computation needed — all 128 geometries are pre-declared.

  buildSidebar();
  renderDiagram([]);

  document.getElementById('btn-reset')   .addEventListener('click', resetAll);
  DOM.btnToggle                           .addEventListener('click', toggleSidebar);
  DOM.themeBtn                            .addEventListener('click', () => setTheme(!_isLight));
  document.getElementById('btn-zoom-in') .addEventListener('click', () => zoomBy(+ZOOM_STEP));
  document.getElementById('btn-zoom-out').addEventListener('click', () => zoomBy(-ZOOM_STEP));
  DOM.dlBtn                               .addEventListener('click', downloadDiagram);
  // Mobile bar
  const mToggle = document.getElementById('btn-mobile-toggle');
  if (mToggle)    mToggle  .addEventListener('click', toggleSidebar);
  if (DOM.dlMobile) DOM.dlMobile.addEventListener('click', downloadDiagram);
  const mReset = document.getElementById('btn-mobile-reset');
  // Single mode-aware listener: in detail-view acts as "Back", otherwise as "Reset".
  // Using ONE listener prevents the double-fire bug (addEventListener + .onclick both
  // firing when enterDetailView sets .onclick = exitDetailView on top of this listener).
  if (mReset) mReset.addEventListener('click', () => {
    if (_mode === 'detail-view') exitDetailView();
    else                         resetAll();
  });

  // ── Phase 2: detail view ──────────────────────────────────────
  document.body.classList.add('set-view');
  initDiagramInteraction();
  document.getElementById('btn-back').addEventListener('click', exitDetailView);

  // Issue 6: theme button in detail sidebar mirrors main theme button
  const themeDetail = document.getElementById('btn-theme-detail');
  if (themeDetail) {
    themeDetail.innerHTML = DOM.themeBtn ? DOM.themeBtn.innerHTML : '';
    themeDetail.title     = DOM.themeBtn ? DOM.themeBtn.title     : '';
    themeDetail.addEventListener('click', () => setTheme(!_isLight));
  }

  // Issue 5: mode-aware download — SVG in set-view, PDF content in detail-view
  DOM.dlBtn.removeEventListener('click', downloadDiagram);  // remove default
  DOM.dlBtn.addEventListener('click', () => {
    if (_mode === 'detail-view') downloadContent();
    else                         downloadDiagram();
  });
  if (DOM.dlMobile) {
    DOM.dlMobile.removeEventListener('click', downloadDiagram);
    DOM.dlMobile.addEventListener('click', () => {
      if (_mode === 'detail-view') downloadContent();
      else                         downloadDiagram();
    });
  }
  // Mobile back
  // (repurposes btn-mobile-reset in detail mode — handled in enterDetailView)
});
