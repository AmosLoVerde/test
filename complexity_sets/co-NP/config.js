/* ═══════════════════════════════════════════════════════════════
   complexity_sets/co-NP/config.js
   ─────────────────────────────────────────────────────────────
   MANIFEST — definisce la struttura della classe co-NP.
   I contenuti testuali sono nei file .md di questa cartella.

   Per aggiungere un nuovo problema:
   1. Crea una sottocartella con un nome significativo.
   2. Aggiungi description.md e i file example*.md.
   3. Aggiungi la voce nell'array "problems" qui sotto.
════════════════════════════════════════════════════════════════ */

window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["co-NP"] = {
  "fullLabel": "co-NP — Complemento di NP",
  "definition": "definition.md",
  "problems": [
    {
      "name": "Tautologia (TAUT)",
      "folder": "tautologia-taut",
      "description": "description.md",
      "examples": [
        {
          "name": "Tautologia proposizionale",
          "file": "example1.md"
        },
        {
          "name": "Sistemi di prova per tautologie",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "Non-3-colorabilità",
      "folder": "non-3-colorabilita",
      "description": "description.md",
      "examples": [
        {
          "name": "Sottografo K₄",
          "file": "example1.md"
        },
        {
          "name": "Grafo di Petersen",
          "file": "example2.md"
        }
      ]
    }
  ]
};
