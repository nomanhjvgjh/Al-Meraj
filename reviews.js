/* ============================================================
   Google reviews widget
   ------------------------------------------------------------
   A self-hosted equivalent of the Trustindex / Elfsight widgets:
   no third-party script, no account, no external request.

   THE DATA BELOW IS REAL but INCOMPLETE. Google's public surfaces
   (the Search knowledge panel) expose only the review text and its
   star rating — not the reviewer's name, avatar or date. Those are
   only available to the business owner.

   So `name` and `date` are empty here, and the widget falls back to
   a Google mark + "Google review". To show real names:

     1. Open your Google Business Profile → Reviews.
     2. Copy the reviewer name and date into the objects below.
     3. The widget renders an initial-letter avatar automatically.

   Set `visible: false` on any review to hide it from the carousel.
   ============================================================ */

const GOOGLE_REVIEWS = [
  {
    name: "",              // e.g. "Aisha Khan"
    date: "",              // e.g. "2025-11-04"
    stars: 5,
    text: "The food was tasty and staff behaviour was decent.",
    visible: true,
  },
  {
    name: "",
    date: "",
    stars: 3,
    text: "The restaurant serves flavorful biryanis with a good variety of options.",
    visible: true,
  },
  {
    // A genuine 2-star review. It is shown because this widget claims to
    // display Google reviews — hiding the criticism would make it a
    // testimonial wall, not a review widget. Flip `visible` to false if
    // you would rather it did not appear.
    name: "",
    date: "",
    stars: 2,
    text: "The service was very poor they need to hire more people to give proper service.",
    visible: true,
  },
];

/* Overall figures, straight from the Google listing. */
const GOOGLE_SUMMARY = { rating: 4.1, count: 277 };

/* ------------------------------------------------------------ */

const grTrack = document.getElementById("grTrack");
const grPrev = document.getElementById("grPrev");
const grNext = document.getElementById("grNext");

