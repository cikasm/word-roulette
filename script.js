(() => {
  const SEGMENTS = 12;
  const SEG = (Math.PI * 2) / SEGMENTS;
  const HISTORY_KEY = "word-roulette-history";
  const HISTORY_MAX = 12;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.getElementById("wheel");
  const ctx = canvas.getContext("2d");
  const spinBtn = document.getElementById("spin");
  const againBtn = document.getElementById("again");
  const copyBtn = document.getElementById("copy");
  const clearBtn = document.getElementById("clear");
  const card = document.getElementById("entry-card");
  const empty = document.getElementById("entry-empty");
  const historyList = document.getElementById("history-list");

  let rotation = 0;
  let spinning = false;
  let current = null;
  let wheelWords = pickWords(SEGMENTS);

  function pickWords(n, mustInclude) {
    const pool = VERBS.filter((v) => v !== mustInclude);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const out = pool.slice(0, n);
    if (mustInclude) out[Math.floor(Math.random() * n)] = mustInclude;
    return out;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function draw() {
    const size = canvas.width;
    const c = size / 2;
    const r = c - 6;
    const colors = ["--seg-rose", "--seg-sage", "--seg-lavender", "--seg-gold"].map(cssVar);
    const text = cssVar("--seg-text");
    const surface = cssVar("--surface");
    const gold = cssVar("--gold");

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(rotation - Math.PI / 2);

    for (let i = 0; i < SEGMENTS; i++) {
      const a0 = i * SEG;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a0, a0 + SEG);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = surface;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.rotate(a0 + SEG / 2);
      ctx.fillStyle = text;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const word = wheelWords[i].word;
      const fontSize = word.length > 9 ? 22 : word.length > 7 ? 26 : 30;
      ctx.font = `500 ${fontSize}px Fraunces, Georgia, serif`;
      ctx.fillText(word, r - 28, 0);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = gold;
    ctx.stroke();
    ctx.restore();
  }

  function indexAtPointer(rot) {
    const norm = ((-rot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(norm / SEG) % SEGMENTS;
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;
    againBtn.disabled = true;

    const nextWords = pickWords(SEGMENTS);
    const target = Math.floor(Math.random() * SEGMENTS);
    const jitter = (Math.random() - 0.5) * SEG * 0.7;
    const turns = reduceMotion ? 1 : 6 + Math.floor(Math.random() * 3);
    const duration = reduceMotion ? 900 : 4800 + Math.random() * 900;

    // Final rotation lands the center of `target` (plus jitter) under the pointer.
    const desired = -(target + 0.5) * SEG + jitter;
    const tau = Math.PI * 2;
    let end = rotation + turns * tau;
    end += ((desired - end) % tau + tau) % tau;

    const start = rotation;
    const t0 = performance.now();
    let swapped = false;

    function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      rotation = start + (end - start) * easeOutQuart(t);
      // Swap in fresh words once the wheel is a blur.
      if (!swapped && t > 0.08) {
        wheelWords = nextWords;
        swapped = true;
      }
      draw();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        rotation = end % tau;
        spinning = false;
        spinBtn.disabled = false;
        againBtn.disabled = false;
        const verb = wheelWords[indexAtPointer(rotation)];
        show(verb, true);
      }
    }
    requestAnimationFrame(frame);
  }

  function show(verb, record) {
    current = verb;
    document.getElementById("word").textContent = verb.word;
    document.getElementById("forms").textContent = verb.forms;
    document.getElementById("definition").textContent = verb.def;
    document.getElementById("cue").textContent = verb.cue;
    empty.hidden = true;
    card.hidden = false;
    // Restart the entrance animation.
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = "";
    history.replaceState(null, "", "#" + encodeURIComponent(verb.word));
    document.title = `${capitalize(verb.word)} · Word Roulette`;
    if (record) addToHistory(verb.word);
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function loadHistory() {
    try {
      const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function saveHistory(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch {
      /* storage unavailable; history just won't persist */
    }
  }

  let historyWords = loadHistory();

  function addToHistory(word) {
    historyWords = [word, ...historyWords].slice(0, HISTORY_MAX);
    saveHistory(historyWords);
    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = "";
    if (!historyWords.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "Nothing yet. The words you receive will rest here.";
      historyList.appendChild(li);
      return;
    }
    historyWords.forEach((w) => {
      const verb = VERBS.find((v) => v.word === w);
      if (!verb) return;
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = verb.word;
      btn.addEventListener("click", () => show(verb, false));
      li.appendChild(btn);
      historyList.appendChild(li);
    });
  }

  spinBtn.addEventListener("click", spin);
  againBtn.addEventListener("click", spin);

  copyBtn.addEventListener("click", async () => {
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      copyBtn.textContent = "Link copied";
    } catch {
      copyBtn.textContent = "Copy failed";
    }
    setTimeout(() => (copyBtn.textContent = "Share this word"), 1600);
  });

  clearBtn.addEventListener("click", () => {
    historyWords = [];
    saveHistory(historyWords);
    renderHistory();
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !["BUTTON", "INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      e.preventDefault();
      spin();
    }
  });

  // Light/dark toggle; remembers the choice, otherwise follows the system.
  const root = document.documentElement;
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  let themeChosen = Boolean(root.dataset.theme);
  if (!themeChosen) root.dataset.theme = darkQuery.matches ? "dark" : "light";
  darkQuery.addEventListener("change", (e) => {
    if (!themeChosen) root.dataset.theme = e.matches ? "dark" : "light";
    draw();
  });
  document.getElementById("theme").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    themeChosen = true;
    try {
      localStorage.setItem("word-roulette-theme", root.dataset.theme);
    } catch {
      /* storage unavailable; choice lasts for this visit */
    }
    draw();
  });

  // A shared link (#word) opens straight to that entry.
  const shared = decodeURIComponent(location.hash.slice(1));
  const sharedVerb = VERBS.find((v) => v.word === shared);
  if (sharedVerb) {
    wheelWords = pickWords(SEGMENTS, sharedVerb);
    rotation = -(wheelWords.indexOf(sharedVerb) + 0.5) * SEG;
    show(sharedVerb, false);
  }

  renderHistory();
  draw();
  // Redraw once the web font is ready so wheel labels use it.
  if (document.fonts) document.fonts.ready.then(draw);
})();
