'use strict';

/* js/state.js
   Variabili globali, costanti, cache DOM, utilita SVG.
   INCLUDE: rilevamento browser/engine, tier prestazionale,
            configurazione filtri e animazioni per-engine.
   Tutti gli altri moduli leggono da qui -- nessun altro file
   dichiara stato globale. */


/* ================================================================
   SVG UTILITY
   ================================================================ */
const SVG_NS = 'http://www.w3.org/2000/svg';
const easeIO = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
const svgEl = (tag, attrs={}) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
  return el;
};


/* ================================================================
   CANVAS CONSTANTS
   ================================================================ */
const SVG_CX = 400, SVG_CY = 250;
const ZOOM_STEP = 0.18, ZOOM_MIN = 0.28, ZOOM_MAX = 5;


/* ================================================================
   VIEW STATE
   ================================================================ */
const viewState = { zoom:1, panX:0, panY:0 };
let _fitRafId = null, _fitTimeout = null;
let _vtZ = null, _vtX = null, _vtY = null;


/* ================================================================
   DOM CACHE
   ================================================================ */
const DOM = {};
function _getRoot() { return DOM.root || (DOM.root = document.getElementById('diagram-root')); }


/* ================================================================
   CTM CACHE  (tooltip hit-testing)
   ================================================================ */
let _ctmCache = null;
function _invalidateCTM() { _ctmCache = null; }
function _getCtm() {
  if (!_ctmCache) _ctmCache = _getRoot().getScreenCTM();
  return _ctmCache;
}


/* ================================================================
   UI STATE FLAGS
   ================================================================ */
let _sidebarOpen = true;
let _defsTheme = null;


/* ================================================================
   LENS STATE  (NP intersect co-NP overlay)
   ================================================================ */
let _lensEl       = null;
let _lensNPKey    = null;
let _lensRebuildT = null;
let _lensRafId    = null;


/* ================================================================
   DETAIL-VIEW MODE STATE
   ================================================================ */
let _mode        = 'set-view';
let _savedVS     = null;
let _activeClsId = null;
let _hoveredGroup = null;
let _immRafId    = null;


/* ================================================================
   DETAIL SIDEBAR STATE
   ================================================================ */
let _dvActiveNav = { type: 'definition', pIdx: -1, eIdx: -1 };
let _dvSubCache  = null;


/* ================================================================
   HIT-OVERLAY MAP
   ================================================================ */
let _overlayMap = new Map();


/* ================================================================
   BROWSER / ENGINE DETECTION
   ----------------------------------------------------------------
   Detects once at parse-time. Used throughout the codebase to
   select per-engine code paths. Grouped by rendering engine:

     _isBlink  = Chrome + Edge + Opera  (Blink + Skia/CanvasKit)
     _isGecko  = Firefox                (Gecko + WebRender)
     _isWebKit = Safari                 (WebKit + Core Animation)

   Individual browser flags are also exposed for cases where the
   same engine has browser-specific quirks (e.g. Edge DirectWrite).
   ================================================================ */
const _BR = (function() {
  const ua  = navigator.userAgent;
  const uad = navigator.userAgentData;   // Client Hints (Chrome/Edge 90+)

  const safari  = /safari/i.test(ua)  && !/chrome|chromium|crios|firefox|fxios|opr\//i.test(ua);
  const firefox = /firefox|fxios/i.test(ua);
  const opera   = /opr\//i.test(ua);
  const edge    = /edg\//i.test(ua);
  // Chrome: Blink but not Edge or Opera
  const chrome  = !safari && !firefox && !opera && !edge &&
                  (/chrome|chromium|crios/i.test(ua) || (uad && uad.brands?.some(b => /chrome/i.test(b.brand))));
  // Blink = Chrome + Edge + Opera (all three share the Blink/Skia stack)
  const blink   = !safari && !firefox;

  return { safari, firefox, opera, edge, chrome, blink };
})();

/* Convenience aliases used throughout the codebase */
const _isSafari  = _BR.safari;
const _isFirefox = _BR.firefox;
const _isEdge    = _BR.edge;
const _isOpera   = _BR.opera;
const _isChrome  = _BR.chrome;
const _isBlink   = _BR.blink;   // Chrome + Edge + Opera

/* CSS engine class applied to <html> by init.js for CSS targeting */
const _engineClass = _isSafari ? 'engine-webkit' : _isFirefox ? 'engine-gecko' : 'engine-blink';


