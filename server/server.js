import express from "express";
import sqlite3 from "sqlite3";
import session from "express-session";

const app = express();
const db = new sqlite3.Database("./server/db.sqlite");

// ===============================
// MIDDLEWARES
// ===============================
app.use(express.json());
app.use(session({
  secret: "warhammer-secret",
  resave: false,
  saveUninitialized: true
}));

// ===============================
// AUTH
// ===============================
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT role FROM users WHERE username=? AND password=?",
    [username, password],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(401).json({ error: "Invalid" });

      req.session.role = row.role;
      res.json({ role: row.role });
    }
  );
});

app.get("/api/me", (req, res) => {
  res.json({ role: req.session.role || "user" });
});

function adminOnly(req, res, next) {
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// ===============================
// SYSTEMS (CRÉATION + POSITION)
// ===============================
app.post("/api/system", adminOnly, (req, res) => {
  const { name, type, slots } = req.body;

  db.get("SELECT COUNT(*) AS count FROM systems", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    const offset = row.count * 80;
    const x = 400 + offset;
    const y = 300;

    db.run(
      `INSERT INTO systems (name, type, x, y, infrastructure_slots)
       VALUES (?, ?, ?, ?, ?)`,
      [name, type, x, y, slots],
      function () {
        const systemId = this.lastID;

        // Création automatique des 3 puissances (0 par défaut)
        [1, 2, 3].forEach(allianceId => {
          db.run(
            "INSERT INTO power (system_id, alliance_id, value) VALUES (?, ?, 0)",
            [systemId, allianceId]
          );
        });

        res.json({ id: systemId, x, y });
      }
    );
  });
});

app.post("/api/system/position", adminOnly, (req, res) => {
  const { id, x, y } = req.body;

  db.run(
    "UPDATE systems SET x=?, y=? WHERE id=?",
    [x, y, id],
    () => res.json({ ok: true })
  );
});

// ===============================
// CONNEXIONS
// ===============================
app.get("/api/connections", (req, res) => {
  db.all("SELECT * FROM connections", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/connections", adminOnly, (req, res) => {
  const { from_system, to_system } = req.body;

  db.run(
    "INSERT INTO connections (from_system, to_system) VALUES (?, ?)",
    [from_system, to_system],
    () => res.json({ ok: true })
  );
});

app.delete("/api/connections", adminOnly, (req, res) => {
  const { from_system, to_system } = req.body;

  db.run(
    "DELETE FROM connections WHERE from_system=? AND to_system=?",
    [from_system, to_system],
    function () {
      res.json({ deleted: this.changes });
    }
  );
});

// ===============================
// MAP DATA (UTILISÉ PAR map.js)
// ===============================
app.get("/api/systems", (req, res) => {
  db.all("SELECT * FROM systems", (err, systems) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all("SELECT * FROM connections", (e1, connections) => {
      db.all("SELECT * FROM infrastructures", (e2, infrastructures) => {
        console.log("INFRASTRUCTURES FROM DB:", infrastructures);
        db.all("SELECT * FROM fleets", (e3, fleets) => {
          db.all("SELECT * FROM power", (e4, powers) => {

            systems.forEach(s => {
              s.powers = powers.filter(p => p.system_id === s.id);
            });

            res.json({
              systems,
              connections,
              infrastructures,
              fleets
            });
          });
        });
      });
    });
  });
});


app.get("/api/fleets", (req, res) => {

  const result = {};

  db.all("SELECT * FROM fleets", (err, fleets) => {
    if (err) return res.json({ error: err.message });

    result.fleets = fleets;

    db.all("SELECT id, name, type FROM systems", (err2, systems) => {
      if (err2) return res.json({ error: err2.message });

      result.systems = systems;

      res.json(result);
    });
  });

});

