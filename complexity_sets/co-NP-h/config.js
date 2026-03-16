/* ═══════════════════════════════════════════════════════════════
   complexity_sets/co-NP-h/config.js
   ─────────────────────────────────────────────────────────────
   MANIFEST — definisce la struttura della classe co-NP-h.
   I contenuti testuali sono nei file .md di questa cartella.

   Per aggiungere un nuovo problema:
   1. Crea una sottocartella con un nome significativo.
   2. Aggiungi description.md e i file example*.md.
   3. Aggiungi la voce nell'array "problems" qui sotto.
════════════════════════════════════════════════════════════════ */

window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["co-NP-h"] = {
  "fullLabel": "co-NP-Hard",
  "definition": "definition.md",
  "problems": [
    {
      "name": "∀-SAT (ALL-UNSAT)",
      "folder": "sat-all-unsat",
      "description": "description.md",
      "examples": [
        {
          "name": "Falsità universale",
          "file": "example1.md"
        },
        {
          "name": "Verifica protocolli",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "Non-Termination Verification",
      "folder": "non-termination-verification",
      "description": "description.md",
      "examples": [
        {
          "name": "Testimone lasso",
          "file": "example1.md"
        },
        {
          "name": "Metodo dei recurrent set",
          "file": "example2.md"
        }
      ]
    }
  ]
};
