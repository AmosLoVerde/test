/* ================================================================
   setting_sets/class-definitions.js
   ----------------------------------------------------------------
   Definisce le classi di complessita' mostrate nel visualizzatore.

   DIPENDENZE LOGICHE (implicitParents):
     NP-h    implica NP         (NP-hard contiene NP-complete che contiene NP)
     NP-c    implica NP-h       (NP-complete e' un sottoinsieme di NP-hard)
                                 -> quindi NP-c -> NP-h -> NP (transitivo)
     co-NP-h implica co-NP
     co-NP-c implica co-NP-h
     PSPACE-h implica PSPACE
     PSPACE-c implica PSPACE-h

   RENDERING DEGLI INSIEMI COMPLETI (NP-c, co-NP-c, PSPACE-c):
     NON sono ellissi. Sono renderizzati come intersezione clipPath
     tra l'area del loro Hard (solid arc, escluse le code) e
     l'ellisse del loro parent. La logica e' in live-renderer.js
     (updateCompleteLenses), esattamente come NP intersect co-NP.
     Le proprieta' di stile (stroke) vengono usate per il colore
     del fill e della label dell'intersezione.
   ================================================================ */

const CLASS_DEFINITIONS = {

  'P': {
    id:'P', sid:'P', label:'P', fullName:'Polynomial Time',
    implicitParents:[], renderPriority:30,
    styleDark:  {fill:'#f59e0b',fillOpacity:.22,stroke:'#fcd34d',strokeOpacity:.95,strokeWidth:2},
    styleLight: {fill:'#F59E0B',fillOpacity:.16,stroke:'#F59E0B',strokeOpacity:.95,strokeWidth:2},
  },
  'NP': {
    id:'NP', sid:'NP', label:'NP', fullName:'Nondeterministic Polynomial Time',
    implicitParents:[], renderPriority:10,
    styleDark:  {fill:'#1d4ed8',fillOpacity:.11,stroke:'#60a5fa',strokeOpacity:.80,strokeWidth:2},
    styleLight: {fill:'#60A5FA',fillOpacity:.11,stroke:'#60A5FA',strokeOpacity:.90,strokeWidth:2},
  },
  'NP-c': {
    id:'NP-c', sid:'NP-c', label:'NP-complete', fullName:'NP-Complete',
    // Selezionare NP-c abilita automaticamente NP-h (che a sua volta abilita NP)
    implicitParents:['NP-h'], renderPriority:22,
    // Colore usato per la label e il fill dell'area di intersezione
    styleDark:  {fill:'none',fillOpacity:0,stroke:'#f97316',strokeOpacity:.90,strokeWidth:1.5},
    styleLight: {fill:'none',fillOpacity:0,stroke:'#1E3A8A',strokeOpacity:.90,strokeWidth:1.5},
  },
  'NP-h': {
    id:'NP-h', sid:'NP-h', label:'NP-Hard', fullName:'NP-Hard',
    // NP-hard implica solo NP (non implica NP-c: l'utente deve selezionare NP-c separatamente)
    implicitParents:['NP'], renderPriority:1,
    styleDark:  {fill:'none',fillOpacity:0,stroke:'#f97316',strokeOpacity:.90,strokeWidth:2},
    styleLight: {fill:'none',fillOpacity:0,stroke:'#1E3A8A',strokeOpacity:.90,strokeWidth:2},
  },
  'co-NP': {
    id:'co-NP', sid:'co-NP', label:'co-NP', fullName:'co-Nondeterministic Polynomial Time',
    implicitParents:[], renderPriority:10,
    styleDark:  {fill:'#065f46',fillOpacity:.11,stroke:'#34d399',strokeOpacity:.80,strokeWidth:2},
    styleLight: {fill:'#C084FC',fillOpacity:.11,stroke:'#C084FC',strokeOpacity:.90,strokeWidth:2},
  },
  'co-NP-c': {
    id:'co-NP-c', sid:'co-NP-c', label:'co-NP-complete', fullName:'co-NP-Complete',
    implicitParents:['co-NP-h'], renderPriority:22,
    styleDark:  {fill:'none',fillOpacity:0,stroke:'#22d3ee',strokeOpacity:.90,strokeWidth:1.5},
    styleLight: {fill:'none',fillOpacity:0,stroke:'#581C87',strokeOpacity:.90,strokeWidth:1.5},
  },
  'co-NP-h': {
    id:'co-NP-h', sid:'co-NP-h', label:'co-NP-Hard', fullName:'co-NP-Hard',
    implicitParents:['co-NP'], renderPriority:1,
    styleDark:  {fill:'none',fillOpacity:0,stroke:'#22d3ee',strokeOpacity:.90,strokeWidth:2},
    styleLight: {fill:'none',fillOpacity:0,stroke:'#581C87',strokeOpacity:.90,strokeWidth:2},
  },
  'PSPACE': {
    id:'PSPACE', sid:'PSPACE', label:'PSPACE', fullName:'Polynomial Space',
    implicitParents:[], renderPriority:4,
    styleDark:  {fill:'#1a2e05',fillOpacity:.10,stroke:'#bef264',strokeOpacity:.72,strokeWidth:2},
    styleLight: {fill:'#C4B5A8',fillOpacity:.13,stroke:'#C4B5A8',strokeOpacity:.82,strokeWidth:2},
  },
  'PSPACE-c': {
    id:'PSPACE-c', sid:'PSPACE-c', label:'PSPACE-complete', fullName:'PSPACE-Complete',
    implicitParents:['PSPACE-h'], renderPriority:5,
    styleDark:  {fill:'none',fillOpacity:0,stroke:'#a3e635',strokeOpacity:.88,strokeWidth:1.5},
    styleLight: {fill:'none',fillOpacity:0,stroke:'#44403C',strokeOpacity:.88,strokeWidth:1.5},
  },
  'PSPACE-h': {
    id:'PSPACE-h', sid:'PSPACE-h', label:'PSPACE-Hard', fullName:'PSPACE-Hard',
    implicitParents:['PSPACE'], renderPriority:3,
    styleDark:  {fill:'none',fillOpacity:0,stroke:'#a3e635',strokeOpacity:.88,strokeWidth:2},
    styleLight: {fill:'none',fillOpacity:0,stroke:'#44403C',strokeOpacity:.88,strokeWidth:2},
  },
};

const CLASS_GROUPS = [
  { label:'Complexity Classes', ids:['P','NP','NP-c','NP-h','co-NP','co-NP-c','co-NP-h','PSPACE','PSPACE-c','PSPACE-h'] },
];

let _isLight = false;
function getStyle(cls) { return _isLight ? cls.styleLight : cls.styleDark; }

const appState = {
  explicit: new Set(),
  applied:  new Set(),
};
