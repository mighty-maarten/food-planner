BEGIN;

-- Where an item is bought, for this list only, when it deviates from the ingredient's default
-- stores. Without an override the defaults apply; an override without a store means any store.
ALTER TABLE public.list_items
    ADD COLUMN store_override BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN store_id UUID NULL,
    ADD CONSTRAINT "FK_list_items_store_id" FOREIGN KEY (store_id) REFERENCES public.stores (id) ON DELETE SET NULL,
    ADD CONSTRAINT "CHK_list_items_store" CHECK (store_override OR store_id IS NULL);

COMMIT;
