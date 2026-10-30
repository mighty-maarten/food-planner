BEGIN;

-- The household's loyalty card of a store, shown as a barcode or QR code in shop mode
ALTER TABLE public.stores
    ADD COLUMN card_code TEXT NULL,
    ADD COLUMN card_format TEXT NULL,
    ADD CONSTRAINT "CHK_stores_card" CHECK ((card_code IS NULL) = (card_format IS NULL));

COMMIT;
