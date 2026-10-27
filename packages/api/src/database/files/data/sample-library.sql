-- A small library to try the app with, applied by hand: npm run db:seed-sample:local
-- Safe to apply again (and on a database with data): what exists is left alone.
-- The categories come from migration 002.

-- Lidl is where most things are bought; the others are for the exceptions
INSERT INTO public.stores (name)
VALUES ('Lidl'), ('Carrefour'), ('Jumbo'), ('Delhaize'), ('Bakker')
ON CONFLICT ((lower(name))) DO NOTHING;

INSERT INTO public.ingredients (name, category_id)
SELECT ingredient.name, categories.id
FROM (VALUES
    ('Tomaten', 'Groenten & fruit'),
    ('Paprika', 'Groenten & fruit'),
    ('Courgette', 'Groenten & fruit'),
    ('Rode ui', 'Groenten & fruit'),
    ('Pompoen', 'Groenten & fruit'),
    ('Champignons', 'Groenten & fruit'),
    ('Brood', 'Brood & bakkerij'),
    ('Kip', 'Vlees & vis'),
    ('Zalm', 'Vlees & vis'),
    ('Geraspte kaas', 'Kaas & vleeswaren'),
    ('Parmezaan', 'Kaas & vleeswaren'),
    ('Yoghurt', 'Zuivel & eieren'),
    ('Quinoa', 'Pasta, rijst & granen'),
    ('Risottorijst', 'Pasta, rijst & granen'),
    ('Pesto', 'Conserven & sauzen'),
    ('Erwten', 'Diepvries')
) AS ingredient (name, category)
JOIN public.categories ON categories.name = ingredient.category
ON CONFLICT ((lower(name))) DO NOTHING;

-- Default stores: bread at the baker, everything else at Lidl
INSERT INTO public.ingredient_default_stores (ingredient_id, store_id)
SELECT ingredients.id, stores.id
FROM public.ingredients
JOIN public.stores ON stores.name = CASE WHEN ingredients.name = 'Brood' THEN 'Bakker' ELSE 'Lidl' END
WHERE ingredients.name IN ('Tomaten', 'Paprika', 'Courgette', 'Rode ui', 'Pompoen', 'Champignons',
    'Brood', 'Kip', 'Zalm', 'Geraspte kaas', 'Parmezaan', 'Yoghurt', 'Quinoa', 'Risottorijst',
    'Pesto', 'Erwten')
ON CONFLICT DO NOTHING;

INSERT INTO public.dishes (name, recipe, servings) VALUES
    ('Fitte schotel met quinoa', NULL, NULL),
    ('Risotto met pompoen en champignons', E'1. Fruit de ui.\n2. Voeg de rijst toe en blus met bouillon.\n3. Roer er op het einde **parmezaan** door.', 4),
    ('Zalm met erwten en patatten', NULL, 2)
ON CONFLICT ((lower(name))) DO NOTHING;

INSERT INTO public.dish_ingredients (dish_id, ingredient_id, amount, unit, position)
SELECT dishes.id, ingredients.id, line.amount, line.unit, line.position
FROM (VALUES
    ('Fitte schotel met quinoa', 'Quinoa', 200, 'g', 1),
    ('Fitte schotel met quinoa', 'Paprika', 1, NULL, 2),
    ('Fitte schotel met quinoa', 'Kip', NULL, NULL, 3),
    ('Fitte schotel met quinoa', 'Courgette', 1, NULL, 4),
    ('Fitte schotel met quinoa', 'Rode ui', 1, NULL, 5),
    ('Fitte schotel met quinoa', 'Geraspte kaas', NULL, NULL, 6),
    ('Risotto met pompoen en champignons', 'Risottorijst', 300, 'g', 1),
    ('Risotto met pompoen en champignons', 'Pompoen', 1, NULL, 2),
    ('Risotto met pompoen en champignons', 'Champignons', 250, 'g', 3),
    ('Risotto met pompoen en champignons', 'Parmezaan', NULL, NULL, 4),
    ('Zalm met erwten en patatten', 'Zalm', 2, 'stukken', 1),
    ('Zalm met erwten en patatten', 'Erwten', 1, 'zak', 2)
) AS line (dish, ingredient, amount, unit, position)
JOIN public.dishes ON dishes.name = line.dish
JOIN public.ingredients ON ingredients.name = line.ingredient
ON CONFLICT ON CONSTRAINT "UQ_dish_ingredients_dish_id_ingredient_id" DO NOTHING;
