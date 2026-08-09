-- TrailNest schema
-- Run against an empty trailnest_dev database.

CREATE TABLE IF NOT EXISTS owners (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS properties (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  owner_id         INT NOT NULL,
  name             VARCHAR(160) NOT NULL,
  type             ENUM('cabin', 'cottage', 'farmstay', 'villa', 'treehouse', 'apartment') NOT NULL,
  location         VARCHAR(160) NOT NULL,
  price_per_night  DECIMAL(10, 2) NOT NULL,
  cover_image_url  VARCHAR(500),
  description      TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_properties_owner
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
  INDEX idx_properties_owner (owner_id)
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