/* ================================================================
   HARDWARE PERFORMANCE TIER
   ----------------------------------------------------------------
   Detected once at startup from Device Memory API (Chrome/Edge 63+)
   and navigator.hardwareConcurrency (all modern browsers).
   Used to scale visual effect quality on low-end devices.

     high   >= 8 GB RAM  AND  >= 8 logical cores
     medium >= 4 GB RAM  AND  >= 4 logical cores
     low    everything else

   CSS class applied to <html> by init.js: perf-high / perf-medium / perf-low
   ================================================================ */
const _PERF_TIER = (function() {
  const mem = navigator.deviceMemory || 4;   // GB, Chrome/Edge only; default 4
  const cpu = navigator.hardwareConcurrency || 4;
  if (mem >= 8 && cpu >= 8) return 'high';
  if (mem >= 4 && cpu >= 4) return 'medium';
  return 'low';
})();


/* ================================================================
   PER-ENGINE SVG FILTER CONFIGURATION
   ----------------------------------------------------------------
   Each engine has a different GPU filter pipeline:

   Blink/Skia (Chrome, Edge, Opera):
     feDropShadow is a single Skia GPU shader pass. Region 6%
     bleed balances visual quality vs offscreen buffer size.
     stdDeviation 2.0 gives good glow at Retina DPR.

   Gecko/WebRender (Firefox):
     WebRender implements ALL painting as GPU draw calls.
     feDropShadow goes through WebRender's shader pipeline,
     which is highly optimised for GPU execution.
     Can afford a slightly larger region (8%) and higher
     stdDeviation (2.5) for richer glow with no extra CPU cost.

   WebKit/CoreAnimation (Safari):
     SVG filter attributes on elements whose geometry is being
     mutated by JS in a RAF loop bypass Core Animation and fall
     back to full CPU software rasterisation every frame.
     Filter config is null -- filters are skipped entirely.
   ================================================================ */
const _FILTER_CFG = _isSafari ? null : _isFirefox ? {
  // Gecko/WebRender: shader-based GPU rendering, can afford richer effects
  x: '-8%', y: '-8%', w: '116%', h: '116%',
  deviationDark:  2.5,
  deviationLight: 1.2,
  opacityDark:    0.65,
  opacityLight:   0.12,
} : {
  // Blink/Skia: single GPU shader pass, efficient
  x: '-6%', y: '-6%', w: '112%', h: '112%',
  deviationDark:  2.0,
  deviationLight: 1.0,
  opacityDark:    0.58,
  opacityLight:   0.10,
};


/* ================================================================
   PER-ENGINE ANIMATION TIMING
   ----------------------------------------------------------------
   Blink   520ms -- predictable 16.67ms rAF, smooth Skia compositing
   Gecko   500ms -- WebRender composites slightly faster per frame
   WebKit  480ms -- Core Animation timing can drift on longer anims;
                    shorter duration keeps transitions within one CA
                    commit cycle, avoiding frame drops at boundaries
   ================================================================ */
const _MORPH_DUR = _isSafari ? 480 : _isFirefox ? 500 : 520;


/* ================================================================
   HOVER FILTER STRINGS
   ----------------------------------------------------------------
   Applied directly via element.style.filter in JS (_addHov) rather
   than via a CSS "transition: filter" rule.

   Reason: CSS "transition: filter" causes ALL browsers to
   pre-allocate compositor layers for EVERY element matching the
   selector, even those never hovered. With 11+ .cls-group elements
   that means 11 GPU surfaces allocated permanently. JS-direct sets
   the filter only on the single actually-hovered element.

   On Safari, filter is not applied at all (see _FILTER_CFG above).

   Firefox/WebRender: can afford a richer drop-shadow since
   WebRender runs it as a GPU shader -- slightly larger blur.
   ================================================================ */
const _HOV_FILTER_DARK  = _isFirefox
  ? 'brightness(1.30) drop-shadow(0 0 7px rgba(255,255,255,.28))'
  : 'brightness(1.28) drop-shadow(0 0 5px rgba(255,255,255,.22))';
const _HOV_FILTER_LIGHT = _isFirefox
  ? 'brightness(0.70) saturate(1.9) drop-shadow(0 0 7px rgba(0,0,0,.32))'
  : 'brightness(0.72) saturate(1.6) drop-shadow(0 0 5px rgba(0,0,0,.28))';


