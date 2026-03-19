'use strict';

/* ================================================================
   js/download.js
   ─────────────────────────────────────────────────────────────
   Export del diagramma corrente come vettore PDF o SVG.

   DIPENDENZE:
     • js/state.js               → DOM, _isLight
     • js/dependency-resolver.js → scenarioKey
     • js/geometry.js            → SCENARIOS
     • js/zoom-pan.js            → sceneBBox
     • setting_sets/class-definitions.js → appState

   ESPORTA (globali):
     • downloadDiagram()
   ================================================================ */


/**
 * downloadDiagram()
 *
 * Esporta il diagramma corrente come PDF vettoriale (jsPDF + svg2pdf)
 * oppure, se le librerie CDN non sono disponibili, come SVG puro.
 *
 * Passaggi:
 *   1. getBBox() sul diagram-root (senza transform) → bounding box reale
 *   2. Clone del live SVG
 *   3. Reset del transform zoom/pan (non vogliamo esportare la vista zoomata)
 *   4. Rimozione dei filtri glow (incompatibili con PDF)
 *   5. Aggiunta del rect di background solido
 *   6. Tentativo PDF via jsPDF/svg2pdf (se CDN disponibili)
 *   7. Fallback: SVG puro via XMLSerializer
 */
async function downloadDiagram() {
  if (appState.applied.size === 0) return;

  const btn = DOM.dlBtn || (DOM.dlBtn = document.getElementById('btn-download'));
  if (btn) { btn.disabled = true; btn.classList.add('dl-disabled'); }

  try {
    /* ── 1. Bounding box reale via getBBox() ────────────────────────── */
    const PAD = 50;
    let vx, vy, vw, vh;

    try {
      const liveRoot = DOM.root || (DOM.root = document.getElementById('diagram-root'));
      // Rimuove temporaneamente il transform di zoom/pan per ottenere bbox in SVG coords
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
      // Fallback: deriva bbox dagli scenari pre-dichiarati
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

    /* ── 2. Clone del live SVG ──────────────────────────────────────── */
    const origSVG  = DOM.diagramSvg || (DOM.diagramSvg = document.getElementById('diagram-svg'));
    const svgClone = origSVG.cloneNode(true);
    svgClone.setAttribute('xmlns',       'http://www.w3.org/2000/svg');
    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    // viewBox stretto attorno alla scena reale (incluse code tratteggiate Hard)
    svgClone.setAttribute('viewBox',  `${vx} ${vy} ${vw} ${vh}`);
    svgClone.setAttribute('width',    String(vw));
    svgClone.setAttribute('height',   String(vh));
    svgClone.removeAttribute('preserveAspectRatio');
    svgClone.style.cssText = '';

    /* ── 3. Rimuove transform zoom/pan dal diagram-root clonato ─────── */
    const rootG = svgClone.querySelector('#diagram-root');
    if (rootG) rootG.removeAttribute('transform');

    /* ── 4. Rimuove filtri SVG (glow / drop-shadow) ─────────────────── */
    svgClone.querySelectorAll('filter').forEach(f => f.remove());
    svgClone.querySelectorAll('[filter]').forEach(el => el.removeAttribute('filter'));

    /* ── 5. Rect di background ──────────────────────────────────────── */
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

    /* ── 6. PDF via jsPDF + svg2pdf (CDN) ───────────────────────────── */
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
        return;   // ✓ PDF riuscito
      } catch (pdfErr) {
        console.warn('[download] PDF fallito, fallback SVG:', pdfErr);
      } finally {
        if (svgClone.parentNode) svgClone.parentNode.removeChild(svgClone);
      }
    }

    /* ── 7. Fallback: SVG puro (sempre vettoriale, senza librerie) ──── */
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
    console.error('[download] Errore imprevisto:', err);
  } finally {
    if (btn) {
      const empty = appState.applied.size === 0;
      btn.disabled = empty;
      btn.classList.toggle('dl-disabled', empty);
    }
  }
}
