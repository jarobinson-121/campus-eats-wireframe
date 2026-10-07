# Campus Eats: wireframe

A lo-fi clickable wireframe for Campus Eats, which shows where to eat on and near BYU campus (CS 356, Part 1).
The 34 restaurants from our card sort can be found two ways: **by food type** and **by location**.

## Run it

It's plain HTML/CSS/JS with no build step. Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8356
```

Then go to http://localhost:8356.

## Deploy (GitHub Pages)

In the repo, go to Settings → Pages → Source: *Deploy from a branch* → `main` / root. The site will be live at
`https://jarobinson-121.github.io/campus-eats-wireframe/`.

## Where things are

| File | What it does |
| --- | --- |
| `js/data.js` | **The only file you edit to change content or IA.** Restaurants (one record each), category labels, the 10 test tasks. |
| `js/core.js` | Builds both browse trees from the attributes in `data.js`; shared helpers. |
| `js/app.js` | Router and page rendering: home, browse pages, restaurant page, site map, coverage check, click log. |
| `js/logger.js` | Records every click to `localStorage`; JSON/CSV export. |
| `js/sync.js` | Sends test results and their clicks to the team Google Sheet (Apps Script web app set in `data.js` → `sheet`), with an offline retry queue. |
| `js/testmode.js` | Test mode: shuffled tasks, timer, give-up, resume after reload, results with export/import. |
| `css/wireframe.css` | Wireframe styles: one font, black and white, one tile style. |

## Pages

- `#/`: home, with both ways in
- `#/food/...` and `#/place/...`: browse; a restaurant page shows "You selected: X"
- `#/map`: site map of both views
- `#/check`: coverage check (every restaurant reachable? empty categories? tasks valid?)
- `#/log`: click log, with Download JSON / CSV and Copy
- `#/test`: test mode
- `#/results`: test results by task and by session, with export and import (merge a teammate's export)

## Editing the IA

- **Add a cuisine:** add `{ key, name }` to `cuisines` and add the key to each matching restaurant's `cuisine` list.
- **Fix a location:** change the restaurant's `campus` (`"on"` / `"near"`) and `area`, and set `verified: true`.
- **Tasks:** edit `tasks`. `expect` lists every restaurant that counts as a correct answer.

After any edit, open `#/check` to confirm nothing became unreachable.

## Notes

- Test-mode results go to the team Google Sheet as each task finishes (tab **Attempts**), and each session's clicks go to the **Clicks** tab when the session ends. A copy also stays in the browser, so export/import still works. Browse-mode clicks stay local; export them from the Click log page.
- To turn off Sheet sending, set `sheet.url` to `""` in `data.js`.
- Restaurant locations are drafted from what most card sorters said and are marked `verified: false` until the team confirms them.
