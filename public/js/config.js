// ---------- ÉLÉMENTS DOM ----------
const connectionsList = document.getElementById("connectionsList");
const fromSelect = document.getElementById("from_system");
const toSelect = document.getElementById("to_system");
const addConnectionBtn = document.getElementById("addConnection");
const addSystemBtn = document.getElementById("addSystemBtn");

const nameInput = document.getElementById("name");
const typeSelect = document.getElementById("type");
const slotsInput = document.getElementById("slots");

const fleetMinus = document.getElementById("fleetMinus");
const fleetPlus = document.getElementById("fleetPlus");
const fleetCountSpan = document.getElementById("fleetCount");

// ---------- VARIABLES ----------
let MAX_FLEETS_PER_ALLIANCE = 0;

// ---------- FONCTION : MISE À JOUR BOUTONS ----------
function updateFleetButtons() {
  fleetCountSpan.textContent = MAX_FLEETS_PER_ALLIANCE;
  fleetMinus.disabled = MAX_FLEETS_PER_ALLIANCE <= 0;
}

// ---------- RÉCUPÉRATION CONFIG INITIALE ----------
fetch("/api/config")
  .then(r => r.json())
  .then(conf => {
    MAX_FLEETS_PER_ALLIANCE = parseInt(conf.max_fleets_per_alliance || 0);
    updateFleetButtons();
  });

// ---------- CHARGEMENT DES SYSTÈMES ----------
function loadSystems() {
  fetch("/api/systems")
    .then(r => r.json())
    .then(data => {
      const systems = data.systems || [];
      fromSelect.innerHTML = "";
      toSelect.innerHTML = "";

      systems.forEach(s => {
        const optFrom = document.createElement("option");
        optFrom.value = s.id;
        optFrom.textContent = s.name;
        fromSelect.appendChild(optFrom);

        const optTo = document.createElement("option");
        optTo.value = s.id;
        optTo.textContent = s.name;
        toSelect.appendChild(optTo);
      });

      loadConnections();
    });
}

// ---------- CHARGEMENT DES CONNEXIONS ----------
function loadConnections() {
  fetch("/api/connections")
    .then(r => r.json())
    .then(conns => {
      connectionsList.innerHTML = "";
      (conns || []).forEach(c => {
        const li = document.createElement("li");
        li.textContent = `Depuis ${c.from_system} → Vers ${c.to_system}`;

        const delBtn = document.createElement("button");
        delBtn.textContent = "Supprimer";
        delBtn.onclick = () => {
          fetch("/api/connections", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ from_system: c.from_system, to_system: c.to_system })
          }).then(() => loadConnections());
        };

        li.appendChild(delBtn);
        connectionsList.appendChild(li);
      });
    });
}

// ---------- AJOUT DE CONNEXION ----------
addConnectionBtn.onclick = () => {
  const from_system = fromSelect.value;
  const to_system = toSelect.value;
  if (!from_system || !to_system) return alert("Sélectionner les deux systèmes");

  fetch("/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from_system, to_system })
  }).then(() => loadConnections());
};

// ---------- AJOUT DE SYSTEME ----------
addSystemBtn.onclick = () => {
  const name = nameInput.value.trim();
  const type = typeSelect.value;
  const slots = parseInt(slotsInput.value);
  if (!name || !type || isNaN(slots)) return alert("Remplir tous les champs correctement");

  fetch("/api/system", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type, slots })
  })
    .then(r => r.json())
    .then(() => {
      nameInput.value = "";
      slotsInput.value = "";
      loadSystems();
    });
};

// ---------- AJUSTEMENT DU NOMBRE DE FLETTES ----------
function adjustFleets(newMax) {
  fetch("/api/fleets")
    .then(r => r.json())
    .then(data => {
      const fleets = data.fleets || [];
      const systems = data.systems || [];

      [1, 2, 3].forEach(alliance => {
        const allianceFleets = fleets.filter(f => f.alliance_id == alliance);

        // Trop de flottes → suppression
        if (allianceFleets.length > newMax) {
          const toDelete = allianceFleets.slice(newMax);
          toDelete.forEach(f => {
            fetch("/api/fleet/" + f.id, { method: "DELETE" });
          });
        }

        // Pas assez → création
        if (allianceFleets.length < newMax) {
          const missing = newMax - allianceFleets.length;
          for (let i = 0; i < missing; i++) {
            const randomSystem = systems[Math.floor(Math.random() * systems.length)];
            if (!randomSystem) continue;
            fetch("/api/fleet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                alliance_id: alliance,
                system_id: randomSystem.id,
                count: 1
              })
            });
          }
        }
      });
    });
}

// ---------- BOUTON + ----------
fleetPlus.onclick = () => {
  MAX_FLEETS_PER_ALLIANCE++;
  updateFleetButtons();

  fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: "max_fleets_per_alliance",
      value: MAX_FLEETS_PER_ALLIANCE
    })
  });

  adjustFleets(MAX_FLEETS_PER_ALLIANCE);
};

// ---------- BOUTON - ----------
fleetMinus.onclick = () => {
  if (MAX_FLEETS_PER_ALLIANCE <= 0) return; // sécurité
  MAX_FLEETS_PER_ALLIANCE--;
  updateFleetButtons();

  fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: "max_fleets_per_alliance",
      value: MAX_FLEETS_PER_ALLIANCE
    })
  });

  adjustFleets(MAX_FLEETS_PER_ALLIANCE);
};

// ---------- INITIALISATION ----------
loadSystems();