# Transitional Legacy Chunks

This folder was the first extraction step away from the single-file HTML app.

It is now reference material only.

Primary editable source files live at:

- `src/data.js`
- `src/sim.js`
- `src/render.js`
- `src/ui.js`

`src/legacy-app.js` is generated from those top-level source files.

This folder can be removed after the next refactor pass once the new module split is stable enough that we no longer need the intermediate chunk history.
