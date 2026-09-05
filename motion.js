/* ============================================================
   Al Meraj Biryani — motion engine
   ------------------------------------------------------------
   Everything here is progressive enhancement. If this file fails
   to load, or the visitor prefers reduced motion, the page still
   renders and scrolls normally — `styles.css` keeps every element
   visible by default and `.reveal` only hides things once the
   `js-motion` class lands on <html>.

   One rAF loop drives smooth scroll, parallax and the marquee.
   Nothing else subscribes to `scroll`.
   ============================================================ */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE_POINTER = window.matchMedia("(pointer: fine)").matches;
const root = document.documentElement;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/* ============================================================
   1. Smooth scroll (Lenis-style inertial wheel)
   ------------------------------------------------------------
   We never transform a wrapper — that would break `position:
   sticky` on the nav. Instead we intercept wheel deltas, keep our
   own `target`, and ease the real scrollTop toward it each frame.
   Touch, keyboard and scrollbar dragging fall through to native
   scrolling; we just resync so the two never fight.
   ============================================================ */
const smooth = {
  enabled: !REDUCED && FINE_POINTER,
  target: window.scrollY,
  current: window.scrollY,
  ease: 0.095,
  velocity: 0,
  wheeling: false,
  idleTimer: 0,
};

/* ============================================================
   CACHED GEOMETRY — the single most important thing in this file.

   The frame loop below WRITES styles (scroll position, transforms, classes).
   If it also READS layout — scrollHeight, getBoundingClientRect — the browser
   is forced to recompute layout synchronously, every frame, mid-write. That
   is "layout thrashing" and it is what makes a scroll feel like 20fps no
   matter how fast the machine is.

   So: measure here, on load / resize / content change. The loop then only
   ever writes. Never put a layout read inside frame().
   ============================================================ */
let viewportH = window.innerHeight;
let docMax = 0;

function measureDoc() {
  viewportH = window.innerHeight;
  docMax = Math.max(0, document.documentElement.scrollHeight - viewportH);
}

const maxScroll = () => docMax;

function onWheel(e) {
  if (!smooth.enabled || e.ctrlKey) return; // ctrl+wheel is browser zoom
  e.preventDefault();

  // deltaMode 1 = lines, 2 = pages. Normalise to pixels.
  const factor = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
  smooth.target = clamp(smooth.target + e.deltaY * factor, 0, maxScroll());

  smooth.wheeling = true;
  clearTimeout(smooth.idleTimer);
  smooth.idleTimer = setTimeout(() => (smooth.wheeling = false), 140);
}

window.addEventListener("wheel", onWheel, { passive: false });

// Native scroll from any other source (keyboard, scrollbar, touch,
// find-in-page). Adopt its position rather than yanking it back.
window.addEventListener(
  "scroll",
  () => {
    if (!smooth.enabled || smooth.wheeling) return;
    if (Math.abs(window.scrollY - smooth.current) > 2) {
      smooth.current = smooth.target = window.scrollY;
    }
  },
  { passive: true }
);

/* Anchor links ride the same easing. */
function scrollToY(y) {
  const dest = clamp(y, 0, maxScroll());
  if (smooth.enabled) {
    smooth.target = dest;
  } else {
    window.scrollTo({ top: dest, behavior: REDUCED ? "auto" : "smooth" });
  }
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id === "#" || id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    const navH = document.getElementById("nav")?.offsetHeight ?? 0;
    scrollToY(window.scrollY + el.getBoundingClientRect().top - navH - 12);
  });
});

/* ============================================================
   2. Scroll-linked effects
   ============================================================ */

/* --- Parallax: elements carrying data-speed drift as they pass ---
   Positions are cached in document space, so the loop needs no layout read. */
const parallaxItems = [...document.querySelectorAll("[data-speed]")].map((el) => ({
  el,
  speed: parseFloat(el.dataset.speed),
  offset: 0,
  top: 0,     // document-space top
  h: 0,
}));

function measureParallax() {
  for (const item of parallaxItems) {
    // Strip our own transform first, or we'd measure the offset we applied
    // last frame and the element would slowly walk off the page.
    const prev = item.el.style.transform;
    item.el.style.transform = "";
    const r = item.el.getBoundingClientRect();
    item.top = r.top + window.scrollY;
    item.h = r.height;
    item.el.style.transform = prev;
  }
}

