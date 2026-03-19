# Documentazione `setting_sets/`

---

## Indice

1. [Cos'è questa cartella](#1-cosè-questa-cartella)
2. [class-definitions.js — Identità e stile delle classi](#2-class-definitionsjs--identità-e-stile-delle-classi)
3. [scenarios.js — Geometria del diagramma](#3-scenariosjs--geometria-del-diagramma)
4. [Il sistema di coordinate](#4-il-sistema-di-coordinate)
5. [Formato ellisse](#5-formato-ellisse)
6. [Formato open-curve (classi Hard)](#6-formato-open-curve-classi-hard)
7. [Il meccanismo import-scenario](#7-il-meccanismo-import-scenario)
8. [Come aggiungere un nuovo scenario](#8-come-aggiungere-un-nuovo-scenario)
9. [Come aggiungere una nuova classe](#9-come-aggiungere-una-nuova-classe)
10. [Relazione con il resto del codebase](#10-relazione-con-il-resto-del-codebase)

---

## 1. Cos'è questa cartella

`setting_sets/` contiene la **configurazione grafica e logica** dell'applicazione: chi sono le classi, come si relazionano tra loro, e dove si disegnano nel diagramma.

Contiene **due file**:

| File | Ruolo |
|---|---|
| `class-definitions.js` | Definisce IDENTITÀ, COLORI e DIPENDENZE di ogni classe |
| `scenarios.js` | Definisce la GEOMETRIA del diagramma per ogni combinazione di classi selezionate |

Questi due file vengono caricati come `<script>` nell'HTML **prima** di tutti i moduli `js/`. Al caricamento della pagina, `geometry.js` e `dependency-resolver.js` leggono i loro dati e pre-computano tutto il necessario. Durante l'interazione utente, i dati di questi file non vengono mai riletti: tutto è già in memoria.

---

## 2. `class-definitions.js` — Identità e stile delle classi

### Struttura globale del file

```javascript
const CLASS_DEFINITIONS = { /* ... */ };
const CLASS_GROUPS = [ /* ... */ ];
let _isLight = false;
function getStyle(cls) { return _isLight ? cls.styleLight : cls.styleDark; }
const appState = { explicit: new Set(), applied: new Set() };
```

Il file dichiara queste entità come variabili globali, accessibili da tutti i moduli `js/` caricati dopo.

### `CLASS_DEFINITIONS` — il dizionario delle classi

Ogni classe è una voce con **7 campi obbligatori**:

```javascript
'NP-h': {
  id:              'NP-h',         // ← stringa unica, usata ovunque come chiave
  sid:             'NP-h',         // ← versione sicura per nomi CSS (può differire da id)
  label:           'NP-Hard',      // ← testo mostrato nel diagramma
  fullName:        'NP-Hard',      // ← testo del tooltip e del titolo detail view
  implicitParents: ['NP'],         // ← classi aggiunte AUTOMATICAMENTE quando questa è selezionata
  renderPriority:  1,              // ← z-order nel SVG: più alto = disegnato sopra
  styleDark:  { fill:'none', fillOpacity:0, stroke:'#f97316', strokeOpacity:.90, strokeWidth:2 },
  styleLight: { fill:'none', fillOpacity:0, stroke:'#1E3A8A', strokeOpacity:.90, strokeWidth:2 },
},
```

#### Campo `implicitParents` — dipendenze tra classi

Questo è il campo più importante per il comportamento dell'applicazione. Definisce la catena di dipendenze logiche:

```javascript
// NP-Hard: aggiunge solo NP (NON NP-complete)
'NP-h':  { implicitParents: ['NP'],    ... }

// NP-complete: aggiunge NP-Hard (che transitivamente aggiunge NP)
'NP-c':  { implicitParents: ['NP-h'],  ... }

// NP: nessuna dipendenza
'NP':    { implicitParents: [],        ... }

// Stessa logica per co-NP e PSPACE
'co-NP-h':   { implicitParents: ['co-NP'],   ... }
'co-NP-c':   { implicitParents: ['co-NP-h'], ... }
'PSPACE-h':  { implicitParents: ['PSPACE'],  ... }
'PSPACE-c':  { implicitParents: ['PSPACE-h'],...}
```

**Attenzione alla direzione:** selezionare NP-Hard aggiunge NP ma **non** NP-complete. È NP-complete che dipende da NP-Hard (non il contrario). Questo riflette la semantica corretta: NP-complete ⊆ NP-Hard ⊆ NP.

#### Campo `renderPriority`

Determina l'**ordine z** (chi sta sopra chi) nel SVG. Valori più alti = in primo piano:

```
P          → 30   (la più piccola, in cima a tutto)
NP-c, co-NP-c → 22  (complete lenses, sopra le ellissi)
PSPACE-c   → 5
PSPACE     → 4
PSPACE-h   → 3
NP, co-NP  → 10
NP-h, co-NP-h → 1  (le parabole Hard in fondo)
```

#### Campi `styleDark` e `styleLight`

Ogni stile ha 5 proprietà:

```javascript
{
  fill:         '#1d4ed8',  // colore di riempimento dell'ellisse
  fillOpacity:  .11,        // trasparenza del riempimento (0=trasparente, 1=pieno)
  stroke:       '#60a5fa',  // colore del bordo E della label nel SVG
  strokeOpacity:.80,        // trasparenza del bordo
  strokeWidth:  2,          // spessore del bordo in px (spazio SVG)
}
```

Per le classi Hard (`NP-h`, `co-NP-h`, `PSPACE-h`) `fill` è `'none'` e `fillOpacity` è `0` perché sono parabole aperte senza riempimento.

Per gli **insiemi completi** (`NP-c`, `co-NP-c`, `PSPACE-c`) anche `fill` è `'none'` e `fillOpacity` è `0` — questi insiemi non vengono renderizzati come ellissi (vedi nota sotto). Lo `stroke` viene usato come base per calcolare il colore del lens di intersezione.

> **Nota architetturale importante:** NP-complete, co-NP-complete e PSPACE-complete **NON sono ellissi nel diagramma**. Sono aree di intersezione calcolate geometricamente da `live-renderer.js` (`updateCompleteLenses()`): NP-complete è l'area che si trova contemporaneamente dentro la parabola NP-Hard (lato concavo, escluse le code) e dentro l'ellisse NP. Il colore dell'area è la media cromatica tra il `stroke` del Hard e il `stroke` del Parent. Non dichiarare mai le ellissi di questi insiemi in `scenarios.js`.

**Come modificare i colori:** cambia `styleDark` per il tema scuro, `styleLight` per il tema chiaro. Il colore `stroke` è importante: viene usato sia per il bordo delle ellissi che per la label testuale, il colore del tooltip, il colore di accento nella detail view, e come componente del colore delle aree di intersezione (lens).

### `CLASS_GROUPS`

```javascript
const CLASS_GROUPS = [
  { label:'Complexity Classes', ids:['P','NP','NP-c','NP-h','co-NP','co-NP-c','co-NP-h','PSPACE','PSPACE-c','PSPACE-h'] },
];
```

Definisce come vengono raggruppate le classi nella **sidebar**. L'ordine degli `ids` è l'ordine di visualizzazione nel menu.

### `getStyle(cls)` e `_isLight`

```javascript
let _isLight = false;
function getStyle(cls) { return _isLight ? cls.styleLight : cls.styleDark; }
```

`_isLight` è la flag globale del tema. Viene impostata da `setTheme()` in `live-renderer.js`. `getStyle(cls)` è la funzione hot-path più chiamata dell'applicazione — essere O(1) e senza branch complessi è intenzionale.

### `appState`

```javascript
const appState = {
  explicit: new Set(),  // classi direttamente selezionate dall'utente
  applied:  new Set(),  // classi effettivamente mostrate (include dipendenze implicite)
};
```

---

## 3. `scenarios.js` — Geometria del diagramma

### Struttura del file

```javascript
let SCENARIO_DECLARATIONS = {
  'P':       [ /* ... */ ],
  'NP':      [ /* ... */ ],
  'NP|NP-h': [ /* ... */ ],
  'P|NP|co-NP': [ /* ... */ ],
  /* ... 53 scenari ... */
};
```

`SCENARIO_DECLARATIONS` è un oggetto JavaScript (usato come dizionario) dove:
- **La chiave** è una stringa come `'NP|NP-h'` — gli ID delle classi che compaiono nel diagramma (solo le 7 classi base: P, NP, co-NP, NP-h, co-NP-h, PSPACE, PSPACE-h), ordinati secondo `_SCENARIO_ORDER` in `dependency-resolver.js`, separati da `|`.
- **Il valore** è un array di **shape descriptor** — oggetti che descrivono dove e come disegnare ogni forma.

**Nota:** gli insiemi completi (NP-c, co-NP-c, PSPACE-c) **non appaiono mai come shape descriptor** in `scenarios.js`. Sono renderizzati automaticamente come lens di intersezione da `live-renderer.js`. La chiave dello scenario li filtra prima del lookup.

`SCENARIO_DECLARATIONS` è dichiarata con `let` perché `geometry.js` la azzera dopo l'utilizzo (`SCENARIO_DECLARATIONS = null`) per liberare memoria.

### Come viene usato da `geometry.js`

Al caricamento della pagina, `geometry.js` esegue:

```javascript
const SCENARIOS = new Map(
  Object.keys(SCENARIO_DECLARATIONS).map(key =>
    [key, resolveScenarioImports(key).map(toSVGCoords).map(_preParseCurveShape)]
  )
);
SCENARIO_DECLARATIONS = null;   // libera la memoria
```

Il risultato è una `Map` con geometria in coordinate SVG già convertita, e path string pre-parsate in array numerici per il morph RAF.

---

## 4. Il sistema di coordinate

Tutto in `scenarios.js` usa le **coordinate display** (sistema matematico intuitivo):

```
Origine (0,0) = centro del canvas visibile
x > 0 → destra     x < 0 → sinistra
y > 0 → su          y < 0 → giù
Range tipico: ±400 in x, ±250 in y
```

La conversione a coordinate SVG avviene automaticamente in `geometry.js` e non va mai fatta manualmente:

```
x_svg = x_display + 400
y_svg = 250 − y_display
```

---

## 5. Formato ellisse

```javascript
{
  id: 'NP',             // OBBLIGATORIO — deve corrispondere a un id in CLASS_DEFINITIONS
  cx: -92,              // x del centro
  cy: -8,               // y del centro
  rx: 228,              // semiasse orizzontale
  ry: 170,              // semiasse verticale
  rotation: 35,         // OPZIONALE — rotazione in gradi (default: 0)
  lx: -217,             // x della label (default: cx)
  ly: -8,               // y della label (default: cy)
  la: 'middle',         // text-anchor: 'middle' | 'start' | 'end'
}
```

La label è posizionata indipendentemente dal centro dell'ellisse per permettere di spostarla fuori dall'ellisse quando le forme si sovrappongono.

---

## 6. Formato open-curve (classi Hard)

```javascript
{
  id:   'NP-h',           // OBBLIGATORIO
  type: 'open-curve',     // OBBLIGATORIO — distingue dal formato ellisse
  p0:   {x:-150, y:165},  // punto sul braccio SINISTRO della parabola
  pm:   {x:0,    y:-126}, // fondo del "bowl" (punto più profondo / vertice)
  p2:   {x:150,  y:165},  // punto sul braccio DESTRO della parabola
  height: 165,            // y-coordinata dove le code tratteggiate si "tagliano"
  rotate: 0,              // OPZIONALE — rotazione in gradi (default: 0)
  lx: 0,                  // OPZIONALE — x della label (default: calcolato automaticamente)
  ly: 165,                // OPZIONALE — y della label
  tailLength: 60,         // OPZIONALE — lunghezza delle code tratteggiate (default: 60)
}
```

### Come interpretare i parametri

**`p0`, `pm`, `p2`** definiscono la forma della parabola. `geometry.js` usa questi 3 punti per calcolare la curva Bézier cubica esatta che li approssima (algoritmo `_parabolaFromPoints` in 7 passi: coefficiente parabola → punti Bézier simmetrici → rotazione → bisection per `t0/t1` dove la curva incrocia `height` → De Casteljau per sub-Bézier esatta → code tangenziali).

**`height`** è la y-coordinata dove i "bracci" della parabola vengono tagliati. Sopra questa y c'è il solid arc (l'arco continuo); sotto ci sono le code tratteggiate. Le code si estendono verso il bordo del canvas per dare l'idea che la classe continui all'infinito.

**Geometria visiva:**
```
         ↑  braccio sinistro     braccio destro  ↑
         |          bowl                          |
y=height ─────────────────────────────────────────
         ↓  coda tratteggiata   coda tratteggiata ↓
```

**`rotate`:** ruota tutta la parabola attorno al punto `(pm.x, height)`. Usato negli scenari con NP-Hard e co-NP-Hard asimmetrici.

**Relazione con `updateCompleteLenses()`:** l'area "sopra l'arco" (dentro la concavità della parabola, escluse le code) viene usata da `live-renderer.js` per calcolare l'area di intersezione dell'insieme completo. `_arcAboveClipPath(solidPath)` costruisce il path chiuso di questa area inversando l'arco e chiudendolo sopra il canvas.

---

## 7. Il meccanismo `import-scenario`

`import-scenario` è una direttiva speciale che importa tutte le forme da uno scenario esistente. Serve per evitare di ripetere la geometria di scenari simili.

```javascript
'P|NP|co-NP|PSPACE': [
  {id:'PSPACE', cx:0, cy:-18, rx:358, ry:260, lx:0, ly:-256, la:'middle'},
  {'import-scenario': 'P|NP|co-NP'},  // importa P, NP, co-NP dal loro scenario
],
```

### Regola last-write-wins

Se una forma con lo stesso `id` appare sia nell'import che localmente, **vince l'ultima dichiarata nell'array**:

```javascript
// Import PRIMA → le forme locali vincono
[{'import-scenario': 'NP|NP-h'}, {id:'NP', cx:0, cy:0, rx:300, ...}]
// → NP usa la geometria locale

// Import DOPO → l'import non sovrascrive nulla
[{id:'PSPACE', ...}, {'import-scenario': 'NP|NP-h'}]
// → PSPACE è sempre locale; NP e NP-h vengono dall'import
```

### Import a catena

```javascript
'A|B|C|D|E': [
  {'import-scenario': 'A|B|C|D'},  // che a sua volta può importare 'A|B|C'...
]
```

`resolveScenarioImports` in `geometry.js` gestisce le catene ricorsivamente e rileva i cicli (emette un warning e li ignora). L'import è transitivo: si può importare da uno scenario che a sua volta importa da altri.

---

## 8. Come aggiungere un nuovo scenario

**Scenario:** vuoi definire come appare il diagramma quando l'utente seleziona NP e PSPACE-Hard.

### Passo 1: trova la chiave corretta

La chiave deve corrispondere all'output di `scenarioKey()`. Apri la console del browser e digita:
```javascript
scenarioKey(new Set(['NP', 'PSPACE-h']))
// NP-h implica NP, PSPACE-h implica PSPACE
// Quindi la selezione effettiva è: NP + PSPACE + PSPACE-h
// scenarioKey filtra i completi (nessuno qui) e ordina: 'NP|PSPACE|PSPACE-h'
```

**Ricorda:** gli insiemi completi vengono filtrati da `scenarioKey()`. La chiave contiene solo le 7 classi base: P, NP, co-NP, NP-h, co-NP-h, PSPACE, PSPACE-h. Selezionare NP-complete fa cercare lo scenario `'NP|NP-h'` (NP-c viene aggiunto come lens sopra).

### Passo 2: progetta la geometria

- Le forme devono essere contenute l'una nell'altra se c'è una relazione di contenimento
- Lascia margine di almeno 20-30 unità tra i bordi
- Le label non devono sovrapporsi
- Usa il range ±400x, ±250y per una buona visualizzazione

### Passo 3: aggiungi l'entry

In `scenarios.js`, nella sezione con il numero di classi corretto:

```javascript
'NP|PSPACE|PSPACE-h': [
  {id:'PSPACE-h', type:'open-curve',
    p0:{x:-150, y:165}, pm:{x:0, y:-126}, p2:{x:150, y:165},
    height:165, lx:0, ly:165},
  {id:'PSPACE', cx:0, cy:-90, rx:250, ry:168, lx:0, ly:-228, la:'middle'},
  {id:'NP', cx:0, cy:-180, rx:76, ry:57, lx:0, ly:-180, la:'middle'},
],
```

### Passo 4: verifica

Salva il file, ricarica la pagina (con Live Server), seleziona le classi corrispondenti. Il diagramma deve mostrare le forme nella posizione dichiarata.

---

## 9. Come aggiungere una nuova classe

Questa è l'operazione più complessa — tocca più file.

### In `class-definitions.js`

1. Aggiungi la voce in `CLASS_DEFINITIONS`:

```javascript
'EXPTIME': {
  id:'EXPTIME', sid:'EXPTIME', label:'EXPTIME', fullName:'Exponential Time',
  implicitParents:[],          // cosa deve essere aggiunto automaticamente
  renderPriority: 2,           // z-order: più basso di PSPACE (4) perché la contiene
  styleDark:  {fill:'#3b0764', fillOpacity:.08, stroke:'#e879f9', strokeOpacity:.65, strokeWidth:2},
  styleLight: {fill:'#E9D5FF', fillOpacity:.12, stroke:'#9333ea', strokeOpacity:.75, strokeWidth:2},
},
```

2. Aggiungi l'`id` in `CLASS_GROUPS`:

```javascript
const CLASS_GROUPS = [
  { label:'Complexity Classes', ids:['P','NP','NP-c','NP-h','co-NP','co-NP-c','co-NP-h',
                                      'PSPACE','PSPACE-c','PSPACE-h','EXPTIME'] },
];
```

### In `scenarios.js`

Aggiungi **tutti** gli scenari che coinvolgono EXPTIME. Ogni combinazione di classi selezionate deve avere il suo scenario dichiarato. Ricorda: se EXPTIME ha un insieme "EXPTIME-complete" equivalente, non dichiararlo come ellisse — andrà gestito come lens in `live-renderer.js`.

### In `js/dependency-resolver.js`

Trova `_SCENARIO_ORDER` e aggiungi `'EXPTIME'` nella posizione corretta (dopo PSPACE-h se EXPTIME contiene PSPACE):

```javascript
const _SCENARIO_ORDER = ['P','NP','co-NP','NP-h','co-NP-h','PSPACE','PSPACE-h','EXPTIME'];
```

### In `complexity_sets/`

Crea `complexity_sets/EXPTIME/` con `config.js` e tutti i file `.md` dei contenuti.

### In `index.html`

```html
<script src="complexity_sets/EXPTIME/config.js"></script>
```

---

## 10. Relazione con il resto del codebase

Il flusso di dati è sempre unidirezionale:

```
class-definitions.js  ──→  CLASS_DEFINITIONS    (letto da dependency-resolver.js e svg-renderer.js)
                       ──→  CLASS_GROUPS         (letto da live-renderer.js → buildSidebar)
                       ──→  appState             (letto e scritto da live-renderer.js)
                       ──→  _isLight             (scritto da setTheme, letto da getStyle ovunque)

scenarios.js           ──→  SCENARIO_DECLARATIONS (letto da geometry.js al parse-time,
                                                    poi azzerato a null per liberare memoria)
```

`geometry.js` trasforma `SCENARIO_DECLARATIONS` in `SCENARIOS` (Map con coordinate SVG pre-calcolate). `dependency-resolver.js` usa `CLASS_DEFINITIONS` per pre-calcolare `_TRANSITIVE_PARENTS` e genera `scenarioKey()`. Tutti gli altri moduli `js/` leggono `SCENARIOS` e `CLASS_DEFINITIONS` a runtime, ma non scrivono mai nei file originali.

Durante l'uso dell'applicazione i dati originali non sono più accessibili (`SCENARIO_DECLARATIONS = null`). L'unica fonte di verità a runtime è `SCENARIOS`.
