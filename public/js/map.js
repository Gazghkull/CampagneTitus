// ---------- CANVAS ----------
const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 50;
document.getElementById("map").appendChild(canvas);
const ctx = canvas.getContext("2d");

// ---------- RESIZE ----------
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 50;
  starCanvas.width = window.innerWidth;
  starCanvas.height = window.innerHeight - 50;
  generateSpaceBackground();
});

// ---------- IMAGES ----------
const planetImg = new Image();
planetImg.src = "images/planet.png";

const moonImg = new Image();
moonImg.src = "images/moon.png";

const fleetImgs = {
  1: new Image(),
  2: new Image(),
  3: new Image()
};

fleetImgs[1].src = "images/fleet_defense.png";
fleetImgs[2].src = "images/fleet_attack.png";
fleetImgs[3].src = "images/fleet_pirate.png";

const backgroundPlanet = new Image();
backgroundPlanet.src = "images/AtarPrime.png"; 

// ---------- DATA ----------
let data = null;
let editMode = false;
let draggedSystem = null;
let hoveredSystem = null;
let detailMenu = null;
let fleetRotation = 0; // angle global pour rotation des flottes

// ---------- CONSTS ----------
const INFRA_TYPES = {
  0: "Vide",
  1: "Forteresse",
  2: "Installation de soutien",
  3: "Base-relais",
  4: "Ligne de fortifications"
};

const ALLIANCES = {
  1: "Défenseur",
  2: "Envahisseur",
  3: "Pirate"
};

// ---------- ADMIN MODE ----------
let isAdmin = false;
const editBtn = document.getElementById("editModeBtn");
if (editBtn) {
  editBtn.onclick = () => {
    editMode = !editMode;
    editBtn.textContent = editMode ? "✔ Mode édition" : "✏️ Mode édition";
  };
}

// Vérifie le rôle de l’utilisateur
fetch("/api/me")
  .then(r => r.json())
  .then(json => {
    if (json.role === "admin") {
      isAdmin = true;
      if (editBtn) editBtn.style.display = "inline-block";
    } else {
      if (editBtn) editBtn.style.display = "none";
    }
  });

// ---------- CREATE IMMERSIVE SPACE BACKGROUND ----------
const starCanvas = document.createElement("canvas");
starCanvas.width = window.innerWidth;
starCanvas.height = window.innerHeight - 50;
const starCtx = starCanvas.getContext("2d");

function generateSpaceBackground() {
  const gradient = starCtx.createLinearGradient(0, 0, 0, starCanvas.height);
  gradient.addColorStop(0, "#000011");
  gradient.addColorStop(1, "#000022");
  starCtx.fillStyle = gradient;
  starCtx.fillRect(0, 0, starCanvas.width, starCanvas.height);

  const sunRadius = starCanvas.height / 3;
  const sunX = 0;
  const sunY = starCanvas.height / 2;
  const sunGrad = starCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
  sunGrad.addColorStop(0, "rgba(255, 255, 200, 1)");
  sunGrad.addColorStop(0.3, "rgba(255, 200, 50, 0.6)");
  sunGrad.addColorStop(0.6, "rgba(255, 100, 0, 0.3)");
  sunGrad.addColorStop(1, "rgba(0,0,0,0)");
  starCtx.fillStyle = sunGrad;
  starCtx.beginPath();
  starCtx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  starCtx.fill();

  for (let i = 0; i < 300; i++) {
    const x = Math.random() * starCanvas.width;
    const y = Math.random() * starCanvas.height;
    const radius = Math.random() * 1.5 + 0.3;
    const brightness = Math.random() * 0.6 + 0.4;
    starCtx.beginPath();
    starCtx.arc(x, y, radius, 0, Math.PI * 2);
    starCtx.fillStyle = `rgba(255,255,255,${brightness})`;
    starCtx.fill();
  }

  const nebulaCount = 3;
  for (let n = 0; n < nebulaCount; n++) {
    const x = Math.random() * starCanvas.width;
    const y = Math.random() * starCanvas.height;
    const radiusX = Math.random() * 200 + 100;
    const radiusY = Math.random() * 100 + 50;
    const grad = starCtx.createRadialGradient(x, y, 0, x, y, radiusX);
    grad.addColorStop(0, `rgba(100,50,200,0.1)`);
    grad.addColorStop(1, `rgba(0,0,0,0)`);
    starCtx.fillStyle = grad;
    starCtx.beginPath();
    starCtx.ellipse(x, y, radiusX, radiusY, 0, 0, 2 * Math.PI);
    starCtx.fill();
  }
}

