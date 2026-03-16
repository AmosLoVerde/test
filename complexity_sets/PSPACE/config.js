/* ═══════════════════════════════════════════════════════════════
   complexity_sets/PSPACE/config.js
   ─────────────────────────────────────────────────────────────
   MANIFEST — definisce la struttura della classe PSPACE.
   I contenuti testuali sono nei file .md di questa cartella.

   Per aggiungere un nuovo problema:
   1. Crea una sottocartella con un nome significativo.
   2. Aggiungi description.md e i file example*.md.
   3. Aggiungi la voce nell'array "problems" qui sotto.
════════════════════════════════════════════════════════════════ */

window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["PSPACE"] = {
  "fullLabel": "PSPACE — Polynomial Space",
  "definition": "definition.md",
  "problems": [
    {
      "name": "QSAT / QBF",
      "folder": "qsat-qbf",
      "description": "description.md",
      "examples": [
        {
          "name": "Quantificatori alternati",
          "file": "example1.md"
        },
        {
          "name": "Model checking CTL",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "Regular Expression Universality",
      "folder": "regular-expression-universality",
      "description": "description.md",
      "examples": [
        {
          "name": "Universalità NFA",
          "file": "example1.md"
        },
        {
          "name": "Equivalenza linguaggi",
          "file": "example2.md"
        }
      ]
    }
  ]
};
