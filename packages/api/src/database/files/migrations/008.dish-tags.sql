BEGIN;

-- Free tags on a dish (pasta, soep, vis, veggie, ...), lowercase, to filter the library and the
-- dish picker
ALTER TABLE public.dishes ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';

COMMIT;
