/* ═══════════════════════════════════════════════════════════════
   complexity_sets/NP-intersect-co-NP/config.js
   ─────────────────────────────────────────────────────────────
   MANIFEST — definisce la struttura della classe NP∩co-NP.
   I contenuti testuali sono nei file .md di questa cartella.

   Per aggiungere un nuovo problema:
   1. Crea una sottocartella con un nome significativo.
   2. Aggiungi description.md e i file example*.md.
   3. Aggiungi la voce nell'array "problems" qui sotto.
════════════════════════════════════════════════════════════════ */

window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["NP∩co-NP"] = {
  "fullLabel": "NP ∩ co-NP",
  "definition": "definition.md",
  "problems": [
    {
      "name": "Integer Factorization",
      "folder": "integer-factorization",
      "description": "description.md",
      "examples": [
        {
          "name": "Modulo RSA-2048",
          "file": "example1.md"
        },
        {
          "name": "Metodo di Fermat",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "Graph Isomorphism",
      "folder": "graph-isomorphism",
      "description": "description.md",
      "examples": [
        {
          "name": "Confronto strutture chimiche",
          "file": "example1.md"
        },
        {
          "name": "Confronto topologie di rete",
          "file": "example2.md"
        }
      ]
    }
  ]
};
