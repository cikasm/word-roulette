# pocket word

A small dictionary of kind words. Turn the wheel to receive a gentle verb, its meaning, and a kind word to carry with you.

## Run locally

Open `index.html` in a browser. There's no build step.

## Add or edit verbs

Edit [`verbs.js`](verbs.js). Each entry looks like this:

```js
{ word: "rest", forms: "rested, rested", def: "To lay down what you carry…", cue: "You have done enough for now…" }
```

## Hosting

The site is served by GitHub Pages from the `main` branch root.

When you change `style.css`, `verbs.js` or `script.js`, bump the `?v=` number on their links in `index.html` so visitors' browsers load the new version right away.
