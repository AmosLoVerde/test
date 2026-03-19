'use strict';

/* ================================================================
   js/detail-view.js
   ─────────────────────────────────────────────────────────────
   Vista dettaglio: caricamento contenuti .md, animazioni di
   immersione/emersione, sidebar accordion, rendering testo.

   DIPENDENZE:
     • js/state.js               → _mode, _savedVS, _activeClsId,
                                    _hoveredGroup, _immRafId,
                                    _dvActiveNav, _dvSubCache,
                                    viewState, SVG_CX/CY, ZOOM_MAX,
                                    DOM, _getRoot, easeIO
     • js/zoom-pan.js            → applyViewTransform, animateFit
     • js/live-renderer.js       → _clearHoverDim, scheduleFit
     • setting_sets/class-definitions.js → CLASS_DEFINITIONS, getStyle, _isLight

   ESPORTA (globali):
     • loadClassContent(classId)
     • enterDetailView(classId, clientX, clientY)
     • exitDetailView()
     • buildDetailSidebar(classId)
     • showContent(classId, type, pIdx, eIdx)
     • downloadContent()
   ================================================================ */


/* ═══════════════════════════════════════════════════════════════
   SECTION 9 — CONTENT LOADER
   ─────────────────────────────────────────────────────────────
   I config.js di ogni classe definiscono la struttura in
   window._CLASS_MANIFEST[classId].
   I contenuti testuali vengono fetchati dai file .md indicati
   nel manifest al primo accesso, poi cachati in memoria.

   ⚠️  fetch() richiede un server — per i test locali usa:
       VS Code → tasto destro → "Open with Live Server"
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
   SECTION 9d — IMMERSION / EMERGE ANIMATIONS
════════════════════════════════════════════════════════════════ */