function updateParallax(y) {
  for (const item of parallaxItems) {
    const top = item.top - y;                       // no getBoundingClientRect
    if (top + item.h < -200 || top > viewportH + 200) continue;

    // -1 (below the fold) → 1 (above it)
    const progress =
      (top + item.h / 2 - viewportH / 2) / (viewportH / 2 + item.h / 2);
    const next = lerp(item.offset, progress * item.speed * -60, 0.12);

    if (Math.abs(next - item.offset) < 0.01) continue;   // nothing to repaint
    item.offset = next;
    item.el.style.transform = `translate3d(0, ${next.toFixed(2)}px, 0)`;
  }
}

/* --- Scroll progress bar ---
   Driven by the user's own scroll position, so it runs under reduced
   motion too. Scales an already-full bar rather than animating `width`,
   which would relayout every frame. --- */
const scrollbarFill = document.querySelector("#scrollbar span");

let lastProgress = -1;

function updateScrollbar(y) {
  if (!scrollbarFill) return;
  const p = docMax > 0 ? clamp(y / docMax, 0, 1) : 0;
  if (Math.abs(p - lastProgress) < 0.0005) return;   // skip identical writes
  lastProgress = p;
  scrollbarFill.style.transform = `scaleX(${p.toFixed(4)})`;
}

/* --- Nav: shadow on scroll, hide when diving down the page --- */
const nav = document.getElementById("nav");
const navLinksEl = document.getElementById("navLinks");
let lastNavY = 0;

let wasStuck = null;
let wasHidden = null;

function updateNav(y) {
  // Only touch classList when the state actually flips — a classList write
  // every frame invalidates style on the nav (and its backdrop-filter) 60x
  // a second for nothing.
  const stuck = y > 8;
  if (stuck !== wasStuck) {
    nav.classList.toggle("is-stuck", stuck);
    wasStuck = stuck;
  }

  // Retract only once we're well past the hero, and never while the
  // mobile drawer is hanging off the nav.
  const goingDown = y > lastNavY && y > 380;
  const hidden = goingDown && !navLinksEl.classList.contains("is-open");
  if (hidden !== wasHidden) {
    nav.classList.toggle("is-hidden", hidden);
    wasHidden = hidden;
  }

  lastNavY = y;
}

/* --- Marquees: base drift, but scroll velocity shoves them along ---
   Each [data-marquee] track has its content duplicated exactly once in
   the HTML, so we wrap at half the scroll width. --- */
const marquees = [...document.querySelectorAll("[data-marquee]")].map((el) => ({
  el,
  speed: parseFloat(el.dataset.marqueeSpeed) || 0.04,
  x: 0,
  half: 0,
}));

const measureMarquees = () => {
  for (const m of marquees) m.half = m.el.scrollWidth / 2;
};

/* One place that re-measures everything the loop depends on. The page height
   changes as images load, when the menu tab swaps, and when the loader is
   removed — a stale docMax would leave the progress bar and the wheel clamp
   wrong. */
function remeasure() {
  measureDoc();
  measureParallax();
  measureMarquees();
  smooth.target = clamp(smooth.target, 0, docMax);
}

window.addEventListener("resize", remeasure);
window.addEventListener("load", remeasure);

// Menu tab swaps and late-loading images change the document height.
if ("ResizeObserver" in window) {
  let raf = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(raf);           // coalesce bursts into one measure
    raf = requestAnimationFrame(remeasure);
  }).observe(document.body);
}

remeasure();

function updateMarquees(dt) {
  // Under reduced motion the strip still loops, but at its calm base speed —
  // no lurching when the visitor scrolls.
  const boost = REDUCED ? 0 : clamp(smooth.velocity * 0.35, -70, 70);

  for (const m of marquees) {
    if (!m.half) continue;
    m.x -= (m.speed + Math.abs(boost) * 0.0012) * dt + boost * 0.012;

    // wrap both ways so a hard scroll-up never tears the strip
    if (m.x <= -m.half) m.x += m.half;
    if (m.x > 0) m.x -= m.half;

    m.el.style.transform = `translate3d(${m.x.toFixed(2)}px, 0, 0)`;
  }
}

/* ============================================================
   3. The single rAF loop
   ============================================================ */
let lastTime = performance.now();

