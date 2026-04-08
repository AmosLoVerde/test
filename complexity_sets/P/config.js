/* ═════════════════════════════════════════════════════════════
   complexity_sets/P/config.js
   ─────────────────────────────────────────────────────────────
   MANIFEST — defines the structure of class P.
   The text content is in the .md files in this folder.

   To add a new problem:
   1. Create a subfolder with a meaningful name.
   2. Add description.md and the example*.md files.
   3. Add the entry to the “problems” array below.
  ══════════════════════════════════════════════════════════════ */

window._CLASS_MANIFEST = window._CLASS_MANIFEST || {};
window._CLASS_MANIFEST["P"] = {
  fullLabel: "P — Polynomial Time",
  definition: "definition.md",
  problems: [
    {
      name: "Euler Path",
      folder: "euler-path",
      description: "description.md",
      examples: [
        {
          name: "Esempio 1",
          file: "example1.md",
        },
        {
          name: "Esempio 2",
          file: "example2.md",
        },
      ],
    },
    {
      name: "Euler Cycle",
      folder: "euler-cycle",
      description: "description.md",
      examples: [
        {
          name: "esempio 1",
          file: "example1.md",
        },
        {
          name: "esempio 2",
          file: "example2.md",
        },
      ],
    },
  ],
};
