/* ═══════════════════════════════════════════════════════════════
   complexity_sets/NP-h/config.js
   ─────────────────────────────────────────────────────────────
   MANIFEST — definisce la struttura della classe NP-h.
   I contenuti testuali sono nei file .md di questa cartella.

   Per aggiungere un nuovo problema:
   1. Crea una sottocartella con un nome significativo.
   2. Aggiungi description.md e i file example*.md.
   3. Aggiungi la voce nell'array "problems" qui sotto.
════════════════════════════════════════════════════════════════ */

window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["NP-h"] = {
  "fullLabel": "NP-Hard",
  "definition": "definition.md",
  "problems": [
    {
      "name": "Halting Problem",
      "folder": "halting-problem",
      "description": "description.md",
      "examples": [
        {
          "name": "Rilevamento loop infiniti",
          "file": "example1.md"
        },
        {
          "name": "Teorema di Rice",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "TSP (Ottimizzazione)",
      "folder": "tsp-ottimizzazione",
      "description": "description.md",
      "examples": [
        {
          "name": "Algoritmo di Held-Karp",
          "file": "example1.md"
        },
        {
          "name": "Euristica di Christofides",
          "file": "example2.md"
        }
      ]
    }
  ]
};
