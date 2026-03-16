/* ═══════════════════════════════════════════════════════════════
   complexity_sets/PSPACE-h/config.js
   ─────────────────────────────────────────────────────────────
   MANIFEST — definisce la struttura della classe PSPACE-h.
   I contenuti testuali sono nei file .md di questa cartella.

   Per aggiungere un nuovo problema:
   1. Crea una sottocartella con un nome significativo.
   2. Aggiungi description.md e i file example*.md.
   3. Aggiungi la voce nell'array "problems" qui sotto.
════════════════════════════════════════════════════════════════ */

window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["PSPACE-h"] = {
  "fullLabel": "PSPACE-Hard",
  "definition": "definition.md",
  "problems": [
    {
      "name": "GO (posizioni di gioco)",
      "folder": "go-posizioni-di-gioco",
      "description": "description.md",
      "examples": [
        {
          "name": "Endgame 5×5 Go",
          "file": "example1.md"
        },
        {
          "name": "Gara di cattura (Semeai)",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "Scacchi Generalizzati",
      "folder": "scacchi-generalizzati",
      "description": "description.md",
      "examples": [
        {
          "name": "Distanza al matto (DTM)",
          "file": "example1.md"
        },
        {
          "name": "Riduzione da QBF",
          "file": "example2.md"
        }
      ]
    }
  ]
};
