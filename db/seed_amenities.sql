-- TrailNest amenities seed (idempotent — safe to run standalone against an
-- existing database; INSERT IGNORE skips rows that already exist by name).

INSERT IGNORE INTO amenities (name, type) VALUES
  ('Pool', 'property'),
  ('WiFi', 'property'),
  ('Kitchen', 'property'),
  ('Air Conditioning', 'property'),
  ('Heating', 'property'),
  ('Parking', 'property'),
  ('Fireplace', 'property'),
  ('Hot Tub', 'property'),
  ('Pet Friendly', 'property'),
  ('Washer/Dryer', 'property'),
  ('Mountain View', 'property'),
  ('Ocean View', 'property'),
  ('Breakfast Included', 'property'),
  ('Workspace', 'property'),
  ('No Smoking', 'restricted'),
  ('No Parties or Events', 'restricted'),
  ('No Unregistered Guests', 'restricted'),
  ('Quiet Hours After 10 PM', 'restricted'),
  ('Air Conditioning', 'room'),
  ('Attached Bathroom', 'room'),
  ('Balcony', 'room'),
  ('TV', 'room'),
  ('Mini Fridge', 'room'),
  ('Study Table', 'room');
