/* ═══════════════════════════════════════════════════════════════
   complexity_sets/scenarios.js
   ─────────────────────────────────────────────────────────────
   Definisce la geometria del diagramma per ogni combinazione
   di classi selezionabili dall'utente.

   ── SISTEMA DI COORDINATE ────────────────────────────────────
   Origine (0,0) = centro del canvas visibile.
     x > 0 → destra    x < 0 → sinistra
     y > 0 → su        y < 0 → giù
   Range: circa ±400 in x, ±250 in y.
   (toSVGCoords() converte automaticamente in coord SVG all'avvio)

   ── FORMATO ELLISSE ──────────────────────────────────────────
   { id, cx, cy, rx, ry, rotation?, lx, ly, la }
   cx,cy = centro | rx,ry = semiassi | rotation = gradi
   lx,ly = posizione label | la = 'middle'|'start'|'end'

   ── FORMATO OPEN-CURVE (classi Hard — forma a parabola) ──────
   { id, type:'open-curve',
     p0:{x,y}, pm:{x,y}, p2:{x,y}, height,
     rotate?, lx?, ly?, tailLength? }
   p0 = punta braccio sinistro | pm = fondo bowl | p2 = punta braccio destro
   height = y dove si tagliano le code tratteggiate

   ── IMPORT-SCENARIO ──────────────────────────────────────────
   {'import-scenario': 'CHIAVE'} copia le forme da un altro scenario.
   Le forme dichiarate DOPO un import sovrascrivono quelle importate
   (last-write-wins per id).

   ── HOW TO ADD A NEW SCENARIO ────────────────────────────────
   1. Trova la chiave corretta con scenarioKey() nella console:
        scenarioKey(new Set(['NP','NP-c','PSPACE']))
   2. Aggiungi la geometria usando coordinate display.
   3. Salva — nessun build step necessario.
════════════════════════════════════════════════════════════════ */

