/* ═══════════════════════════════════════════════════════════════
   complexity_sets/NP/config.js
   ─────────────────────────────────────────────────────────────
   MANIFEST — definisce la struttura della classe NP.
   I contenuti testuali sono nei file .md di questa cartella.

   Per aggiungere un nuovo problema:
   1. Crea una sottocartella con un nome significativo.
   2. Aggiungi description.md e i file example*.md.
   3. Aggiungi la voce nell'array "problems" qui sotto.
════════════════════════════════════════════════════════════════ */

window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["NP"] = {
  "fullLabel": "NP — Nondeterministic Polynomial Time",
  "definition": "definition.md",
  "problems": [
    {
      "name": "Boolean Satisfiability (SAT)",
      "folder": "boolean-satisfiability-sat",
      "description": "description.md",
      "examples": [
        {
          "name": "Istanza 3-SAT",
          "file": "example1.md"
        },
        {
          "name": "Circuit-SAT",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "Hamiltonian Path",
      "folder": "hamiltonian-path",
      "description": "description.md",
      "examples": [
        {
          "name": "Grafo a 6 nodi",
          "file": "example1.md"
        },
        {
          "name": "Tour del cavallo",
          "file": "example2.md"
        }
      ]
    }
  ]
};
