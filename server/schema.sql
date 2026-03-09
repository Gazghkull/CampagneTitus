-- Alliances
CREATE TABLE IF NOT EXISTS alliances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL
);

INSERT OR IGNORE INTO alliances (id, name, color) VALUES
(1, 'Alliance Rouge', '#ff4444'),
(2, 'Alliance Verte', '#44ff44'),
(3, 'Alliance Bleue', '#4444ff');

-- Systèmes (planètes / lunes)
CREATE TABLE IF NOT EXISTS systems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('planet','moon')),
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  infrastructure_slots INTEGER NOT NULL
);

-- Puissance par système et alliance
CREATE TABLE IF NOT EXISTS power (
  system_id INTEGER NOT NULL,
  alliance_id INTEGER NOT NULL,
  value INTEGER NOT NULL DEFAULT 0 CHECK(value BETWEEN 0 AND 4),
  PRIMARY KEY(system_id, alliance_id),
  FOREIGN KEY(system_id) REFERENCES systems(id) ON DELETE CASCADE,
  FOREIGN KEY(alliance_id) REFERENCES alliances(id)
);

-- Connexions entre systèmes
CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_system INTEGER NOT NULL,
  to_system INTEGER NOT NULL,
  FOREIGN KEY(from_system) REFERENCES systems(id),
  FOREIGN KEY(to_system) REFERENCES systems(id)
);

-- =========================
-- INFRASTRUCTURE TYPES
-- =========================
CREATE TABLE IF NOT EXISTS infrastructure_types (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO infrastructure_types (id, name) VALUES
(1, 'Forteresse'),
(2, 'Installation de soutien'),
(3, 'Base-relais'),
(4, 'Ligne de fortifications');

-- =========================
-- INFRASTRUCTURES (SLOTS)
-- =========================
CREATE TABLE IF NOT EXISTS infrastructures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  system_id INTEGER NOT NULL,
  slot_index INTEGER NOT NULL,

  infrastructure_type_id INTEGER,
  alliance_id INTEGER,
  state TEXT CHECK(state IN ('empty','active','destroyed')) NOT NULL DEFAULT 'empty',

  UNIQUE(system_id, slot_index),

  FOREIGN KEY(system_id) REFERENCES systems(id) ON DELETE CASCADE,
  FOREIGN KEY(alliance_id) REFERENCES alliances(id),
  FOREIGN KEY(infrastructure_type_id) REFERENCES infrastructure_types(id)
);

-- Flottes
CREATE TABLE IF NOT EXISTS fleets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  system_id INTEGER NOT NULL,
  alliance_id INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(system_id) REFERENCES systems(id),
  FOREIGN KEY(alliance_id) REFERENCES alliances(id)
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT INTO config (key, value) VALUES ('max_fleets_per_alliance', '5');

-- Utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin','user')) NOT NULL
);

INSERT OR IGNORE INTO users (username, password, role)
VALUES ('admin', 'admin', 'admin');