/* ============================================================
   Al Meraj Biryani — interactions
   ------------------------------------------------------------
   MENU DATA: exactly the ten items on the shop's own menu board,
   nothing more. Do not add a dish that is not on that board.

   PRICES. The board's price column is scratched out, overwritten
   and offset from the rows it belongs to, so most prices cannot be
   read off it honestly. Only these are known:

     Mutton Korma      ₹240 half / ₹480 full   (printed on the board)
     Chicken Korma     ₹160 half               (magicpin listing)
     Chicken Ishtu     ₹160 half               (magicpin listing)

   Every other item has `price: null`, which renders as
   "Call for today's rate" — true, since the biryanis are sold by
   the kilo at a rate the board itself shows being rewritten.

   Fill a real number in and the card switches to showing it. Do not
   guess: a wrong price on a menu is worse than no price.
   ============================================================ */

/* ------------------------------------------------------------
   Loading screen
   ------------------------------------------------------------
   Lifts on `window.load` (i.e. once the images are actually in), with
   a minimum on-screen time so it never flashes on a fast connection.

   The MAX timeout is the important part: if a single image hangs, `load`
   never fires, and without this the curtain would sit over the page
   forever. It always comes up.
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   REVEAL FAILSAFE — read this before touching the reveal system.

   `.js-on .reveal` starts at `opacity: 0`, and the ONLY thing that brings it
   back is the IntersectionObserver in motion.js. So if that observer never
   runs — an old browser without IntersectionObserver, motion.js failing to
   load, or anything throwing before the observer is wired — every section
   stays invisible and the whole site renders as a blank cream page.

   This checks whether anything got revealed, and if the system is dead it
   strips the classes so content is simply visible, unanimated. Losing the
   animation is a nuisance; losing the page is a disaster.
   ------------------------------------------------------------ */
setTimeout(function revealFailsafe() {
  if (document.querySelector(".reveal.is-in")) return;   // system is alive
  document.documentElement.classList.remove("js-on", "js-motion");
}, 3000);

(function loadingScreen() {
  const loader = document.getElementById("loader");
  if (!loader) return;

  const MIN_MS = 700;    // don't blink in and out
  const MAX_MS = 6000;   // hard ceiling — lift regardless
  const started = performance.now();
  let lifted = false;

  function lift() {
    if (lifted) return;
    lifted = true;

    const wait = Math.max(0, MIN_MS - (performance.now() - started));
    setTimeout(() => {
      // `is-ready` releases the scroll lock immediately; the curtain
      // fades out over it rather than after it.
      document.documentElement.classList.add("is-ready");
      loader.classList.add("is-done");
      // once the fade has run, drop the element out of the layout entirely
      setTimeout(() => document.documentElement.classList.remove("is-loading"), 800);
    }, wait);
  }

  window.addEventListener("load", lift);
  setTimeout(lift, MAX_MS);
})();

/* ------------------------------------------------------------
   Graceful image fallback — registered first, before anything else.
   Until real photos land in assets/img/, hide any image that fails
   to load so the warm gradient behind it shows through instead of a
   broken-image icon and stray alt text.
   ------------------------------------------------------------ */
const hideBrokenImage = (img) => {
  img.style.display = "none";
};

// `error` on <img> does not bubble, so listen in the capture phase.
document.addEventListener(
  "error",
  (e) => {
    if (e.target.tagName === "IMG") hideBrokenImage(e.target);
  },
  true
);

// Images that already failed before this script parsed won't re-fire
// `error`, so sweep for them once everything has settled.
window.addEventListener("load", () => {
  document.querySelectorAll("img").forEach((img) => {
    if (img.complete && img.naturalWidth === 0) hideBrokenImage(img);
  });
});

const MENU = {
  biryani: [
    {
      name: "Mutton Biryani",
      desc: "Slow-cooked mutton on the bone, layered with aged basmati and sealed on dum.",
      price: null,
      img: "mutton-biryani.jpg",
      tags: [["By the kilo", "kg"]],
    },
    {
      name: "Chicken Dum Pukht Biryani",
      desc: "The signature. Marinated chicken and rice sealed under dough, cooked until the steam does all the work.",
      price: null,
      img: "dum-pukht.jpg",
      tags: [["Bestseller", "best"], ["By the kilo", "kg"]],
    },
    {
      name: "Fish Biryani",
      desc: "Delicate and lightly spiced, so the fish is never overwhelmed by the masala.",
      price: null,
      img: "fish-biryani.jpg",
      tags: [["By the kilo", "kg"]],
    },
    {
      name: "Chicken Biryani Masale Wali",
      desc: "Deeper, darker, hotter. Fried onion and a heavy hand of freshly ground garam masala.",
      price: null,
      img: "masala-biryani.jpg",
      tags: [["Spicy", "hot"], ["By the kilo", "kg"]],
    },
    {
      name: "Matar Pulao Veg Biryani",
      desc: "Green peas and whole spices through soft basmati. The vegetarian plate.",
      price: null,
      img: "veg-biryani.jpg",
      tags: [["Veg", "veg"], ["By the kilo", "kg"]],
    },
    {
      name: "Chicken Muradabadi Biryani",
      desc: "The Muradabad style — lighter and more aromatic, the spice sitting behind the rice rather than on top of it.",
      price: null,
      img: "muradabadi.jpg",
      tags: [["By the kilo", "kg"]],
    },
  ],

  curries: [
    {
      name: "Chicken Korma",
      desc: "Slow-simmered in yoghurt and browned onion. Rich without being heavy.",
      price: 160,
      priceNote: "half",
      verified: true,
      img: "korma.jpg",
      tags: [["Bestseller", "best"]],
    },
    {
      name: "Chicken Kali Mirch",
      desc: "Black pepper, not chilli — a slow, warming heat rather than a sharp one.",
      price: null,
      img: "kali-mirch.jpg",
      tags: [],
    },
    {
      name: "Chicken Ishtu",
      desc: "The old Delhi stew. Clear, gentle, whole spices and bone stock, nothing in the way.",
      price: 160,
      priceNote: "half",
      verified: true,
      img: "stew.jpg",
      tags: [],
    },
    {
      name: "Mutton Korma",
      desc: "Mutton simmered down in a dark, spiced gravy. Best mopped up with bread.",
      price: 240,
      priceNote: "half",
      priceFull: 480,
      verified: true,
      img: "mutton-korma.jpg",
      tags: [["Chef's pick", "best"]],
    },
  ],
};

