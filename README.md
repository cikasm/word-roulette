# Verb Roulette

A small digital dictionary with a spinning wheel. Spin it and you get a verb, its definition, and a short cue for what you might do next.

## Run locally

Open `index.html` in a browser. There's no build step.

## Add or edit verbs

Edit [`verbs.js`](verbs.js). Each entry looks like this:

```js
{ word: "begin", forms: "began, begun", def: "To start…", cue: "Pick the thing you keep postponing…" }
```

## Hosting

The site is served by GitHub Pages from the `main` branch root.