/* Wrapped in a function so the early-return paths below are legal. */
(function reviewsWidget() {
  if (!grTrack || !grPrev || !grNext) return;

  const escHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  /* --- stars: n filled, rest dimmed --- */
  function starsHTML(n) {
    let out = "";
    for (let i = 1; i <= 5; i++) {
      out += `<span class="gr__star${i <= n ? "" : " is-off"}">&#9733;</span>`;
    }
    return out;
  }

  /* Fill the header from GOOGLE_SUMMARY, so the rating lives in exactly one
     place. Target the header star row by id — a `.gr__stars` selector would
     also match the star rows inside the cards and blank them out. */
  const headStars = document.getElementById("grHeadStars");
  const headRating = document.getElementById("grRating");
  const headCount = document.getElementById("grCount");

  if (headStars) {
    headStars.innerHTML = starsHTML(Math.round(GOOGLE_SUMMARY.rating));
    headStars.setAttribute("aria-label", `Rated ${GOOGLE_SUMMARY.rating} out of 5`);
  }
  if (headRating) headRating.textContent = GOOGLE_SUMMARY.rating.toFixed(1);
  if (headCount) headCount.textContent = GOOGLE_SUMMARY.count;

  /* --- one avatar colour per initial, stable across reloads --- */
  const AVATAR_COLORS = ["#1E7B45", "#2A5DB0", "#B0442A", "#6B3FA0", "#0F7C8A"];
  const colorFor = (str) => {
    let h = 0;
    for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return escHtml(iso); // allow free text
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const GOOGLE_MARK = `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z"/>
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z"/>
      <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C2.9 17.3 2 20.5 2 24s.9 6.7 2.5 9.9l7.3-5.7z"/>
      <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/>
    </svg>`;

  function cardHTML(r) {
    const named = r.name.trim().length > 0;

    const avatar = named
      ? `<span class="gr__avatar" style="background:${colorFor(r.name)}">${escHtml(r.name.trim()[0].toUpperCase())}</span>`
      : `<span class="gr__avatar gr__avatar--google">${GOOGLE_MARK}</span>`;

    const who = named ? escHtml(r.name) : "Google review";
    const when = r.date ? formatDate(r.date) : "Verified review";

    return `
      <article class="gr__card">
        <header class="gr__card-head">
          ${avatar}
          <div>
            <strong>${who}</strong>
            <span class="gr__date">${when}</span>
          </div>
        </header>

        <div class="gr__stars" aria-label="Rated ${r.stars} out of 5">
          ${starsHTML(r.stars)}
          <span class="gr__verified" title="Verified review" aria-hidden="true">&#10003;</span>
        </div>

        <p class="gr__text">${escHtml(r.text)}</p>
        <button class="gr__more" type="button" hidden>Read more</button>
      </article>`;
  }

  const reviews = GOOGLE_REVIEWS.filter((r) => r.visible !== false);
  const REAL = reviews.length;                 // count of distinct reviews
  grTrack.innerHTML = reviews.map(cardHTML).join("");

  /* Every review hidden (or the array emptied): there is nothing to lay out,
     and the code below indexes cards[0]. Retire the carousel and stop. */
  if (REAL === 0) {
    document.querySelector(".gr__carousel")?.setAttribute("hidden", "");
    return;
  }

  /* ----------------------------------------------------------
     Seamless infinite loop.

     With only a handful of reviews the viewport can already hold
     them all, so a clamped carousel would have nothing to page and
     the arrows would sit dead. Instead we clone the whole set a few
     times: the track always overflows, the arrows always do
     something, and when the index walks off the end of the originals
     we snap back by one set-width with the transition off — invisible
     because card N is identical to card 0.
     ---------------------------------------------------------- */
  const CAN_LOOP = REAL >= 2;
  if (CAN_LOOP) {
    // Two extra copies (3x total) guarantee a filled viewport for any
    // per-view count up to 2x the review set — more than enough here.
    const originals = [...grTrack.children];
    for (let copy = 0; copy < 2; copy++) {
      originals.forEach((card) => grTrack.appendChild(card.cloneNode(true)));
    }
  } else {
    // one review: nothing to scroll, so retire the arrows entirely
    grPrev.hidden = true;
    grNext.hidden = true;
  }

  const cards = [...grTrack.children];

  /* --- "Read more" only where the text is actually clamped ---
     Run across every card, clones included, since clones were made
     before any listeners were attached. --- */
  cards.forEach((card) => {
    const text = card.querySelector(".gr__text");
    const btn = card.querySelector(".gr__more");
    // a clamped element's scrollHeight exceeds its clientHeight
    if (text.scrollHeight - text.clientHeight > 2) {
      btn.hidden = false;
      btn.addEventListener("click", () => {
        const open = card.classList.toggle("is-open");
        btn.textContent = open ? "Show less" : "Read more";
        measure();
      });
    }
  });

  const GLIDE = 600;  // must match the transition on .gr__track in CSS

  let index = 0;      // measured in cards, over the (cloned) track
  let step = 0;       // one card + gap, in px
  let wrapTimer = 0;
  let animating = false;

  function measure() {
    const gap = parseFloat(getComputedStyle(grTrack).gap) || 0;
    step = cards[0].getBoundingClientRect().width + gap;
    place(false);
  }

  // `animate=false` jumps with the transition suppressed (used for the
  // invisible wrap); `true` glides.
  function place(animate) {
    grTrack.style.transition = animate ? "" : "none";
    grTrack.style.transform = `translate3d(${-index * step}px, 0, 0)`;
    if (!animate) {
      void grTrack.offsetWidth; // flush the jump before re-enabling glide
      grTrack.style.transition = "";
    }
  }

  /* End-of-glide work runs on a timer, not a `transitionend` listener.
     transitionend can silently never fire (element hidden, transition
     interrupted, tab backgrounded mid-glide) and it is the only thing that
     clears `animating` — one missed event would leave the arrows dead. */
  function go(dir) {
    if (!CAN_LOOP || animating) return;
    animating = true;
    index += dir;
    place(true);

    clearTimeout(wrapTimer);
    wrapTimer = setTimeout(() => {
      // stepped onto a clone set? rebase into the originals (0 … REAL-1)
      // with no visible movement.
      if (index >= REAL) { index -= REAL; place(false); }
      else if (index < 0) { index += REAL; place(false); }
      animating = false;
    }, GLIDE + 60);
  }

  grPrev.addEventListener("click", () => go(-1));
  grNext.addEventListener("click", () => go(1));

  window.addEventListener("resize", () => {
    index = ((index % REAL) + REAL) % REAL; // keep it in the originals
    measure();
  });
  if (document.fonts?.ready) document.fonts.ready.then(measure);
  measure();

  /* --- autoplay (loops forever now, so no maxIndex guard) --- */
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timer = 0;

  function play() {
    clearInterval(timer);
    if (REDUCED || !CAN_LOOP) return;
    timer = setInterval(() => go(1), 5000);
  }
  const stop = () => clearInterval(timer);

  grTrack.addEventListener("pointerenter", stop);
  grTrack.addEventListener("pointerleave", play);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : play()));
  play();
})();
