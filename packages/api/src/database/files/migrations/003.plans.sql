BEGIN;

-- A week menu: a date range (typically Thursday to Wednesday) with a dish per day and one
-- shopping list
CREATE TABLE public.plans (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_by_id UUID NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_plans_id" PRIMARY KEY (id),
    CONSTRAINT "CHK_plans_dates" CHECK (end_date >= start_date AND end_date - start_date < 31),
    CONSTRAINT "FK_plans_created_by_id" FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL
);

CREATE INDEX "IDX_plans_start_date" ON public.plans (start_date);

-- The dish of a day; days without a row are days without cooking
CREATE TABLE public.plan_days (
    plan_id UUID NOT NULL,
    date DATE NOT NULL,
    dish_id UUID NOT NULL,
    CONSTRAINT "PK_plan_days" PRIMARY KEY (plan_id, date),
    CONSTRAINT "FK_plan_days_plan_id" FOREIGN KEY (plan_id) REFERENCES public.plans (id) ON DELETE CASCADE,
    CONSTRAINT "FK_plan_days_dish_id" FOREIGN KEY (dish_id) REFERENCES public.dishes (id) ON DELETE CASCADE
);

CREATE INDEX "IDX_plan_days_dish_id" ON public.plan_days (dish_id);

-- The shopping list of a plan: one line per ingredient. `manual` lines were added freely (or
-- carried over) and stay when no planned dish needs them; the others disappear with their last
-- source. `needed_by` overrides the date derived from the sources.
CREATE TABLE public.list_items (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    ingredient_id UUID NOT NULL,
    manual BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT NULL,
    needed_by DATE NULL,
    added_by_id UUID NULL,
    checked_at TIMESTAMPTZ NULL,
    checked_by_id UUID NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_list_items_id" PRIMARY KEY (id),
    CONSTRAINT "UQ_list_items_plan_id_ingredient_id" UNIQUE (plan_id, ingredient_id),
    CONSTRAINT "FK_list_items_plan_id" FOREIGN KEY (plan_id) REFERENCES public.plans (id) ON DELETE CASCADE,
    CONSTRAINT "FK_list_items_ingredient_id" FOREIGN KEY (ingredient_id) REFERENCES public.ingredients (id) ON DELETE CASCADE,
    CONSTRAINT "FK_list_items_added_by_id" FOREIGN KEY (added_by_id) REFERENCES public.users (id) ON DELETE SET NULL,
    CONSTRAINT "FK_list_items_checked_by_id" FOREIGN KEY (checked_by_id) REFERENCES public.users (id) ON DELETE SET NULL
);

CREATE INDEX "IDX_list_items_ingredient_id" ON public.list_items (ingredient_id);

-- Which planned days (dishes) a list item is bought for. Changing or clearing the dish of a day
-- removes its sources.
CREATE TABLE public.list_item_sources (
    list_item_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    date DATE NOT NULL,
    CONSTRAINT "PK_list_item_sources" PRIMARY KEY (list_item_id, date),
    CONSTRAINT "FK_list_item_sources_list_item_id" FOREIGN KEY (list_item_id) REFERENCES public.list_items (id) ON DELETE CASCADE,
    CONSTRAINT "FK_list_item_sources_plan_day" FOREIGN KEY (plan_id, date) REFERENCES public.plan_days (plan_id, date) ON DELETE CASCADE
);

CREATE INDEX "IDX_list_item_sources_plan_day" ON public.list_item_sources (plan_id, date);

COMMIT;
