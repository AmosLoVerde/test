/* ═══════════════════════════════════════════════════════════════
   complexity_sets/co-NP-c/config.js
   ─────────────────────────────────────────────────────────────
   MANIFEST — definisce la struttura della classe co-NP-c.
   I contenuti testuali sono nei file .md di questa cartella.

   Per aggiungere un nuovo problema:
   1. Crea una sottocartella con un nome significativo.
   2. Aggiungi description.md e i file example*.md.
   3. Aggiungi la voce nell'array "problems" qui sotto.
════════════════════════════════════════════════════════════════ */

window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["co-NP-c"] = {
  "fullLabel": "co-NP-complete",
  "definition": "definition.md",
  "problems": [
    {
      "name": "UNSAT",
      "folder": "unsat",
      "description": "description.md",
      "examples": [
        {
          "name": "Formula Pigeonhole",
          "file": "example1.md"
        },
        {
          "name": "Prove CDCL moderni",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "ILP Infeasibility",
      "folder": "ilp-infeasibility",
      "description": "description.md",
      "examples": [
        {
          "name": "Scheduling infeasible",
          "file": "example1.md"
        },
        {
          "name": "Bin packing impossibile",
          "file": "example2.md"
        }
      ]
    }
  ]
};
