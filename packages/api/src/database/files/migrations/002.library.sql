BEGIN;

-- Shop sections (Groenten & fruit, Zuivel, ...). `position` is the default order, used when no
-- store is selected; every store can have its own order (store_category_positions).
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    position INT NOT NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_categories_id" PRIMARY KEY (id)
);

CREATE UNIQUE INDEX "UQ_categories_name" ON public.categories (lower(name));

CREATE TABLE public.stores (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_stores_id" PRIMARY KEY (id)
);

CREATE UNIQUE INDEX "UQ_stores_name" ON public.stores (lower(name));

-- The route through a store. Categories without a row follow in their default order.
CREATE TABLE public.store_category_positions (
    store_id UUID NOT NULL,
    category_id UUID NOT NULL,
    position INT NOT NULL,
    CONSTRAINT "PK_store_category_positions" PRIMARY KEY (store_id, category_id),
    CONSTRAINT "FK_store_category_positions_store_id" FOREIGN KEY (store_id) REFERENCES public.stores (id) ON DELETE CASCADE,
    CONSTRAINT "FK_store_category_positions_category_id" FOREIGN KEY (category_id) REFERENCES public.categories (id) ON DELETE CASCADE
);

CREATE INDEX "IDX_store_category_positions_category_id" ON public.store_category_positions (category_id);

-- Shared ingredient catalogue. The category is optional, so an ingredient can be added quickly
-- from the dish form (and by the import) and categorised later.
CREATE TABLE public.ingredients (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ingredients_id" PRIMARY KEY (id),
    CONSTRAINT "FK_ingredients_category_id" FOREIGN KEY (category_id) REFERENCES public.categories (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX "UQ_ingredients_name" ON public.ingredients (lower(name));
CREATE INDEX "IDX_ingredients_category_id" ON public.ingredients (category_id);

-- Where an ingredient is usually bought (zero, one or more stores)
CREATE TABLE public.ingredient_default_stores (
    ingredient_id UUID NOT NULL,
    store_id UUID NOT NULL,
    CONSTRAINT "PK_ingredient_default_stores" PRIMARY KEY (ingredient_id, store_id),
    CONSTRAINT "FK_ingredient_default_stores_ingredient_id" FOREIGN KEY (ingredient_id) REFERENCES public.ingredients (id) ON DELETE CASCADE,
    CONSTRAINT "FK_ingredient_default_stores_store_id" FOREIGN KEY (store_id) REFERENCES public.stores (id) ON DELETE CASCADE
);

CREATE INDEX "IDX_ingredient_default_stores_store_id" ON public.ingredient_default_stores (store_id);

CREATE TABLE public.dishes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    -- Markdown
    recipe TEXT NULL,
    source_url TEXT NULL,
    servings INT NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_dishes_id" PRIMARY KEY (id)
);

CREATE UNIQUE INDEX "UQ_dishes_name" ON public.dishes (lower(name));

-- Ingredient lines of a dish, amount and unit are optional ("tomaten", "2 paprika's", "1 pot pesto")
CREATE TABLE public.dish_ingredients (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    dish_id UUID NOT NULL,
    ingredient_id UUID NOT NULL,
    amount DOUBLE PRECISION NULL,
    unit TEXT NULL,
    position INT NOT NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_dish_ingredients_id" PRIMARY KEY (id),
    CONSTRAINT "UQ_dish_ingredients_dish_id_ingredient_id" UNIQUE (dish_id, ingredient_id),
    CONSTRAINT "FK_dish_ingredients_dish_id" FOREIGN KEY (dish_id) REFERENCES public.dishes (id) ON DELETE CASCADE,
    -- An ingredient that is still used by a dish cannot be deleted
    CONSTRAINT "FK_dish_ingredients_ingredient_id" FOREIGN KEY (ingredient_id) REFERENCES public.ingredients (id) ON DELETE RESTRICT
);

CREATE INDEX "IDX_dish_ingredients_ingredient_id" ON public.dish_ingredients (ingredient_id);

-- Default categories in a typical route through a store, editable in the app
INSERT INTO public.categories (name, position) VALUES
    ('Groenten & fruit', 1),
    ('Brood & bakkerij', 2),
    ('Vlees & vis', 3),
    ('Kaas & vleeswaren', 4),
    ('Zuivel & eieren', 5),
    ('Pasta, rijst & granen', 6),
    ('Conserven & sauzen', 7),
    ('Kruiden & specerijen', 8),
    ('Ontbijt & tussendoor', 9),
    ('Diepvries', 10),
    ('Dranken', 11),
    ('Huishouden', 12),
    ('Verzorging', 13);

COMMIT;
