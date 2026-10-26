BEGIN;

-- When the checked state of an item last changed, as ticked on the device. A tick only applies
-- when it is newer, so the last tick wins, also when it reaches the server later (offline).
ALTER TABLE public.list_items ADD COLUMN check_changed_at TIMESTAMPTZ NULL;

COMMIT;
