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
      "name": "Circuit-SAT",
      "folder": "circuit-sat",
      "description": "description.md",
      "examples": [
        {
          "name": "Teorema Levin-Cook",
          "file": "teorema-lv.md"
        },
        {
          "name": "Esempio 1",
          "file": "example1.md"
        },
        {
          "name": "Esempio 2",
          "file": "example2.md"
        }
        
      ]
    },
    {
      "name": "SAT",
      "folder": "sat",
      "description": "description.md",
      "examples": [
        {
          "name": "Esempio 1",
          "file": "example1.md"
        },
        {
          "name": "Esempio 2",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "k-SAT",
      "folder": "k-sat",
      "description": "description.md",
      "examples": [
        {
          "name": "Esempio 1",
          "file": "example1.md"
        },
        {
          "name": "Esempio 2",
          "file": "example2.md"
        }
      ]
    },
    {
      "name": "Riduzioni",
      "folder": "riduzioni",
      "description": "description.md",
      "examples": [
        {
          "name": "SAT ≼ k-SAT",
          "file": "example1.md"
        },
        {
          "name": "SAT ≼ k-SAT",
          "file": "example2.md"
        }
      ]
    }
  ]
};
