'use strict';

/* ================================================================
   js/init.js
   DOMContentLoaded: popola DOM cache, tema, sidebar, listener UI.
   Applica classi engine/perf a <html> per CSS targeting.
   Avvia preload idle dei contenuti didattici.
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* -- 1. Engine + perf classes su <html> ---------------------------
     Tutte le ottimizzazioni CSS per-engine usano questi selettori:
       html.engine-blink  → Chrome, Edge, Opera
       html.engine-gecko  → Firefox
       html.engine-webkit → Safari
       html.perf-high / .perf-medium / .perf-low → tier hardware    */
  const root = document.documentElement;
  root.classList.add(_engineClass, `perf-${_PERF_TIER}`);


  /* -- 2. Pre-popola cache DOM -------------------------------------- */
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


  /* -- 3. Tema: localStorage → fallback ora del giorno ------------- */
  let preferLight = false;
  try {
    const saved = localStorage.getItem('cx-theme');
    if (saved) {
      preferLight = saved === 'light';
    } else {
      const h = new Date().getHours();
      preferLight = (h >= 7 && h < 19);
    }
  } catch (_) {
    const h = new Date().getHours();
    preferLight = (h >= 7 && h < 19);
  }
  setTheme(preferLight);
  updateToggleIcon();


  /* -- 4. Mobile: inizia con sidebar collassata -------------------- */
  if (window.innerWidth <= 600) {
    DOM.sidebar.classList.add('collapsed');
    document.body.classList.remove('sidebar-open');
    _sidebarOpen = false;
    if (DOM.themeBtn) DOM.themeBtn.style.display = 'none';
    updateToggleIcon();
  }


  /* -- 5. Costruisce sidebar e render iniziale vuoto --------------- */
  buildSidebar();
  renderDiagram([]);


  /* -- 6. Event listener principali -------------------------------- */
  document.getElementById('btn-reset')   .addEventListener('click', resetAll);
  DOM.btnToggle                           .addEventListener('click', toggleSidebar);
  DOM.themeBtn                            .addEventListener('click', () => setTheme(!_isLight));
  document.getElementById('btn-zoom-in') .addEventListener('click', () => zoomBy(+ZOOM_STEP));
  document.getElementById('btn-zoom-out').addEventListener('click', () => zoomBy(-ZOOM_STEP));

  const mToggle = document.getElementById('btn-mobile-toggle');
  if (mToggle) mToggle.addEventListener('click', toggleSidebar);

  const mReset = document.getElementById('btn-mobile-reset');
  if (mReset) mReset.addEventListener('click', () => {
    if (_mode === 'detail-view') exitDetailView();
    else                         resetAll();
  });


  /* -- 7. Detail view ---------------------------------------------- */
  document.body.classList.add('set-view');
  initDiagramInteraction();
  document.getElementById('btn-back').addEventListener('click', exitDetailView);

  const themeDetail = document.getElementById('btn-theme-detail');
  if (themeDetail) {
    themeDetail.innerHTML = DOM.themeBtn ? DOM.themeBtn.innerHTML : '';
    themeDetail.title     = DOM.themeBtn ? DOM.themeBtn.title     : '';
    themeDetail.addEventListener('click', () => setTheme(!_isLight));
  }


  /* -- 8. Download mode-aware -------------------------------------- */
  DOM.dlBtn.addEventListener('click', () => {
    if (_mode === 'detail-view') downloadContent();
    else                         downloadDiagram();
  });
  if (DOM.dlMobile) {
    DOM.dlMobile.addEventListener('click', () => {
      if (_mode === 'detail-view') downloadContent();
      else                         downloadDiagram();
    });
  }


  /* -- 9. Idle preload dei contenuti didattici --------------------
     Quando il browser e' inattivo dopo il caricamento iniziale,
     prefetcha i manifest di tutte le classi. Cosi' la prima apertura
     di qualsiasi detail view e' istantanea invece di attendere la rete.

     Usa requestIdleCallback (Chrome/Firefox/Edge) o setTimeout (Safari).
     Il timeout di 2000ms garantisce che il preload avvenga anche se il
     browser non raggiunge mai un periodo di idle prolungato.          */
  _idle(() => {
    const manifest = window._CLASS_MANIFEST;
    if (!manifest) return;
    const ids = Object.keys(manifest);
    // Carica le classi in sequenza a bassa priorita' per non competere
    // con il rendering principale.
    let i = 0;
    function loadNext(deadline) {
      // Se c'e' tempo residuo nel frame idle o siamo gia' alla fine, carica
      while (i < ids.length) {
        const timeOk = deadline
          ? (deadline.timeRemaining() > 5 || deadline.didTimeout)
          : true;
        if (!timeOk) break;
        loadClassContent(ids[i++]);
      }
      if (i < ids.length) _idle(loadNext);
    }
    _idle(loadNext);
  });

});
