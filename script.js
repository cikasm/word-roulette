(() => {
  const HISTORY_KEY = "word-roulette-history";
  const HISTORY_MAX = 12;
  const TAU = Math.PI * 2;
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

  // Every verb sits on the wheel, in a shuffled order.
  const wheelWords = shuffle([...VERBS]);
  const SEGMENTS = wheelWords.length;
  const SEG = TAU / SEGMENTS;

  let rotation = 0;
  let spinning = false;
  let landed = null; // index of the word the wheel stopped on

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // Match the canvas to its on-screen size so the small labels stay crisp.
  function resize() {
    const px = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1));
    if (px && canvas.width !== px) {
      canvas.width = canvas.height = px;
      draw();
    }
  }

  function draw() {
    const size = canvas.width;
    const c = size / 2;
    const r = c * 0.985;
    const text = cssVar("--seg-text");
    const line = cssVar("--line");
    const gold = cssVar("--gold");
    const rose = cssVar("--rose");
    const fontSize = size * 0.0175;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(rotation - Math.PI / 2);

    // One calm face; color appears only on the word the wheel stopped on.
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = cssVar("--wheel");
    ctx.fill();
    if (landed !== null) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, landed * SEG, (landed + 1) * SEG);
      ctx.closePath();
      ctx.fillStyle = cssVar("--wheel-hi");
      ctx.fill();
    }

    // Fine tick marks around the rim, like a dial.
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(1, size * 0.0015);
    for (let i = 0; i < SEGMENTS; i++) {
      const a = i * SEG;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.965, Math.sin(a) * r * 0.965);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }

    ctx.textBaseline = "middle";
    for (let i = 0; i < SEGMENTS; i++) {
      const angle = i * SEG + SEG / 2;
      // Labels on the left half of the screen are turned around so none read upside down.
      const flip = Math.cos(angle + rotation - Math.PI / 2) < 0;
      ctx.save();
      ctx.rotate(flip ? angle + Math.PI : angle);
      ctx.textAlign = flip ? "left" : "right";
      if (i === landed) {
        ctx.fillStyle = rose;
        ctx.globalAlpha = 1;
        ctx.font = `600 ${fontSize * 1.15}px Fraunces, Georgia, serif`;
      } else {
        ctx.fillStyle = text;
        ctx.globalAlpha = 0.62;
        ctx.font = `400 ${fontSize}px Fraunces, Georgia, serif`;
      }
      ctx.fillText(wheelWords[i].word, flip ? -r * 0.935 : r * 0.935, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Hairline inner ring and gold outer ring.
    ctx.lineWidth = Math.max(1, size * 0.0015);
    ctx.strokeStyle = gold;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(1.5, size * 0.003);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function indexAtPointer(rot) {
    const norm = ((-rot % TAU) + TAU) % TAU;
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
    landed = null;

    const target = Math.floor(Math.random() * SEGMENTS);
    const jitter = (Math.random() - 0.5) * SEG * 0.6;
    const turns = reduceMotion ? 1 : 5 + Math.floor(Math.random() * 3);
    const duration = reduceMotion ? 900 : 5200 + Math.random() * 900;

    // Final rotation lands the center of `target` (plus jitter) under the pointer.
    const desired = -(target + 0.5) * SEG + jitter;
    let end = rotation + turns * TAU;
    end += ((desired - end) % TAU + TAU) % TAU;

    const start = rotation;
    const t0 = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      rotation = start + (end - start) * easeOutQuart(t);
      draw();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        rotation = end % TAU;
        spinning = false;
        spinBtn.disabled = false;
        againBtn.disabled = false;
        landed = indexAtPointer(rotation);
        draw();
        show(wheelWords[landed], true);
      }
    }
    requestAnimationFrame(frame);
  }

  function show(verb, record) {
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
    document.title = `${verb.word} · pocket word`;
    if (record) {
      addToHistory(verb.word);
      const box = card.getBoundingClientRect();
      if (box.bottom > window.innerHeight) {
        card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      }
    }
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
  againBtn.addEventListener("click", () => {
    canvas.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    spin();
  });

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

  // A shared link (#word) opens straight to that entry, with the wheel turned to it.
  const shared = decodeURIComponent(location.hash.slice(1));
  const sharedVerb = VERBS.find((v) => v.word === shared);
  if (sharedVerb) {
    landed = wheelWords.indexOf(sharedVerb);
    rotation = -(landed + 0.5) * SEG;
    show(sharedVerb, false);
  }

  renderHistory();
  resize();
  draw();
  new ResizeObserver(resize).observe(canvas);
  // Redraw once the web font is ready so wheel labels use it.
  if (document.fonts) document.fonts.ready.then(draw);
})();
