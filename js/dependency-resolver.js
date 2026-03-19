'use strict';

/* ================================================================
   js/dependency-resolver.js
   ----------------------------------------------------------------
   Risoluzione dipendenze tra classi di complessita'.

   DIPENDENZE:
     setting_sets/class-definitions.js -> CLASS_DEFINITIONS, appState

   ESPORTA (globali):
     resolveImplicitDependencies(sel)
     getTransitiveParents(id)
     cascadeDeselect(removedId, explicit)
     scenarioKey(activeSet)
     _SCENARIO_ORDER
   ================================================================ */


/* ================================================================
   COMPLETE SETS
   Gli insiemi completi non contribuiscono alla chiave scenario
   perche' sono renderizzati come lens clipPath (come NP intersect
   co-NP), non come forme nel diagramma.
   ================================================================ */
const _COMPLETE_SETS = new Set(['NP-c', 'co-NP-c', 'PSPACE-c']);


/* ================================================================
   TRANSITIVE PARENTS (pre-calcolati)
   ================================================================ */
const _TRANSITIVE_PARENTS = (() => {
  const m = new Map();
  for (const id of Object.keys(CLASS_DEFINITIONS)) {
    const out = new Set();
    const q = [id]; let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++];
      for (const p of (CLASS_DEFINITIONS[cur]?.implicitParents ?? [])) {
        if (!out.has(p)) { out.add(p); q.push(p); }
      }
    }
    m.set(id, out);
  }
  return m;
})();

function resolveImplicitDependencies(sel) {
  const out = new Set(sel);
  const q   = [...sel]; let qi = 0;
  while (qi < q.length) {
    const id = q[qi++];
    for (const pid of (CLASS_DEFINITIONS[id]?.implicitParents ?? [])) {
      if (!out.has(pid)) { out.add(pid); q.push(pid); }
    }
  }
  return out;
}

function getTransitiveParents(id) { return _TRANSITIVE_PARENTS.get(id) ?? new Set(); }

function cascadeDeselect(removedId, explicit) {
  explicit.delete(removedId);
  for (const id of [...explicit]) {
    if (getTransitiveParents(id).has(removedId)) explicit.delete(id);
  }
}


/* ================================================================
   SCENARIO KEY
   Gli insiemi completi (NP-c, co-NP-c, PSPACE-c) sono ESCLUSI
   dalla chiave: la loro presenza non cambia la geometria base
   del diagramma (che dipende solo da Hard + Parent), ma solo
   aggiunge il layer di intersezione renderizzato da
   updateCompleteLenses().
   ================================================================ */
const _SCENARIO_ORDER = ['P','NP','co-NP','NP-h','co-NP-h','PSPACE','PSPACE-h'];
const _SCENARIO_ORDER_MAP = new Map(_SCENARIO_ORDER.map((id, i) => [id, i]));

function scenarioKey(activeSet) {
  if (!activeSet || activeSet.size === 0) return '';
  return [...activeSet]
    .filter(id => !_COMPLETE_SETS.has(id))          // <-- escludi insiemi completi
    .sort((a, b) => (_SCENARIO_ORDER_MAP.get(a) ?? 99) - (_SCENARIO_ORDER_MAP.get(b) ?? 99))
    .join('|');
}
