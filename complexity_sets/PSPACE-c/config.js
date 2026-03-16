/* ═══════════════════════════════════════════════════════════════
   complexity_sets/PSPACE-c/config.js
   ─────────────────────────────────────────────────────────────
   MANIFEST — definisce la struttura della classe PSPACE-c.
   I contenuti testuali sono nei file .md di questa cartella.

   Per aggiungere un nuovo problema:
   1. Crea una sottocartella con un nome significativo.
   2. Aggiungi description.md e i file example*.md.
   3. Aggiungi la voce nell'array "problems" qui sotto.
════════════════════════════════════════════════════════════════ */

window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["PSPACE-c"] = {
  "fullLabel": "PSPACE-complete",
  "definition": "definition.md",
  "problems": [
    {
      "name": "TQBF",
      "folder": "tqbf",
      "description": "description.md",
      "examples": [
        {
          "name": "Valutazione albero AND-OR",
          "file": "example1.md"
        },
        {
          "name": "Gioco Shannon (Hex)",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "Geography Game",
      "folder": "geography-game",
      "description": "description.md",
      "examples": [
        {
          "name": "Geography con parole",
          "file": "example1.md"
        },
        {
          "name": "Token su grafo diretto",
          "file": "example2.md"
        }
      ]
    }
  ]
};
