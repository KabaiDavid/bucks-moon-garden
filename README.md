# Buck's Restaurant & Bar — "The Moon Garden"

A premium digital-experience concept for **Buck's Restaurant & Bar**, 425 W. Ormsby Ave., Old Louisville, by Aurevia.

The site treats a visit to buckslou.com like walking into the restaurant after dark: white flowers against deep green walls, candlelight, antique china, bourbon, and live piano. It's built as a fast static site with no framework and no runtime dependencies.

## View it

```bash
cd site && python3 -m http.server 8765
```

Then open http://localhost:8765.

## Structure

| Path | What it is |
| --- | --- |
| `site/` | The finished, deployable website. Deploy this folder as-is. |
| `site/assets/css/site.css` | The design system and every component |
| `site/assets/js/site.js` | All interaction: live open/closed status, scroll scenes, reservation panel, tabs, search, forms |
| `site/assets/img/` | Buck's own photography, colour-graded and exported as responsive WebP |
| `src/pages/` | Page bodies. Each one starts with a JSON front-matter comment. |
| `src/partials/` | Shared head, header and footer, plus the reservation panel |
| `src/data/menus.json` | Lunch, dinner and dessert menus, taken from buckslou.com (updated June 10, 2026) |
| `src/data/bar.json` | The bourbon list and wines by the glass and bottle, taken from buckslou.com |
| `build.py` | Rebuilds `site/*.html` from `src/`. Run `python3 build.py` after any content change. |
| `tools/grade.py` | The photo grading and export pipeline (needs Pillow and NumPy) |

To update a price or a dish, edit `src/data/menus.json` and run `python3 build.py`.

## Pages

- **Home** (`index.html`) has nine chapters:
  1. Hero
  2. The Moon Garden: a scroll-driven "moonrise" reveal
  3. The Experience: Atmosphere, Cuisine and Music, each with its own composition
  4. The Cuisine: an interactive dish showcase
  5. The Bar: the bourbon count, a moving list of labels and the Kris Creates journal
  6. Private Dining
  7. Our Story
  8. Gallery
  9. Visit, then a closing reservation call to action
- **Menus**: lunch, dinner and dessert in tabs. The page opens on whichever menu is being served next, in Louisville time. Deep links work: `menus.html#dinner`.
- **The Bar**: all 110 bourbons and bottled-in-bond pours, searchable, plus the wine list.
- **Private Dining**: occasions, the deposit policy and an inquiry form.
- **Our Story**: the founder, the four ideas behind Buck's, the Mayflower, the people, and the cocktail journal.
- **Visit**: hours, address, parking, directions from I-65, and a contact form for private parties and gift certificates.

## Design decisions

- **Palette:** Moon Garden Green `#10251B`, Deep Emerald `#192F24`, Warm Ivory `#F4EFE5`, Muted Champagne `#C5B18A`, Soft Black `#171714`. Champagne is used only for small accents, never for large areas of gold.
- **Typography:**
  - Cormorant Garamond for headlines. Its italic is the "after dark" voice, and it echoes the script of Buck's oval logo.
  - Jost for body text and letter-spaced labels.
- **Photography:** every image is Buck's own, taken from buckslou.com. Most of the originals are bright daytime phone shots, so `tools/grade.py` gives them one consistent grade: shadows lean green, highlights lean warm, with a soft vignette. Food gets a lighter grade so dishes look true to life. No image is AI-generated or stock.
- **Motion:**
  - The hero animation finishes in under three seconds and never blocks the page.
  - There is no loader and no audio.
  - With `prefers-reduced-motion` set, every effect turns off and the page shows its finished state.
- **Conversion:**
  - Every "Reserve" button opens a panel with three options: book online through the existing Toast Tables link, call, or take a party of 10 or more to private dining.
  - The panel shows the coming week's service days.
  - On phones, a sticky bar at the bottom gives Reserve, Call and Directions.
  - Live "Open now / Dinner today from 5 pm" status runs on `America/New_York` time.
- **SEO and accessibility:**
  - Schema.org `Restaurant` data, with hours.
  - Menus are real HTML, not images.
  - Skip link, focus trap in the dialog, keyboard-operable tabs, and alt text on every photo.

## Content integrity

Every fact on the site comes from buckslou.com: the history, people, dishes, prices, hours, policies, bourbon and wine lists, and cocktail journal. Nothing was invented. **Confirm with the client before launch:**

1. **Live piano.** Our Story says Buck "provided nightly live piano music", and the concept presents it as nightly. Confirm the current schedule.
2. **"Over 25 years"** comes from the Private Dining page. The restaurant was established in 1992, so the client may prefer "over 30 years".
3. **Forms:**
   - The forms are set up for Netlify Forms (`data-netlify`).
   - On another host, point each form's `action` at the client's form handler.
   - Until a handler exists, a failed submission tells the guest to call or email instead. It never shows a false success message.
4. **Photography:** the original photos are low resolution (1200 px wide; the hero is 2500 × 800). A one-day evening shoot, covering the bar at candle-time, the piano and plated dinner service, would take this concept from strong to exceptional. The layout is ready to receive it.
