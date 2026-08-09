-- TrailNest fictional seed data (local dev only)
-- Demo owner login: demo.owner@trailnest.test / TestPass123!

INSERT INTO owners (name, email, password_hash) VALUES
  ('Jordan Hale', 'demo.owner@trailnest.test', '$2a$10$uQuc3AlHqwnql/NNZREvO.7smo.Cmf1eST.N18NroADQ9H1jU5WYu');

INSERT INTO properties (owner_id, name, type, location, price_per_night, cover_image_url, description) VALUES
  (1, 'Ridgeview Cabin', 'cabin', 'Blue Ridge, NC',
    145.00, 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800',
    'A timber cabin tucked into the ridgeline with a wraparound porch and a wood-burning stove. Mornings here start with fog rolling through the valley below.'),

  (1, 'Willow Creek Farmstay', 'farmstay', 'Hudson Valley, NY',
    120.00, 'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=800',
    'A working farmstay bordered by a slow creek, with fresh eggs each morning and a barn loft converted into a cozy guest room.'),

  (1, 'Sable Dune Cottage', 'cottage', 'Outer Banks, NC',
    165.00, 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800',
    'A weathered-shingle cottage two dunes back from the shoreline, with an outdoor shower and a hammock strung between two live oaks.'),

  (1, 'Terracotta Hollow Villa', 'villa', 'Ojai, CA',
    240.00, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    'A single-story adobe-style villa surrounded by olive trees, built around a shaded courtyard with a wood-fired soaking tub.'),

  (1, 'Fernbrook Treehouse', 'treehouse', 'Willamette Valley, OR',
    135.00, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
    'A treehouse suspended among Douglas firs, reached by a rope bridge, with a skylight positioned for stargazing from bed.'),

  (1, 'Sagebrush Loft', 'apartment', 'Santa Fe, NM',
    95.00, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'A sun-washed adobe loft above a quiet courtyard, a short walk from the plaza, with kiva fireplaces and hand-plastered walls.');

INSERT INTO leads (property_id, name, email, message, status) VALUES
  (1, 'Priya Menon', 'priya.menon@example.com', 'Is Ridgeview Cabin available the second week of October? Traveling with one other person.', 'new'),
  (2, 'Marcus Feld', 'marcus.feld@example.com', 'Would love to bring our dog along to Willow Creek Farmstay — is that alright?', 'contacted'),
  (3, 'Aiko Tanaka', 'aiko.tanaka@example.com', 'Asking about Sable Dune Cottage for a long weekend in September, party of 4.', 'new'),
  (5, 'Owen Baptiste', 'owen.baptiste@example.com', 'Curious whether Fernbrook Treehouse has power outlets for remote work.', 'closed');