/* Custom zoom animation with completion callback */
function _animateZoomTo(tZ, tX, tY, dur, onDone) {
  if (_immRafId) { cancelAnimationFrame(_immRafId); _immRafId = null; }
  const z0=viewState.zoom, px0=viewState.panX, py0=viewState.panY;
  const dz=tZ-z0, dpx=tX-px0, dpy=tY-py0;
  const t0=performance.now();
  _setWillChange();
  function step(now) {
    const t = Math.min(1, (now-t0)/dur);
    const e = t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
    viewState.zoom = z0+dz*e;
    viewState.panX = px0+dpx*e;
    viewState.panY = py0+dpy*e;
    applyViewTransform();
    if (t < 1) { _immRafId = requestAnimationFrame(step); }
    else { _immRafId = null; _clearWillChange(300); if (onDone) onDone(); }
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
  if (_hoveredGroup) { _removeHov(_hoveredGroup); _hoveredGroup = null; }
  _clearHoverDim();
  DOM.diagramSvg.classList.remove('has-hover');
  document.body.classList.remove('set-view');
  document.body.classList.add('detail-view');

  // Enable download button for content export
  const dlBtn = DOM.dlBtn || (DOM.dlBtn = document.getElementById('btn-download'));
  if (dlBtn) { dlBtn.disabled = false; dlBtn.classList.remove('dl-disabled'); }

  // ── Compute zoom target ──────────────────────────────────────────
  let zoomCx = SVG_CX, zoomCy = SVG_CY;
  if (clientX !== undefined && clientY !== undefined) {
    const svg  = DOM.diagramSvg;
    const rect = svg.getBoundingClientRect();
    const svgX = (clientX - rect.left)  / rect.width  * 800;
    const svgY = (clientY - rect.top)   / rect.height * 500;
    zoomCx = SVG_CX + (svgX - SVG_CX - viewState.panX) / viewState.zoom;
    zoomCy = SVG_CY + (svgY - SVG_CY - viewState.panY) / viewState.zoom;
  } else {
    const shapes = SCENARIOS.get(scenarioKey(appState.applied)) || [];
    if (classId === 'NP∩co-NP') {
      const np   = shapes.find(s => s.id === 'NP'    && s.type !== 'open-curve');
      const conp = shapes.find(s => s.id === 'co-NP' && s.type !== 'open-curve');
      if (np && conp) { zoomCx = (np.cx + conp.cx) / 2; zoomCy = (np.cy + conp.cy) / 2; }
    } else if (_COMPLETE_MAP[classId]) {
      // Complete-set: zoom toward the parent ellipse center (where the lens lives)
      const def = _COMPLETE_MAP[classId];
      const pSh = shapes.find(s => s.id === def.parentId && s.type !== 'open-curve');
      if (pSh) { zoomCx = pSh.cx; zoomCy = pSh.cy; }
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
        const mReset = document.getElementById('btn-mobile-reset');
        if (mReset) mReset.textContent = '← Back to diagram';
        updateToggleIcon();
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

    // Phase 3: restore shapes with a gentle fade-in
    for (const ch of root.children) {
      ch.style.transition = 'opacity 600ms cubic-bezier(0.4,0,0.2,1)';
      ch.style.opacity = '1';
    }

    // Phase 4 (280ms): zoom back smoothly (800ms)
    if (_savedVS) {
      _animateZoomTo(_savedVS.zoom, _savedVS.panX, _savedVS.panY, 800, () => {
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
      const mReset = document.getElementById('btn-mobile-reset');
      if (mReset) mReset.textContent = 'Reset selection';
      updateToggleIcon();
    }, 350);

  }, 280);
}


/* ═══════════════════════════════════════════════════════════════
   SECTION 9e — DETAIL SIDEBAR BUILDER
════════════════════════════════════════════════════════════════ */

async function buildDetailSidebar(classId) {
  const content = await loadClassContent(classId);
  if (!content) return;

  const color = _dvColor(classId);

  const titleEl = document.getElementById('detail-class-title');
  if (titleEl) titleEl.textContent = content.fullLabel;

  const list = document.getElementById('detail-nav-list');
  if (!list) return;
  list.innerHTML = '';

  // ── Definition item ──────────────────────────────────────────
  const defItem = _makeDvItem('definition', '§', 'Definition', color, -1, -1, classId);
  defItem.classList.add('definition');
  list.appendChild(defItem);

  // ── Problems ─────────────────────────────────────────────────
  content.problems.forEach((prob, pi) => {
    const probSection = document.createElement('div');
    probSection.className = 'dv-section';
    probSection.id = `dv-prob-${pi}`;

    const probItem = _makeDvItem('problem', '•', prob.name, color, pi, -1, classId);
    probSection.appendChild(probItem);

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

  _dvActiveNav = { type: 'definition', pIdx: -1, eIdx: -1 };
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
  });
  return item;
}

function _syncDvActiveClass(classId) {
  const list = document.getElementById('detail-nav-list');
  if (!list) return;
  const actives = list.getElementsByClassName('active');
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
    const section = document.getElementById(`dv-prob-${pIdx}`);
    if (section) {
      const item = section.querySelector('.dv-item.problem');
      if (item) item.classList.add('active');
    }
    const subList = document.getElementById(`dv-sub-${pIdx}`);
    if (subList) subList.classList.add('open');
  }
}


/* ═══════════════════════════════════════════════════════════════
   SECTION 9g — showContent + downloadContent
════════════════════════════════════════════════════════════════ */

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
    title = `${content.fullLabel}`;
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

    // 1. Parse Markdown → HTML
    textEl.innerHTML = window.marked ? marked.parse(html) : html;

    // 2. Render LaTeX: $...$ inline e $$...$$ display
    if (window.renderMathInElement) {
      renderMathInElement(textEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true  },
          { left: '$',  right: '$',  display: false },
        ],
        throwOnError: false,
      });
    }

    titleEl.style.opacity = '1';
    textEl.style.opacity  = '1';
  }, 180);
}

async function downloadContent() {
  const titleEl = document.getElementById('content-title');
  const textEl  = document.getElementById('content-text');
  if (!titleEl || !textEl) return;

  const title   = titleEl.textContent.trim() || 'content';
  const bodyTxt = textEl.innerText.trim()    || '';

  const btn = DOM.dlBtn || (DOM.dlBtn = document.getElementById('btn-download'));
  if (btn) btn.disabled = true;

  try {
    const md = [
      `# ${title}`,
      '',
      bodyTxt
        .split('\n')
        .map(l => l.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n'),
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
