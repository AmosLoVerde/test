# Documentazione `complexity_sets/`

---

## Indice

1. [Cos'è questa cartella](#1-cosè-questa-cartella)
2. [Struttura di una classe](#2-struttura-di-una-classe)
3. [config.js — Il manifest](#3-configjs--il-manifest)
4. [definition.md — La definizione formale](#4-definitionmd--la-definizione-formale)
5. [I file dei problemi e degli esempi](#5-i-file-dei-problemi-e-degli-esempi)
6. [Sintassi Markdown supportata](#6-sintassi-markdown-supportata)
7. [Sintassi LaTeX supportata](#7-sintassi-latex-supportata)
8. [Le definition-box](#8-le-definition-box)
9. [Come aggiungere un nuovo problema](#9-come-aggiungere-un-nuovo-problema)
10. [Come aggiungere un nuovo esempio](#10-come-aggiungere-un-nuovo-esempio)
11. [Come aggiungere una nuova classe](#11-come-aggiungere-una-nuova-classe)
12. [Come viene caricato il contenuto (flusso tecnico)](#12-come-viene-caricato-il-contenuto-flusso-tecnico)
13. [Nomi di cartelle e file](#13-nomi-di-cartelle-e-file)

---

## 1. Cos'è questa cartella

`complexity_sets/` contiene tutto il **contenuto didattico** dell'applicazione: le definizioni formali delle classi di complessità, i problemi noti di ogni classe, e gli esempi applicativi.

È organizzata in **11 sottocartelle**, una per classe:

```
complexity_sets/
├── P/
├── NP/
├── NP-c/
├── NP-h/
├── co-NP/
├── co-NP-c/
├── co-NP-h/
├── PSPACE/
├── PSPACE-c/
├── PSPACE-h/
└── NP-intersect-co-NP/
```

**Chi dovrebbe modificare questi file:** chiunque voglia aggiornare i contenuti matematici — definizioni, problemi, esempi. Non è necessario toccare nessun file JavaScript o CSS. È sufficiente modificare i file `.md` e il `config.js` della classe interessata.

**Requisito tecnico:** i file `.md` vengono caricati via `fetch()`, che richiede un server HTTP. Non funzionano aprendo `index.html` direttamente dal filesystem. Usa VS Code + Live Server oppure `python3 -m http.server 8080`.

---

## 2. Struttura di una classe

Ogni cartella (es. `complexity_sets/P/`) ha questa struttura:

```
P/
├── config.js            ← MANIFEST: dice quali file esistono e dove sono
├── definition.md        ← Definizione formale della classe P
├── maximum-flow/        ← Una sottocartella per ogni problema
│   ├── description.md   ← Descrizione del problema Maximum Flow
│   ├── example1.md      ← Esempio: "Rete idrica"
│   └── example2.md      ← Esempio: "Assegnamento task"
└── shortest-path/
    ├── description.md
    ├── example1.md
    └── example2.md
```

La struttura è **dichiarativa**: non basta creare i file, bisogna anche registrarli in `config.js`. Il sito non scopre i file automaticamente — li carica solo quelli elencati nel manifest.

---

## 3. `config.js` — Il manifest

Il `config.js` di ogni classe ha una struttura fissa:

```javascript
window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["P"] = {
  fullLabel: "P — Polynomial Time",   // ← titolo mostrato nella detail view
  definition: "definition.md",         // ← percorso relativo alla definizione

  problems: [
    {
      name: "Maximum Flow",            // ← nome mostrato nel menu sidebar
      folder: "maximum-flow",          // ← nome della sottocartella
      description: "description.md",  // ← file della descrizione del problema
      examples: [
        { name: "Rete idrica",         file: "example1.md" },
        { name: "Assegnamento task",   file: "example2.md" },
      ],
    },
    {
      name: "Shortest Path",
      folder: "shortest-path",
      description: "description.md",
      examples: [
        { name: "GPS navigation",          file: "example1.md" },
        { name: "Network routing (OSPF)",  file: "example2.md" },
      ],
    },
  ],
};
```

### Come funziona tecnicamente

1. Questo file viene caricato come `<script>` nell'HTML: `<script src="complexity_sets/P/config.js"></script>`
2. Al caricamento, esegue immediatamente e aggiunge `"P"` all'oggetto globale `window._CLASS_MANIFEST`
3. Quando l'utente clicca sulla classe P nel diagramma, `main.js` legge `window._CLASS_MANIFEST["P"]` e usa i percorsi dichiarati per fare le `fetch()` dei file `.md`

### Regola dei percorsi

Tutti i percorsi in `config.js` sono **relativi alla cartella della classe** (es. `complexity_sets/P/`):

- `definition: "definition.md"` → `fetch('complexity_sets/P/definition.md')`
- `folder: "maximum-flow"`, `description: "description.md"` → `fetch('complexity_sets/P/maximum-flow/description.md')`
- `file: "example1.md"` → `fetch('complexity_sets/P/maximum-flow/example1.md')`

### `fullLabel`

Stringa mostrata come titolo nella detail view. Può includere caratteri speciali: `"P — Polynomial Time"`, `"NP ∩ co-NP"`, ecc. Diverso dal campo `label` in `class-definitions.js` (che è più breve, usato nell'ellisse SVG).

---

## 4. `definition.md` — La definizione formale

Il file `definition.md` contiene la definizione formale della classe, scritto in **Markdown esteso con LaTeX**. Viene renderizzato nella detail view quando si clicca "§ Definition" nel menu.

### Struttura consigliata per una definizione

Guardando `complexity_sets/P/definition.md` come riferimento:

```markdown
### Descrizione intuitiva
<br>
La <b>classe $P$</b> contiene i problemi decisionali...

<hr style="margin: 2rem 0;">

### Descrizione formale

<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [1]">
$$P = \lbrace A\text{ | } \exists c>0\text{, }\exists M_A ... \rbrace$$
</div>

dove:
* $A$ è un **problema decisionale**
* $|x|$ è la **lunghezza della codifica** dell'istanza $x$

<hr style="margin: 2rem 0;">

### Relazioni note con altre classi
<br>
* $P\subseteq \textit{NP}$
* $P\subseteq \textit{co-NP}$

<hr style="margin: 2rem 0;">

### Relazioni ancora non note / problemi aperti
<br>
* $P \stackrel{?}{=} \textit{NP}$
```

**Note importanti:**
- Le sezioni usano `###` (H3), non `#` o `##`, per allinearsi visivamente al titolo già presente nel pannello
- `<br>` dopo le intestazioni aggiunge spazio verticale (il CSS non ha margini automatici tra H3 e testo)
- `<hr style="margin: 2rem 0;">` crea separatori orizzontali tra le sezioni
- Tag HTML inline (`<b>`, `<br>`, `<hr>`) sono permessi dentro il Markdown e vengono renderizzati normalmente
- Le formule LaTeX usano `$...$` per l'inline e `$$...$$` per i blocchi display

---

## 5. I file dei problemi e degli esempi

### `description.md` (dei problemi)

Contiene la **descrizione tecnica** del problema: definizione formale, complessità, algoritmi noti, certificati. È il testo mostrato quando si clicca il nome di un problema nel menu.

Esempio tipico (`complexity_sets/P/maximum-flow/description.md`):
```markdown
**Maximum Flow** chiede: dato un network diretto con capacità sugli archi
e due nodi distinti (sorgente $s$ e pozzo $t$), qual è il flusso massimo
trasmissibile da $s$ a $t$?

Risolvibile in tempo polinomiale tramite Ford-Fulkerson con BFS
(Edmonds-Karp, $O(VE^2)$) o algoritmi push-relabel ($O(V^2 E)$).
```

### `example1.md`, `example2.md`, ... (degli esempi)

Contengono un **esempio concreto applicativo** del problema. È il testo più narrativo e accessibile — deve essere comprensibile anche a chi non conosce la teoria.

Struttura consigliata:
```markdown
**Esempio: rete di distribuzione idrica**

I nodi sono stazioni di pompaggio, gli archi sono condotte con capacità massima...

Capacità: $s \to A: 10$, $s \to B: 8$, $A \to t: 6$, $B \to t: 9$.
Il flusso massimo è **14**.
```

---

## 6. Sintassi Markdown supportata

I file `.md` vengono processati da **marked.js**. Tutta la sintassi Markdown standard è supportata:

```markdown
# Titolo H1
## Titolo H2
### Titolo H3

**testo in grassetto**
*testo in corsivo*
`codice inline`

- elemento lista non ordinata
- altro elemento

1. primo elemento lista ordinata
2. secondo elemento

> blockquote

```codice
blocco di codice
```

[testo link](https://esempio.com)

| colonna 1 | colonna 2 |
|-----------|-----------|
| valore    | valore    |
```

### Tag HTML inline

Dato che marked.js permette HTML dentro il Markdown, si possono usare:
- `<b>testo</b>` → **grassetto**
- `<i>testo</i>` → *corsivo*
- `<br>` → a capo forzato
- `<hr>` → linea orizzontale
- `<div class="definition-box" ...>` → box per definizioni formali (vedi sezione 8)
- `<span style="color:red">testo</span>` → testo colorato

---

## 7. Sintassi LaTeX supportata

I file `.md` vengono processati da **KaTeX** dopo il parsing Markdown. KaTeX supporta la maggior parte di LaTeX matematico standard.

### Formule inline

Racchiudi la formula tra singoli `$`:

```markdown
La classe $P$ contiene i problemi con complessità $O(n^k)$ per qualche $k > 0$.
```

Risultato: La classe *P* contiene i problemi con complessità *O(nᵏ)* per qualche *k > 0*.

### Formule display (blocco)

Racchiudi la formula tra doppi `$$`:

```markdown
$$P = \bigcup_{c>0} \text{DTIME}(n^c)$$
```

Risultato: formula centrata su riga propria, di dimensione più grande.

### Comandi LaTeX comuni

```latex
\subseteq          → ⊆
\supseteq          → ⊇
\cup               → ∪
\cap               → ∩
\forall            → ∀
\exists            → ∃
\lbrace \rbrace    → { }  (in KaTeX bisogna usare \lbrace e \rbrace invece di \{ \})
\stackrel{?}{=}    → =  con ? sopra (per relazioni incerte)
\textit{NP}        → NP in corsivo
\text{testo}       → testo normale dentro una formula
O(n^2)             → O(n²)
\mathcal{O}        → O con stile script
\log, \sin, \max   → funzioni matematiche standard
\frac{a}{b}        → a/b come frazione
\sqrt{n}           → √n
```

### Attenzione: caratteri speciali

In LaTeX dentro Markdown, il backslash `\` ha significato speciale. Alcuni caratteri richiedono attenzione:

```latex
\{  →  usare \lbrace   (le parentesi graffe sono usate da LaTeX per i gruppi)
_   →  pedice:   $x_i$  →  xᵢ
^   →  apice:    $x^2$  →  x²
|   →  va bene:  $|x|$  →  |x|
```

---

## 8. Le definition-box

Le `definition-box` sono blocchi HTML con stile speciale usati per racchiudere definizioni formali importanti. Si dichiarano direttamente nel Markdown:

```html
<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [1]">
$$P = \lbrace A \mid \exists c>0 \text{ t.c. } A \text{ è decidibile in } O(n^c) \rbrace$$
</div>
```

### Parametri

**`--box-color`** (proprietà CSS inline): il colore del bordo e dell'intestazione della box. Può essere qualsiasi colore CSS. Alcuni colori suggeriti per coerenza visiva:
- `#7c3aed` — viola (usato per P)
- `#1d4ed8` — blu (adatto per NP)
- `#065f46` — verde scuro (adatto per co-NP)
- `#9d174d` — bordeaux (adatto per NP-complete)

**`data-title`** (attributo HTML): il testo dell'intestazione della box (es. `"Definizione [1]"`, `"Teorema di Savitch"`, `"Corollario"`). Se omesso, la box non mostra intestazione.

### Come appare

```
┌─────────────────────────────────────────────────────┐
│ DEFINIZIONE [1]                                     │ ← from data-title
├─────────────────────────────────────────────────────┤
│                                                     │
│   P = { A | ∃c>0, ∃ algoritmo M_A in O(|x|^c) }   │ ← il contenuto (LaTeX)
│                                                     │
└─────────────────────────────────────────────────────┘
```

Il colore del bordo e dell'intestazione corrisponde a `--box-color`. Lo sfondo della box è una versione molto trasparente dello stesso colore.

### Multiple definition-box in sequenza

Si possono mettere più box di seguito:

```markdown
<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [1]">
$$P = \bigcup_{c>0} \text{DTIME}(n^c)$$
</div>

Quindi:

<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [2]">
$$\text{DTIME}(f(n)) = \lbrace A \mid A \text{ decidibile in tempo } O(f(n)) \rbrace$$
</div>
```

---

## 9. Come aggiungere un nuovo problema

**Scenario:** vuoi aggiungere il problema "Primality Testing" alla classe P.

### Passo 1: crea la cartella del problema

```
complexity_sets/P/primality-testing/
```

Il nome della cartella deve essere:
- Tutto in minuscolo
- Parole separate da trattini (`-`)
- Senza spazi, apostrofi, caratteri speciali
- Descrittivo ma non troppo lungo

### Passo 2: crea i file dei contenuti

**`description.md`:**
```markdown
**Primality Testing** chiede: dato un intero $n$, è $n$ primo?

Il test di primalità è in P grazie all'algoritmo AKS (Agrawal, Kayal, Saxena, 2002),
che decide la primalità in tempo $O((\log n)^{12})$ deterministico.
In pratica si usano test probabilistici come Miller-Rabin ($O(k \log^2 n \log \log n)$)
con probabilità di errore $< 4^{-k}$.
```

**`example1.md`:**
```markdown
**Esempio: test di Miller-Rabin**

Per verificare se $n = 561$ è primo, Miller-Rabin controlla alcune basi $a$.
Con $a = 2$: $2^{560} \equiv 1 \pmod{561}$ ma $561 = 3 \times 11 \times 17$
(numero di Carmichael). Miller-Rabin rileva la compostezza con alta probabilità
scegliendo basi multiple.
```

**`example2.md`:**
```markdown
**Esempio: algoritmo AKS su input piccolo**

Input: $n = 31$. L'algoritmo AKS verifica:
1. $n$ non è una potenza perfetta: $31 \neq a^b$ per nessun $a, b > 1$ ✓
2. Trova $r$ tale che ord$_r(n) > (\log_2 n)^2$: $r = 29$ ✓
3. Verifica condizioni polinomiali...
Conclusione: $31$ è primo.
```

### Passo 3: registra in config.js

Apri `complexity_sets/P/config.js` e aggiungi la voce nel campo `problems`:

```javascript
window._CLASS_MANIFEST["P"] = {
  fullLabel: "P — Polynomial Time",
  definition: "definition.md",
  problems: [
    // ... problemi esistenti ...
    {
      name: "Primality Testing",       // ← nome nel menu
      folder: "primality-testing",     // ← nome della cartella
      description: "description.md",
      examples: [
        { name: "Test di Miller-Rabin", file: "example1.md" },
        { name: "Algoritmo AKS",        file: "example2.md" },
      ],
    },
  ],
};
```

### Passo 4: verifica

Ricarica la pagina nel browser (Live Server aggiorna automaticamente). Clicca sulla classe P nel diagramma. Il nuovo problema deve apparire nel menu sidebar.

---

## 10. Come aggiungere un nuovo esempio

**Scenario:** vuoi aggiungere un terzo esempio al problema "Maximum Flow" di P.

### Passo 1: crea il file

```
complexity_sets/P/maximum-flow/example3.md
```

```markdown
**Esempio: matching bipartito massimo**

Il matching bipartito si riduce a max flow: $n$ worker a sinistra,
$m$ job a destra. Si aggiunge una sorgente $s$ collegata a ogni worker
e ogni job collegato al pozzo $t$. Ogni arco ha capacità 1.

Il max flow = matching massimo. Edmonds-Karp trova la soluzione in
$O(V \cdot E) = O((n+m) \cdot nm)$.
```

### Passo 2: registra in config.js

```javascript
{
  name: "Maximum Flow",
  folder: "maximum-flow",
  description: "description.md",
  examples: [
    { name: "Rete idrica",          file: "example1.md" },
    { name: "Assegnamento task",    file: "example2.md" },
    { name: "Matching bipartito",   file: "example3.md" },  // ← aggiunto
  ],
},
```

---

## 11. Come aggiungere una nuova classe

Questa è l'operazione più complessa — richiede modifiche a più file.

### Passo 1: crea la struttura in complexity_sets/

```
complexity_sets/EXPTIME/
├── config.js
├── definition.md
└── (cartelle problemi...)
```

**`config.js`:**
```javascript
window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["EXPTIME"] = {
  fullLabel: "EXPTIME — Exponential Time",
  definition: "definition.md",
  problems: [
    {
      name: "Chess (General)",
      folder: "chess-general",
      description: "description.md",
      examples: [
        { name: "Scacchi n×n", file: "example1.md" },
      ],
    },
  ],
};
```

### Passo 2: aggiungi il \<script\> in index.html

```html
<script src="complexity_sets/EXPTIME/config.js"></script>
```

Aggiungilo **prima** di `<script src="js/main.js"></script>`.

### Passo 3: dichiara la classe in setting_sets/class-definitions.js

(Vedi `README_setting-sets.md` per i dettagli.)

### Passo 4: dichiara gli scenari in setting_sets/scenarios.js

(Vedi `README_setting-sets.md` per i dettagli.)

### Passo 5: aggiorna _SCENARIO_ORDER in js/main.js

Trova la costante `_SCENARIO_ORDER` (cerca con Ctrl+F) e aggiungi `'EXPTIME'` nella posizione corretta.

---

## 12. Come viene caricato il contenuto (flusso tecnico)

Capire questo aiuta a diagnosticare problemi.

### Fase 1: al caricamento della pagina (sincrono)

```html
<script src="complexity_sets/P/config.js"></script>
```

Il browser esegue `config.js` immediatamente. Il risultato: `window._CLASS_MANIFEST["P"]` viene popolato. Il contenuto dei `.md` **non viene ancora caricato**.

### Fase 2: quando l'utente clicca una classe (asincrono)

```javascript
// In main.js, enterDetailView():
const content = await loadClassContent('P');
```

`loadClassContent('P')` legge `window._CLASS_MANIFEST["P"]` e lancia **tutte le fetch in parallelo**:

```
fetch('complexity_sets/P/definition.md')
fetch('complexity_sets/P/maximum-flow/description.md')
fetch('complexity_sets/P/maximum-flow/example1.md')
fetch('complexity_sets/P/maximum-flow/example2.md')
fetch('complexity_sets/P/shortest-path/description.md')
fetch('complexity_sets/P/shortest-path/example1.md')
fetch('complexity_sets/P/shortest-path/example2.md')
```

Tutte e 7 le fetch partono contemporaneamente. Il caricamento totale impiega il tempo della fetch **più lenta**, non la somma di tutte.

### Fase 3: caching in memoria

Il risultato (tutto il testo dei `.md`) viene memorizzato in `_contentCache`:

```javascript
_contentCache.set('P', {
  fullLabel: 'P — Polynomial Time',
  definition: '<testo del definition.md>',
  problems: [
    {
      name: 'Maximum Flow',
      description: '<testo del description.md>',
      examples: [
        { name: 'Rete idrica', content: '<testo di example1.md>' },
        { name: 'Assegnamento task', content: '<testo di example2.md>' },
      ],
    },
    // ...
  ],
});
```

La prossima volta che l'utente clicca P, il contenuto è già in memoria — nessuna fetch.

### Fase 4: rendering

```javascript
// In showContent():
textEl.innerHTML = marked.parse(html);  // Markdown → HTML
renderMathInElement(textEl, { ... });   // HTML → HTML con KaTeX
```

Il testo grezzo del `.md` viene prima convertito da Markdown in HTML da marked.js, poi KaTeX scansiona il DOM risultante e sostituisce ogni `$...$` e `$$...$$` con il rendering matematico SVG/HTML.

### Errori comuni e come diagnosticarli

**Il pannello contenuto rimane vuoto:**
- Controlla la console del browser per errori di fetch (404)
- Verifica che il file dichiarato in `config.js` esista nel percorso corretto
- Verifica di star usando un server HTTP (non `file://`)

**Le formule LaTeX non vengono renderizzate:**
- Verifica che la CDN di KaTeX sia accessibile (controlla la scheda Network del browser)
- Verifica la sintassi: `$formula$` non `$ formula $` (spazi dentro i delimitatori non funzionano)
- Usa `\lbrace` e `\rbrace` invece di `\{` e `\}`

**Il problema non appare nel menu:**
- Verifica che la voce sia aggiunta in `config.js`
- Verifica che il `folder` in `config.js` corrisponda esattamente al nome della cartella

---

## 13. Nomi di cartelle e file

### Convenzioni obbligatorie

I nomi delle **cartelle dei problemi** devono essere:
- Tutti in minuscolo
- Parole separate da trattini: `maximum-flow`, `shortest-path`, `halting-problem`
- Senza spazi, underscore, o caratteri speciali
- Senza lettere accentate o Unicode: `non-colorabilita` non `non-colorabilità`

I nomi dei **file degli esempi** devono essere:
- `example1.md`, `example2.md`, `example3.md`, ...
- Oppure nomi descrittivi: `erdos-renyi.md`, `miller-rabin.md`

Se si usano nomi descrittivi, il campo `file` in `config.js` deve corrispondere esattamente:
```javascript
{ name: "Test di Miller-Rabin", file: "miller-rabin.md" }
```

### Caso speciale: NP∩co-NP

La cartella per l'intersezione NP∩co-NP usa il nome `NP-intersect-co-NP` (non `NP∩co-NP`, che non è un nome di cartella valido su tutti i sistemi operativi). Questa mappatura è gestita in `main.js`:

```javascript
const _CONTENT_FOLDER_MAP = { 'NP∩co-NP': 'NP-intersect-co-NP' };
```

Il `config.js` di questa classe usa la chiave `"NP∩co-NP"` (il carattere matematico), non `"NP-intersect-co-NP"`:
```javascript
window._CLASS_MANIFEST["NP∩co-NP"] = { ... };
```
