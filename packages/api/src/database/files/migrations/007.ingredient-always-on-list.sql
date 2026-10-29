BEGIN;

-- Ingredients that are always needed (bread, milk, ...): a new plan starts with them on its
-- shopping list.
ALTER TABLE public.ingredients ADD COLUMN always_on_list BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
