# Documentazione CSS
## Cartella `css/`

---

## Indice

1. [Panoramica e filosofia](#1-panoramica-e-filosofia)
2. [theme.css — Colori e tipografia](#2-themecss--colori-e-tipografia)
3. [layout.css — Struttura della pagina](#3-layoutcss--struttura-della-pagina)
4. [diagram.css — Animazioni e interazione SVG](#4-diagramcss--animazioni-e-interazione-svg)
5. [detail-view.css — Vista dettaglio](#5-detail-viewcss--vista-dettaglio)
6. [Ottimizzazioni per-engine](#6-ottimizzazioni-per-engine)
7. [Come modificare il tema](#7-come-modificare-il-tema)
8. [Come aggiungere un nuovo stile responsive](#8-come-aggiungere-un-nuovo-stile-responsive)

---

## 1. Panoramica e filosofia

Il CSS è diviso in **4 file** con responsabilità nettamente separate:

```
theme.css         →  tutto ciò che riguarda i COLORI e la TIPOGRAFIA
layout.css        →  tutto ciò che riguarda le POSIZIONI e le DIMENSIONI
diagram.css       →  tutto ciò che riguarda le FORME SVG del diagramma
detail-view.css   →  tutto ciò che riguarda la SCHERMATA DI DETTAGLIO
```

Tutti e quattro i file usano le variabili CSS definite in `theme.css` (es. `var(--bg)`, `var(--text)`). Questo significa che **cambiare un colore in `theme.css` lo cambia in tutto il sito**.

Le ottimizzazioni per rendering engine (Chrome/Edge, Firefox, Safari) sono distribuite in `layout.css`, `diagram.css` e `detail-view.css` sotto selettori come `html.engine-blink`, `html.engine-gecko`, `html.engine-webkit`. Queste classi vengono applicate da `js/init.js` al primo frame dopo il caricamento.

---

## 2. `theme.css` — Colori e tipografia

### Variabili CSS (`:root`)

Tutte le variabili sono definite su `:root` per il **tema scuro** (default):

```css
:root {
  --bg:         #080d18;   /* sfondo pagina e pannelli */
  --surface:    #0c1220;   /* sfondo sidebar */
  --surface2:   #111928;   /* sfondo elementi della lista */
  --surface3:   #18243a;   /* sfondo elementi in hover */
  --border:     #1e2f48;   /* bordi standard */
  --border-hi:  #2e4a72;   /* bordi in stato attivo/hover */
  --text:       #d4e4ff;   /* testo primario */
  --text-muted: #5a7ba0;   /* testo secondario, etichette */
  --text-dim:   #2e4464;   /* testo quasi invisibile */
  --accent:     #4a9eff;   /* colore di accento (blu) */
  --sw:         278px;     /* larghezza sidebar desktop */
  --ease:       cubic-bezier(0.4,0,0.2,1); /* curva di animazione standard */
  --sidebar-dur:.55s;      /* durata animazione apertura/chiusura sidebar */
}
```

Per il **tema chiaro** (`body.light`), le stesse variabili vengono ridefinite. Quando JavaScript chiama `setTheme(true)`, aggiunge la classe `light` al `body`. Immediatamente tutte le variabili cambiano valore e l'intera interfaccia si aggiorna via CSS.

### Reset di base e body

```css
*,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }

body {
  font-family: 'JetBrains Mono', monospace;
  background: var(--bg); color: var(--text);
  height: 100vh; overflow: hidden; display: flex;
  transition: background .4s ease, color .4s ease;
}
```

Il `body` è un **flex container orizzontale**. I suoi due figli diretti sono `#sidebar` (larghezza fissa) e `#main` (flex:1). `overflow: hidden` impedisce scrollbars indesiderate.

> **Nota:** la `transition: background/color` sul body è intenzionale per il crossfade del tema. Su Safari questo può essere ereditato dai figli in modo indesiderato — vedere la sezione 6 per i workaround per-engine.

### Sfondo a puntini

```css
body::before {
  content:''; position:absolute; inset:0; pointer-events:none; z-index:0;
  background-image: url("data:image/svg+xml,...");
  background-size: 28px 28px;
}
```

`position:absolute` (non `fixed`) evita la creazione di un compositor layer GPU permanente. `pointer-events:none` non intercetta i click. `z-index:0` lo mantiene sotto tutto il contenuto.

---

## 3. `layout.css` — Struttura della pagina

### Bottone toggle (#btn-toggle)

```css
#btn-toggle {
  position: fixed;
  z-index: 200;
}
body.sidebar-open #btn-toggle {
  top: 16px;
  left: calc(var(--sw) - 42px);  /* dentro il bordo destro della sidebar */
}
body:not(.sidebar-open) #btn-toggle {
  top: 14px;
  left: 14px;  /* angolo top-left del viewport */
}
```

Il bottone è `position: fixed` — sempre visibile. **Importante:** è posizionato fuori dalla sidebar nell'HTML perché, se fosse dentro, sparrebbe quando la sidebar collassa a `width: 0` con `overflow: hidden`.

### Sidebar (#sidebar e .sidebar-inner)

```css
#sidebar {
  width: var(--sw); min-width: var(--sw);
  isolation: isolate;
  transition: width var(--sidebar-dur) var(--ease),
              min-width var(--sidebar-dur) var(--ease);
  overflow: hidden;
}
#sidebar.collapsed { width: 0; min-width: 0; }
```

`isolation: isolate` crea un contesto di stacking separato che previene interferenze tra i compositor layers della sidebar e del diagramma SVG (particolarmente importante su Safari). La transizione anima `width` — l'`overflow: hidden` fa scomparire il contenuto durante il collasso.

### Main area (#main, #diagram-wrapper, #diagram-svg, #diagram-root)

```css
#main { flex:1; position:relative; z-index:1; overflow:hidden; }
#diagram-svg { width:100%; height:100%; overflow:visible; cursor:grab; }
#diagram-root { contain: layout; }
```

- `#diagram-svg` ha `overflow:visible` — le parabole Hard si estendono oltre il viewBox e devono essere visibili.
- `#diagram-root` ha `contain: layout` come base universalmente sicura. Le classi engine-blink e engine-gecko lo sovrascrivono con `contain: strict` (vedi sezione 6). Su Safari, `contain: strict` include `contain: size` che su un `<g>` SVG non ha box di riferimento e può causare fallback al software renderer.
- `will-change` **non è impostato in CSS** su `#diagram-root`. Viene applicato dinamicamente via JS da `zoom-pan.js` solo durante pan/zoom attivi (solo su Blink).

### Zoom controls (#zoom-controls)

```css
#zoom-controls {
  position:fixed; bottom:22px; right:24px; z-index:200;
  display:flex; flex-direction:column; gap:5px;
}
```

Tre bottoni in colonna fissi in basso a destra: download (con `margin-bottom:6px`), zoom-in, zoom-out.

### Layout responsive (tablet e mobile)

**Tablet** (`max-width: 900px`): `--sw` ridotta a `240px`.

**Mobile** (`max-width: 600px`): la sidebar diventa un **drawer dal basso** con `position: fixed; bottom: var(--mob-bar-h)` che si animata via `transform: translateY` (non `width` come sul desktop — più performante su mobile perché non forza un relayout). La barra mobile è `position: fixed; bottom: 0` con `border-radius: 16px 16px 0 0`.

---

## 4. `diagram.css` — Animazioni e interazione SVG

### Animazioni entrata/uscita delle forme

```css
.cls-entering { animation: cls-appear .38s ease both; }
@keyframes cls-appear    { from { opacity:0 } to { opacity:1 } }

.cls-exiting {
  animation: cls-disappear .38s cubic-bezier(0.4,0,1,1) both !important;
  pointer-events: none !important;
}
.cls-reset-exit {
  animation: cls-disappear .52s cubic-bezier(0.4,0,0.6,1) both !important;
  pointer-events: none !important;
}
@keyframes cls-disappear { from { opacity:1 } to { opacity:0 } }
```

- `.cls-entering`: aggiunta da JS quando una forma appare. Fade-in 380ms.
- `.cls-exiting`: `!important` per battere qualsiasi override. `pointer-events: none` durante l'uscita.
- `.cls-reset-exit`: più lenta (520ms) per un effetto a cascata durante il Reset all.
- `both` in `animation-fill-mode`: la forma inizia immediatamente in `opacity:0`.

### Hover delle forme

```css
.cls-group, .intersection-group {
  transition: opacity .22s ease;
  cursor: default;
}
.cls-group.cls-hov,
.intersection-group.cls-hov {
  cursor: pointer;
}
```

**Perché il `filter` non è in CSS:** avere `transition: filter` su `.cls-group` causerebbe la pre-allocazione di compositor layers GPU per **ogni** elemento corrispondente, anche quelli mai hoverati. Con 11+ gruppi SVG questo si traduce in decine di MB di VRAM sprecati permanentemente. Il filter hover viene invece applicato direttamente via `element.style.filter` in JavaScript (`_addHov()` in `diagram-interaction.js`) — solo sull'elemento effettivamente hoverato.

**Perché il dimming non è in CSS:** il dimming degli elementi non hoverati (opacity 0.28 su tutto tranne la forma sotto il mouse) è gestito interamente in JavaScript tramite `style.opacity` inline. Una regola CSS come `:hover ~ *` interferirebbe con le animazioni CSS in corso sulle forme (che hanno `animation-fill-mode: both`), causando flickering. Il JS imposta `opacity` inline, che ha la precedenza assoluta senza interrompere le animazioni.

### Hover fill delle parabole Hard

```css
path[data-role="hover-fill"] {
  fill-opacity: 0;
  transition: fill-opacity .22s ease;
  pointer-events: none;
}
.cls-group.cls-hov path[data-role="hover-fill"] {
  fill-opacity: 0.14;
}
body.light .cls-group.cls-hov path[data-role="hover-fill"] {
  fill-opacity: 0.30;
}
```

Le classi Hard (parabole aperte) hanno un `path[data-role="hover-fill"]` invisibile che copre l'intera area interna. Il CSS lo fa apparire quando il gruppo ha `.cls-hov`. Gli overlay invisibili per i click (`data-overlay-for`) sono in parallelo — gestiti da JS.

### Tooltip

```css
#diagram-tooltip {
  position:fixed; z-index:500; pointer-events:none;
  opacity:0; transform:translateY(4px);
  transition: opacity .16s ease, transform .16s ease;
}
#diagram-tooltip.visible { opacity:1; transform:translateY(0); }
```

Appare con lieve movimento verso l'alto. Posizione gestita da JS in base al mouse.

---

## 5. `detail-view.css` — Vista dettaglio

### Sistema a doppio pannello della sidebar

La sidebar contiene due pannelli sovrapposti che si scambiano tramite opacity:

```css
.sidebar-inner { position: relative; }

#sidebar-class-view {
  transition: opacity .28s ease;
  contain: paint;
}
#sidebar-class-view.sv-out {
  opacity: 0; pointer-events: none;  /* senza translateX: evita GPU layer promotion */
}
#sidebar-detail-view {
  position: absolute; inset: 0;
  opacity: 0; pointer-events: none;
  transition: opacity .28s ease;
}
#sidebar-detail-view.dv-in {
  opacity: 1; pointer-events: all;
}
```

`#sidebar-detail-view` è `position: absolute; inset: 0` — copre esattamente `#sidebar-class-view`. La transizione usa **solo opacity** (non `transform: translateX`): usare `translateX` promuoverebbe l'intera sidebar a layer GPU durante la transizione, tenendola in VRAM insieme al diagramma SVG.

### Menu accordion della vista dettaglio

```css
.dv-subitems {
  overflow: hidden;
  max-height: 0;
  transition: max-height .28s ease;
}
.dv-subitems.open { max-height: 200px; }
```

Anima `max-height` da `0` a `200px`. Se si aggiungono molti esempi a un problema, aumentare `200px`.

### Pannello contenuto (#content-panel)

```css
#content-panel {
  position: absolute; inset: 0; z-index: 3;
  opacity: 0; pointer-events: none;
  transition: opacity .35s ease;
  background: var(--bg);
  contain: paint;  /* isola i repaint dello scroll dal diagramma SVG */
}
#content-panel.cp-in { opacity: 1; pointer-events: all; }
```

`z-index: 3` lo porta sopra il diagramma. `contain: paint` isola i repaint causati dallo scroll interno. Il padding-left si adatta via media query quando la sidebar è chiusa (spazio per il toggle flottante).

### Definition box

```css
.definition-box {
  border: 1px solid var(--box-color);
  border-radius: 10px;
}
.definition-box::before {
  content: attr(data-title);
  background: color-mix(in srgb, var(--box-color) 14%, transparent);
}
```

`--box-color` è dichiarata inline sull'elemento HTML. `color-mix` crea colori semi-trasparenti senza rgba manuali.

---

## 6. Ottimizzazioni per-engine

`js/init.js` applica le classi `engine-blink`, `engine-gecko` o `engine-webkit` a `<html>` al primo frame. CSS e JS le usano per attivare ottimizzazioni specifiche.

### Blink (Chrome, Edge, Opera) — `html.engine-blink`

```css
html.engine-blink #diagram-root {
  contain: strict;  /* override del base contain:layout — sicuro su Blink */
}
html.engine-blink .class-item {
  content-visibility: auto;          /* skip rendering off-screen sidebar items */
  contain-intrinsic-size: 0 52px;    /* hint per la scrollbar */
}
html.engine-blink .cls-group {
  pointer-events: bounding-box;      /* hit-test su bounding box, non path preciso */
}
html.engine-blink .intersection-group {
  pointer-events: bounding-box;
}
```

- `contain: strict` su Blink è sicuro perché include `contain: size` con box CSS di riferimento corretto per `<g>` SVG.
- `content-visibility: auto` riduce il costo di layout/style per gli item sidebar fuori viewport del ~60%.
- `pointer-events: bounding-box` usa il rettangolo di bounding box per l'hit-testing invece della geometria precisa — visivamente identico per ellissi convesse, significativamente più economico.

### Gecko (Firefox) — `html.engine-gecko`

```css
html.engine-gecko #diagram-root {
  contain: strict;
  isolation: isolate;   /* batch draw calls in un render pass WebRender */
}
html.engine-gecko #sidebar {
  isolation: isolate;
}
html.engine-gecko #class-list,
html.engine-gecko #detail-nav-list {
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
```

- `isolation: isolate` su `#diagram-root` e `#sidebar` dice a WebRender di trattare i draw call del subtree come un unico render pass, riducendo l'overhead di submission GPU.
- `scrollbar-width: thin` riduce la scrollbar a 6px, stile Firefox nativo.

### WebKit (Safari) — `html.engine-webkit`

```css
html.engine-webkit #diagram-root {
  contain: layout;   /* mantenuto base — strict/size/paint rischiano fallback software */
}
html.engine-webkit #sidebar {
  will-change: auto; /* mai usare will-change su Safari */
}
html.engine-webkit #class-list,
html.engine-webkit #detail-nav-list,
html.engine-webkit #content-panel {
  -webkit-overflow-scrolling: touch;  /* scroll inerziale su touch */
}
```

- Su Safari, `contain: strict` include `contain: size` che su un `<g>` SVG non ha box CSS di riferimento — può causare fallback al software renderer. Base `contain: layout` è il massimo sicuro.
- `will-change: auto` esplicito annulla eventuali hint ereditati.
- `-webkit-overflow-scrolling: touch` abilita lo scroll inerziale (momentum) sulle aree scrollabili.

### Performance tier — `html.perf-low`

```css
html.perf-low .cls-entering  { animation-duration: 0.18s; }
html.perf-low .cls-exiting   { animation-duration: 0.18s; }
html.perf-low #sidebar        { transition-duration: 0.25s; }
html.perf-low #sidebar-class-view,
html.perf-low #sidebar-detail-view { transition-duration: 0.15s; }
html.perf-low #content-panel { transition: opacity 0.15s ease; }
```

Su hardware con poca memoria o pochi core, le durate delle animazioni vengono ridotte per mantenere la UI reattiva. Il tier è calcolato da `_PERF_TIER` in `state.js`.

### Prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  .cls-entering, .cls-exiting, .cls-reset-exit {
    animation-duration: 0.01ms !important;
  }
  .cls-group, .intersection-group {
    transition: none !important;
  }
  .cls-entering { animation: none !important; opacity: 1 !important; }
  .cls-exiting  { animation: none !important; opacity: 0 !important; }
}
```

Rispetta le preferenze di accessibilità del sistema operativo.

---

## 7. Come modificare il tema

### Cambiare un colore

Apri `theme.css`. Modifica la variabile in `:root` (tema scuro) e/o `body.light` (tema chiaro).

Esempio — cambiare il colore di accento da blu a verde:
```css
:root {
  --accent: #22c55e;  /* era #4a9eff */
}
body.light {
  --accent: #16a34a;  /* era #1d4ed8 */
}
```

### Cambiare larghezza sidebar

```css
:root {
  --sw: 320px;  /* era 278px */
}
```

---

## 8. Come aggiungere un nuovo stile responsive

Per un breakpoint intermedio (es. schermi > 1400px):

```css
/* In layout.css, in fondo */
@media (min-width: 1400px) {
  :root { --sw: 340px; }
}
```

Per stili mobile specifici per la vista dettaglio, aggiungili in `detail-view.css` dentro un blocco `@media (max-width: 600px)`.

Per aggiungere ottimizzazioni per un nuovo engine futuro:
1. Aggiungi il rilevamento in `js/state.js` (`_BR` object + alias)
2. Aggiungi la classe CSS in `_engineClass` (stesso file)
3. Aggiungi le regole CSS sotto `html.engine-nuovo` nei file CSS appropriati
