# Photos go here

Drop images with these exact filenames. Until you do, every slot falls back to
a warm gradient — the site will never show broken-image icons or stray alt text.

## The hero carousel

The big circular plate that straddles the wave is a carousel. It cycles through
four **square** photos every 3.6 seconds; the circle is a CSS mask, so these are
ordinary JPGs — no transparency needed:

`dum-pukht.jpg` → `hyderabadi.jpg` → `mutton-biryani.jpg` → `masala-biryani.jpg`

To change which dishes appear, edit the `.hero__slide` list in `index.html`.
Square crops, ~900×900, look best.

## Transparent PNGs (cut-outs, no background)

These sit on the crimson hero. They **must** have transparent backgrounds, or
you'll get white boxes floating on red.

| File | Used for |
|---|---|
| `scatter-chilli.png` | Scattered spice cut-out, upper left |
| `scatter-mint.png` | Scattered spice cut-out, mid left |
| `scatter-star-anise.png` | Scattered spice cut-out, lower left |
| `scatter-cardamom.png` | Scattered spice cut-out, upper right |
| `scatter-saffron.png` | Scattered spice cut-out, mid right |
| `scatter-bayleaf.png` | Scattered spice cut-out, lower right |

Tip: to cut a background out of a photo, use remove.bg or Photoshop's
"Remove Background". Keep each scatter image around 200–400px.

## Regular JPGs

| File | Used for |
|---|---|
| `kitchen.jpg` | About section portrait. Sealing the pot with dough, or rice being layered. Portrait crop. |

## Menu + ticker (square-ish crops, ~600×500)

One photo per dish on the menu board — ten in total. Each appears twice: as a
menu card, and as a circle in the scrolling dish ticker.

**Biryani:** `mutton-biryani.jpg`, `dum-pukht.jpg`, `fish-biryani.jpg`,
`masala-biryani.jpg`, `veg-biryani.jpg` (matar pulao), `muradabadi.jpg`

**Korma & curries:** `korma.jpg`, `kali-mirch.jpg`, `stew.jpg` (ishtu),
`mutton-korma.jpg`

`korma.jpg` and `mutton-korma.jpg` also fill the two circular dishes peeking in
from the hero's left and right edges.

Compress everything to under ~250 KB.