function frame(now) {
  const dt = clamp(now - lastTime, 0, 50); // cap after a background tab
  lastTime = now;

  if (smooth.enabled) {
    const prev = smooth.current;
    smooth.current = lerp(smooth.current, smooth.target, smooth.ease);
    smooth.velocity = smooth.current - prev;

    if (Math.abs(smooth.target - smooth.current) < 0.08) {
      smooth.current = smooth.target;
      smooth.velocity = 0;
    } else {
      window.scrollTo(0, smooth.current);
    }
  } else {
    smooth.velocity = window.scrollY - smooth.current;
    smooth.current = window.scrollY;
  }

  /* WRITE-ONLY from here down. No getBoundingClientRect, no scrollHeight —
     see the geometry cache at the top of this file. */
  updateNav(smooth.current);
  updateScrollbar(smooth.current);          // user-driven; runs under reduced motion
  updateMarquees(dt);                       // the dish ticker loops for everyone
  if (!REDUCED) updateParallax(smooth.current);   // parallax is pure travel

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ============================================================
   4. Split the headline into masked, staggered words
   ============================================================ */
function splitWords(el) {
  const frag = document.createDocumentFragment();
  let index = 0;

  el.childNodes.forEach((node) => {
    if (node.nodeName === "BR") {
      frag.appendChild(node.cloneNode());
      return;
    }

    // A styled span (e.g. .accent) keeps its class; each word inside
    // still gets its own mask so the stagger reads across the whole line.
    const isElement = node.nodeType === Node.ELEMENT_NODE;
    const text = node.textContent;
    const className = isElement ? node.className : "";

    text.split(/(\s+)/).forEach((chunk) => {
      if (!chunk.trim()) {
        if (chunk) frag.appendChild(document.createTextNode(" "));
        return;
      }
      const mask = document.createElement("span");
      mask.className = "mask";

      const word = document.createElement("span");
      word.className = `mask__word ${className}`.trim();
      word.textContent = chunk;
      word.style.transitionDelay = `${index * 55}ms`;
      index++;

      mask.appendChild(word);
      frag.appendChild(mask);
    });
  });

  el.replaceChildren(frag);
  el.classList.add("is-split");
}

document.querySelectorAll("[data-split]").forEach(splitWords);

/* ============================================================
   5. Reveal on enter — stagger children, wipe images, count numbers
   ============================================================ */
function countUp(el) {
  const to = parseFloat(el.dataset.count);
  const decimals = (el.dataset.count.split(".")[1] || "").length;
  const prefix = el.dataset.prefix || "";
  const suffix = el.dataset.suffix || "";
  const duration = 1400;
  const start = performance.now();

  const tick = (now) => {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    el.textContent = prefix + (to * eased).toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* No IntersectionObserver (an old browser)? Then nothing would ever clear the
   `opacity: 0` on `.reveal` and the page would render blank. Drop the classes
   and show everything unanimated instead. */
if (!("IntersectionObserver" in window)) {
  root.classList.remove("js-on", "js-motion");
  document.querySelectorAll("[data-count]").forEach((n) => {
    n.textContent = (n.dataset.prefix || "") + n.dataset.count + (n.dataset.suffix || "");
  });
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        el.classList.add("is-in");

        el.querySelectorAll("[data-count]").forEach((n) => {
          if (n.dataset.counted) return;
          n.dataset.counted = "1";
          REDUCED
            ? (n.textContent =
                (n.dataset.prefix || "") + n.dataset.count + (n.dataset.suffix || ""))
            : countUp(n);
        });

        io.unobserve(el);
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -70px" }
  );

  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

/* ============================================================
   6. Hero dish carousel — auto-advancing crossfade
   ------------------------------------------------------------
   Pauses on hover and whenever the tab is backgrounded, so it never
   burns frames off-screen. Under reduced motion it shows slide one
   and never moves.
   ============================================================ */
(function heroCarousel() {
  const track = document.getElementById("heroTrack");
  const dotsBox = document.getElementById("heroDots");
  if (!track || !dotsBox) return;

  const REAL = track.children.length;   // distinct dishes
  if (REAL < 2) return;

  /* Clone slide 1 onto the end. When the track scrolls onto that clone we
     snap back to slide 1 with the transition off — invisible, because the
     two are identical. That keeps the leftward scroll continuous instead of
     rewinding across every slide. */
  track.appendChild(track.firstElementChild.cloneNode(true));

  const DELAY = 3200;
  const GLIDE = 900;      // must match the transition on .hero__track in CSS

  let index = 0;
  let timer = 0;
  let wrapTimer = 0;
  let animating = false;

  /* Plain buttons in a labelled group — `role="tab"` would be a lie, since
     these control no tab panel, and screen readers would announce a tab
     interface that isn't there. */
  const slideNames = [...track.children].map(
    (s) => s.querySelector("img")?.alt || "dish"
  );

  const dots = Array.from({ length: REAL }, (_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "hero__dot" + (i === 0 ? " is-active" : "");
    dot.setAttribute("aria-label", `Show ${slideNames[i]}`);
    if (i === 0) dot.setAttribute("aria-current", "true");
    dot.addEventListener("click", () => {
      if (animating) return;
      slideTo(i, true);
      restart();
    });
    dotsBox.appendChild(dot);
    return dot;
  });

  function paint() {
    const active = index % REAL;
    dots.forEach((d, i) => {
      const on = i === active;
      d.classList.toggle("is-active", on);
      if (on) d.setAttribute("aria-current", "true");
      else d.removeAttribute("aria-current");
    });
  }

  /* animate=false suppresses the transition — that's the invisible wrap.

     The end-of-glide work runs on a timer rather than a `transitionend`
     listener. transitionend can silently never fire (the element gets
     hidden, the transition is interrupted, the tab backgrounds mid-glide),
     and since it is the only thing that clears `animating`, a single missed
     event would deadlock the slider permanently. A timer always fires. */
  function slideTo(next, animate) {
    index = next;
    track.style.transition = animate ? "" : "none";
    track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
    if (!animate) {
      void track.offsetWidth;  // flush the jump before re-enabling the glide
      track.style.transition = "";
    }
    paint();

    clearTimeout(wrapTimer);
    animating = animate;
    if (!animate) return;

    wrapTimer = setTimeout(() => {
      animating = false;
      // landed on the clone? rebase to the real first slide, no movement seen
      if (index >= REAL) slideTo(0, false);
    }, GLIDE + 60);
  }

  const advance = () => { if (!animating) slideTo(index + 1, true); };

  /* The carousel keeps cycling even under reduced motion — otherwise those
     visitors only ever see one dish. What they don't get is the *glide*: the
     global reduced-motion rule in styles.css collapses the transition to
     ~0ms, so slides cut instantly instead of sliding. Content still rotates,
     no motion is animated. Hovering the plate still pauses it. */
  function restart() {
    clearInterval(timer);
    timer = setInterval(advance, REDUCED ? 5000 : DELAY);
  }
  const stop = () => clearInterval(timer);

  track.addEventListener("pointerenter", stop);
  track.addEventListener("pointerleave", restart);

  // don't animate a tab nobody is looking at
  document.addEventListener("visibilitychange", () =>
    document.hidden ? stop() : restart()
  );

  restart();
})();

/* ============================================================
   7. Pointer-reactive polish (desktop only)
   ============================================================ */
if (FINE_POINTER && !REDUCED) {
  /* --- Magnetic buttons: the button leans toward the cursor --- */
  document.querySelectorAll(".magnetic").forEach((btn) => {
    const strength = 0.32;

    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength;
      const y = (e.clientY - (r.top + r.height / 2)) * strength;
      btn.style.setProperty("--mx", `${x.toFixed(1)}px`);
      btn.style.setProperty("--my", `${y.toFixed(1)}px`);
    });

    const reset = () => {
      btn.style.setProperty("--mx", "0px");
      btn.style.setProperty("--my", "0px");
    };
    btn.addEventListener("pointerleave", reset);
    btn.addEventListener("blur", reset);
  });

  /* --- Spotlight follows the cursor across cards --- */
  document.querySelectorAll(".card, .dish, .gr__card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--px", `${e.clientX - r.left}px`);
      card.style.setProperty("--py", `${e.clientY - r.top}px`);
    });
  });
}

/* ============================================================
   8. Exports for script.js (tabs need the spotlight wiring)
   ============================================================ */
window.__motion = {
  REDUCED,
  FINE_POINTER,
  scrollToY,
  bindSpotlight(nodes) {
    if (!FINE_POINTER || REDUCED) return;
    nodes.forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--px", `${e.clientX - r.left}px`);
        card.style.setProperty("--py", `${e.clientY - r.top}px`);
      });
    });
  },
};

/* `js-motion` is set by an inline script in <head> — before first
   paint, so `.reveal` elements never flash visible. This one only
   tells CSS to stop fighting us over `scroll-behavior`. */
if (smooth.enabled) root.classList.add("has-smooth-scroll");
