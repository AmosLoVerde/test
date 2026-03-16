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
      name: "Maximum Flow",
      folder: "maximum-flow",
      description: "description.md",
      examples: [
        {
          name: "Rete idrica",
          file: "example1.md",
        },
        {
          name: "Assegnamento task",
          file: "example2.md",
        },
      ],
    },
    {
      name: "Shortest Path",
      folder: "shortest-path",
      description: "description.md",
      examples: [
        {
          name: "GPS navigation",
          file: "example1.md",
        },
        {
          name: "Network routing (OSPF)",
          file: "example2.md",
        },
      ],
    },
  ],
};