/* ------------------------------------------------------------
   Render menu
   ------------------------------------------------------------ */
const grid = document.getElementById("menuGrid");

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

function priceHTML(d) {
  // No confirmed price: say so plainly rather than invent a number.
  if (d.price == null) {
    return `<span class="dish__price dish__price--ask">Call for rate</span>`;
  }

  const half = d.priceNote ? `<small> / ${esc(d.priceNote)}</small>` : "";
  const full = d.priceFull
    ? `<small> &middot; &#8377;${d.priceFull} full</small>`
    : "";

  return `<span class="dish__price">&#8377;${d.price}${half}${full}</span>`;
}

function dishHTML(d, i) {
  const tags = d.tags
    .map(([label, kind]) => `<span class="tag tag--${kind}">${esc(label)}</span>`)
    .join("");

  return `
    <article class="dish" style="animation-delay:${i * 55}ms">
      <div class="dish__img">
        <img src="assets/img/${esc(d.img)}" alt="${esc(d.name)}"
             width="600" height="375" loading="lazy" decoding="async" />
      </div>
      <div class="dish__body">
        <div class="dish__top">
          <h3 class="dish__name">${esc(d.name)}</h3>
          <span class="dish__dots"></span>
          ${priceHTML(d)}
        </div>
        <p class="dish__desc">${esc(d.desc)}</p>
        ${tags ? `<div class="dish__tags">${tags}</div>` : ""}
      </div>
    </article>`;
}

function renderMenu(category) {
  const items = MENU[category] || [];
  grid.innerHTML = items.map(dishHTML).join("");
  window.__motion?.bindSpotlight(grid.querySelectorAll(".dish"));
}

/* ------------------------------------------------------------
   Tabs — sliding pill indicator + crossfade of the grid
   ------------------------------------------------------------ */
const tabs = [...document.querySelectorAll(".tab")];
const tabBar = document.getElementById("tabs");

const pill = document.createElement("span");
pill.className = "tab__pill";
pill.setAttribute("aria-hidden", "true");
tabBar.appendChild(pill);

function movePill(tab) {
  pill.style.width = `${tab.offsetWidth}px`;
  pill.style.transform = `translateX(${tab.offsetLeft - tabBar.clientLeft}px)`;
}

/* One pending swap at a time. Without clearing, rapid tab clicks stack
   timeouts: an earlier one strips `is-swapping` while a later render is
   still pending, so the grid flickers and can settle on the wrong category. */
let swapTimer = 0;

function selectTab(tab) {
  tabs.forEach((t) => {
    t.classList.toggle("is-active", t === tab);
    t.setAttribute("aria-selected", String(t === tab));
  });
  grid.setAttribute("aria-labelledby", tab.id);   // panel names its own tab
  movePill(tab);

  // let the outgoing cards fall away before the new set animates in
  grid.classList.add("is-swapping");
  clearTimeout(swapTimer);
  swapTimer = setTimeout(() => {
    renderMenu(tab.dataset.cat);
    grid.classList.remove("is-swapping");
  }, 180);
}

tabs.forEach((tab) => tab.addEventListener("click", () => selectTab(tab)));

renderMenu("biryani");

// Position the pill once fonts have settled, and again on resize.
const syncPill = () => {
  const active = tabs.find((t) => t.classList.contains("is-active"));
  if (active) movePill(active);
};
window.addEventListener("resize", syncPill);
tabBar.addEventListener("scroll", syncPill, { passive: true });
if (document.fonts?.ready) document.fonts.ready.then(syncPill);
requestAnimationFrame(syncPill);

/* ------------------------------------------------------------
   Mobile drawer
   ------------------------------------------------------------ */
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");

const closeDrawer = () => {
  navLinks.classList.remove("is-open");
  burger.setAttribute("aria-expanded", "false");
};

burger.addEventListener("click", () => {
  const open = navLinks.classList.toggle("is-open");
  burger.setAttribute("aria-expanded", String(open));
});

navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeDrawer));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

/* Scroll reveal, parallax, smooth scroll and the marquee all live
   in motion.js, which loads after this file. */

/* ------------------------------------------------------------
   Footer year
   ------------------------------------------------------------ */
document.getElementById("year").textContent = new Date().getFullYear();