/* ================================================================
   SCHEDULING UTILITIES
   ----------------------------------------------------------------
   _schedule(fn, ms): debounce helper.
     Chrome 95+: uses scheduler.postTask() with 'user-visible'
     priority for main-thread scheduling that yields to input events.
     All others: plain setTimeout.

   _idle(fn): idle-time callback.
     Chrome/Firefox/Edge: requestIdleCallback (true idle detection).
     Safari (no rIC support): setTimeout with 200ms delay.
   ================================================================ */
const _hasScheduler = typeof scheduler !== 'undefined' && typeof scheduler.postTask === 'function';
const _hasRIC = typeof requestIdleCallback === 'function';

function _schedule(fn, ms) {
  if (_hasScheduler && ms <= 50) {
    // postTask yields to input events between tasks -- avoids jank when
    // the user types quickly (multiple checkboxes). Only used for short
    // debounces where the user-visible priority category is appropriate.
    return scheduler.postTask(fn, { priority: 'user-visible', delay: ms });
  }
  return setTimeout(fn, ms);
}

function _idle(fn) {
  if (_hasRIC) requestIdleCallback(fn, { timeout: 2000 });
  else         setTimeout(fn, 200);
}


/* ================================================================
   SVG RENDERING HINT ATTRIBUTES
   ----------------------------------------------------------------
   Per-engine SVG rendering quality hints. Applied once at shape
   build time, never changed.

   shape-rendering on ellipses:
     Blink/Skia: 'geometricPrecision' uses Skia's GPU anti-aliasing
       path tessellator -- high quality at no extra CPU cost.
     Gecko/WebRender: 'auto' lets WebRender's GPU rasteriser decide;
       its shader path already produces geometricPrecision quality.
     WebKit: 'auto' -- any non-default value on Safari can trigger
       expensive software fallbacks on complex paths.

   text-rendering on SVG labels:
     Blink: 'geometricPrecision' -- Skia's ClearType-equivalent
       subpixel path, GPU-accelerated on all platforms.
     Gecko: 'optimizeLegibility' -- activates Firefox's font hinting
       engine for sharper text at small sizes (our labels are ~15px).
     WebKit: 'auto' -- avoid any rendering hints that could trigger
       a software text rasterisation fallback.
   ================================================================ */
const _SVG_SHAPE_RENDERING = _isBlink ? 'geometricPrecision' : 'auto';
const _SVG_TEXT_RENDERING  = _isBlink ? 'geometricPrecision' : _isFirefox ? 'optimizeLegibility' : 'auto';


/* ================================================================
   SVG ICON STRINGS
   ================================================================ */
const SVG_CHEVRON_LEFT  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 3 5 8 10 13"/></svg>';
const SVG_CHEVRON_RIGHT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 3 11 8 6 13"/></svg>';
const SVG_SUN  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="2.5"/><line x1="8" y1="13.5" x2="8" y2="15"/><line x1="1" y1="8" x2="2.5" y2="8"/><line x1="13.5" y1="8" x2="15" y2="8"/><line x1="3.1" y1="3.1" x2="4.2" y2="4.2"/><line x1="11.8" y1="11.8" x2="12.9" y2="12.9"/><line x1="12.9" y1="3.1" x2="11.8" y2="4.2"/><line x1="4.2" y1="11.8" x2="3.1" y2="12.9"/></svg>';
const SVG_MOON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12.5 10.5A6 6 0 0 1 5.5 3.5a6 6 0 1 0 7 7z"/></svg>';
const SVG_CHEVRON_UP   = '<polyline points="3 10 8 5 13 10"/>';
const SVG_CHEVRON_DOWN = '<polyline points="3 6 8 11 13 6"/>';


/* ================================================================
   COMPLETE LENS STATE  (NP-c, co-NP-c, PSPACE-c intersection areas)
   Parallel to the NP intersect co-NP lens system.
   Maps complete-set ID -> DOM group element.
   ================================================================ */
const _completeLensEls  = new Map();   // id -> g element
const _completeLensRafs = new Map();   // id -> RAF handle


/* ================================================================
   COMPLETE SET -> HARD/PARENT MAP
   Static config used by live-renderer.js and detail-view.js.
   ================================================================ */
const _COMPLETE_MAP = {
  'NP-c':     { hardId: 'NP-h',     parentId: 'NP'     },
  'co-NP-c':  { hardId: 'co-NP-h',  parentId: 'co-NP'  },
  'PSPACE-c': { hardId: 'PSPACE-h', parentId: 'PSPACE' },
};
