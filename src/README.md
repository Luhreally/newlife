# Source Layout

The editable source of truth now lives in:

- `data.js`
- `sim.js`
- `render.js`
- `ui.js`

`legacy-app.js` is generated from those files for browser runtime compatibility.

Rebuild it with:

```bash
npm run build:legacy
```

Current intent:

- `data.js`: constants, shared globals, math helpers, seed/world generation, materials, tribes, archetypes
- `sim.js`: indexes, memory, agency, projects, camps, creatures, serialization, world update logic
- `render.js`: projection, terrain, structures, actors, overlays, and scene rendering
- `ui.js`: forecast controls, inspector, selection/picking, animation loop, and input binding

The `legacy/` folder is transitional reference material from the first extraction pass and should not be treated as the primary edit target.
