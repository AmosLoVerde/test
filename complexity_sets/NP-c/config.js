/* ═══════════════════════════════════════════════════════════════
   complexity_sets/NP-c/config.js
   ─────────────────────────────────────────────────────────────
   MANIFEST — definisce la struttura della classe NP-c.
   I contenuti testuali sono nei file .md di questa cartella.

   Per aggiungere un nuovo problema:
   1. Crea una sottocartella con un nome significativo.
   2. Aggiungi description.md e i file example*.md.
   3. Aggiungi la voce nell'array "problems" qui sotto.
════════════════════════════════════════════════════════════════ */

window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["NP-c"] = {
  "fullLabel": "NP-complete",
  "definition": "definition.md",
  "problems": [
    {
      "name": "3-SAT",
      "folder": "3-sat",
      "description": "description.md",
      "examples": [
        {
          "name": "Riduzione a 3-clausole",
          "file": "example1.md"
        },
        {
          "name": "Algoritmo DPLL",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "Vertex Cover",
      "folder": "vertex-cover",
      "description": "description.md",
      "examples": [
        {
          "name": "Sicurezza di rete",
          "file": "example1.md"
        },
        {
          "name": "Algoritmo FPT",
          "file": "example2.md"
        }
      ]
    }
  ]
};
