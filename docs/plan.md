# Plan

Scope, agreed design decisions and milestones for Food Planner. Keep this file up to date when a
milestone is done or a decision changes.

## Goal

Replace the current way of working: once a week a list of dishes for the coming days (typically
Thursday to the next Wednesday), and from that a short shopping list with only what isn't at home
yet. Used by one household (two people), in Dutch, on the phone in the store and on any device at
home.

## Agreed design

### Users and security

- One shared household: everyone sees and edits the same dishes, plans and lists. Users exist for
  login and for showing who added or ticked something.
- Email and password login, no sign-up. Accounts are created with the user CLI
  (`npm run user -- create`).
- Short-lived access token in memory and a sliding httpOnly refresh session (90 days), so the
  installed app stays logged in. See the README, "Authentication".

### Dishes (library)

- Create, edit and delete dishes. A dish has a name and a list of ingredient lines; amount and unit
  are optional ("tomaten", "2 paprika's", "1 pot pesto").
- Optional recipe: markdown text, source URL and number of servings.
- Ingredients come from a shared catalogue (one "tomaat" reused everywhere, with autocomplete).
  An ingredient has a category and zero, one or more default stores (e.g. yoghurt: store A for one
  person, store B for the other).
- Categories (Groenten & fruit, Zuivel, Huishouden, ...) with a separate order per store, matching
  the route through that store.
- Decided while building milestone 2:
  - Names of categories, stores, ingredients and dishes are unique, case-insensitive (409
    `CONFLICT`).
  - An ingredient's category is optional ("Zonder categorie", listed first on the ingredients
    screen), so ingredients can be typed quickly in the dish form and added by the import.
  - Dish ingredient lines are sent by ingredient name; unknown names are added to the catalogue.
    The same ingredient twice in one dish is rejected. Amount is a number (`0,5`), unit free text.
  - An ingredient used by a dish cannot be deleted (409 with the dishes). Deleting a category makes
    its ingredients uncategorised; deleting a store removes it from the ingredients.
  - Categories have a default order (used without a store); a store's route lists every category,
    categories it has no position for (e.g. new ones) follow in the default order.
  - Reordering uses up/down buttons instead of drag and drop (reliable with one thumb).
  - Migration 002 adds a default set of Dutch categories.

### Plans (build mode, "Bouwen")

