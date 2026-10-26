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

### Shop mode ("Winkelen")

- Optimised for one hand on a phone: big tap targets, tick an item as it goes into the basket,
  ticked items drop to the bottom and can be unticked.
- Filter by store ("I'm at store A": its items plus items without a store) and group by category
  in that store's order.
- "Needed by" is shown on every item.
- Works offline: the active list is cached on the device and ticks made offline are synced when the
  connection is back. Two people can shop at the same time (e.g. in two stores): ticks show up live
  for the other (SSE). Conflicting changes: the last tick wins.

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

## Milestones

1. **Scaffold** (done): monorepo, auth, user CLI, Dutch app shell, PWA, zod config, logging,
   error envelope, OpenAPI client types.
2. **Library**: categories, stores with their category order, ingredient catalogue (category,
   default stores), dishes with ingredient lines and recipe. API + screens under "Gerechten".
3. **Build mode**: plans with days and dishes, shopping list generation from the planned dishes
   (pick ingredients, merge, needed-by date), free items, carry over from the previous plan.
4. **Shop mode**: store filter, grouping by category in store order, ticking, offline cache and
   sync queue (IndexedDB), live updates over SSE.
5. **Import**: parse the notes export, cluster duplicates, review file, seed script.
6. **Infrastructure and deploy**: Dockerfile and Compose for the app, proxy LXC, img-manager
   refactor, Food Planner LXC, deployment runbook (`DEPLOYMENT.md`), backups.

## Open questions

- Path of the full Apple Notes export (needed for milestone 5).
