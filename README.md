# Complexity Classes — Set Diagram
## Documentazione globale del progetto

---

## Indice

1. [Cos'è questo progetto](#1-cosè-questo-progetto)
2. [Struttura del progetto](#2-struttura-del-progetto)
3. [Come funziona: visione d'insieme](#3-come-funziona-visione-dinsieme)
4. [Ordine di caricamento e dipendenze tra file](#4-ordine-di-caricamento-e-dipendenze-tra-file)
5. [Come avviare il progetto in locale](#5-come-avviare-il-progetto-in-locale)
6. [Le due modalità dell'applicazione](#6-le-due-modalità-dellapplicazione)
7. [Flusso completo di un'interazione utente](#7-flusso-completo-di-uninterazione-utente)
8. [Guida per sviluppatori: dove intervenire](#8-guida-per-sviluppatori-dove-intervenire)
9. [Tecnologie esterne usate](#9-tecnologie-esterne-usate)
10. [Sistemi di coordinate](#10-sistemi-di-coordinate)
11. [Concetti chiave dell'architettura](#11-concetti-chiave-dellarchitettura)

---

## 1. Cos'è questo progetto

Un visualizzatore didattico interattivo delle classi di complessità computazionale (P, NP, NP-Hard, NP-complete, co-NP, co-NP-Hard, co-NP-complete, PSPACE, PSPACE-Hard, PSPACE-complete, NP∩co-NP).

L'utente seleziona una o più classi da un menu laterale. Il diagramma SVG animato mostra le relazioni di inclusione tra le classi selezionate. Cliccando su una classe nel diagramma si entra in una **vista dettaglio** che mostra la definizione formale, i problemi noti e gli esempi applicativi, con rendering di Markdown e formule LaTeX.

---

## 2. Struttura del progetto

```
index.html                              ← Punto di ingresso, struttura HTML
│
├── css/
│   ├── theme.css                       ← Colori, variabili CSS, dark/light
│   ├── layout.css                      ← Sidebar, layout strutturale, zoom controls
│   ├── diagram.css                     ← Animazioni SVG, hover, mobile, tooltip
│   ├── detail-view.css                 ← Vista dettaglio, accordion, content panel
│   └── README_css.md                   ← Documentazione CSS
│
├── js/
│   ├── state.js                        ← Variabili globali, costanti, cache DOM,
│   │                                      rilevamento browser/engine, configurazioni
│   │                                      per-engine (filtri, timing, scheduling)
│   ├── dependency-resolver.js          ← BFS dipendenze, scenarioKey, cascadeDeselect
│   ├── geometry.js                     ← Matematica parabole, Map SCENARIOS
│   ├── svg-renderer.js                 ← Costruttori SVG: defs, ellissi, parabole
│   ├── diagram-interaction.js          ← Hover dimming, hit overlay, routing click
│   ├── tooltip.js                      ← Tooltip + lens hit-testing
│   ├── live-renderer.js                ← Morph, transizioni, complete lenses, sidebar, tema
│   ├── zoom-pan.js                     ← Zoom, pan, auto-fit, touch
│   ├── detail-view.js                  ← Content loader, immersione, accordion
│   ├── download.js                     ← Export SVG / PDF
│   ├── init.js                         ← DOMContentLoaded, engine/perf classes, wiring
│   └── README_js.md                    ← Documentazione JS dettagliata
│
├── setting_sets/
│   ├── class-definitions.js            ← Definizione visiva e logica delle classi
│   ├── scenarios.js                    ← Geometria degli scenari del diagramma
│   └── README_setting-sets.md          ← Documentazione setting_sets
│
└── complexity_sets/
    ├── P/
    │   ├── config.js                   ← Manifest dei contenuti della classe P
    │   ├── definition.md               ← Definizione formale di P
    │   ├── maximum-flow/
    │   │   ├── description.md
    │   │   ├── example1.md
    │   │   └── example2.md
    │   └── shortest-path/
    │       ├── description.md
    │       ├── example1.md
    │       └── example2.md
    ├── NP/  ←  stessa struttura
    ├── NP-c/
    ├── NP-h/
    ├── co-NP/
    ├── co-NP-c/
    ├── co-NP-h/
    ├── PSPACE/
    ├── PSPACE-c/
    ├── PSPACE-h/
    ├── NP-intersect-co-NP/
    └── README_complexity-sets.md       ← Documentazione complexity_sets
```

---

## 3. Come funziona: visione d'insieme

Il progetto si basa su **tre strati separati di dati e logica**, che comunicano in un senso unico:

```
setting_sets/         →   COME si disegna il diagramma
                          (colori, forme, posizioni, geometria)

complexity_sets/      →   COSA si mostra nella vista dettaglio
                          (definizioni, problemi, esempi in Markdown+LaTeX)

js/                   →   Tutta la logica interattiva
                          (animazioni, stato, routing, rendering)
                          suddivisa in 11 moduli tematici
```

Questa separazione è intenzionale e potente: un matematico può aggiornare i contenuti didattici in `complexity_sets/` senza toccare nessun file JavaScript. Un designer può ridisegnare la grafica in `css/` senza toccare i contenuti. Un programmatore che vuole aggiungere una nuova classe lavora principalmente in `setting_sets/` e `complexity_sets/`.

---

## 4. Ordine di caricamento e dipendenze tra file

L'ordine degli `<script>` in `index.html` è **obbligatorio e non può essere cambiato** senza verificare le dipendenze:

```
1.  CDN: jsPDF, svg2pdf                    → librerie per l'export PDF/SVG
2.  CDN: marked.js                         → parser Markdown
3.  CDN: KaTeX                             → renderer LaTeX
4.  css/ (tutti)                           → prima il CSS, prima che il browser mostri nulla
5.  setting_sets/class-definitions.js      → CLASS_DEFINITIONS, CLASS_GROUPS, appState
6.  setting_sets/scenarios.js              → SCENARIO_DECLARATIONS
7.  complexity_sets/*/config.js            → window._CLASS_MANIFEST[id]
8.  js/state.js                            ← variabili globali, engine detection
9.  js/dependency-resolver.js             ← legge CLASS_DEFINITIONS al parse-time
10. js/geometry.js                        ← legge SCENARIO_DECLARATIONS al parse-time
11. js/svg-renderer.js
12. js/diagram-interaction.js
13. js/tooltip.js
14. js/live-renderer.js
15. js/zoom-pan.js                        ← initPan IIFE qui (DOM già disponibile)
16. js/detail-view.js
17. js/download.js
18. js/init.js                            ← DOMContentLoaded, engine/perf classes, wiring
```

**Perché questo ordine è critico:**

- `dependency-resolver.js` e `geometry.js` leggono `CLASS_DEFINITIONS` e `SCENARIO_DECLARATIONS` al **parse-time** (fuori da qualsiasi funzione). Se i rispettivi file `setting_sets/` non sono ancora stati caricati, il codice genera `ReferenceError`.
- Il calcolo di `SCENARIOS` avviene **una sola volta** al caricamento della pagina, pre-computando tutti i layout geometrici per tutti i 53 scenari dichiarati. Da quel momento in avanti ogni cambio di selezione ha un lookup O(1).
- `zoom-pan.js` contiene un IIFE che si esegue immediatamente. Poiché tutti gli `<script>` sono in fondo al `<body>`, il DOM è già disponibile.
- I `config.js` delle classi popolano `window._CLASS_MANIFEST` — oggetto letto da `detail-view.js` quando l'utente apre una classe.

---

## 5. Come avviare il progetto in locale

Il progetto usa `fetch()` per caricare i file `.md` da `complexity_sets/`. I browser **bloccano** `fetch()` quando il file viene aperto direttamente dal filesystem (`file://`). È necessario un server locale.

**Metodo 1 — VS Code + Live Server (consigliato):**
1. Installa l'estensione **Live Server** (Ritwick Dey)
2. Apri la cartella del progetto in VS Code
3. Tasto destro su `index.html` → **Open with Live Server**
4. Il browser apre `http://127.0.0.1:5500/index.html` automaticamente

**Metodo 2 — Python (da terminale):**
```bash
cd /percorso/del/progetto
python3 -m http.server 8080
# Poi apri: http://localhost:8080
```

**Metodo 3 — Node.js:**
```bash
npx serve .
```

Su **server di produzione** (qualsiasi hosting web standard) funziona senza configurazione aggiuntiva.

---

## 6. Le due modalità dell'applicazione

### Modalità set-view (visualizzatore)

Lo stato predefinito. L'utente:
- Seleziona classi dalla sidebar. Le dipendenze si risolvono automaticamente secondo le catene dichiarate in `class-definitions.js`:
  - Selezionare **NP-Hard** aggiunge automaticamente **NP** (ma NON NP-complete — quest'ultimo va selezionato separatamente).
  - Selezionare **NP-complete** aggiunge automaticamente **NP-Hard** (e transitivamente **NP**).
  - Stessa logica per co-NP e PSPACE.
- Vede il diagramma SVG animarsi con le forme degli insiemi selezionati.
- Gli **insiemi completi (NP-complete, co-NP-complete, PSPACE-complete)** non sono ellissi ma **aree di intersezione** clipPath: NP-complete è l'area dentro la parabola NP-Hard che si sovrappone all'ellisse NP, esattamente come NP∩co-NP è l'intersezione delle due ellissi.
- Passa il mouse sulle forme: gli altri insiemi si oscurano, la forma sotto il mouse si illumina, appare un tooltip con il nome.
- Clicca/tocca una forma per passare alla modalità detail-view.
- Può scaricare il diagramma come PDF o SVG vettoriale.

### Modalità detail-view (contenuto didattico)

Attivata cliccando su una forma nel diagramma:
- La sidebar si trasforma in un menu di navigazione (§ Definizione + problemi noti con esempi)
- Il diagramma SVG svanisce con un fade e lo zoom si immerge verso la classe selezionata
- Il pannello di destra mostra il testo formattato: Markdown renderizzato + formule LaTeX rese con KaTeX.
- Clicca "← Back to diagram" (o il bottone mobile equivalente) per tornare alla visualizzazione.

---

## 7. Flusso completo di un'interazione utente

**Scenario: l'utente seleziona "NP-Hard" e poi ci clicca sopra**

```
1. Click sul checkbox NP-h nella sidebar
   └─ event listener delegato su #class-list  (live-renderer.js)
   └─ appState.explicit.add('NP-h')
   └─ scheduleUpdate()  ← debounce 32ms (usa scheduler.postTask su Chrome 95+)

2. Dopo 32ms: executeUpdate()  (live-renderer.js)
   └─ resolveImplicitDependencies({'NP-h'})  (dependency-resolver.js)
      └─ NP-h → implicitParents: ['NP']
      └─ risultato: {'NP-h', 'NP'}
   └─ scenarioKey({'NP-h','NP'})
      → filtra insiemi completi (nessuno qui) → 'NP|NP-h'
   └─ SCENARIOS.get('NP|NP-h') → array di 2 shape pre-calcolate
   └─ transitionToScenario([...shapes])

3. transitionToScenario()  (live-renderer.js)
   └─ buildSVGDefs() → filtri glow in <defs>  (svg-renderer.js, parametri per-engine)
   └─ per ogni shape: buildShapeGroup() → <g> SVG  (svg-renderer.js)
   └─ insertAtZOrder() → inserisce nel DOM z-order corretto
   └─ .cls-entering → animazione fade-in  (diagram.css)
   └─ updateLens() → NP e co-NP non sono entrambi presenti → nessun lens
   └─ updateCompleteLenses() → NP-c non è in applied → nessun lens completo
   └─ _rebuildHitOverlay() → overlay invisibili per NP-h  (diagram-interaction.js)
   └─ scheduleFit() → dopo 700ms centra il diagramma  (zoom-pan.js)

4. Utente passa il mouse su NP-h
   └─ mousemove → RAF throttle  (diagram-interaction.js)
   └─ target.closest('[data-overlay-for]') → overlay di NP-h
   └─ _overlayMap.get('NP-h') → gruppo SVG reale
   └─ _addHov() → cls-hov + style.filter JS-diretto (non CSS)
   └─ _applyHoverDim() → NP a opacity 0.28
   └─ tooltip.js → showTip('NP-Hard', ...) via data-overlay-for

5. Utente clicca su NP-h
   └─ mouseup → delta < 6px → è un click  (zoom-pan.js)
   └─ _handleDiagramClick()  (diagram-interaction.js)
   └─ enterDetailView('NP-h', clientX, clientY)  (detail-view.js)

6. enterDetailView()
   └─ fade-out forme (750ms) + zoom verso il punto (900ms)
   └─ buildDetailSidebar('NP-h') → loadClassContent('NP-h')
      └─ window._CLASS_MANIFEST['NP-h'] → manifest
      └─ fetch parallele con Promise.all
   └─ showContent('NP-h', 'definition', -1, -1)
      └─ marked.parse() + renderMathInElement()

7. Utente clicca "← Back to diagram"
   └─ exitDetailView()
   └─ content panel svanisce, sidebar torna a class-view
   └─ forme riappaiono (fade-in 600ms)
   └─ zoom torna alla posizione salvata (800ms)
```

---

## 8. Guida per sviluppatori: dove intervenire

### Aggiungere/modificare un contenuto testuale (definizioni, problemi, esempi)

→ Vai in `complexity_sets/<nome-classe>/`  
→ Leggi `README_complexity-sets.md`  
→ Modifica i `.md` esistenti o aggiungi nuove cartelle  
→ Aggiorna `config.js` con i riferimenti ai nuovi file

### Cambiare i colori o lo stile del sito

→ Vai in `css/theme.css` per variabili colore  
→ Vai in `css/layout.css` per dimensioni/posizioni  
→ Leggi `README_css.md`

### Cambiare animazioni delle forme nel diagramma

→ `css/diagram.css` per le animazioni CSS (fade-in/out delle forme)  
→ `js/svg-renderer.js` per la costruzione dei gruppi SVG  
→ `js/live-renderer.js` → `morphGroup()` per le animazioni di transizione

### Aggiungere una nuova classe di complessità

Operazione che tocca **più file**. Procedura completa:

1. **`setting_sets/class-definitions.js`** — aggiungi la voce in `CLASS_DEFINITIONS` con tutti i campi (`id`, `sid`, `label`, `fullName`, `implicitParents`, `renderPriority`, `styleDark`, `styleLight`) e aggiungi l'`id` in `CLASS_GROUPS`.
2. **`js/dependency-resolver.js`** — aggiungi l'`id` in `_SCENARIO_ORDER` nella posizione corretta.
3. **`setting_sets/scenarios.js`** — dichiara tutti gli scenari che coinvolgono la nuova classe. Ricorda che gli insiemi completi (se la nuova classe ne ha) non vanno dichiarati come ellissi: vengono renderizzati automaticamente come aree di intersezione da `updateCompleteLenses()`.
4. **`complexity_sets/<nuovo-id>/`** — crea la cartella, scrivi `config.js` e tutti i `.md`.
5. **`index.html`** — aggiungi `<script src="complexity_sets/<nuovo-id>/config.js"></script>` nella lista degli script.

### Cambiare la logica di zoom, pan, touch

→ `js/zoom-pan.js`

### Cambiare la logica di caricamento dei contenuti

→ `js/detail-view.js` → `loadClassContent()`

### Cambiare l'export del diagramma

→ `js/download.js`

---

## 9. Tecnologie esterne usate

Tutte caricate da CDN (nessuna installazione npm necessaria):

| Libreria | Versione | Scopo |
|---|---|---|
| **marked.js** | latest | Converte Markdown in HTML nei pannelli contenuto |
| **KaTeX** | latest | Renderizza formule LaTeX (`$...$` e `$$...$$`) |
| **jsPDF** | 2.5.1 | Export del diagramma come PDF |
| **svg2pdf.js** | 2.2.3 | Converte SVG in PDF vettoriale |
| **EB Garamond** | Google Fonts | Font serif usato per label e contenuti |
| **JetBrains Mono** | Google Fonts | Font monospace usato per l'interfaccia |

Se la CDN di jsPDF o svg2pdf non è disponibile, il download del diagramma cade automaticamente su SVG puro (fallback interno in `download.js`).

---

## 10. Sistemi di coordinate

Il progetto usa **due sistemi di coordinate** che è fondamentale distinguere:

### Coordinate display (usate in `scenarios.js`)

Sistema matematico intuitivo per chi dichiara i layout:
```
Origine (0,0) = centro del canvas visibile
x > 0 → destra     x < 0 → sinistra
y > 0 → su          y < 0 → giù
Range: circa ±400 in x, ±250 in y
```

### Coordinate SVG (usate internamente dal renderer)

Sistema grafico standard del browser:
```
Origine (0,0) = angolo in alto a sinistra
x > 0 → destra     y > 0 → giù (invertito rispetto al display!)
Canvas: viewBox="0 0 800 500", centro fisico in (400, 250)
```

**Conversione automatica:** `toSVGCoords()` in `geometry.js` converte tutte le coordinate da display a SVG **una sola volta** al caricamento. Chi scrive scenari usa sempre le coordinate display — la conversione è trasparente.

Formula: `x_svg = x_display + 400`, `y_svg = 250 − y_display`

---

## 11. Concetti chiave dell'architettura

### Pre-computazione al caricamento

`SCENARIOS` è una `Map` costruita **una sola volta** al parse-time di `geometry.js`. Contiene la geometria SVG già calcolata per tutti i 53 scenari dichiarati. Ogni cambio di selezione fa un lookup O(1) — nessun calcolo geometrico avviene durante l'interazione.

### Insiemi completi come lens clipPath

NP-complete, co-NP-complete e PSPACE-complete **non sono ellissi**: sono aree di intersezione calcolate geometricamente al volo. NP-complete è l'intersezione tra l'area interna della parabola NP-Hard (escluse le code) e l'ellisse NP. Questo è identico al meccanismo già usato per NP∩co-NP, ma esteso ai tre insiemi completi. La geometria di base (Hard + Parent) viene dichiarata in `scenarios.js`; il lens dell'insieme completo è aggiunto sopra da `updateCompleteLenses()` in `live-renderer.js`.

### Dependency resolver e catene di dipendenze

Le dipendenze tra classi seguono la semantica corretta della teoria della complessità:
- **NP-Hard** (`implicitParents: ['NP']`) — abilita NP, ma NON NP-complete
- **NP-complete** (`implicitParents: ['NP-h']`) — abilita NP-Hard (e transitivamente NP)

Gli insiemi completi sono esclusi dalla `scenarioKey()`: la loro presenza non cambia le forme di base del diagramma, cambia solo il layer di intersezione visualizzato sopra.

### Cache DOM

Tutti i nodi DOM frequentemente acceduti sono cachati nell'oggetto `DOM` (es. `DOM.root`, `DOM.diagramSvg`, `DOM.sidebar`). Questo evita `getElementById()` ripetuti ad ogni frame di animazione.

### Animazioni RAF (requestAnimationFrame)

Tutte le animazioni di morph (transizione tra scenari) usano `requestAnimationFrame` con una funzione ease-in-out quadratica (`easeIO`). Le forme esistenti vengono **morfate in-place** invece di essere distrutte e ricreate. La durata del morph (`_MORPH_DUR`) varia per engine: 480ms su Safari, 500ms su Firefox, 520ms su Chrome/Edge.

### Ottimizzazioni per-engine

`state.js` rileva il rendering engine al parse-time (`_isBlink`, `_isFirefox`, `_isSafari`). `init.js` applica le classi CSS `engine-blink/gecko/webkit` e `perf-high/medium/low` a `<html>`. CSS e JS usano questi selettori per applicare ottimizzazioni specifiche: filtri SVG disabilitati su Safari, `will-change` solo su Blink, `content-visibility: auto` solo su Blink, scrollbar sottile su Firefox, scroll inerziale su Safari.

### Fetch parallele

Quando l'utente entra in una vista dettaglio, tutti i file `.md` di quella classe vengono caricati **contemporaneamente** con `Promise.all`. Il risultato viene cachato in `_contentCache` e riusato per accessi successivi alla stessa classe.

### Modularità JS

Il JavaScript è suddiviso in 11 moduli con responsabilità singola, caricati in ordine deterministico da `index.html`. Ogni modulo dichiara esplicitamente le proprie dipendenze in testa al file. L'intera architettura usa variabili globali invece di ES modules per massima compatibilità browser senza necessità di bundler.