// Génération initiale
generateSpaceBackground();

// ---------- FETCH DATA ----------
fetch("/api/systems")
  .then(r => r.json())
  .then(json => {
    data = json;
    animate(); // lance animation avec rotation flottes
  });

// ---------- ANIMATION LOOP ----------
function animate() {
  fleetRotation += 0.001;
  drawMap();
  requestAnimationFrame(animate);
}

// ---------- DRAW MAP ----------
function drawMap() {
  if (!data) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(starCanvas, 0, 0);

  const { systems, connections, fleets, infrastructures } = data;

  // Coordonnées fixes dans la map
  const bgPlanetX = 850; // x fixe
  const bgPlanetY = 600; // y fixe
  const bgPlanetSize = 100; // taille fixe

  ctx.drawImage(backgroundPlanet, bgPlanetX - bgPlanetSize/2, bgPlanetY - bgPlanetSize/2, bgPlanetSize, bgPlanetSize);
  ctx.globalAlpha = 1;

  // --- DRAW CONNECTIONS ---
  ctx.strokeStyle = "#888";
  ctx.setLineDash([5, 5]);
  connections.forEach(c => {
    const from = systems.find(s => s.id === c.from_system);
    const to = systems.find(s => s.id === c.to_system);
    if (!from || !to) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

// --- DRAW SYSTEMS ---
systems.forEach(s => {
  const img = s.type === "planet" ? planetImg : moonImg;
  const size = s.type === "planet" ? 65 : 50;
  ctx.drawImage(img, s.x - size / 2, s.y - size / 2, size, size);

  ctx.fillStyle = "#fff";
  ctx.font = "14px Arial";
  ctx.fillText(s.name, s.x - ctx.measureText(s.name).width / 2, s.y - 28);

  const offsetY = 35;

  // 🔹 Fix ordre des alliances : Défenseur, Envahisseur, Pirate
  const allianceOrder = [1, 2, 3]; // IDs fixes
  allianceOrder.forEach((allianceId, idx) => {
    const p = s.powers.find(power => power.alliance_id === allianceId) || { value: 0 };
    const colors = ["#00f","#f00","#0f0"];
    ctx.fillStyle = colors[allianceId - 1];
    ctx.fillRect(s.x - 20, s.y + offsetY + idx * 12, p.value * 10, 12);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(s.x - 20, s.y + offsetY + idx * 12, 40, 12);
  });
});

  // --- DRAW FLEETS ---
  systems.forEach(sys => {
    const fleetsHere = fleets.filter(f => f.system_id === sys.id);
    if (!fleetsHere.length) return;

    const radius = 70;
    const size = 30;

    let total = fleetsHere.reduce((sum, f) => sum + f.count, 0);
    let index = 0;

    fleetsHere.forEach(f => {
      const img = fleetImgs[f.alliance_id];
      if (!img) return;

      for (let i = 0; i < f.count; i++) {
        const angle = (index / total) * Math.PI * 2 + fleetRotation;
        const fx = sys.x + Math.cos(angle) * radius - size / 2;
        const fy = sys.y + Math.sin(angle) * radius - size / 2;
        ctx.drawImage(img, fx, fy, size, size);
        index++;
      }
    });
  });

  // --- HOVER INFRASTRUCTURES ---
  if (hoveredSystem) {
    for (let slotIndex = 0; slotIndex < hoveredSystem.infrastructure_slots; slotIndex++) {
      const infra = infrastructures.find(i => i.system_id === hoveredSystem.id && i.slot_index === slotIndex);
      let text = "Vide";
      if (infra) {
        if (infra.state === "destroyed") text = "Détruit";
        else if (infra.state === "active") {
          const infraName = INFRA_TYPES[infra.infrastructure_type_id] || "Infrastructure inconnue";
          const allianceName = ALLIANCES[infra.alliance_id] || "Alliance inconnue";
          text = `${infraName} (${allianceName})`;
        }
      }
      ctx.fillStyle = "#ff0";
      ctx.fillText(`Slot ${slotIndex + 1}: ${text}`, hoveredSystem.x + 25, hoveredSystem.y + slotIndex * 15);
    }
  }
}

// ---------- MOUSE INTERACTIONS ----------
canvas.addEventListener("mousemove", e => {
  const mx = e.offsetX;
  const my = e.offsetY;

  hoveredSystem = null;
  if (!data) return;

  data.systems.forEach(s => {
    if (mx > s.x - 20 && mx < s.x + 20 && my > s.y - 20 && my < s.y + 20) hoveredSystem = s;
  });

  if (editMode && draggedSystem) {
    draggedSystem.x = mx;
    draggedSystem.y = my;
  }

  drawMap();
});

canvas.addEventListener("mousedown", e => {
  if (!editMode) return;
  const mx = e.offsetX;
  const my = e.offsetY;
  draggedSystem = data.systems.find(s => mx > s.x - 20 && mx < s.x + 20 && my > s.y - 20 && my < s.y + 20) || null;
});

canvas.addEventListener("mouseup", () => {
  if (!draggedSystem) return;

  fetch("/api/system/position", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: draggedSystem.id, x: draggedSystem.x, y: draggedSystem.y })
  });

  draggedSystem = null;
});