app.post("/api/fleet", (req, res) => {

  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  const { system_id, alliance_id, count } = req.body;

  db.run(
    `INSERT INTO fleets (system_id, alliance_id, count)
     VALUES (?, ?, ?)`,
    [system_id, alliance_id, count || 1],
    function(err) {

      if (err) {
        console.error(err);
        return res.json({ error: err.message });
      }

      res.json({
        ok: true,
        id: this.lastID
      });

    }
  );

});

//Route config
app.post("/api/config", (req, res) => { 
  if (req.session.role !== "admin") { 
    return res.status(403).json({ error: "Admin only" }); 
  } 
  
  const { key, value } = req.body; db.run( "UPDATE config SET value=? WHERE key=?", [value, key], err => { if (err) return res.json({ error: err.message }); res.json({ ok: true }); } 
);
});

app.get("/api/config", adminOnly, (req, res) => {
  db.all("SELECT * FROM config", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const result = {};
    rows.forEach(row => {
      result[row.key] = row.value;
    });

    res.json(result);
  });
});

//Mouvement d'une flotte
app.post("/api/fleet/move", (req, res) => {

  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  const { fleet_id, target_system_id } = req.body;

  db.run(
    "UPDATE fleets SET system_id=? WHERE id=?",
    [target_system_id, fleet_id],
    err => {
      if (err) return res.json({ error: err.message });
      res.json({ ok: true });
    }
  );

});

//Suppression flotte
app.delete("/api/fleet/:id", (req,res)=>{

  if (req.session.role !== "admin") {
    return res.status(403).json({ error:"Admin only"});
  }

  db.run("DELETE FROM fleets WHERE id=?", [req.params.id], ()=> {
    res.json({ok:true});
  });

});

// ---------- INFRASTRUCTURES ----------
app.post("/api/infrastructure", adminOnly, (req, res) => {
  const { system_id, slot_index, infrastructure_type_id, alliance_id, state } = req.body;

  if (!system_id || slot_index === undefined || !state) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  // ----- EMPTY -----
  if (state === "empty") {
    db.run(
      `UPDATE infrastructures
       SET infrastructure_type_id=NULL, alliance_id=NULL, state='empty'
       WHERE system_id=? AND slot_index=?`,
      [system_id, slot_index],
      err => err ? res.status(500).json({ error: err.message }) : res.json({ ok: true })
    );
    return;
  }

  // ----- DESTROYED -----
  if (state === "destroyed") {
    db.run(
      `UPDATE infrastructures
       SET infrastructure_type_id=NULL, alliance_id=NULL, state='destroyed'
       WHERE system_id=? AND slot_index=?`,
      [system_id, slot_index],
      err => err ? res.status(500).json({ error: err.message }) : res.json({ ok: true })
    );
    return;
  }

  // ----- ACTIVE -----
  if (!infrastructure_type_id || !alliance_id) {
    return res.status(400).json({ error: "infrastructure_type_id et alliance_id requis pour état actif" });
  }

  db.run(
    `INSERT INTO infrastructures (system_id, slot_index, infrastructure_type_id, alliance_id, state)
     VALUES (?, ?, ?, ?, 'active')
     ON CONFLICT(system_id, slot_index) DO UPDATE SET
       infrastructure_type_id=excluded.infrastructure_type_id,
       alliance_id=excluded.alliance_id,
       state='active'`,
    [system_id, slot_index, infrastructure_type_id, alliance_id],
    err => err ? res.status(500).json({ error: err.message }) : res.json({ ok: true })
  );
});

// ===============================
// ADMIN
// ===============================
app.post("/api/power", adminOnly, (req, res) => {
  const { system_id, alliance_id, value } = req.body;

  db.run(
    "UPDATE power SET value=? WHERE system_id=? AND alliance_id=?",
    [value, system_id, alliance_id],
    () => res.json({ ok: true })
  );
});

// ===============================
// FRONTEND (TOUJOURS À LA FIN)
// ===============================
app.use(express.static("public"));

// ===============================
app.listen(3000, () => {
  console.log("✔ Serveur lancé : http://localhost:3000");
});