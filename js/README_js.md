# Documentazione JavaScript
## Cartella `js/` — struttura modulare

---

## Indice

1. [Struttura modulare](#1-struttura-modulare)
2. [Ordine di caricamento e dipendenze](#2-ordine-di-caricamento-e-dipendenze)
3. [state.js — variabili globali e costanti](#3-statejs--variabili-globali-e-costanti)
4. [dependency-resolver.js — logica delle dipendenze](#4-dependency-resolverjs--logica-delle-dipendenze)
5. [geometry.js — motore geometrico](#5-geometryjs--motore-geometrico)
6. [svg-renderer.js — costruttori SVG](#6-svg-rendererjs--costruttori-svg)
7. [diagram-interaction.js — hover e click](#7-diagram-interactionjs--hover-e-click)
8. [tooltip.js — tooltip e lens](#8-tooltipjs--tooltip-e-lens)
9. [live-renderer.js — transizioni e sidebar](#9-live-rendererjs--transizioni-e-sidebar)
10. [zoom-pan.js — zoom, pan, touch](#10-zoom-panjs--zoom-pan-touch)
11. [detail-view.js — vista dettaglio](#11-detail-viewjs--vista-dettaglio)
12. [download.js — export SVG / PDF](#12-downloadjs--export-svg--pdf)
13. [init.js — inizializzazione](#13-initjs--inizializzazione)
14. [Variabili globali: riferimento completo](#14-variabili-globali-riferimento-completo)
15. [Tecniche di performance](#15-tecniche-di-performance)
16. [Guida rapida: dove modificare cosa](#16-guida-rapida-dove-modificare-cosa)

---

## 1. Struttura modulare

Il JavaScript dell'applicazione è diviso in **11 file** tematici, caricati nell'ordine corretto da `index.html`. Ciascun file ha una responsabilità unica e ben definita:

| File | Righe approx. | Responsabilità |
|---|---|---|
| `state.js` | ~250 | Variabili globali, costanti, cache DOM, utilità SVG, browser detection, config per-engine |
| `dependency-resolver.js` | ~70 | BFS dipendenze tra classi, scenarioKey, cascadeDeselect |
| `geometry.js` | ~200 | Matematica parabole, conversione coordinate, Map SCENARIOS |
| `svg-renderer.js` | ~260 | Costruttori SVG: defs, ellissi, parabole |
| `diagram-interaction.js` | ~250 | Hover dimming, hit overlay, routing click → detail view |
| `tooltip.js` | ~200 | Tooltip + hit-testing geometrico lens NP∩co-NP e insiemi completi |
| `live-renderer.js` | ~1220 | Morph animazioni, NP∩co-NP lens, complete lenses, executeUpdate, sidebar, tema |
| `zoom-pan.js` | ~345 | Zoom, pan, auto-fit, mouse/touch/wheel, initPan IIFE |
| `detail-view.js` | ~505 | Content loader, animazioni immersione, accordion |
| `download.js` | ~100 | Export diagramma come SVG vettoriale o PDF |
| `init.js` | ~130 | DOMContentLoaded: engine/perf classes, DOM cache, tema, listener UI, idle preload |

**Principio:** ogni file usa solo variabili dichiarate nei file caricati prima di lui. Nessun modulo di livello superiore viene richiamato da quelli inferiori — il flusso di dipendenza è sempre verso il basso (unidirezionale).

---

## 2. Ordine di caricamento e dipendenze

L'ordine degli `<script>` in `index.html` è **obbligatorio**. Non spostare i tag senza aver verificato le dipendenze.

```
[dati prima dei moduli]
setting_sets/class-definitions.js   → CLASS_DEFINITIONS, CLASS_GROUPS, appState, _isLight, getStyle
setting_sets/scenarios.js           → SCENARIO_DECLARATIONS
complexity_sets/*/config.js         → window._CLASS_MANIFEST[id]

[moduli js/ in ordine]
1.  js/state.js                  ← nessuna dipendenza da altri moduli js/
2.  js/dependency-resolver.js    ← legge CLASS_DEFINITIONS al parse-time
3.  js/geometry.js               ← legge SCENARIO_DECLARATIONS al parse-time
4.  js/svg-renderer.js           ← usa CLASS_DEFINITIONS, getStyle, DOM, svgEl, _FILTER_CFG
5.  js/diagram-interaction.js    ← usa _getRoot, _overlayMap, _buildHoverFillPath, _isSafari
6.  js/tooltip.js                ← usa _getCtm, _getRoot, CLASS_DEFINITIONS, _lensEl
7.  js/live-renderer.js          ← usa tutto quanto sopra + _COMPLETE_MAP, _completeLensEls
8.  js/zoom-pan.js               ← usa applyViewTransform, _handleDiagramClick, _isBlink
                                   ↑ initPan IIFE si esegue qui — DOM disponibile (fondo body)
9.  js/detail-view.js            ← usa applyViewTransform, animateFit, _COMPLETE_MAP
10. js/download.js               ← usa sceneBBox, SCENARIOS, scenarioKey
11. js/init.js                   ← applica _engineClass/_PERF_TIER a <html>, registra listener
```

**Punti critici:**
- `dependency-resolver.js` e `geometry.js` leggono i dati globali (`CLASS_DEFINITIONS`, `SCENARIO_DECLARATIONS`) al **parse-time** (fuori da funzioni). Devono caricare DOPO i rispettivi file `setting_sets/`.
- `zoom-pan.js` contiene un IIFE `initPan()` che si esegue immediatamente. Poiché tutti gli script sono in fondo al `<body>`, il DOM è già disponibile.
- `live-renderer.js` chiama `_rebuildHitOverlay` (da `diagram-interaction.js`) e `scheduleFit` (da `zoom-pan.js`): entrambi già caricati.

---

## 3. state.js — variabili globali e costanti

**Non modificare questo file se non sai cosa stai facendo** — ogni altra sezione del codice legge da qui. È l'unico file che dichiara stato globale.

### Utilità SVG
- `SVG_NS`, `svgEl(tag, attrs)`, `easeIO(t)` — namespace SVG, factory elemento, easing quadratico

### Costanti canvas
- `SVG_CX = 400`, `SVG_CY = 250` — centro logico del canvas
- `ZOOM_STEP`, `ZOOM_MIN`, `ZOOM_MAX` — limiti zoom

### Stato view
- `viewState = {zoom, panX, panY}` — stato corrente della vista
- `_fitRafId`, `_fitTimeout` — handle animazione auto-fit
- `_vtZ/_vtX/_vtY` — cache valori transform (skip-write dirty check)

### Cache DOM
- `DOM` — oggetto con riferimenti a tutti i nodi principali
- `_getRoot()` — lazy-init `DOM.root`

### Cache CTM (tooltip)
- `_ctmCache`, `_invalidateCTM()`, `_getCtm()` — evita `getScreenCTM()` a ogni mousemove

### Flag UI
- `_sidebarOpen`, `_defsTheme`

### Stato lens NP∩co-NP
- `_lensEl`, `_lensNPKey`, `_lensRebuildT`, `_lensRafId`

### Stato detail-view
- `_mode` (`'set-view'` | `'detail-view'`), `_savedVS`, `_activeClsId`, `_hoveredGroup`, `_immRafId`

### Stato accordion sidebar dettaglio
- `_dvActiveNav`, `_dvSubCache`

### Hit-overlay map
- `_overlayMap` — `Map<classId, SVGElement>` per O(1) lookup hover

### Browser / Engine detection
Rilevato una volta al parse-time dall'user agent. Usato ovunque per selezionare code path ottimali:
- `_BR` — oggetto con flags: `safari, firefox, opera, edge, chrome, blink`
- `_isSafari`, `_isFirefox`, `_isEdge`, `_isOpera`, `_isChrome`, `_isBlink` — alias di convenienza
- `_engineClass` — stringa CSS class (`'engine-webkit'`|`'engine-gecko'`|`'engine-blink'`)

### Hardware performance tier
- `_PERF_TIER` — `'high'`|`'medium'`|`'low'` da `deviceMemory` + `hardwareConcurrency`

### Configurazione filtri SVG per-engine
- `_FILTER_CFG` — `null` su Safari (filtri SVG disabilitati), oggetto con `{x,y,w,h,deviationDark,deviationLight,opacityDark,opacityLight}` su Blink e Gecko (valori diversi per i due engine)

### Timing animazioni per-engine
- `_MORPH_DUR` — durata morph: 480ms Safari, 500ms Firefox, 520ms Blink

### Hover filter strings
- `_HOV_FILTER_DARK`, `_HOV_FILTER_LIGHT` — stringhe CSS `filter` per hover, più ricche su Firefox. Applicate via `element.style.filter` (non via CSS `transition: filter`).

### Scheduling utilities
- `_schedule(fn, ms)` — usa `scheduler.postTask` su Chrome 95+ (cede agli input), altrimenti `setTimeout`
- `_idle(fn)` — usa `requestIdleCallback` (Chrome/Firefox/Edge) o `setTimeout(200)` (Safari)

### SVG rendering hints
- `_SVG_SHAPE_RENDERING` — `'geometricPrecision'` su Blink, `'auto'` altrove
- `_SVG_TEXT_RENDERING` — `'geometricPrecision'` Blink, `'optimizeLegibility'` Gecko, `'auto'` Safari

### Stato complete lenses (NP-c, co-NP-c, PSPACE-c)
- `_completeLensEls` — `Map<classId, SVGElement>` — elemento DOM del lens
- `_completeLensRafs` — `Map<classId, rafHandle>` — RAF loop di sincronizzazione

### Configurazione insiemi completi
- `_COMPLETE_MAP` — oggetto statico `{ 'NP-c': {hardId:'NP-h', parentId:'NP'}, ... }` — usato da `live-renderer.js` e `detail-view.js`

### Icone SVG
- `SVG_CHEVRON_LEFT/RIGHT/UP/DOWN`, `SVG_SUN`, `SVG_MOON` — stringhe HTML di icone

---

## 4. dependency-resolver.js — logica delle dipendenze

Gestisce la **risoluzione automatica delle dipendenze** tra classi e la generazione delle chiavi scenario.

### `_COMPLETE_SETS`
`Set` degli id degli insiemi completi: `{'NP-c', 'co-NP-c', 'PSPACE-c'}`. Questi vengono esclusi dalla `scenarioKey()` perché non determinano la geometria di base del diagramma (solo il layer di intersezione sopra).

### `resolveImplicitDependencies(sel)`
BFS sulle `implicitParents` di ogni classe. Le catene di dipendenza sono:
```
NP-h  → implicitParents: ['NP']     → aggiunge solo NP
NP-c  → implicitParents: ['NP-h']   → aggiunge NP-h, poi transitivamente NP
co-NP-h → ['co-NP']
co-NP-c → ['co-NP-h']              → aggiunge co-NP-h, poi co-NP
PSPACE-h → ['PSPACE']
PSPACE-c → ['PSPACE-h']            → aggiunge PSPACE-h, poi PSPACE
```

**Nota critica:** selezionare NP-Hard aggiunge NP ma **non** NP-complete. Selezionare NP-complete aggiunge NP-Hard (e quindi NP). La direzione della dipendenza è inversa rispetto all'intuizione: è NP-complete che dipende da NP-Hard, non il contrario.

### `cascadeDeselect(removedId, explicit)`
Quando l'utente deseleziona una classe, rimuove anche tutte le classi che la richiedono come genitore implicito transitivo.

### `scenarioKey(activeSet)`
Converte un `Set<string>` nella chiave canonica per cercare la geometria in `SCENARIOS`. **Filtra gli insiemi completi** prima di costruire la chiave:
```js
// Selezionate: {NP-c, NP-h, NP}
scenarioKey(new Set(['NP-c','NP-h','NP'])) → 'NP|NP-h'
// NP-c è filtrato: non contribuisce alla geometria base
```
L'ordine è deterministico (definito in `_SCENARIO_ORDER` in questo stesso file, non in `main.js`).

### `_SCENARIO_ORDER`
`['P','NP','co-NP','NP-h','co-NP-h','PSPACE','PSPACE-h']` — include solo i 7 id non-completi che compaiono come chiavi negli scenari.

### `_TRANSITIVE_PARENTS`
Map pre-calcolata al parse-time: `id → Set<genitoriTransitivi>`. Lookup O(1) invece di BFS live ad ogni interazione.

---

## 5. geometry.js — motore geometrico

### `_parabolaFromPoints(sh)`
Cuore matematico del motore. Dato un insieme di punti descrittivi della parabola (punto sul ramo sinistro `p0`, fondo bowl `pm`, punto sul ramo destro `p2`, altezza delle braccia `height`), calcola in 7 passi:
1. Il coefficiente della parabola `y = a·(x−pm.x)² + pm.y`
2. I punti di controllo Bézier cubici simmetrici
3. La rotazione opzionale di tutti i punti di controllo attorno al punto `(pm.x, height)`
4. L'intersezione precisa della curva Bézier ruotata con `y = height` (bisection 64 iterazioni)
5. La sub-Bézier esatta tra i due punti di intersezione (algoritmo De Casteljau)
6. Le code tratteggiate tangenziali estese di `tailLength` unità
7. La posizione default della label (centroide tra arco e code)

### `toSVGCoords(shape)`
Converte coordinate display → SVG: `x_svg = x + 400`, `y_svg = 250 - y`. Chiamata una sola volta per shape al caricamento.

### `resolveScenarioImports(key, visited)`
Espande ricorsivamente le direttive `{'import-scenario': 'KEY'}`, con guard anti-ciclo e semantica last-write-wins per deduplicazione per `id`.

### `_preParseCurveShape(shape)`
Pre-parsa le path string degli open-curve in array numerici `_arc8/_lt4/_rt4`. Il RAF loop di morph usa questi array senza mai eseguire regex o parse stringhe.

### `SCENARIOS`
`Map<string, Shape[]>` costruita al parse-time di questo file. Contiene la geometria SVG pre-calcolata per tutti i 53 scenari dichiarati. Ogni `executeUpdate()` fa un lookup O(1). **Non viene mai ricalcolata.** `SCENARIO_DECLARATIONS` viene azzerata subito dopo per liberare memoria.

---

## 6. svg-renderer.js — costruttori SVG

### `buildSVGDefs()`
Crea i filtri SVG per ogni classe in `<defs id="svg-defs">` usando `feDropShadow` (non `feGaussianBlur`). I parametri (regione, stdDeviation, opacità) provengono da `_FILTER_CFG` in `state.js` e differiscono per engine:
- **Blink:** regione 6%, stdDeviation 2.0 dark / 1.0 light
- **Gecko/WebRender:** regione 8%, stdDeviation 2.5 dark / 1.2 light (GPU shader path, può permettersi valori più ricchi)
- **Safari:** funzione ritorna immediatamente — nessun filtro creato (i filtri SVG su elementi animati forzano WebKit nel software renderer)

Guard interno: se il tema non è cambiato (`_defsTheme`), ritorna senza toccare il DOM. Preserva i clipPath lens NP∩co-NP e degli insiemi completi quando resetta `innerHTML`.

### `buildShapeGroup(shape, allShapes)`
Dispatcher: chiama `buildEllipseGroup` o `buildOpenCurveGroup` a seconda del tipo.

### `buildEllipseGroup(shape, allShapes)`
Crea un `<g class="cls-group cls-{sid}" data-class-id=...>` con:
- `<title>` per accessibilità
- `<ellipse>` con attributo `shape-rendering` per-engine (`_SVG_SHAPE_RENDERING`) e filter condizionale (`_FILTER_CFG ? url(#glow-...) : nessuno`)
- `<text>` con attributo `text-rendering` per-engine (`_SVG_TEXT_RENDERING`)

Caches: `g._ellipseEl`, `g._textEl` per accesso O(1) in `morphGroup()`.

### `buildOpenCurveGroup(shape)`
Crea un `<g>` per le classi Hard con:
- `path[data-role="hover-fill"]` — area di fill invisibile (CSS la mostra al hover)
- `path[data-role="solid-arc"]` — arco principale
- `path[data-role="left-tail"]` / `path[data-role="right-tail"]` — code tratteggiate
- `<text>` per la label

Caches: `g._hoverFill`, `g._solidArc`, `g._leftTail`, `g._rightTail`, `g._textEl`.

### `_buildHoverFillPath(shape)`
Costruisce il path chiuso `M tailLeft L arcStart Bezier L tailRight Z` per l'area hover delle parabole.

---

## 7. diagram-interaction.js — hover e click

### `_addHov(g)` / `_removeHov(g)`
Toggling centralizzato di `cls-hov` + `style.filter` JS-diretto. Il filter NON è in CSS (`transition: filter` pre-allocherebbe compositor layers per ogni `.cls-group`, anche non hoverati). Su Safari il filter è omesso completamente.

### `_applyHoverDim(hoveredGroup)` / `_clearHoverDim()`
Dimming degli elementi non hoverati tramite `style.opacity` inline (priorità massima, non interferisce con animazioni CSS). `_HOV_DIM = '0.28'`. Skip write se l'elemento è già al target.

### `initDiagramInteraction()`
RAF-throttled `mousemove` — massimo 1 aggiornamento per frame (60Hz). Logica di risoluzione del target: se il target ha un antenato con `data-overlay-for` → usa `_overlayMap.get()` per trovare il gruppo SVG reale (meccanismo per le parabole Hard); altrimenti walk-up DOM cercando `.cls-group` o `.intersection-group`.

### `_handleDiagramClick(target, clientX, clientY)`
Routing click verso la detail view:
1. `data-overlay-for` → `enterDetailView(overlayFor)` (parabole Hard)
2. `.intersection-group` con `data-class-id` → `enterDetailView(classId)` (complete lenses: NP-c, co-NP-c, PSPACE-c)
3. `.intersection-group` senza `data-class-id` → `enterDetailView('NP∩co-NP')`
4. `data-class-id` generico → `enterDetailView(classId)`

### `_rebuildHitOverlay(root, shapes)`
Per ogni shape `open-curve`: inserisce overlay hit invisibili (`data-overlay-for`) in posizione z-order corretta (immediatamente dopo il gruppo Hard nel DOM). Ricostruisce `_overlayMap`. Skip dei gruppi `data-complete-for` (i complete lenses gestiscono da soli hover e click).

---

## 8. tooltip.js — tooltip e lens

IIFE con stato privato. Cache delle dimensioni del tooltip (`_tipW/_tipH`) per evitare `offsetWidth/Height` ad ogni mousemove.

### `isInLens(svg, clientX, clientY)`
Hit-test geometrico per il lens NP∩co-NP: converte coordinate schermo → SVG via CTM, verifica che il punto sia dentro NP AND dentro co-NP AND fuori da tutti gli elementi con priorità più alta (`_lensHigherIds = ['NP-c','co-NP-c','P']`). Usa una cache degli elementi ellisse invalidata da `_invalidateLensCache()` (chiamata da `transitionToScenario`).

### Logica mousemove tooltip
Ordine di priorità:
1. `isInLens()` → tooltip NP∩co-NP (hit-test geometrico, più affidabile dei pointer-events clip-path)
2. `closest('[data-overlay-for]')` → tooltip della classe Hard corrispondente
3. Walk-up DOM: `.intersection-group` con `data-class-id` → tooltip dell'insieme completo (NP-c, co-NP-c, PSPACE-c)
4. Walk-up DOM: `.intersection-group` senza `data-class-id` → tooltip NP∩co-NP
5. Walk-up DOM: `data-class-id` generico → tooltip della classe
6. `hideTip()`

---

## 9. live-renderer.js — transizioni e sidebar

Modulo principale (~1220 righe). Gestisce tutto il rendering live.

### `scheduleUpdate()`
Debounce 32ms. Su Chrome 95+ usa `_schedule()` che chiama `scheduler.postTask()` con priorità `user-visible` — cede agli eventi input tra task, prevenendo jank durante click rapidi multipli.

### `syncCheckboxes(applied, prevApplied)`
Diff O(changed) — aggiorna solo i checkbox il cui stato è effettivamente cambiato.

### `exitGroup(g)`
Cancella RAF in corso, aggiunge `cls-exiting`, rimuove dal DOM dopo 280ms.

### `morphGroup(g, shape, allShapes)`
- **Ellissi:** RAF con `baseVal.value` diretto (Blink/Gecko) o `setAttribute` (Safari). Label fusa nel tick. Durata `_MORPH_DUR` (per-engine).
- **Open-curve:** usa array pre-parsati `_arc8/_lt4/_rt4` per interpolare 12 parametri Bézier senza regex. Aggiorna anche hover-fill e overlay nel tick. Fallback crossfade se i path non sono parseable.

### `insertAtZOrder(root, g, id)` / `insertLensAtZOrder(root, lensEl)`
Inserisce un nuovo gruppo nella posizione z-order corretta basandosi su `renderPriority`.

### `updateLens(root, shapes, hasNewEntrants)`
Gestisce il layer NP∩co-NP. Tecnica: due `<clipPath>` in `<defs>` sincronizzati con le ellissi live via RAF loop (`lensAnimTick`). Usa `setAttribute` per i clipPath children (bug WebKit: `baseVal.value` nelle `<defs>` non propagato correttamente).

### `updateCompleteLenses(root, shapes, applied)`
Gestisce i tre overlay degli insiemi completi (NP-c, co-NP-c, PSPACE-c). Per ognuno:
- Costruisce due `<clipPath>` in `<defs>`: uno con l'ellisse del parent, uno con `_arcAboveClipPath()` (path chiuso dell'area interna della parabola Hard)
- Un `<rect>` colorato viene clippato da entrambi in cascata → produce l'area di intersezione
- La label è posizionata a 40% tra il top dell'ellisse e il midpoint dell'arco (`_computeCompleteLabelPos`)
- Il colore è la media cromatica tra il colore del Hard e del parent (`_mixHex`)
- Un RAF loop sincronizza i clipPath per `_MORPH_DUR + 120ms` dopo ogni cambio scenario
- Il gruppo ha `data-complete-for` e `data-class-id` per essere identificabile da hover/click

### `transitionToScenario(newShapes)`
Sequenza per ogni cambio di scenario:
1. Invalida cache lens tooltip
2. Se `newShapes` vuoto: exit di tutto, clear lenses, clear complete lenses
3. Altrimenti: costruisce `live` Map (skip `data-complete-for`), esce le forme rimosse (skip `data-complete-for`), morpha/entra le forme nuove
4. `updateLens()` → NP∩co-NP
5. `updateCompleteLenses()` → complete lenses (deve venire prima di `_rebuildHitOverlay` per popolare `_overlayMap` correttamente)
6. `_rebuildHitOverlay()` → overlay Hard
7. `scheduleFit()`

### `executeUpdate()`
Dispatcher principale dopo debounce. Risolve dipendenze → promuove ad `explicit` → `scenarioKey` → `SCENARIOS.get()` → `transitionToScenario()`.

### `buildSidebar()`
DocumentFragment (un solo reflow), event listener delegato sul container (un listener per tutti i checkbox), `DOM.chkMap` per O(1) sync.

### `resetAll()`
Filtra i gruppi saltando `data-complete-for` (i complete lenses hanno un loop di cleanup separato con animazione).

### `setTheme(light)` / `toggleSidebar()`
`setTheme`: aggiorna sidebar in-place, rebuild defs, refresh hover filter inline, refresh complete lens colors, aggiorna colori di ogni shape senza distruggere il DOM. `toggleSidebar`: re-fit dopo 620ms (CSS transition ~550ms).

---

## 10. zoom-pan.js — zoom, pan, touch

### `applyViewTransform()`
Applica `translate(400+panX, 250+panY) scale(zoom) translate(-400,-250)` al `diagram-root`. Dirty-check: salta `setAttribute` se i valori non sono cambiati.

### `_setWillChange()` / `_clearWillChange()`
`will-change: transform` applicato **solo su Blink** (`_isBlink`). Su Firefox: WebRender GPU-accelera già tutti i transform. Su Safari: Core Animation gestisce il proprio compositing e `will-change` aumenta il consumo VRAM.

### `animateFit(tZ, tX, tY)` / `scheduleFit(shapes)`
`scheduleFit` aspetta 700ms dopo le animazioni di morph/enter, poi usa `getBBox()` sul DOM reale (transform temporaneamente rimosso) per il bounding box vero includendo le code tratteggiate.

### `initPan()` IIFE
Si esegue immediatamente al caricamento. Gestisce:
- **Mouse drag:** scale precompute una volta per drag, non per frame
- **Wheel:** zoom a scatti
- **Touch:** pan con 1 dito, pinch-zoom con 2 dita
- **Tap/click:** se spostamento < 6px → `_handleDiagramClick()`
- **Touch hover:** aggiorna `_hoveredGroup` al touchstart per feedback visivo

---

## 11. detail-view.js — vista dettaglio

### `loadClassContent(classId)`
Carica tutti i `.md` in parallelo con `Promise.all`. Cachato in `_contentCache`.

> ⚠️ `fetch()` richiede un server locale. Non funziona da `file://`.

### `enterDetailView(classId, clientX, clientY)` / `exitDetailView()`
Transizione in 5 fasi temporizzate (0ms, 80ms, 700ms, 760ms, 1050ms). Zoom target calcolato dal punto cliccato in coordinate SVG. Per gli insiemi completi (`_COMPLETE_MAP`), il target è il centro dell'ellisse parent.

### `buildDetailSidebar(classId)` / `showContent()`
Accordion con § Definizione + problemi + esempi (esclusivo: aprirne uno chiude gli altri). `showContent` applica crossfade 180ms + `marked.parse()` + `renderMathInElement()`.

### `downloadContent()`
Scarica il contenuto corrente del content panel come `.md`.

---

## 12. download.js — export SVG / PDF

### `downloadDiagram()`
1. `getBBox()` sul `diagram-root` senza transform → bounding box reale (include code tratteggiate)
2. Clone del live SVG, reset del transform di zoom/pan, rimozione filtri SVG
3. Aggiunta rect di background
4. Tentativo PDF via jsPDF + svg2pdf (se CDN disponibili)
5. Fallback SVG puro via `XMLSerializer`

---

## 13. init.js — inizializzazione

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // 1. Applica _engineClass e perf-${_PERF_TIER} a <html>
  //    → abilita ottimizzazioni CSS per-engine
  // 2. Pre-popola DOM cache (DOM.root, DOM.diagramSvg, ecc.)
  // 3. Tema: localStorage → fallback ora del giorno (7-19 = chiaro)
  // 4. Mobile: inizia con sidebar collassata
  // 5. buildSidebar() + renderDiagram([])
  // 6. Event listeners: btn-reset, btn-toggle, btn-theme, btn-zoom-in/out
  // 7. detail view: initDiagramInteraction(), btn-back
  // 8. Download mode-aware: set-view → SVG/PDF, detail-view → MD
  // 9. Idle preload: carica loadClassContent() per tutte le classi
  //    durante i frame idle (requestIdleCallback o setTimeout su Safari)
});
```

Questo è l'ultimo file caricato. Applicare le classi CSS `engine-*` a `<html>` come primo passo garantisce che tutte le ottimizzazioni CSS per-engine siano attive prima che qualsiasi elemento venga renderizzato.

---

## 14. Variabili globali: riferimento completo

| Variabile | File | Tipo | Descrizione |
|---|---|---|---|
| `appState.explicit` | class-definitions.js | `Set<string>` | Classi selezionate dall'utente |
| `appState.applied` | class-definitions.js | `Set<string>` | Classi mostrate (explicit + dipendenze) |
| `_isLight` | class-definitions.js | `boolean` | Tema corrente (true = chiaro) |
| `CLASS_DEFINITIONS` | class-definitions.js | `object` | Definizioni visive e logiche delle classi |
| `CLASS_GROUPS` | class-definitions.js | `array` | Gruppi per la sidebar |
| `SCENARIOS` | geometry.js | `Map<string,Shape[]>` | Geometrie pre-calcolate di tutti gli scenari |
| `_mode` | state.js | `string` | `'set-view'` o `'detail-view'` |
| `_sidebarOpen` | state.js | `boolean` | Stato sidebar |
| `_hoveredGroup` | state.js | `Element\|null` | Gruppo SVG sotto il mouse |
| `_savedVS` | state.js | `{zoom,panX,panY}` | View state salvato prima dell'immersione |
| `_activeClsId` | state.js | `string\|null` | Classe nella detail view |
| `viewState` | state.js | `{zoom,panX,panY}` | View state corrente |
| `DOM` | state.js | `object` | Cache dei nodi DOM principali |
| `_overlayMap` | state.js | `Map` | classId → gruppo SVG (Hard shapes + complete lenses) |
| `_lensEl` | state.js | `Element\|null` | Elemento SVG del lens NP∩co-NP |
| `_completeLensEls` | state.js | `Map` | classId → elemento SVG del complete lens |
| `_completeLensRafs` | state.js | `Map` | classId → handle RAF di sync |
| `_COMPLETE_MAP` | state.js | `object` | Config statica: hardId+parentId per ogni insieme completo |
| `_BR` | state.js | `object` | Flags browser: safari/firefox/opera/edge/chrome/blink |
| `_isSafari/_isFirefox/_isBlink` | state.js | `boolean` | Alias per i flag engine più usati |
| `_engineClass` | state.js | `string` | Classe CSS da applicare a `<html>` |
| `_PERF_TIER` | state.js | `string` | Tier hardware: high/medium/low |
| `_FILTER_CFG` | state.js | `object\|null` | Config filtri SVG per-engine (null su Safari) |
| `_MORPH_DUR` | state.js | `number` | Durata morph ms (per-engine) |
| `_HOV_FILTER_DARK/LIGHT` | state.js | `string` | CSS filter per hover, per-engine |
| `_schedule` | state.js | `function` | Debounce helper (postTask o setTimeout) |
| `_idle` | state.js | `function` | Idle callback (rIC o setTimeout) |
| `_COMPLETE_SETS` | dependency-resolver.js | `Set<string>` | IDs degli insiemi completi (esclusi da scenarioKey) |
| `_SCENARIO_ORDER` | dependency-resolver.js | `array` | Ordine canonico dei 7 ID non-completi |

---

## 15. Tecniche di performance

| Tecnica | File | Motivo |
|---|---|---|
| RAF throttle mousemove | diagram-interaction.js | 1000Hz mouse → 1 elaborazione/frame |
| `style.opacity` inline | diagram-interaction.js | Priorità massima senza rompere animazioni CSS |
| JS-direct `style.filter` per hover | diagram-interaction.js | Evita pre-allocazione layers per ogni .cls-group |
| `_TRANSITIVE_PARENTS` pre-calcolata | dependency-resolver.js | BFS O(1) invece di live |
| `_COMPLETE_SETS` filtro in `scenarioKey` | dependency-resolver.js | Scenari comuni a hard+complete riusati |
| `SCENARIOS` pre-calcolata | geometry.js | Lookup O(1) invece di calcolo geometrico a runtime |
| `_arc8/_lt4/_rt4` arrays | live-renderer.js | Regex eseguita una sola volta, hot path senza parse |
| `SVGAnimatedLength.baseVal.value` | live-renderer.js | Accesso numerico diretto, no string parse (Blink/Gecko) |
| `setAttribute` su Safari | live-renderer.js | Evita bypass del compositor WebKit su baseVal.value |
| `_schedule()` con `postTask` | live-renderer.js | Cede input events su Chrome 95+ durante click rapidi |
| `_MORPH_DUR` per-engine | state.js | Durata ottimale per CA/WebRender/Skia |
| `will-change` solo su `_isBlink` | zoom-pan.js | Blink beneficia; Firefox/Safari no |
| Dirty-check su `applyViewTransform` | zoom-pan.js | Skip `setAttribute` quando il transform non cambia |
| `updateScales()` una volta per drag | zoom-pan.js | `getBoundingClientRect` non chiamato per frame |
| `DOM{}` cache | state.js | Evita `getElementById` ripetuti |
| `_getCtm()` con cache | state.js + tooltip.js | `getScreenCTM()` non chiamato ad ogni mousemove |
| `DocumentFragment` in `buildSidebar` | live-renderer.js | Un solo reflow DOM invece di N |
| Event listener delegato sulla lista | live-renderer.js | Un listener invece di uno per checkbox |
| `_contentCache` Map | detail-view.js | Fetch una sola volta per sessione |
| Fetch parallele (`Promise.all`) | detail-view.js | Tempo totale = max(fetch) non sum(fetch) |
| `_idle()` preload | init.js | Contenuti didattici pre-fetchati durante frame idle |
| `content-visibility: auto` (Blink) | layout.css + detail-view.css | Skip rendering off-screen sidebar items |
| Filter SVG disabilitati (Safari) | svg-renderer.js | Evita software rendering per frame su WebKit |
| In-place color update (setTheme) | live-renderer.js | No destroy/recreate DOM su cambio tema |

---

## 16. Guida rapida: dove modificare cosa

| Cosa vuoi fare | File da toccare |
|---|---|
| Cambiare colori/stile delle classi | `setting_sets/class-definitions.js` |
| Aggiungere/spostare una geometria in uno scenario | `setting_sets/scenarios.js` |
| Aggiungere una nuova classe di complessità | `class-definitions.js` + `scenarios.js` + `dependency-resolver.js` (`_SCENARIO_ORDER`) + nuovo `complexity_sets/<id>/` + `index.html` |
| Modificare i testi didattici | `complexity_sets/<id>/*.md` |
| Cambiare animazioni CSS (fade-in, exit) | `css/diagram.css` |
| Cambiare la logica di morph SVG | `js/live-renderer.js` → `morphGroup()` |
| Cambiare colore/parametri del glow SVG | `js/state.js` → `_FILTER_CFG` |
| Cambiare durata animazioni morph | `js/state.js` → `_MORPH_DUR` |
| Cambiare zoom / pan / touch | `js/zoom-pan.js` |
| Cambiare il rendering del tooltip | `js/tooltip.js` |
| Cambiare l'animazione di immersione | `js/detail-view.js` → `enterDetailView()` |
| Cambiare l'export del diagramma | `js/download.js` |
| Cambiare la logica del tema | `js/live-renderer.js` → `setTheme()` |
| Cambiare il layout della sidebar | `js/live-renderer.js` → `buildSidebar()` |
| Aggiungere un nuovo listener globale | `js/init.js` |
| Aggiungere ottimizzazioni per un nuovo engine | `js/state.js` (detection + config) + `css/layout.css` + `css/diagram.css` |
