import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";

// chemin absolu du fichier actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// chemin ABSOLU vers la base
const dbPath = path.join(__dirname, "..", "db.sqlite");

console.log("📂 Base ciblée :", dbPath);

// --- Supprimer l'ancienne base ---
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log("🗑 Ancienne base supprimée !");
}

// --- Créer la nouvelle base ---
const db = new sqlite3.Database(dbPath);

const schema = `

PRAGMA foreign_keys = ON;

-- ======================
-- ALLIANCES
-- ======================
CREATE TABLE alliances (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL
);

INSERT INTO alliances (id, name, color) VALUES
(1, 'Défenseur', '#4444ff'),
(2, 'Envahisseur', '#ff4444'),
(3, 'Pirate', '#44ff44b2');

-- ======================
-- TYPES D’INFRASTRUCTURES
-- ======================
CREATE TABLE infrastructure_types (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

INSERT INTO infrastructure_types (id, name) VALUES
(0, 'Vide'),
(1, 'Forteresse'),
(2, 'Installation de soutien'),
(3, 'Base-relais'),
(4, 'Ligne de fortifications');

-- ======================
-- SYSTÈMES
-- ======================
CREATE TABLE systems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('planet','moon')),
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  infrastructure_slots INTEGER NOT NULL
);

-- ======================
-- PUISSANCE
-- ======================
CREATE TABLE power (
  system_id INTEGER NOT NULL,
  alliance_id INTEGER NOT NULL,
  value INTEGER NOT NULL DEFAULT 0 CHECK(value BETWEEN 0 AND 4),
  PRIMARY KEY(system_id, alliance_id),
  FOREIGN KEY(system_id) REFERENCES systems(id) ON DELETE CASCADE,
  FOREIGN KEY(alliance_id) REFERENCES alliances(id)
);

-- ======================
-- CONNEXIONS
-- ======================
CREATE TABLE connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_system INTEGER NOT NULL,
  to_system INTEGER NOT NULL,
  FOREIGN KEY(from_system) REFERENCES systems(id),
  FOREIGN KEY(to_system) REFERENCES systems(id)
);

-- ======================
-- INFRASTRUCTURES
-- ======================
CREATE TABLE infrastructures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  system_id INTEGER NOT NULL,
  slot_index INTEGER NOT NULL,
  infrastructure_type_id INTEGER,
  alliance_id INTEGER,
  state TEXT CHECK(state IN ('empty','active','destroyed')) NOT NULL,
  UNIQUE(system_id, slot_index),
  FOREIGN KEY(system_id) REFERENCES systems(id) ON DELETE CASCADE,
  FOREIGN KEY(alliance_id) REFERENCES alliances(id),
  FOREIGN KEY(infrastructure_type_id) REFERENCES infrastructure_types(id)
);

-- ======================
-- FLOTTES
-- ======================
CREATE TABLE fleets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  system_id INTEGER NOT NULL,
  alliance_id INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(system_id) REFERENCES systems(id),
  FOREIGN KEY(alliance_id) REFERENCES alliances(id)
);

CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT INTO config (key, value) VALUES ('max_fleets_per_alliance', '5');

-- ======================
-- UTILISATEURS
-- ======================
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin','user')) NOT NULL
);

INSERT INTO users (username, password, role)
VALUES ('admin', 'admin', 'admin');
`;

db.exec(schema, err => {
  if (err) {
    console.error("❌ Erreur création DB :", err);
  } else {
    console.log("✅ Base recréée avec types d’infrastructures et états !");
  }
  db.close();
});