// ---------- DOUBLE CLICK MENU ----------
canvas.addEventListener("dblclick", e => {
  if (!hoveredSystem || !isAdmin) return;
  showDetailMenu(hoveredSystem);
});

// ---------- SHOW DETAIL MENU ----------
function showDetailMenu(system) {
  if (detailMenu) detailMenu.remove();

  detailMenu = document.createElement("div");
  detailMenu.id = "detailMenu";
  detailMenu.style.position = "absolute";
  detailMenu.style.left = Math.min(window.innerWidth - 250, system.x + 50) + "px";
  detailMenu.style.top = Math.min(window.innerHeight - 200, system.y) + "px";
  detailMenu.style.background = "#222";
  detailMenu.style.color = "#fff";
  detailMenu.style.padding = "10px";
  detailMenu.style.border = "2px solid #fff";
  detailMenu.style.zIndex = 1000;
  detailMenu.style.minWidth = "250px";

  detailMenu.innerHTML = `<h3>${system.name}</h3>`;
  stopMenuPropagation(detailMenu);

// --- POWER CONTROL ---
const powerDiv = document.createElement("div");
powerDiv.innerHTML = "<b>Puissance par alliance :</b><br>";

// 🔹 Fix ordre des alliances
const allianceOrder = [1, 2, 3]; // Défenseur, Envahisseur, Pirate
allianceOrder.forEach(allianceId => {
  const p = system.powers.find(power => power.alliance_id === allianceId) || { value: 0 };
  const row = document.createElement("div");
  row.style.marginBottom = "5px";
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.innerHTML = `
    <button class="decrease">-</button>
    <span style="width:40px;text-align:center"> ${p.value} </span>
    <button class="increase">+</button>
    <span style="margin-left:5px">${ALLIANCES[allianceId]}</span>
  `;
  row.querySelector(".decrease").onclick = () => {
    if (p.value > 0) p.value--;
    updatePower(system.id, allianceId, p.value);
    drawMap();
    showDetailMenu(system);
  };
  row.querySelector(".increase").onclick = () => {
    if (p.value < 4) p.value++;
    updatePower(system.id, allianceId, p.value);
    drawMap();
    showDetailMenu(system);
  };
  powerDiv.appendChild(row);
});
detailMenu.appendChild(powerDiv);

  // --- INFRASTRUCTURE CONTROL ---
  if (isAdmin) {
    const infraDiv = document.createElement("div");
    infraDiv.innerHTML = "<b>Infrastructures :</b><br>";
    for (let i = 0; i < system.infrastructure_slots; i++) {
      const slot = document.createElement("button");
      slot.textContent = getSlotText(system, i);
      slot.style.margin = "3px";
      slot.onclick = () => showInfraMenu(system, i);
      infraDiv.appendChild(slot);
    }
    detailMenu.appendChild(infraDiv);
  }

  // --- FLEET CONTROL ---
  if (isAdmin) {
    const fleetDiv = document.createElement("div");
    fleetDiv.innerHTML = "<b>Flottes :</b><br>";
    const fleetsHere = data.fleets.filter(f => f.system_id === system.id);

    fleetsHere.forEach(f => {
      const btn = document.createElement("button");
      btn.textContent = `${ALLIANCES[f.alliance_id]}`;
      btn.style.margin = "3px";

      // 🔹 IMPORTANT : stop propagation pour éviter la fermeture du menu
      btn.addEventListener("click", e => {
        e.stopPropagation();
        showFleetMoveMenu(f, system);
      });

      fleetDiv.appendChild(btn);
    });
    detailMenu.appendChild(fleetDiv);
  }

  document.body.appendChild(detailMenu);
}

