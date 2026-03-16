/* ═══════════════════════════════════════════════════════════════
   complexity_sets/class-definitions.js
   ─────────────────────────────────────────────────────────────
   Definisce le classi di complessità mostrate nel visualizzatore.

   HOW TO ADD A NEW CLASS:
   1. Aggiungi una voce in CLASS_DEFINITIONS con tutti i campi.
   2. Aggiungi il suo id in CLASS_GROUPS.
   3. Aggiungi il suo id in _SCENARIO_ORDER (cerca nel <script>).
   4. Dichiara tutti gli scenari in complexity_sets/scenarios.js.
   5. Crea la sua cartella in setting_sets/ con config.json e md.

   CAMPI OBBLIGATORI:
   id, sid, label, fullName  — identità della classe
   implicitParents           — classi auto-aggiunte quando questa è selezionata
   renderPriority            — z-order nel SVG (più alto = in primo piano)
   styleDark / styleLight    — colori tema scuro / chiaro
════════════════════════════════════════════════════════════════ */

const CLASS_DEFINITIONS = {

  'P': {
    id:'P', sid:'P', label:'P', fullName:'Polynomial Time', category:'complexity', containedBy:['NP','co-NP'], overlaps:[],
    implicitParents:[], renderPriority:30,
    styleDark:  {fill:'#f59e0b',fillOpacity:.22,stroke:'#fcd34d',strokeOpacity:.95,strokeWidth:2},
    styleLight: {fill:'#F59E0B',fillOpacity:.16,stroke:'#F59E0B',strokeOpacity:.95,strokeWidth:2},
  },
  'NP': {
    id:'NP', sid:'NP', label:'NP', fullName:'Nondeterministic Polynomial Time', category:'complexity', containedBy:[], overlaps:['co-NP'],
    implicitParents:[], renderPriority:10,
    styleDark:  {fill:'#1d4ed8',fillOpacity:.11,stroke:'#60a5fa',strokeOpacity:.80,strokeWidth:2},
    styleLight: {fill:'#60A5FA',fillOpacity:.11,stroke:'#60A5FA',strokeOpacity:.90,strokeWidth:2},
  },
  'NP-c': {
    id:'NP-c', sid:'NP-c', label:'NP-complete', fullName:'NP-Complete', category:'complexity', containedBy:['NP'], overlaps:[],
    implicitParents:['NP'], renderPriority:22,
    styleDark:  {fill:'#7c3aed',fillOpacity:.30,stroke:'#c4b5fd',strokeOpacity:.92,strokeWidth:1.5},
    styleLight: {fill:'#2563EB',fillOpacity:.18,stroke:'#2563EB',strokeOpacity:.92,strokeWidth:1.5},
  },
  'NP-h': {
    id:'NP-h', sid:'NP-h', label:'NP-Hard', fullName:'NP-Hard', category:'complexity', containedBy:[], overlaps:['NP'],
    implicitParents:['NP-c'], renderPriority:1,
    styleDark:  {fill:'none',fillOpacity:0,stroke:'#f97316',strokeOpacity:.90,strokeWidth:2},
    styleLight: {fill:'none',fillOpacity:0,stroke:'#1E3A8A',strokeOpacity:.90,strokeWidth:2},
  },
  'co-NP': {
    id:'co-NP', sid:'co-NP', label:'co-NP', fullName:'co-Nondeterministic Polynomial Time', category:'complexity', containedBy:[], overlaps:['NP'],
    implicitParents:[], renderPriority:10,
    styleDark:  {fill:'#065f46',fillOpacity:.11,stroke:'#34d399',strokeOpacity:.80,strokeWidth:2},
    styleLight: {fill:'#C084FC',fillOpacity:.11,stroke:'#C084FC',strokeOpacity:.90,strokeWidth:2},
  },
  'co-NP-c': {
    id:'co-NP-c', sid:'co-NP-c', label:'co-NP-complete', fullName:'co-NP-Complete', category:'complexity', containedBy:['co-NP'], overlaps:[],
    implicitParents:['co-NP'], renderPriority:22,
    styleDark:  {fill:'#9d174d',fillOpacity:.30,stroke:'#f9a8d4',strokeOpacity:.92,strokeWidth:1.5},
    styleLight: {fill:'#9333EA',fillOpacity:.18,stroke:'#9333EA',strokeOpacity:.92,strokeWidth:1.5},
  },
  'co-NP-h': {
    id:'co-NP-h', sid:'co-NP-h', label:'co-NP-Hard', fullName:'co-NP-Hard', category:'complexity', containedBy:[], overlaps:['co-NP'],
    implicitParents:['co-NP-c'], renderPriority:1,
    styleDark:  {fill:'none',fillOpacity:0,stroke:'#22d3ee',strokeOpacity:.90,strokeWidth:2},
    styleLight: {fill:'none',fillOpacity:0,stroke:'#581C87',strokeOpacity:.90,strokeWidth:2},
  },
  'PSPACE': {
    id:'PSPACE', sid:'PSPACE', label:'PSPACE', fullName:'Polynomial Space', category:'complexity', overlaps:[],
    implicitParents:[], renderPriority:4,
    styleDark:  {fill:'#1a2e05',fillOpacity:.10,stroke:'#bef264',strokeOpacity:.72,strokeWidth:2},
    styleLight: {fill:'#C4B5A8',fillOpacity:.13,stroke:'#C4B5A8',strokeOpacity:.82,strokeWidth:2},
  },
  'PSPACE-c': {
    id:'PSPACE-c', sid:'PSPACE-c', label:'PSPACE-complete', fullName:'PSPACE-Complete', category:'complexity', containedBy:['PSPACE'], overlaps:[],
    implicitParents:['PSPACE'], renderPriority:5,
    styleDark:  {fill:'#243b0a',fillOpacity:.55,stroke:'#bef264',strokeOpacity:.90,strokeWidth:2},
    styleLight: {fill:'#8A7A70',fillOpacity:.30,stroke:'#8A7A70',strokeOpacity:.90,strokeWidth:2},
  },
  'PSPACE-h': {
    id:'PSPACE-h', sid:'PSPACE-h', label:'PSPACE-Hard', fullName:'PSPACE-Hard', category:'complexity', containedBy:[], overlaps:['PSPACE'],
    implicitParents:['PSPACE-c'], renderPriority:3,
    styleDark:  {fill:'none',fillOpacity:0,stroke:'#a3e635',strokeOpacity:.88,strokeWidth:2},
    styleLight: {fill:'none',fillOpacity:0,stroke:'#44403C',strokeOpacity:.88,strokeWidth:2},
  },
};

const CLASS_GROUPS = [
  { label:'Complexity Classes', ids:['P','NP','NP-c','NP-h','co-NP','co-NP-c','co-NP-h','PSPACE','PSPACE-c','PSPACE-h'] },
];

/* Cached theme flag — set once in setTheme(), read O(1) everywhere.
   Eliminates repeated document.body.classList.contains('light') on every
   getStyle() call (hot path: morph RAF frames, sidebar build, SVG render). */
let _isLight = false;
function getStyle(cls) { return _isLight ? cls.styleLight : cls.styleDark; }


/* ═══════════════════════════════════════════════════════════════
   SECTION 2 — APPLICATION STATE
════════════════════════════════════════════════════════════════ */
const appState = {
  explicit: new Set(),   // IDs the user directly ticked
  applied:  new Set(),   // resolved = explicit + transitive implicit parents
};
