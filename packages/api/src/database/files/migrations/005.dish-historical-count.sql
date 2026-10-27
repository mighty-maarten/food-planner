BEGIN;

-- How often a dish was planned before the app (from the imported Apple Notes menus), so old
-- favourites can be suggested alongside the dishes planned in the app.
ALTER TABLE public.dishes ADD COLUMN historical_count INT NOT NULL DEFAULT 0;

COMMIT;
