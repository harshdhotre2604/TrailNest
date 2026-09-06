-- TrailNest schema
-- Run against an empty trailnest_dev database.
--
-- This file is the single source of truth for the schema (no migration
-- framework exists yet) and only runs automatically via
-- docker-entrypoint-initdb.d against a FRESH db volume. If you already have
-- a trailnest_dev volume from before the 13-step property wizard was added,
-- recreate it (`docker compose down -v` + up) or apply the new CREATE/ALTER
-- statements below by hand.

CREATE TABLE IF NOT EXISTS owners (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Core listing. `name`/`type`/`location`/`price_per_night`/`description` are
-- the original fields and stay as-is (PropertyCard.jsx and property/[id]
-- already depend on these exact names). Everything below `description` is
-- the 13-step wizard's data, added on top.
CREATE TABLE IF NOT EXISTS properties (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  owner_id         INT NOT NULL,
  name             VARCHAR(160) NOT NULL,
  type             ENUM('cabin', 'cottage', 'farmstay', 'villa', 'treehouse', 'apartment') NOT NULL,
  location         VARCHAR(160) NOT NULL,
  price_per_night  DECIMAL(10, 2) NOT NULL,
  cover_image_url  VARCHAR(500),
  description      TEXT,

  -- Property Type & Vacation step
  property_type    ENUM('entire', 'room_based', 'mixed') NOT NULL DEFAULT 'entire',
  vacation_type    VARCHAR(60),
  is_day_picnic    TINYINT(1) NOT NULL DEFAULT 0,
  is_pure_veg      TINYINT(1) NOT NULL DEFAULT 0,

  -- Location step
  country               VARCHAR(60) NOT NULL DEFAULT 'India',
  state                 VARCHAR(80),
  city                  VARCHAR(80),
  address               VARCHAR(255),
  custom_location_name  VARCHAR(160),

  -- Pricing step (whole-property / mixed pricing; per-room pricing lives in property_rooms)
  cleaning_fee          DECIMAL(10, 2),
  service_fee           DECIMAL(10, 2),
  pricing_type          VARCHAR(30),
  tax_included          TINYINT(1) NOT NULL DEFAULT 1,
  tax_percentage        DECIMAL(5, 2),
  max_guests            INT,
  bedroom_count         INT,
  weekend_days          JSON,
  child_pricing_enabled TINYINT(1) NOT NULL DEFAULT 0,
  price_per_child       DECIMAL(10, 2),
  dietary_options       JSON,

  -- Basic Info / Activities steps
  terms_and_conditions   TEXT,
  whatsapp_share_note    VARCHAR(500),
  custom_activities_note TEXT,

  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_properties_owner
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
  INDEX idx_properties_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- `type` distinguishes the property-allowed / property-restricted / room-amenity
-- pickers from a single shared catalog. Uniqueness is per (name, type) rather
-- than global, since e.g. "Air Conditioning" is a legitimate amenity at both
-- the property and room level.
CREATE TABLE IF NOT EXISTS amenities (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(80) NOT NULL,
  type  ENUM('property', 'restricted', 'room') NOT NULL DEFAULT 'property',
  UNIQUE KEY uq_amenity_name_type (name, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Room Configuration step. For property_type = 'entire', a single row with
-- is_whole_property = 1 stands in for the main project's separate
-- wholePropertyRoom concept, keeping this one table for every booking model.
CREATE TABLE IF NOT EXISTS property_rooms (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  property_id               INT NOT NULL,
  is_whole_property         TINYINT(1) NOT NULL DEFAULT 0,
  room_type                 VARCHAR(60),
  room_view                 VARCHAR(60),
  room_name                 VARCHAR(120) NOT NULL,
  description               TEXT,
  price_type                ENUM('per_room', 'per_person', 'per_villa') NOT NULL DEFAULT 'per_room',
  weekday_price              DECIMAL(10, 2),
  weekend_price              DECIMAL(10, 2),
  tax_included               TINYINT(1) NOT NULL DEFAULT 1,
  tax_percentage              DECIMAL(5, 2),
  weekday_extra_adult_rate    DECIMAL(10, 2),
  weekend_extra_adult_rate    DECIMAL(10, 2),
  max_adults                 INT NOT NULL DEFAULT 2,
  max_children                INT NOT NULL DEFAULT 0,
  min_guests                  INT,
  check_in_time                TIME NOT NULL DEFAULT '12:00:00',
  check_out_time               TIME NOT NULL DEFAULT '10:00:00',
  availability_scope           VARCHAR(30) NOT NULL DEFAULT 'always',
  sort_order                   INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_property_rooms_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_rooms_property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS property_room_beds (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  room_id   INT NOT NULL,
  bed_type  VARCHAR(60) NOT NULL,
  quantity  INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_property_room_beds_room
    FOREIGN KEY (room_id) REFERENCES property_rooms(id) ON DELETE CASCADE,
  INDEX idx_property_room_beds_room (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS property_room_amenities (
  room_id      INT NOT NULL,
  amenity_id   INT NOT NULL,
  PRIMARY KEY (room_id, amenity_id),
  CONSTRAINT fk_property_room_amenities_room
    FOREIGN KEY (room_id) REFERENCES property_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_property_room_amenities_amenity
    FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Which Experience Builder entries (by experience_type) a room is available for.
CREATE TABLE IF NOT EXISTS property_room_experience_types (
  room_id          INT NOT NULL,
  experience_type  VARCHAR(60) NOT NULL,
  PRIMARY KEY (room_id, experience_type),
  CONSTRAINT fk_property_room_experience_types_room
    FOREIGN KEY (room_id) REFERENCES property_rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Descriptive-only bedrooms shown for property_type = 'entire' (no pricing,
-- no FK to property_rooms — separate from the single priced whole-property row).
CREATE TABLE IF NOT EXISTS property_bedrooms (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  property_id  INT NOT NULL,
  name         VARCHAR(120) NOT NULL,
  bed_config   VARCHAR(255),
  description  TEXT,
  sort_order   INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_property_bedrooms_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_bedrooms_property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Experience Builder step
CREATE TABLE IF NOT EXISTS property_experiences (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  property_id       INT NOT NULL,
  experience_type   VARCHAR(60) NOT NULL,
  title             VARCHAR(160) NOT NULL,
  description       TEXT,
  availability_note VARCHAR(255),
  pricing_model     ENUM('per_person', 'per_room', 'per_group', 'fixed_package') NOT NULL DEFAULT 'per_person',
  price             DECIMAL(10, 2),
  inclusions        TEXT,
  exclusions        TEXT,
  sort_order        INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_property_experiences_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_experiences_property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Package Builder step
CREATE TABLE IF NOT EXISTS property_packages (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  property_id      INT NOT NULL,
  package_name     VARCHAR(160) NOT NULL,
  experience_type  VARCHAR(60),
  duration         VARCHAR(60),
  meal_plan_note   VARCHAR(255),
  inclusions       TEXT,
  exclusions       TEXT,
  price            DECIMAL(10, 2),
  sort_order       INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_property_packages_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_packages_property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pricing step's meal plans — one row per plan_type (No Meal / Breakfast Only /
-- Breakfast + Lunch/Dinner / All Inclusive) per property.
CREATE TABLE IF NOT EXISTS property_meal_plans (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  plan_type   VARCHAR(60) NOT NULL,
  included    TINYINT(1) NOT NULL DEFAULT 0,
  extra_cost  DECIMAL(10, 2),
  CONSTRAINT fk_property_meal_plans_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY uq_property_meal_plan (property_id, plan_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activities step. activity_key references a hardcoded activities constant
-- (see backend/src/constants/propertyOptions.js), not a DB catalog table.
CREATE TABLE IF NOT EXISTS property_activities (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  property_id   INT NOT NULL,
  activity_key  VARCHAR(80) NOT NULL,
  is_paid       TINYINT(1) NOT NULL DEFAULT 0,
  pricing_type  ENUM('per_person', 'group'),
  price         DECIMAL(10, 2),
  CONSTRAINT fk_property_activities_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY uq_property_activity (property_id, activity_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Media Center step's videos (property images use the existing
-- property_images table below, extended with a nullable room_id).
CREATE TABLE IF NOT EXISTS property_videos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  property_id  INT NOT NULL,
  video_path   VARCHAR(500) NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_property_videos_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_videos_property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Corporate & Event step
CREATE TABLE IF NOT EXISTS property_event_facilities (
  property_id       INT NOT NULL PRIMARY KEY,
  conference_hall   TINYINT(1) NOT NULL DEFAULT 0,
  meeting_room      TINYINT(1) NOT NULL DEFAULT 0,
  lawn_capacity     INT,
  banquet_capacity  INT,
  parking_capacity  INT,
  CONSTRAINT fk_property_event_facilities_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS property_event_capacities (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  property_id     INT NOT NULL,
  capacity_name   VARCHAR(120) NOT NULL,
  capacity_value  VARCHAR(60),
  CONSTRAINT fk_property_event_capacities_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_event_capacities_property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Both predefined (from the EVENT_TYPES constant) and custom event-type chips
-- land here as plain strings.
CREATE TABLE IF NOT EXISTS property_event_types (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  property_id      INT NOT NULL,
  event_type_name  VARCHAR(120) NOT NULL,
  CONSTRAINT fk_property_event_types_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_event_types_property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Compliance & Payouts step. Deliberately its own table, isolated from every
-- other query path — list/listMine/getById use explicit column SELECTs that
-- never touch this table, and the AI feature (ai.controller.js/ai_service.js)
-- must never reference it either. See AI_Integration_MTS.pdf guardrail:
-- KYC/bank fields never reach the AI, full stop.
CREATE TABLE IF NOT EXISTS property_compliance (
  property_id       INT NOT NULL PRIMARY KEY,
  owner_name        VARCHAR(120),
  owner_phone       VARCHAR(30),
  owner_email       VARCHAR(190),
  id_type           VARCHAR(30),
  id_number         VARCHAR(60),
  account_name      VARCHAR(120),
  account_number    VARCHAR(60),
  ifsc_code         VARCHAR(20),
  commission_type   VARCHAR(30),
  commission_value  DECIMAL(10, 2),
  CONSTRAINT fk_property_compliance_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- `scope` splits the Amenities step's "Property Amenities" vs "Restrictions"
-- pickers; room-scoped amenities live in property_room_amenities instead,
-- since they belong to a specific room rather than the property as a whole.
CREATE TABLE IF NOT EXISTS property_amenities (
  property_id  INT NOT NULL,
  amenity_id   INT NOT NULL,
  scope        ENUM('allowed', 'not_allowed') NOT NULL DEFAULT 'allowed',
  PRIMARY KEY (property_id, amenity_id, scope),
  CONSTRAINT fk_property_amenities_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_property_amenities_amenity
    FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- `room_id` NULL = property-level image (Media Center step); set = a
-- specific room's image (Room Configuration step).
CREATE TABLE IF NOT EXISTS property_images (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  property_id  INT NOT NULL,
  room_id      INT NULL,
  image_path   VARCHAR(500) NOT NULL,
  is_primary   TINYINT(1) NOT NULL DEFAULT 0,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_property_images_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_property_images_room
    FOREIGN KEY (room_id) REFERENCES property_rooms(id) ON DELETE CASCADE,
  INDEX idx_property_images_property (property_id),
  INDEX idx_property_images_room (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leads (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  property_id  INT NOT NULL,
  name         VARCHAR(120) NOT NULL,
  email        VARCHAR(190) NOT NULL,
  message      TEXT NOT NULL,
  status       ENUM('new', 'contacted', 'closed') NOT NULL DEFAULT 'new',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_leads_property
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_leads_property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
