/* ═══════════════════════════════════════════════════════════════
   complexity_sets/P/config.js
   ─────────────────────────────────────────────────────────────
   MANIFEST — definisce la struttura della classe P.
   I contenuti testuali sono nei file .md di questa cartella.

   Per aggiungere un nuovo problema:
   1. Crea una sottocartella con un nome significativo.
   2. Aggiungi description.md e i file example*.md.
   3. Aggiungi la voce nell'array "problems" qui sotto.
════════════════════════════════════════════════════════════════ */

window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["P"] = {
  "fullLabel": "P — Polynomial Time",
  "definition": "definition.md",
  "problems": [
    {
      "name": "Maximum Flow",
      "folder": "maximum-flow",
      "description": "description.md",
      "examples": [
        {
          "name": "Rete idrica",
          "file": "example1.md"
        },
        {
          "name": "Assegnamento task",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "Shortest Path",
      "folder": "shortest-path",
      "description": "description.md",
      "examples": [
        {
          "name": "GPS navigation",
          "file": "example1.md"
        },
        {
          "name": "Network routing (OSPF)",
          "file": "example2.md"
        }
      ]
    }
  ]
};