- A plan has a start and end date: a new plan defaults to Thursday to Wednesday, both editable.
- Every day gets a dish from the library, a new dish, or stays empty (no cooking).
- One shopping list per plan. For each planned dish you pick which of its ingredients you need to
  buy (not everything: only what isn't at home).
- Items without a dish can be added freely (brood, waspoeder, ...).
- Each item shows its "needed by" date: the first day a planned dish uses it, so you can decide to
  buy fresh things later. The same ingredient in several dishes becomes one line with the earliest
  date and the dishes it comes from. Editable.
- Unticked items of the previous plan can be carried over to the new one.
- Ingredients that are always needed (bread, milk) can be marked "Altijd op de lijst": a new plan
  starts with them on its list as free items. Existing plans don't change; removing one from a
  list is for that week only.
- Decided while building milestone 3:
  - Plans don't overlap (409 `CONFLICT`), so "the plan of today" and "the previous plan" are
    unambiguous. A plan lasts at most 31 days. The current plan is the one with today in it, else
    the first one coming up, else the most recent.
  - A new plan starts on the coming Thursday, or the day after the last plan if that runs longer,
    and ends on the first Wednesday after its start.
  - One dish per day. Ingredients are not picked by default (only what isn't at home). Another
    dish on a day clears that day's picks; changing the plan's dates drops days outside the range.
  - The list has one line per ingredient (merged across days). A line picked only for dishes
    disappears with its last pick; a line added freely or carried over stays. Free items are
    ingredients too (added to the catalogue), so shop mode can group them by category and store.
  - "Needed by" is the first day a planned dish uses it, unless set by hand; the amounts per dish
    are shown with the line, not summed.
  - Carry over offers the unticked items of the previous plan that are not on the new list; they
    become free items. Ticking itself (`checked_at`, `checked_by`) is part of milestone 4.
  - Every change returns the whole plan; the client sends changes to a plan one at a time and
    shows ingredient picks immediately.

### Shop mode ("Winkelen")

- Optimised for one hand on a phone: big tap targets, tick an item as it goes into the basket,
  ticked items drop to the bottom and can be unticked.
- Filter by store ("I'm at store A": its items plus items set to "any store" on the list; items without a store only show without a filter) and group by category
  in that store's order.
- Per item, the store can deviate from the ingredient's defaults for this list only: the ⋮ menu
  of an item in shop mode (or the item dialog in build mode) offers the default, a store or any
  store. The filter uses this choice; carry over keeps it. Offline it is queued like a tick.
- Shop mode has no top bar on phones: one sticky toolbar with the store choice, the live/offline
  status and the count, the progress as its bottom edge, and small category labels, so the list
  starts right at the top.
- "Needed by" is shown on every item.
- Works offline: the active list is cached on the device and ticks made offline are synced when the
  connection is back. Two people can shop at the same time (e.g. in two stores): ticks show up live
  for the other (SSE). Conflicting changes: the last tick wins.
- Decided while building milestone 4:
  - "The last tick wins" by the time of the tick on the device (`check_changed_at`), not by when
    it reaches the server, so a tick made offline doesn't overwrite a later one. Times in the
    future count as now (a phone clock running ahead can't win every later tick).
  - Shop mode shows the current plan. Its list, categories and stores are cached in IndexedDB;
    ticks are applied at once, queued (only the last tick per item) and sent in order when online,
    in the foreground, or when the live connection is back. A rejected tick (e.g. the item was
    removed) is dropped. Logging out clears the cache and the queue.
  - Live updates: `GET /plans/:id/events` (SSE, a ping every 25 s, in memory in the single API
    process). Read with fetch so the access token stays in the Authorization header. Ticks arrive
    as the item's new state, other changes (build mode) make shop mode reload the plan. An
    incoming tick doesn't overwrite an unsent tick of this device.
  - Ticked items move to an "In je kar" section at the bottom, most recent first; the shopper's
    own ticks don't say who, the other's do. Items needed today, tomorrow or earlier are
    highlighted. The chosen store is remembered on the device.

### Hosting

- Domain `food-planner.mighty.be`, on the Proxmox home server (see `~/_code/personal/home-server`
  and `~/_code/personal/img-manager` for the current setup).
- New LXC for the reverse proxy only (Caddy with automatic HTTPS), ports 80/443 forwarded to it.
  It routes `img-manager.mighty.be` and `food-planner.mighty.be` to their own LXCs.
- Refactor img-manager: remove its own Caddy, expose the app on the LAN only. Update its
  DEPLOYMENT.md and the home-server notes.
- New LXC for Food Planner: Docker Compose with the app (API serving the built client) and
  PostgreSQL 18, included in the existing vzdump backups (synced to S3).
- Anything that touches the server (creating LXCs, port forwarding, redeploying img-manager) is
  confirmed with Maarten first, or done by him from a runbook.
- Decided while preparing milestone 6:
  - One image (Node 26): the API serves the built client. PostgreSQL 18 in the same Compose
    project, data in `./data/postgres`; the app's port 3000 is published on the LAN for the proxy.
  - Proxy: Caddy in Docker on its own LXC (104, `192.168.1.97`); Food Planner on LXC 105
    (`192.168.1.96`). img-manager's existing certificate is copied to the proxy so the switch
    needs no new certificate, and its own Caddy keeps running until the port forwards moved
    (instant rollback).
  - Backups: vzdump of every LXC (existing, synced to S3) plus a nightly `pg_dump` on the LXC
    (`scripts/backup-db.sh`, 14 days) for restoring only the database.
  - On first start the app adds its migration table to the empty database the postgres image
    creates (it used to assume a database it created itself).

### Historical data

There is a large set of old weekly menus in Apple Notes, to become the start of the dish library.
Maarten provides the full export (not available yet). Format, from a sample:

```
Do: fitte schotel met quinoa, rode paprika, kip, courgette, rode ui en geraspte kaas
Vr: /
Za: Risotto met pompoen en champignons
Zo:/
Ma: Boekweitsalade (https://etenuitdevolkstuin.nl/2015/02/06/boekweit-salade-van-ottolenghi-recept/)
Di: zalm met erwten en patatten
Wo: Pitta met bloemkool/courgette
```

- Weeks have no dates, so only dishes are imported (with how often they occurred, to suggest
  favourites), not historical plans.
- `/` or a missing day means no cooking.
- The name often lists ingredients: keep the full name as the dish name and propose those words as
  ingredients.
- URLs become the recipe's source URL and are removed from the name.
- Many duplicates and variants ("Pitta met bloemkool en courgette" / "Pitta met
  bloemkool/courgette"): cluster them, produce a review file (canonical name ← variants) for
  Maarten to approve, then load it with a seed script.
- Decided while building milestone 5:
  - The export is `export.txt` in the repository root, the review file `import/review.txt`; both
    are git-ignored (personal data). See the README, "Importing old menus".
  - Day lines are read with or without `:`, also checklist lines (`- [ ] Ma:`) and labels
    (`middag:`). `A => B` means B was made. `/`, `x`, `?` or nothing is no cooking. Eating out,
    work, "bij mama" and the like go under `[skip]` (movable to `[dishes]`).
  - Parentheses: URLs become the source, comma lists (`Cantonese rijst (ei, hesp, prei)`) become
    ingredients, notes (`zonder ajuin`, `ok`) are dropped.
  - Dishes are grouped when they share at least 75% of their words (word order, filler words,
    plurals and one-letter typos ignored); the most used spelling names the dish. "Spaghetti"
    and "Spaghetti carbonara" stay apart.
  - Proposed ingredients come from the name ("Zalm met erwten en patatten"); dish types
    (wok, soep, slaatje, ...) are left out, risotto becomes Risottorijst. Ingredient spellings
    are merged in the `[ingredients]` section.
  - `dishes.historical_count` keeps how often a dish was planned before the app; the dish picker
    sorts by it plus the plans in the app. The load is one transaction and can run again.

## Milestones

1. **Scaffold** (done): monorepo, auth, user CLI, Dutch app shell, PWA, zod config, logging,
   error envelope, OpenAPI client types.
2. **Library** (done): categories, stores with their category order, ingredient catalogue
   (category, default stores), dishes with ingredient lines and recipe. API + screens under
   "Gerechten".
3. **Build mode** (done): plans with days and dishes, shopping list generation from the planned
   dishes (pick ingredients, merge, needed-by date), free items, carry over from the previous plan.
4. **Shop mode** (done): store filter, grouping by category in store order, ticking, offline cache
   and sync queue (IndexedDB), live updates over SSE.
5. **Import** (done): parse the notes export, cluster duplicates, review file, seed script.
6. **Infrastructure and deploy** (done, live since 2026-10-27 at https://food-planner.mighty.be):
   Dockerfile and Compose for the app, proxy LXC, img-manager refactor, Food Planner LXC,
   deployment runbook (`DEPLOYMENT.md`), backups. The cutover runbook is
   `proxy-cutover-2026-10.md` in the `home-server` repository.

## Open questions

None at the moment. The old menus were imported into production on 2026-10-27.