let SCENARIO_DECLARATIONS = {

  /* ═══ length 1 — 1 set ═══ */
  'P': [
    {id:'P', cx:0, cy:-8, rx:130, ry:98, lx:0, ly:-8, la:'middle'},
  ],
  'NP': [
    {id:'NP', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:148, la:'middle'},
  ],
  'co-NP': [
    {id:'co-NP', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:148, la:'middle'},
  ],
  'PSPACE': [
    {id:'PSPACE', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:133, la:'middle'},
  ],

  /* ═══ length 2 — 2 sets ═══ */
  'P|NP': [
    {id:'NP', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:148, la:'middle'},
    {id:'P', cx:0, cy:-8, rx:122, ry:92, lx:0, ly:-8, la:'middle'},
  ],
  'P|co-NP': [
    {id:'co-NP', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:148, la:'middle'},
    {id:'P', cx:0, cy:-8, rx:122, ry:92, lx:0, ly:-8, la:'middle'},
  ],
  'P|PSPACE': [
    {id:'PSPACE', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:133, la:'middle'},
    {id:'P', cx:0, cy:-12, rx:122, ry:92, lx:0, ly:-12, la:'middle'},
  ],
  'NP|co-NP': [
    {id:'NP', cx:-92, cy:-8, rx:228, ry:170, lx:-217, ly:-8, la:'middle'},
    {id:'co-NP', cx:92, cy:-8, rx:228, ry:170, lx:217, ly:-8, la:'middle'},
  ],
  'NP|NP-c': [
    {id:'NP', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:148, la:'middle'},
    {id:'NP-c', cx:0, cy:-12, rx:122, ry:92, lx:0, ly:-12, la:'middle'},
  ],
  'NP|PSPACE': [
    {id:'PSPACE', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:133, la:'middle'},
    {id:'NP', cx:0, cy:-12, rx:122, ry:92, lx:0, ly:-12, la:'middle'},
  ],
  'co-NP|co-NP-c': [
    {id:'co-NP', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:148, la:'middle'},
    {id:'co-NP-c', cx:0, cy:-12, rx:122, ry:92, lx:0, ly:-12, la:'middle'},
  ],
  'co-NP|PSPACE': [
    {id:'PSPACE', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:133, la:'middle'},
    {id:'co-NP', cx:0, cy:-12, rx:122, ry:92, lx:0, ly:-12, la:'middle'},
  ],
  'PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:148, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:-12, rx:122, ry:92, lx:0, ly:-12, la:'middle'},
  ],

  /* ═══ length 3 — 3 sets ═══ */
  'P|NP|co-NP': [
    {id:'P', cx:0, cy:-8, rx:65, ry:50, lx:0, ly:-8, la:'middle'},
    {'import-scenario': 'NP|co-NP'},
  ],
  'P|NP|NP-c': [
    {id:'NP', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:148, la:'middle'},
    {id:'NP-c', cx:100, cy:-8, rx:72, ry:52, lx:100, ly:-8, la:'middle'},
    {id:'P', cx:-100, cy:-8, rx:72, ry:52, lx:-100, ly:-8, la:'middle'},
  ],
  'P|NP|PSPACE': [
    {id:'PSPACE', cx:0, cy:0, rx:360, ry:268, lx:0, ly:230, la:'middle'},
    {'import-scenario': 'P|NP'},
  ],
  'P|co-NP|co-NP-c': [
    {id:'co-NP', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:148, la:'middle'},
    {id:'co-NP-c', cx:100, cy:-8, rx:72, ry:52, lx:100, ly:-8, la:'middle'},
    {id:'P', cx:-100, cy:-8, rx:72, ry:52, lx:-100, ly:-8, la:'middle'},
  ],
  'P|co-NP|PSPACE': [
    {id:'PSPACE', cx:0, cy:0, rx:360, ry:268, lx:0, ly:230, la:'middle'},
    {'import-scenario': 'P|co-NP'},
  ],
  'P|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:148, la:'middle'},
    {id:'PSPACE-c', cx:100, cy:-8, rx:72, ry:52, lx:100, ly:-8, la:'middle'},
    {id:'P', cx:-100, cy:-8, rx:72, ry:52, lx:-100, ly:-8, la:'middle'},
  ],
  'NP|co-NP|NP-c': [
    {id:'NP', cx:-92, cy:-8, rx:228, ry:170, lx:-215, ly:86, la:'middle'},
    {id:'co-NP', cx:92, cy:-8, rx:228, ry:170, lx:217, ly:-8, la:'middle'},
    {id:'NP-c', cx:-215, cy:-8, rx:65, ry:50, lx:-215, ly:-8, la:'middle'},
  ],
  'NP|co-NP|co-NP-c': [
    {id:'NP', cx:-92, cy:-8, rx:228, ry:170, lx:-217, ly:-8, la:'middle'},
    {id:'co-NP', cx:92, cy:-8, rx:228, ry:170, lx:215, ly:86, la:'middle'},
    {id:'co-NP-c', cx:215, cy:-8, rx:65, ry:50, lx:215, ly:-8, la:'middle'},
  ],
  'NP|co-NP|PSPACE': [
    {id:'PSPACE', cx:0, cy:-18, rx:358, ry:260, lx:0, ly:-256, la:'middle'},
    {id:'NP', cx:-92, cy:-8, rx:228, ry:170, lx:-217, ly:-8, la:'middle'},
    {id:'co-NP', cx:92, cy:-8, rx:228, ry:170, lx:217, ly:-8, la:'middle'},
  ],
  'NP|NP-c|NP-h': [
    {id:'NP-h', type:'open-curve', p0:{x:-150, y:165}, pm:{x:0, y:-126}, p2:{x:150, y:165}, height:165, lx:0, ly:165},
    {id:'NP', cx:0, cy:-90, rx:250, ry:168, lx:0, ly:-228, la:'middle'},
    {id:'NP-c', cx:0, cy:-30, rx:88, ry:66, lx:0, ly:-30, la:'middle'},
  ],
  'NP|NP-c|PSPACE': [
    {id:'PSPACE', cx:0, cy:0, rx:360, ry:268, lx:0, ly:230, la:'middle'},
    {'import-scenario': 'NP|NP-c'},
  ],
  'NP|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:148, la:'middle'},
    {id:'PSPACE-c', cx:100, cy:-8, rx:72, ry:52, lx:100, ly:-8, la:'middle'},
    {id:'NP', cx:-100, cy:-8, rx:72, ry:52, lx:-100, ly:-8, la:'middle'},
  ],
  'co-NP|co-NP-c|co-NP-h': [
    {id:'co-NP-h', type:'open-curve', p0:{x:-150, y:165}, pm:{x:0, y:-126}, p2:{x:150, y:165}, height:165, lx:0, ly:165},
    {id:'co-NP', cx:0, cy:-90, rx:250, ry:168, lx:0, ly:-228, la:'middle'},
    {id:'co-NP-c', cx:0, cy:-30, rx:88, ry:66, lx:0, ly:-30, la:'middle'},
  ],
  'co-NP|co-NP-c|PSPACE': [
    {id:'PSPACE', cx:0, cy:0, rx:360, ry:268, lx:0, ly:230, la:'middle'},
    {'import-scenario': 'co-NP|co-NP-c'},
  ],
  'co-NP|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:-8, rx:252, ry:186, lx:0, ly:148, la:'middle'},
    {id:'PSPACE-c', cx:100, cy:-8, rx:72, ry:52, lx:100, ly:-8, la:'middle'},
    {id:'co-NP', cx:-100, cy:-8, rx:72, ry:52, lx:-100, ly:-8, la:'middle'},
  ],
  'PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE-h', type:'open-curve', p0:{x:-150, y:165}, pm:{x:0, y:-126}, p2:{x:150, y:165}, height:165, lx:0, ly:165},
    {id:'PSPACE', cx:0, cy:-90, rx:250, ry:168, lx:0, ly:-228, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:-30, rx:88, ry:66, lx:0, ly:-30, la:'middle'},
  ],

  /* ═══ length 4 — 4 sets ═══ */
  'P|NP|co-NP|NP-c': [
    {id:'P', cx:0, cy:-8, rx:65, ry:50, lx:0, ly:-8, la:'middle'},
    {'import-scenario': 'NP|co-NP|NP-c'},
  ],
  'P|NP|co-NP|co-NP-c': [
    {id:'P', cx:0, cy:-8, rx:65, ry:50, lx:0, ly:-8, la:'middle'},
    {'import-scenario': 'NP|co-NP|co-NP-c'},
  ],
  'P|NP|co-NP|PSPACE': [
    {id:'PSPACE', cx:0, cy:-18, rx:358, ry:260, lx:0, ly:-256, la:'middle'},
    {'import-scenario': 'P|NP|co-NP'},
  ],
  'P|NP|NP-c|NP-h': [
    {id:'NP-h', type:'open-curve', p0:{x:-130, y:185}, pm:{x:0, y:-62}, p2:{x:130, y:185}, height:185, lx:0, ly:185},
    {id:'NP', cx:0, cy:-90, rx:250, ry:188, lx:-210, ly:-90, la:'start'},
    {id:'NP-c', cx:0, cy:25, rx:76, ry:57, lx:0, ly:25, la:'middle'},
    {id:'P', cx:0, cy:-180, rx:76, ry:57, lx:0, ly:-180, la:'middle'},
  ],
  'P|NP|NP-c|PSPACE': [
    {id:'PSPACE', cx:0, cy:0, rx:360, ry:268, lx:0, ly:230, la:'middle'},
    {'import-scenario': 'P|NP|NP-c'},
  ],
  'P|NP|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:2, rx:360, ry:305, lx:0, ly:287, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:175, rx:72, ry:52, lx:0, ly:175, la:'middle'},
    {id:'NP', cx:0, cy:-85, rx:252, ry:180, lx:0, ly:65, la:'middle'},
    {id:'P', cx:0, cy:-85, rx:122, ry:92, lx:0, ly:-85, la:'middle'},
  ],
  'P|co-NP|co-NP-c|co-NP-h': [
    {id:'co-NP-h', type:'open-curve', p0:{x:-130, y:185}, pm:{x:0, y:-62}, p2:{x:130, y:185}, height:185, lx:0, ly:185},
    {id:'co-NP', cx:0, cy:-90, rx:250, ry:188, lx:210, ly:-90, la:'end'},
    {id:'co-NP-c', cx:0, cy:25, rx:76, ry:57, lx:0, ly:25, la:'middle'},
    {id:'P', cx:0, cy:-180, rx:76, ry:57, lx:0, ly:-180, la:'middle'},
  ],
  'P|co-NP|co-NP-c|PSPACE': [
    {id:'PSPACE', cx:0, cy:0, rx:360, ry:268, lx:0, ly:230, la:'middle'},
    {'import-scenario': 'P|co-NP|co-NP-c'},
  ],
  'P|co-NP|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:2, rx:360, ry:305, lx:0, ly:287, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:175, rx:72, ry:52, lx:0, ly:175, la:'middle'},
    {id:'co-NP', cx:0, cy:-85, rx:252, ry:180, lx:0, ly:65, la:'middle'},
    {id:'P', cx:0, cy:-85, rx:122, ry:92, lx:0, ly:-85, la:'middle'},
  ],
  'P|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE-h', type:'open-curve', p0:{x:-130, y:185}, pm:{x:0, y:-62}, p2:{x:130, y:185}, height:185, lx:0, ly:185},
    {id:'PSPACE', cx:0, cy:-90, rx:250, ry:188, lx:0, ly:-90, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:25, rx:76, ry:57, lx:0, ly:25, la:'middle'},
    {id:'P', cx:0, cy:-180, rx:76, ry:57, lx:0, ly:-180, la:'middle'},
  ],
  'NP|co-NP|NP-c|co-NP-c': [
    {id:'NP', cx:-92, cy:-8, rx:228, ry:170, lx:-215, ly:86, la:'middle'},
    {id:'co-NP', cx:92, cy:-8, rx:228, ry:170, lx:215, ly:86, la:'middle'},
    {id:'NP-c', cx:-215, cy:-8, rx:65, ry:50, lx:-215, ly:-8, la:'middle'},
    {id:'co-NP-c', cx:215, cy:-8, rx:65, ry:50, lx:215, ly:-8, la:'middle'},
  ],
  'NP|co-NP|NP-c|NP-h': [
    {id:'NP-h', type:'open-curve', p0:{x:-280, y:223}, pm:{x:-160, y:23}, p2:{x:-40, y:223}, height:223, lx:-160, ly:223},
    {id:'NP', cx:-105, cy:-45, rx:215, ry:160, rotation:35, lx:-215, ly:-120, la:'middle'},
    {id:'co-NP', cx:105, cy:-45, rx:215, ry:160, rotation:-35, lx:215, ly:-120, la:'middle'},
    {id:'NP-c', cx:-160, cy:87, rx:50, ry:34, lx:-160, ly:87, la:'middle'},
  ],
  'NP|co-NP|NP-c|PSPACE': [
    {id:'PSPACE', cx:0, cy:-18, rx:358, ry:260, lx:0, ly:-256, la:'middle'},
    {'import-scenario': 'NP|co-NP|NP-c'},
  ],
  'NP|co-NP|co-NP-c|co-NP-h': [
    {id:'co-NP-h', type:'open-curve', p0:{x:40, y:223}, pm:{x:160, y:23}, p2:{x:280, y:223}, height:223, lx:160, ly:223},
    {id:'NP', cx:-105, cy:-45, rx:215, ry:160, rotation:35, lx:-215, ly:-120, la:'middle'},
    {id:'co-NP', cx:105, cy:-45, rx:215, ry:160, rotation:-35, lx:215, ly:-120, la:'middle'},
    {id:'co-NP-c', cx:160, cy:87, rx:50, ry:34, lx:160, ly:87, la:'middle'},
  ],
  'NP|co-NP|co-NP-c|PSPACE': [
    {id:'PSPACE', cx:0, cy:-18, rx:358, ry:260, lx:0, ly:-256, la:'middle'},
    {'import-scenario': 'NP|co-NP|co-NP-c'},
  ],
  'NP|co-NP|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:55, rx:360, ry:295, lx:0, ly:-218, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:250, rx:72, ry:52, lx:0, ly:250, la:'middle'},
    {'import-scenario': 'NP|co-NP'},
  ],
  'NP|NP-c|NP-h|PSPACE': [
    {id:'PSPACE', cx:0, cy:-60, rx:345, ry:320, lx:0, ly:-358, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-190, y:340}, pm:{x:0, y:-126}, p2:{x:190, y:340}, height:340, lx:0, ly:340},
    {id:'NP', cx:0, cy:-90, rx:250, ry:168, lx:0, ly:-228, la:'middle'},
    {id:'NP-c', cx:0, cy:-30, rx:88, ry:66, lx:0, ly:-30, la:'middle'},
  ],
  'NP|NP-c|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:2, rx:360, ry:305, lx:0, ly:275, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:175, rx:72, ry:52, lx:0, ly:175, la:'middle'},
    {id:'NP', cx:0, cy:-85, rx:252, ry:180, lx:0, ly:65, la:'middle'},
    {id:'NP-c', cx:0, cy:-85, rx:122, ry:92, lx:0, ly:-85, la:'middle'},
  ],
  'NP|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE', cx:0, cy:-90, rx:250, ry:188, lx:-210, ly:-90, la:'start'},
    {id:'PSPACE-c', cx:0, cy:25, rx:76, ry:57, lx:0, ly:25, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-116, y:178}, pm:{x:0, y:-62}, p2:{x:116, y:178}, height:178, lx:0, ly:178},
    {id:'NP', cx:0, cy:-180, rx:76, ry:57, lx:0, ly:-180, la:'middle'},
  ],
  'co-NP|co-NP-c|co-NP-h|PSPACE': [
    {id:'PSPACE', cx:0, cy:-60, rx:345, ry:320, lx:0, ly:-358, la:'middle'},
    {id:'co-NP-h', type:'open-curve', p0:{x:-190, y:340}, pm:{x:0, y:-126}, p2:{x:190, y:340}, height:340, lx:0, ly:340},
    {id:'co-NP', cx:0, cy:-90, rx:250, ry:168, lx:0, ly:-228, la:'middle'},
    {id:'co-NP-c', cx:0, cy:-30, rx:88, ry:66, lx:0, ly:-30, la:'middle'},
  ],
  'co-NP|co-NP-c|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:2, rx:360, ry:305, lx:0, ly:275, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:175, rx:72, ry:52, lx:0, ly:175, la:'middle'},
    {id:'co-NP', cx:0, cy:-85, rx:252, ry:180, lx:0, ly:65, la:'middle'},
    {id:'co-NP-c', cx:0, cy:-85, rx:122, ry:92, lx:0, ly:-85, la:'middle'},
  ],
  'co-NP|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE', cx:0, cy:-90, rx:250, ry:188, lx:210, ly:-90, la:'end'},
    {id:'PSPACE-c', cx:0, cy:25, rx:76, ry:57, lx:0, ly:25, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-116, y:178}, pm:{x:0, y:-62}, p2:{x:116, y:178}, height:178, lx:0, ly:178},
    {id:'co-NP', cx:0, cy:-180, rx:76, ry:57, lx:0, ly:-180, la:'middle'},
  ],

  /* ═══ length 5 — 5 sets ═══ */
  'P|NP|co-NP|NP-c|co-NP-c': [
    {id:'P', cx:0, cy:-8, rx:65, ry:50, lx:0, ly:-8, la:'middle'},
    {'import-scenario': 'NP|co-NP|NP-c|co-NP-c'},
  ],
  'P|NP|co-NP|NP-c|NP-h': [
    {id:'P', cx:0, cy:-100, rx:50, ry:38, lx:0, ly:-100, la:'middle'},
    {'import-scenario': 'NP|co-NP|NP-c|NP-h'},
  ],
  'P|NP|co-NP|NP-c|PSPACE': [
    {id:'PSPACE', cx:0, cy:-18, rx:358, ry:260, lx:0, ly:-256, la:'middle'},
    {id:'NP', cx:-92, cy:-8, rx:228, ry:170, lx:-215, ly:86, la:'middle'},
    {id:'co-NP', cx:92, cy:-8, rx:228, ry:170, lx:217, ly:-8, la:'middle'},
    {id:'NP-c', cx:-215, cy:-8, rx:65, ry:50, lx:-215, ly:-8, la:'middle'},
    {id:'P', cx:0, cy:-8, rx:65, ry:50, lx:0, ly:-8, la:'middle'},
  ],
  'P|NP|co-NP|co-NP-c|co-NP-h': [
    {id:'P', cx:0, cy:-100, rx:50, ry:38, lx:0, ly:-100, la:'middle'},
    {'import-scenario': 'NP|co-NP|co-NP-c|co-NP-h'},
  ],
  'P|NP|co-NP|co-NP-c|PSPACE': [
    {id:'PSPACE', cx:0, cy:-18, rx:358, ry:260, lx:0, ly:-256, la:'middle'},
    {'import-scenario': 'P|NP|co-NP|co-NP-c'},
  ],
  'P|NP|co-NP|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:55, rx:360, ry:295, lx:0, ly:-218, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:250, rx:72, ry:52, lx:0, ly:250, la:'middle'},
    {'import-scenario': 'P|NP|co-NP'},
  ],
  'P|NP|NP-c|NP-h|PSPACE': [
    {id:'PSPACE', cx:0, cy:-60, rx:345, ry:320, lx:0, ly:-358, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-165, y:340}, pm:{x:0, y:-62}, p2:{x:165, y:340}, height:340, lx:0, ly:340},
    {id:'NP', cx:0, cy:-90, rx:250, ry:188, lx:-210, ly:-90, la:'start'},
    {id:'NP-c', cx:0, cy:25, rx:76, ry:57, lx:0, ly:25, la:'middle'},
    {id:'P', cx:0, cy:-180, rx:76, ry:57, lx:0, ly:-180, la:'middle'},
  ],
  'P|NP|NP-c|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:2, rx:360, ry:305, lx:0, ly:275, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:175, rx:72, ry:52, lx:0, ly:175, la:'middle'},
    {id:'NP', cx:0, cy:-85, rx:252, ry:180, lx:-212, ly:-85, la:'start'},
    {id:'NP-c', cx:0, cy:0, rx:76, ry:57, lx:0, ly:0, la:'middle'},
    {id:'P', cx:0, cy:-170, rx:76, ry:57, lx:0, ly:-170, la:'middle'},
  ],
  'P|NP|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE', cx:0, cy:2, rx:360, ry:305, lx:0, ly:-270, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:175, rx:72, ry:52, lx:0, ly:175, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:387}, pm:{x:0, y:93}, p2:{x:140, y:387}, height:387, lx:0, ly:387},
    {id:'NP', cx:0, cy:-100, rx:180, ry:140, lx:0, ly:25, la:'middle'},
    {id:'P', cx:0, cy:-100, rx:70, ry:52, lx:0, ly:-100, la:'middle'},
  ],
  'P|co-NP|co-NP-c|co-NP-h|PSPACE': [
    {id:'PSPACE', cx:0, cy:-60, rx:345, ry:320, lx:0, ly:-358, la:'middle'},
    {id:'co-NP-h', type:'open-curve', p0:{x:-165, y:340}, pm:{x:0, y:-62}, p2:{x:165, y:340}, height:340, lx:0, ly:340},
    {id:'co-NP', cx:0, cy:-90, rx:250, ry:188, lx:210, ly:-90, la:'end'},
    {id:'co-NP-c', cx:0, cy:25, rx:76, ry:57, lx:0, ly:25, la:'middle'},
    {id:'P', cx:0, cy:-180, rx:76, ry:57, lx:0, ly:-180, la:'middle'},
  ],
  'P|co-NP|co-NP-c|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:2, rx:360, ry:305, lx:0, ly:275, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:175, rx:72, ry:52, lx:0, ly:175, la:'middle'},
    {id:'co-NP', cx:0, cy:-85, rx:252, ry:180, lx:212, ly:-85, la:'end'},
    {id:'co-NP-c', cx:0, cy:0, rx:76, ry:57, lx:0, ly:0, la:'middle'},
    {id:'P', cx:0, cy:-170, rx:76, ry:57, lx:0, ly:-170, la:'middle'},
  ],
  'P|co-NP|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE', cx:0, cy:2, rx:360, ry:305, lx:0, ly:-270, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:175, rx:72, ry:52, lx:0, ly:175, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:387}, pm:{x:0, y:93}, p2:{x:140, y:387}, height:387, lx:0, ly:387},
    {id:'co-NP', cx:0, cy:-100, rx:180, ry:140, lx:0, ly:25, la:'middle'},
    {id:'P', cx:0, cy:-100, rx:70, ry:52, lx:0, ly:-100, la:'middle'},
  ],
  'NP|co-NP|NP-c|co-NP-c|NP-h': [
    {id:'co-NP-c', cx:160, cy:87, rx:50, ry:34, lx:160, ly:87, la:'middle'},
    {'import-scenario': 'NP|co-NP|NP-c|NP-h'},
  ],
  'NP|co-NP|NP-c|co-NP-c|co-NP-h': [
    {id:'NP-c', cx:-160, cy:87, rx:50, ry:34, lx:-160, ly:87, la:'middle'},
    {'import-scenario': 'NP|co-NP|co-NP-c|co-NP-h'},
  ],
  'NP|co-NP|NP-c|co-NP-c|PSPACE': [
    {id:'PSPACE', cx:0, cy:-18, rx:358, ry:260, lx:0, ly:-256, la:'middle'},
    {'import-scenario': 'NP|co-NP|NP-c|co-NP-c'},
  ],
  'NP|co-NP|NP-c|NP-h|PSPACE': [
    {id:'PSPACE', cx:0, cy:10, rx:375, ry:310, lx:0, ly:-278, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-280, y:400}, pm:{x:-160, y:23}, p2:{x:-40, y:400}, height:400, lx:-160, ly:400},
    {id:'NP', cx:-105, cy:-45, rx:215, ry:160, rotation:35, lx:-215, ly:-120, la:'middle'},
    {id:'co-NP', cx:105, cy:-45, rx:215, ry:160, rotation:-35, lx:215, ly:-120, la:'middle'},
    {id:'NP-c', cx:-160, cy:87, rx:50, ry:34, lx:-160, ly:87, la:'middle'},
  ],
  'NP|co-NP|NP-c|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:55, rx:360, ry:295, lx:0, ly:-218, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:230, rx:72, ry:52, lx:0, ly:230, la:'middle'},
    {'import-scenario': 'NP|co-NP|NP-c'},
  ],
  'NP|co-NP|co-NP-c|co-NP-h|PSPACE': [
    {id:'PSPACE', cx:0, cy:10, rx:375, ry:310, lx:0, ly:-278, la:'middle'},
    {id:'co-NP-h', type:'open-curve', p0:{x:40, y:400}, pm:{x:160, y:23}, p2:{x:280, y:400}, height:400, lx:160, ly:400},
    {id:'NP', cx:-105, cy:-45, rx:215, ry:160, rotation:35, lx:-215, ly:-120, la:'middle'},
    {id:'co-NP', cx:105, cy:-45, rx:215, ry:160, rotation:-35, lx:215, ly:-120, la:'middle'},
    {id:'co-NP-c', cx:160, cy:87, rx:50, ry:34, lx:160, ly:87, la:'middle'},
  ],
  'NP|co-NP|co-NP-c|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:55, rx:360, ry:295, lx:0, ly:-218, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:250, rx:72, ry:52, lx:0, ly:250, la:'middle'},
    {'import-scenario': 'NP|co-NP|co-NP-c'},
  ],
  'NP|co-NP|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:430}, pm:{x:0, y:175}, p2:{x:140, y:430}, height:430, lx:0, ly:430},
    {'import-scenario': 'NP|co-NP|PSPACE|PSPACE-c'},
  ],
  'NP|NP-c|NP-h|PSPACE|PSPACE-c': [
    {id:'PSPACE-c', cx:0, cy:180, rx:72, ry:52, lx:0, ly:180, la:'middle'},
    {'import-scenario': 'NP|NP-c|NP-h|PSPACE'},
  ],
  'NP|NP-c|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE', cx:0, cy:2, rx:360, ry:305, lx:-290, ly:2, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:210, rx:72, ry:52, lx:0, ly:210, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-150, y:387}, pm:{x:0, y:128}, p2:{x:150, y:387}, height:387, lx:0, ly:387},
    {id:'NP', cx:0, cy:-85, rx:252, ry:180, lx:0, ly:65, la:'middle'},
    {id:'NP-c', cx:0, cy:-85, rx:122, ry:92, lx:0, ly:-85, la:'middle'},
  ],
  'co-NP|co-NP-c|co-NP-h|PSPACE|PSPACE-c': [
    {id:'PSPACE-c', cx:0, cy:180, rx:72, ry:52, lx:0, ly:180, la:'middle'},
    {'import-scenario': 'co-NP|co-NP-c|co-NP-h|PSPACE'},
  ],
  'co-NP|co-NP-c|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE', cx:0, cy:2, rx:360, ry:305, lx:290, ly:2, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:210, rx:72, ry:52, lx:0, ly:210, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-150, y:387}, pm:{x:0, y:128}, p2:{x:150, y:387}, height:387, lx:0, ly:387},
    {id:'co-NP', cx:0, cy:-85, rx:252, ry:180, lx:0, ly:65, la:'middle'},
    {id:'co-NP-c', cx:0, cy:-85, rx:122, ry:92, lx:0, ly:-85, la:'middle'},
  ],

  /* ═══ length 6 — 6 sets ═══ */
  'P|NP|co-NP|NP-c|co-NP-c|NP-h': [
    {id:'co-NP-c', cx:160, cy:87, rx:50, ry:34, lx:160, ly:87, la:'middle'},
    {'import-scenario': 'P|NP|co-NP|NP-c|NP-h'},
  ],
  'P|NP|co-NP|NP-c|co-NP-c|co-NP-h': [
    {id:'NP-c', cx:-160, cy:87, rx:50, ry:34, lx:-160, ly:87, la:'middle'},
    {'import-scenario': 'P|NP|co-NP|co-NP-c|co-NP-h'},
  ],
  'P|NP|co-NP|NP-c|co-NP-c|PSPACE': [
    {id:'PSPACE', cx:0, cy:-18, rx:358, ry:260, lx:0, ly:-256, la:'middle'},
    {'import-scenario': 'P|NP|co-NP|NP-c|co-NP-c'},
  ],
  'P|NP|co-NP|NP-c|NP-h|PSPACE': [
    {id:'P', cx:0, cy:-100, rx:50, ry:38, lx:0, ly:-100, la:'middle'},
    {'import-scenario': 'NP|co-NP|NP-c|NP-h|PSPACE'},
  ],
  'P|NP|co-NP|NP-c|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:55, rx:360, ry:295, lx:0, ly:-218, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:250, rx:72, ry:52, lx:0, ly:250, la:'middle'},
    {'import-scenario': 'P|NP|co-NP|NP-c'},
  ],
  'P|NP|co-NP|co-NP-c|co-NP-h|PSPACE': [
    {id:'PSPACE', cx:0, cy:10, rx:375, ry:310, lx:0, ly:-278, la:'middle'},
    {id:'co-NP-h', type:'open-curve', p0:{x:40, y:400}, pm:{x:160, y:23}, p2:{x:280, y:400}, height:400, lx:160, ly:400},
    {id:'NP', cx:-105, cy:-45, rx:215, ry:160, rotation:35, lx:-215, ly:-120, la:'middle'},
    {id:'co-NP', cx:105, cy:-45, rx:215, ry:160, rotation:-35, lx:215, ly:-120, la:'middle'},
    {id:'co-NP-c', cx:160, cy:87, rx:50, ry:34, lx:160, ly:87, la:'middle'},
    {id:'P', cx:0, cy:-100, rx:50, ry:38, lx:0, ly:-100, la:'middle'},
  ],
  'P|NP|co-NP|co-NP-c|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:55, rx:360, ry:295, lx:0, ly:-218, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:250, rx:72, ry:52, lx:0, ly:250, la:'middle'},
    {'import-scenario': 'P|NP|co-NP|co-NP-c'},
  ],
  'P|NP|co-NP|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:430}, pm:{x:0, y:175}, p2:{x:140, y:430}, height:430, lx:0, ly:430},
    {'import-scenario': 'P|NP|co-NP|PSPACE|PSPACE-c'},
  ],
  'P|NP|NP-c|NP-h|PSPACE|PSPACE-c': [
    {id:'PSPACE-c', cx:0, cy:180, rx:72, ry:52, lx:0, ly:180, la:'middle'},
    {'import-scenario': 'P|NP|NP-c|NP-h|PSPACE'},
  ],
  'P|NP|NP-c|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE', cx:0, cy:2, rx:360, ry:305, lx:-290, ly:2, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:210, rx:72, ry:52, lx:0, ly:210, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-150, y:387}, pm:{x:0, y:128}, p2:{x:150, y:387}, height:387, lx:0, ly:387},
    {id:'NP', cx:0, cy:-85, rx:252, ry:180, lx:-212, ly:-85, la:'start'},
    {id:'NP-c', cx:0, cy:0, rx:76, ry:57, lx:0, ly:0, la:'middle'},
    {id:'P', cx:0, cy:-170, rx:76, ry:57, lx:0, ly:-170, la:'middle'},
  ],
  'P|co-NP|co-NP-c|co-NP-h|PSPACE|PSPACE-c': [
    {id:'PSPACE-c', cx:0, cy:180, rx:72, ry:52, lx:0, ly:180, la:'middle'},
    {'import-scenario': 'P|co-NP|co-NP-c|co-NP-h|PSPACE'},
  ],
  'P|co-NP|co-NP-c|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE', cx:0, cy:2, rx:360, ry:305, lx:290, ly:2, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:210, rx:72, ry:52, lx:0, ly:210, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-150, y:387}, pm:{x:0, y:128}, p2:{x:150, y:387}, height:387, lx:0, ly:387},
    {id:'co-NP', cx:0, cy:-85, rx:252, ry:180, lx:212, ly:-85, la:'end'},
    {id:'co-NP-c', cx:0, cy:0, rx:76, ry:57, lx:0, ly:0, la:'middle'},
    {id:'P', cx:0, cy:-170, rx:76, ry:57, lx:0, ly:-170, la:'middle'},
  ],
  'NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h': [
    {id:'NP-h', type:'open-curve', p0:{x:-315, y:223}, pm:{x:-160, y:23}, p2:{x:-5, y:223}, height:223, lx:-160, ly:223},
    {id:'co-NP-h', type:'open-curve', p0:{x:5, y:223}, pm:{x:160, y:23}, p2:{x:315, y:223}, height:223, lx:160, ly:223},
    {id:'NP', cx:-105, cy:-45, rx:215, ry:160, rotation:35, lx:-215, ly:-120, la:'middle'},
    {id:'co-NP', cx:105, cy:-45, rx:215, ry:160, rotation:-35, lx:215, ly:-120, la:'middle'},
    {id:'NP-c', cx:-160, cy:87, rx:50, ry:34, lx:-160, ly:87, la:'middle'},
    {id:'co-NP-c', cx:160, cy:87, rx:50, ry:34, lx:160, ly:87, la:'middle'},
  ],
  'NP|co-NP|NP-c|co-NP-c|NP-h|PSPACE': [
    {id:'PSPACE', cx:0, cy:10, rx:375, ry:310, lx:0, ly:-278, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-280, y:400}, pm:{x:-160, y:23}, p2:{x:-40, y:400}, height:400, lx:-160, ly:400},
    {id:'NP', cx:-105, cy:-45, rx:215, ry:160, rotation:35, lx:-215, ly:-120, la:'middle'},
    {id:'co-NP', cx:105, cy:-45, rx:215, ry:160, rotation:-35, lx:215, ly:-120, la:'middle'},
    {id:'NP-c', cx:-160, cy:87, rx:50, ry:34, lx:-160, ly:87, la:'middle'},
    {id:'co-NP-c', cx:160, cy:87, rx:50, ry:34, lx:160, ly:87, la:'middle'},
  ],
  'NP|co-NP|NP-c|co-NP-c|co-NP-h|PSPACE': [
    {id:'PSPACE', cx:0, cy:10, rx:375, ry:310, lx:0, ly:-278, la:'middle'},
    {id:'co-NP-h', type:'open-curve', p0:{x:40, y:400}, pm:{x:160, y:23}, p2:{x:280, y:400}, height:400, lx:160, ly:400},
    {id:'NP', cx:-105, cy:-45, rx:215, ry:160, rotation:35, lx:-215, ly:-120, la:'middle'},
    {id:'co-NP', cx:105, cy:-45, rx:215, ry:160, rotation:-35, lx:215, ly:-120, la:'middle'},
    {id:'NP-c', cx:-160, cy:87, rx:50, ry:34, lx:-160, ly:87, la:'middle'},
    {id:'co-NP-c', cx:160, cy:87, rx:50, ry:34, lx:160, ly:87, la:'middle'},
  ],
  'NP|co-NP|NP-c|co-NP-c|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:55, rx:360, ry:295, lx:0, ly:-218, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:250, rx:72, ry:52, lx:0, ly:250, la:'middle'},
    {'import-scenario': 'NP|co-NP|NP-c|co-NP-c'},
  ],
  'NP|co-NP|NP-c|NP-h|PSPACE|PSPACE-c': [
    {'import-scenario': 'NP|co-NP|NP-c|NP-h|PSPACE'},
    {id:'PSPACE-c', cx:-75, cy:240, rx:60, ry:40, lx:-75, ly:240, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-325, y:400}, pm:{x:-160, y:23}, p2:{x:5, y:400}, height:400, lx:-160, ly:400},
  ],
  'NP|co-NP|NP-c|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:430}, pm:{x:0, y:175}, p2:{x:140, y:430}, height:430, lx:0, ly:430},
    {'import-scenario': 'NP|co-NP|NP-c|PSPACE|PSPACE-c'},
  ],
  'NP|co-NP|co-NP-c|co-NP-h|PSPACE|PSPACE-c': [
    {'import-scenario': 'NP|co-NP|co-NP-c|co-NP-h|PSPACE'},
    {id:'PSPACE-c', cx:75, cy:240, rx:60, ry:40, lx:75, ly:240, la:'middle'},
    {id:'co-NP-h', type:'open-curve', p0:{x:-5, y:400}, pm:{x:160, y:23}, p2:{x:325, y:400}, height:400, lx:160, ly:400},
  ],
  'NP|co-NP|co-NP-c|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:430}, pm:{x:0, y:175}, p2:{x:140, y:430}, height:430, lx:0, ly:430},
    {'import-scenario': 'NP|co-NP|co-NP-c|PSPACE|PSPACE-c'},
  ],
  'NP|NP-c|NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {'import-scenario': 'NP|NP-c|NP-h|PSPACE|PSPACE-c'},
    {id:'PSPACE', cx:0, cy:-30, rx:345, ry:320, lx:0, ly:-328, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:210, rx:72, ry:52, lx:0, ly:210, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:370}, pm:{x:0, y:128}, p2:{x:140, y:370}, height:370, lx:0, ly:370},
    {id:'NP-h', type:'open-curve', p0:{x:-260, y:370}, pm:{x:0, y:-126}, p2:{x:260, y:370}, height:370, lx:-250, ly:370},
  ],
  'co-NP|co-NP-c|co-NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {'import-scenario': 'co-NP|co-NP-c|co-NP-h|PSPACE|PSPACE-c'},
    {id:'PSPACE', cx:0, cy:-30, rx:345, ry:320, lx:0, ly:-328, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:210, rx:72, ry:52, lx:0, ly:210, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:370}, pm:{x:0, y:128}, p2:{x:140, y:370}, height:370, lx:0, ly:370},
    {id:'co-NP-h', type:'open-curve', p0:{x:-260, y:370}, pm:{x:0, y:-126}, p2:{x:260, y:370}, height:370, lx:250, ly:370},
  ],

  /* ═══ length 7 — 7 sets ═══ */
  'P|NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h': [
    {id:'NP-h', type:'open-curve', p0:{x:-315, y:223}, pm:{x:-160, y:23}, p2:{x:-5, y:223}, height:223, lx:-160, ly:223},
    {id:'co-NP-h', type:'open-curve', p0:{x:5, y:223}, pm:{x:160, y:23}, p2:{x:315, y:223}, height:223, lx:160, ly:223},
    {id:'NP', cx:-105, cy:-45, rx:215, ry:160, rotation:35, lx:-215, ly:-120, la:'middle'},
    {id:'co-NP', cx:105, cy:-45, rx:215, ry:160, rotation:-35, lx:215, ly:-120, la:'middle'},
    {id:'NP-c', cx:-160, cy:87, rx:50, ry:34, lx:-160, ly:87, la:'middle'},
    {id:'co-NP-c', cx:160, cy:87, rx:50, ry:34, lx:160, ly:87, la:'middle'},
    {id:'P', cx:0, cy:-100, rx:50, ry:38, lx:0, ly:-100, la:'middle'},
  ],
  'P|NP|co-NP|NP-c|co-NP-c|NP-h|PSPACE': [
    {'import-scenario': 'P|NP|co-NP|NP-c|co-NP-c|NP-h'},
    {id:'PSPACE', cx:0, cy:10, rx:375, ry:310, lx:0, ly:-278, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-280, y:400}, pm:{x:-160, y:23}, p2:{x:-40, y:400}, height:400, lx:-160, ly:400},
  ],
  'P|NP|co-NP|NP-c|co-NP-c|co-NP-h|PSPACE': [
    {id:'PSPACE', cx:0, cy:10, rx:375, ry:310, lx:0, ly:-278, la:'middle'},
    {id:'co-NP-h', type:'open-curve', p0:{x:40, y:400}, pm:{x:160, y:23}, p2:{x:280, y:400}, height:400, lx:160, ly:400},
    {id:'NP', cx:-105, cy:-45, rx:215, ry:160, rotation:35, lx:-215, ly:-120, la:'middle'},
    {id:'co-NP', cx:105, cy:-45, rx:215, ry:160, rotation:-35, lx:215, ly:-120, la:'middle'},
    {id:'NP-c', cx:-160, cy:87, rx:50, ry:34, lx:-160, ly:87, la:'middle'},
    {id:'co-NP-c', cx:160, cy:87, rx:50, ry:34, lx:160, ly:87, la:'middle'},
    {id:'P', cx:0, cy:-100, rx:50, ry:38, lx:0, ly:-100, la:'middle'},
  ],
  'P|NP|co-NP|NP-c|co-NP-c|PSPACE|PSPACE-c': [
    {id:'PSPACE', cx:0, cy:55, rx:360, ry:295, lx:0, ly:-218, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:230, rx:72, ry:52, lx:0, ly:230, la:'middle'},
    {'import-scenario': 'P|NP|co-NP|NP-c|co-NP-c'},
  ],
  'P|NP|co-NP|NP-c|NP-h|PSPACE|PSPACE-c': [
    {'import-scenario': 'P|NP|co-NP|NP-c|NP-h|PSPACE'},
    {id:'PSPACE-c', cx:-75, cy:240, rx:60, ry:40, lx:-75, ly:240, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-325, y:400}, pm:{x:-160, y:23}, p2:{x:5, y:400}, height:400, lx:-160, ly:400},
  ],
  'P|NP|co-NP|NP-c|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:430}, pm:{x:0, y:175}, p2:{x:140, y:430}, height:430, lx:0, ly:430},
    {'import-scenario': 'P|NP|co-NP|NP-c|PSPACE|PSPACE-c'},
  ],
  'P|NP|co-NP|co-NP-c|co-NP-h|PSPACE|PSPACE-c': [
    {'import-scenario': 'P|NP|co-NP|co-NP-c|co-NP-h|PSPACE'},
    {id:'PSPACE-c', cx:75, cy:240, rx:60, ry:40, lx:75, ly:240, la:'middle'},
    {id:'co-NP-h', type:'open-curve', p0:{x:-5, y:400}, pm:{x:160, y:23}, p2:{x:325, y:400}, height:400, lx:160, ly:400},
  ],
  'P|NP|co-NP|co-NP-c|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:430}, pm:{x:0, y:175}, p2:{x:140, y:430}, height:430, lx:0, ly:430},
    {'import-scenario': 'P|NP|co-NP|co-NP-c|PSPACE|PSPACE-c'},
  ],
  'P|NP|NP-c|NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE', cx:0, cy:-30, rx:345, ry:320, lx:0, ly:-328, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:210, rx:72, ry:52, lx:0, ly:210, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:370}, pm:{x:0, y:128}, p2:{x:140, y:370}, height:370, lx:0, ly:370},
    {id:'NP-h', type:'open-curve', p0:{x:-260, y:370}, pm:{x:0, y:-62}, p2:{x:260, y:370}, height:370, lx:-250, ly:370},
    {id:'NP', cx:0, cy:-90, rx:250, ry:188, lx:-210, ly:-90, la:'start'},
    {id:'NP-c', cx:0, cy:25, rx:76, ry:57, lx:0, ly:25, la:'middle'},
    {id:'P', cx:0, cy:-170, rx:76, ry:57, lx:0, ly:-170, la:'middle'},
  ],
  'P|co-NP|co-NP-c|co-NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE', cx:0, cy:-30, rx:345, ry:320, lx:0, ly:-328, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:210, rx:72, ry:52, lx:0, ly:210, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:370}, pm:{x:0, y:128}, p2:{x:140, y:370}, height:370, lx:0, ly:370},
    {id:'co-NP-h', type:'open-curve', p0:{x:-260, y:370}, pm:{x:0, y:-62}, p2:{x:260, y:370}, height:370, lx:250, ly:370},
    {id:'co-NP', cx:0, cy:-90, rx:250, ry:188, lx:210, ly:-90, la:'end'},
    {id:'co-NP-c', cx:0, cy:25, rx:76, ry:57, lx:0, ly:25, la:'middle'},
    {id:'P', cx:0, cy:-180, rx:76, ry:57, lx:0, ly:-180, la:'middle'},
  ],
  'NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h|PSPACE': [
    {'import-scenario': 'NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h'},
    {id:'PSPACE', cx:0, cy:10, rx:375, ry:310, lx:0, ly:-278, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-315, y:400}, pm:{x:-160, y:23}, p2:{x:-5, y:400}, height:400, lx:-160, ly:400},
    {id:'co-NP-h', type:'open-curve', p0:{x:5, y:400}, pm:{x:160, y:23}, p2:{x:315, y:400}, height:400, lx:160, ly:400},
  ],
  'NP|co-NP|NP-c|co-NP-c|NP-h|PSPACE|PSPACE-c': [
    {'import-scenario': 'NP|co-NP|NP-c|co-NP-c|NP-h|PSPACE'},
    {id:'PSPACE-c', cx:-75, cy:240, rx:60, ry:40, lx:-75, ly:240, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-325, y:400}, pm:{x:-160, y:23}, p2:{x:5, y:400}, height:400, lx:-160, ly:400},
  ],
  'NP|co-NP|NP-c|co-NP-c|co-NP-h|PSPACE|PSPACE-c': [
    {'import-scenario': 'NP|co-NP|NP-c|co-NP-c|co-NP-h|PSPACE'},
    {id:'PSPACE-c', cx:75, cy:240, rx:60, ry:40, lx:75, ly:240, la:'middle'},
    {id:'co-NP-h', type:'open-curve', p0:{x:-5, y:400}, pm:{x:160, y:23}, p2:{x:325, y:400}, height:400, lx:160, ly:400},
  ],
  'NP|co-NP|NP-c|co-NP-c|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:430}, pm:{x:0, y:175}, p2:{x:140, y:430}, height:430, lx:0, ly:430},
    {'import-scenario': 'NP|co-NP|NP-c|co-NP-c|PSPACE|PSPACE-c'},
  ],
  'NP|co-NP|NP-c|NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {'import-scenario': 'NP|co-NP|NP-c|NP-h|PSPACE|PSPACE-c'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-175, y:400}, pm:{x:-75, y:170}, p2:{x:25, y:400}, height:400, lx:-75, ly:400},
    {id:'NP-h', type:'open-curve', p0:{x:-375, y:400}, pm:{x:-160, y:23}, p2:{x:55, y:400}, height:400, lx:-300, ly:400},
  ],
  'NP|co-NP|co-NP-c|co-NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {'import-scenario': 'NP|co-NP|co-NP-c|co-NP-h|PSPACE|PSPACE-c'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-25, y:400}, pm:{x:75, y:170}, p2:{x:175, y:400}, height:400, lx:75, ly:400},
    {id:'co-NP-h', type:'open-curve', p0:{x:-55, y:400}, pm:{x:160, y:23}, p2:{x:375, y:400}, height:400, lx:300, ly:400},
  ],

  /* ═══ length 8 — 8 sets ═══ */
  'P|NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h|PSPACE': [
    {'import-scenario': 'P|NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h'},
    {id:'PSPACE', cx:0, cy:10, rx:375, ry:310, lx:0, ly:-278, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-315, y:400}, pm:{x:-160, y:23}, p2:{x:-5, y:400}, height:400, lx:-160, ly:400},
    {id:'co-NP-h', type:'open-curve', p0:{x:5, y:400}, pm:{x:160, y:23}, p2:{x:315, y:400}, height:400, lx:160, ly:400},
  ],
  'P|NP|co-NP|NP-c|co-NP-c|NP-h|PSPACE|PSPACE-c': [
    {'import-scenario': 'P|NP|co-NP|NP-c|co-NP-c|NP-h|PSPACE'},
    {id:'PSPACE-c', cx:-75, cy:240, rx:60, ry:40, lx:-75, ly:240, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-325, y:400}, pm:{x:-160, y:23}, p2:{x:5, y:400}, height:400, lx:-160, ly:400},
  ],
  'P|NP|co-NP|NP-c|co-NP-c|co-NP-h|PSPACE|PSPACE-c': [
    {'import-scenario': 'P|NP|co-NP|NP-c|co-NP-c|co-NP-h|PSPACE'},
    {id:'PSPACE-c', cx:75, cy:240, rx:60, ry:40, lx:75, ly:240, la:'middle'},
    {id:'co-NP-h', type:'open-curve', p0:{x:-5, y:400}, pm:{x:160, y:23}, p2:{x:325, y:400}, height:400, lx:160, ly:400},
  ],
  'P|NP|co-NP|NP-c|co-NP-c|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE-h', type:'open-curve', p0:{x:-140, y:430}, pm:{x:0, y:175}, p2:{x:140, y:430}, height:430, lx:0, ly:430},
    {'import-scenario': 'P|NP|co-NP|NP-c|co-NP-c|PSPACE|PSPACE-c'},
  ],
  'P|NP|co-NP|NP-c|NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE', cx:0, cy:10, rx:375, ry:310, lx:0, ly:-278, la:'middle'},
    {id:'PSPACE-c', cx:-75, cy:240, rx:60, ry:40, lx:-75, ly:240, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-175, y:400}, pm:{x:-75, y:170}, p2:{x:25, y:400}, height:400, lx:-75, ly:400},
    {id:'NP-h', type:'open-curve', p0:{x:-375, y:400}, pm:{x:-160, y:23}, p2:{x:55, y:400}, height:400, lx:-300, ly:400},
    {id:'NP', cx:-105, cy:-45, rx:215, ry:160, rotation:35, lx:-215, ly:-120, la:'middle'},
    {id:'co-NP', cx:105, cy:-45, rx:215, ry:160, rotation:-35, lx:215, ly:-120, la:'middle'},
    {id:'NP-c', cx:-160, cy:87, rx:50, ry:34, lx:-160, ly:87, la:'middle'},
    {id:'P', cx:0, cy:-100, rx:50, ry:38, lx:0, ly:-100, la:'middle'},
  ],
  'P|NP|co-NP|co-NP-c|co-NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {id:'PSPACE', cx:0, cy:10, rx:375, ry:310, lx:0, ly:-278, la:'middle'},
    {id:'PSPACE-c', cx:75, cy:240, rx:60, ry:40, lx:75, ly:240, la:'middle'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-25, y:400}, pm:{x:75, y:170}, p2:{x:175, y:400}, height:400, lx:75, ly:400},
    {id:'co-NP-h', type:'open-curve', p0:{x:-55, y:400}, pm:{x:160, y:23}, p2:{x:375, y:400}, height:400, lx:300, ly:400},
    {id:'NP', cx:-105, cy:-45, rx:215, ry:160, rotation:35, lx:-215, ly:-120, la:'middle'},
    {id:'co-NP', cx:105, cy:-45, rx:215, ry:160, rotation:-35, lx:215, ly:-120, la:'middle'},
    {id:'co-NP-c', cx:160, cy:87, rx:50, ry:34, lx:160, ly:87, la:'middle'},
    {id:'P', cx:0, cy:-100, rx:50, ry:38, lx:0, ly:-100, la:'middle'},
  ],
  'NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h|PSPACE|PSPACE-c': [
    {'import-scenario': 'NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h|PSPACE'},
    {id:'PSPACE', cx:0, cy:110, rx:390, ry:440, lx:0, ly:-308, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:415, rx:72, ry:48, lx:0, ly:415, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-422, y:630}, pm:{x:-160, y:23}, p2:{x:102, y:630}, height:630, lx:-300, ly:630},
    {id:'co-NP-h', type:'open-curve', p0:{x:-102, y:630}, pm:{x:160, y:23}, p2:{x:422, y:630}, height:630, lx:300, ly:630},
  ],
  'NP|co-NP|NP-c|co-NP-c|NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {'import-scenario': 'NP|co-NP|NP-c|co-NP-c|NP-h|PSPACE|PSPACE-c'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-175, y:400}, pm:{x:-75, y:170}, p2:{x:25, y:400}, height:400, lx:-75, ly:400},
    {id:'NP-h', type:'open-curve', p0:{x:-375, y:400}, pm:{x:-160, y:23}, p2:{x:55, y:400}, height:400, lx:-300, ly:400},
  ],
  'NP|co-NP|NP-c|co-NP-c|co-NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {'import-scenario': 'NP|co-NP|NP-c|co-NP-c|co-NP-h|PSPACE|PSPACE-c'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-25, y:400}, pm:{x:75, y:170}, p2:{x:175, y:400}, height:400, lx:75, ly:400},
    {id:'co-NP-h', type:'open-curve', p0:{x:-55, y:400}, pm:{x:160, y:23}, p2:{x:375, y:400}, height:400, lx:300, ly:400},
  ],

  /* ═══ length 9 — 9 sets ═══ */
  'P|NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h|PSPACE|PSPACE-c': [
    {'import-scenario': 'P|NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h|PSPACE'},
    {id:'PSPACE', cx:0, cy:110, rx:390, ry:440, lx:0, ly:-308, la:'middle'},
    {id:'PSPACE-c', cx:0, cy:415, rx:72, ry:48, lx:0, ly:415, la:'middle'},
    {id:'NP-h', type:'open-curve', p0:{x:-422, y:630}, pm:{x:-160, y:23}, p2:{x:102, y:630}, height:630, lx:-300, ly:630},
    {id:'co-NP-h', type:'open-curve', p0:{x:-102, y:630}, pm:{x:160, y:23}, p2:{x:422, y:630}, height:630, lx:300, ly:630},
  ],
  'P|NP|co-NP|NP-c|co-NP-c|NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {'import-scenario': 'P|NP|co-NP|NP-c|co-NP-c|NP-h|PSPACE|PSPACE-c'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-175, y:400}, pm:{x:-75, y:170}, p2:{x:25, y:400}, height:400, lx:-75, ly:400},
    {id:'NP-h', type:'open-curve', p0:{x:-375, y:400}, pm:{x:-160, y:23}, p2:{x:55, y:400}, height:400, lx:-300, ly:400},
  ],
  'P|NP|co-NP|NP-c|co-NP-c|co-NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {'import-scenario': 'P|NP|co-NP|NP-c|co-NP-c|co-NP-h|PSPACE|PSPACE-c'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-25, y:400}, pm:{x:75, y:170}, p2:{x:175, y:400}, height:400, lx:75, ly:400},
    {id:'co-NP-h', type:'open-curve', p0:{x:-55, y:400}, pm:{x:160, y:23}, p2:{x:375, y:400}, height:400, lx:300, ly:400},
  ],
  'NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {'import-scenario': 'NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h|PSPACE|PSPACE-c'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-150, y:630}, pm:{x:0, y:337}, p2:{x:150, y:630}, height:630, lx:0, ly:630},
    {id:'NP-h', type:'open-curve', p0:{x:-472, y:630}, pm:{x:-160, y:23}, p2:{x:152, y:630}, height:630, lx:-380, ly:630},
    {id:'co-NP-h', type:'open-curve', p0:{x:-152, y:630}, pm:{x:160, y:23}, p2:{x:472, y:630}, height:630, lx:380, ly:630},
  ],

  /* ═══ length 10 — 10 sets ═══ */
  'P|NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h|PSPACE|PSPACE-c|PSPACE-h': [
    {'import-scenario': 'P|NP|co-NP|NP-c|co-NP-c|NP-h|co-NP-h|PSPACE|PSPACE-c'},
    {id:'PSPACE-h', type:'open-curve', p0:{x:-150, y:630}, pm:{x:0, y:337}, p2:{x:150, y:630}, height:630, lx:0, ly:630},
    {id:'NP-h', type:'open-curve', p0:{x:-472, y:630}, pm:{x:-160, y:23}, p2:{x:152, y:630}, height:630, lx:-380, ly:630},
    {id:'co-NP-h', type:'open-curve', p0:{x:-152, y:630}, pm:{x:160, y:23}, p2:{x:472, y:630}, height:630, lx:380, ly:630},
  ],

};