// ---------- MOVE FLEET MENU ----------
function showFleetMoveMenu(fleet, system) {
  if (!isAdmin) return;

  document.querySelectorAll(".fleetMoveMenu").forEach(m => m.remove());
  document.querySelectorAll(".infraMenu").forEach(m => m.remove());

  const menu = document.createElement("div");
  menu.className = "fleetMoveMenu";
  menu.style.position = "absolute";
  menu.style.background = "#222";
  menu.style.padding = "10px";
  menu.style.border = "2px solid white";
  menu.style.zIndex = 1200;

  // Positionner en dessous du detailMenu
  if (detailMenu) {
    const rect = detailMenu.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;       // même alignement horizontal que le menu principal
    menu.style.top = `${rect.bottom + 5}px`; // juste en dessous, 5px de marge
  } else {
    menu.style.left = "100px";
    menu.style.top = "100px";
  }

  stopMenuPropagation(menu);

  const title = document.createElement("div");
  title.textContent = "Déplacer vers :";
  title.style.marginBottom = "5px";
  menu.appendChild(title);

  data.systems.forEach(s => {
    const btn = document.createElement("button");
    btn.textContent = s.name;
    btn.style.margin = "3px";
    btn.addEventListener("click", e => {
      e.stopPropagation(); // empêche fermeture immédiate
      fetch("/api/fleet/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fleet_id: fleet.id, target_system_id: s.id })
      }).then(() => {
        fleet.system_id = s.id;
        drawMap();
        menu.remove();
        showDetailMenu(data.systems.find(sys => sys.id === s.id));
      });
    });
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  menu.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
// ---------- GET SLOT TEXT ----------
function getSlotText(system, index) {
  const infra = data.infrastructures.find(i => i.system_id === system.id && i.slot_index === index);
  if (!infra || infra.state === "empty") return "Vide";
  if (infra.state === "destroyed") return "Détruit";
  const infraName = INFRA_TYPES[infra.infrastructure_type_id] || "Infrastructure inconnue";
  const allianceName = ALLIANCES[infra.alliance_id] || "Alliance inconnue";
  return `${infraName} (${allianceName})`;
}

// ---------- SHOW INFRA MENU ----------
function showInfraMenu(system, index) {
  
  // Ferme tous les menus d’infrastructure existants
  document.querySelectorAll(".infraMenu").forEach(m => m.remove());
  document.querySelectorAll(".fleetMoveMenu").forEach(m => m.remove()); // fermer aussi menus flotte


  const menu = document.createElement("div");
  menu.className = "infraMenu";
  menu.style.position = "absolute";
  const rect = detailMenu.getBoundingClientRect();
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 5}px`;
  menu.style.background = "#333";
  menu.style.color = "#fff";
  menu.style.padding = "10px";
  menu.style.border = "2px solid #fff";
  menu.style.zIndex = 1100;

  stopMenuPropagation(menu);

  const infraLabel = document.createElement("div");
  infraLabel.textContent = "Choisir l'infrastructure :";
  infraLabel.style.marginBottom = "5px";
  menu.appendChild(infraLabel);

  const infraSelect = document.createElement("select");
  infraSelect.style.width = "100%";
  infraSelect.style.marginBottom = "10px";
  Object.keys(INFRA_TYPES).forEach(id => {
    if (id == 0) return;
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = INFRA_TYPES[id];
    infraSelect.appendChild(opt);
  });
  menu.appendChild(infraSelect);

  const allianceLabel = document.createElement("div");
  allianceLabel.textContent = "Choisir l'alliance :";
  allianceLabel.style.marginBottom = "5px";
  menu.appendChild(allianceLabel);

  const allianceSelect = document.createElement("select");
  allianceSelect.style.width = "100%";
  allianceSelect.style.marginBottom = "10px";
  Object.keys(ALLIANCES).forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = ALLIANCES[id];
    allianceSelect.appendChild(opt);
  });
  menu.appendChild(allianceSelect);

  const addBtn = document.createElement("button");
  addBtn.textContent = "Ajouter / Modifier";
  addBtn.style.width = "100%";
  addBtn.style.marginBottom = "5px";
  addBtn.onclick = () => {
    const infraChoice = parseInt(infraSelect.value);
    const allianceChoice = parseInt(allianceSelect.value);
    applyInfraChoice(system, index, infraChoice, allianceChoice, "active");
    menu.remove();
  };
  menu.appendChild(addBtn);

  const destroyBtn = document.createElement("button");
  destroyBtn.textContent = "Détruire";
  destroyBtn.style.width = "100%";
  destroyBtn.style.marginBottom = "5px";
  destroyBtn.onclick = () => {
    applyInfraChoice(system, index, null, null, "destroyed");
    menu.remove();
  };
  menu.appendChild(destroyBtn);

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "Supprimer";
  removeBtn.style.width = "100%";
  removeBtn.onclick = () => {
    applyInfraChoice(system, index, null, null, "empty");
    menu.remove();
  };
  menu.appendChild(removeBtn);

  document.body.appendChild(menu);
}

// ---------- APPLY INFRA ----------
function applyInfraChoice(system, index, infrastructure_type_id = null, alliance_id = null, state = "active") {
  if (infrastructure_type_id === 0) infrastructure_type_id = null;

  const infraIndex = data.infrastructures.findIndex(i => i.system_id === system.id && i.slot_index === index);
  const newInfra = { system_id: system.id, slot_index: index, infrastructure_type_id, alliance_id, state };

  if (infraIndex !== -1) data.infrastructures[infraIndex] = newInfra;
  else data.infrastructures.push(newInfra);

  fetch("/api/infrastructure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newInfra)
  })
  .then(r => r.json())
  .then(resp => {
    if (resp.error) console.error("❌ Erreur mise à jour infrastructure :", resp.error);
    drawMap();
    showDetailMenu(system);
  })
  .catch(err => console.error("❌ Erreur réseau :", err));
}

// ---------- UPDATE POWER ----------
function updatePower(system_id, alliance_id, value) {
  fetch("/api/power", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system_id, alliance_id, value })
  });
}

// ---------- CLOSE MENUS ON OUTSIDE CLICK ----------
document.addEventListener("click", e => {
  if (!detailMenu) return;
  const infraMenus = Array.from(document.querySelectorAll(".infraMenu"));
  if (!detailMenu.contains(e.target) && !infraMenus.some(menu => menu.contains(e.target))) {
    detailMenu.remove();
    detailMenu = null;
    infraMenus.forEach(menu => menu.remove());
  }
});

// ---------- STOP PROPAGATION ----------
function stopMenuPropagation(menuElement) {
  menuElement.addEventListener("click", e => e.stopPropagation());
}