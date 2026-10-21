"use strict";
const canvas = document.querySelector("#game"),
  ctx = canvas.getContext("2d"),
  mini = document.querySelector("#map"),
  mc = mini.getContext("2d");
const $ = (s) => document.querySelector(s),
  TAU = Math.PI * 2,
  WORLD = 3200,
  BLOCK = 400,
  ROAD = 104;
let width,
  height,
  dpr,
  clock = 0,
  last = 0,
  paused = false,
  dead = false,
  stage = 0,
  deliveries = 0,
  money = 0,
  wanted = 0,
  heat = 0,
  health = 100,
  inCar = null,
  toastUntil = 0,
  sound = false,
  audio;
const keys = {},
  player = { x: 1530, y: 1610, a: 0 },
  camera = { x: player.x, y: player.y },
  goal = { x: 2720, y: 1210 },
  cars = [],
  cops = [],
  people = [],
  buildings = [],
  palms = [],
  sparks = [];
let seed = 42;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function range(a, b) {
  return a + random() * (b - a);
}
function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  width = innerWidth;
  height = innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", resize);
resize();
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").classList.add("show");
  toastUntil = clock + 4;
}
function rect(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}
for (let x = 0; x < 7; x++) {
  for (let y = 0; y < 8; y++) {
    const bx = x * BLOCK + ROAD / 2 + 23,
      by = y * BLOCK + ROAD / 2 + 23;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        buildings.push({
          x: bx + i * 142,
          y: by + j * 142,
          w: range(100, 128),
          h: range(92, 123),
          color: ["#233640", "#2c3d43", "#34454a", "#28333f", "#3a4146"][
            Math.floor(random() * 5)
          ],
          neon: random() > 0.72,
        });
      }
    }
    for (let i = 0; i < 4; i++) {
      palms.push({
        x: x * BLOCK + 65 + i * 78,
        y: y * BLOCK + 63,
        a: range(0, TAU),
      });
    }
  }
}
function makeCar(x, y, a, color, traffic = false) {
  return { x, y, a, color, v: 0, traffic, turn: 0, damaged: 0 };
}
const missionCar = makeCar(1665, 1619, Math.PI / 2, "#e2ff86");
cars.push(missionCar);
for (let i = 0; i < 38; i++) {
  const horizontal = i % 2 === 0,
    lane = 1 + Math.floor(random() * 6);
  cars.push(
    makeCar(
      horizontal ? range(130, 2660) : lane * 400 + 22,
      horizontal ? lane * 400 - 22 : range(100, 3090),
      horizontal ? 0 : Math.PI / 2,
      ["#d37669", "#acc5be", "#cfba85", "#6e94b3", "#9f82ad"][i % 5],
      true,
    ),
  );
}
for (let i = 0; i < 65; i++) {
  const x = Math.floor(random() * 7) * 400 + 68;
  people.push({
    x,
    y: range(80, 3100),
    a: range(0, TAU),
    color: ["#ed9b85", "#9ccdbf", "#ceb987"][i % 3],
  });
}
function solid(x, y, r = 10) {
  if (x < 40 || x > 2775 || y < 40 || y > 3160) {
    return true;
  }
  return buildings.some(
    (b) => x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h,
  );
}
function move(o, dx, dy, r) {
  let hit = false;
  if (!solid(o.x + dx, o.y, r)) {
    o.x += dx;
  } else {
    hit = true;
  }
  if (!solid(o.x, o.y + dy, r)) {
    o.y += dy;
  } else {
    hit = true;
  }
  return hit;
}
function interact() {
  if (dead || paused) {
    return;
  }
  if (inCar) {
    let x = inCar.x - Math.sin(inCar.a) * 31,
      y = inCar.y + Math.cos(inCar.a) * 31;
    if (solid(x, y, 8)) {
      toast("Pas assez de place pour sortir ici.");
      return;
    }
    player.x = x;
    player.y = y;
    inCar.v = 0;
    inCar = null;
    toast("À pied · ZQSD ou flèches pour bouger");
  } else {
    let near = cars
      .filter((c) => Math.hypot(c.x - player.x, c.y - player.y) < 65)
      .sort(
        (a, b) =>
          Math.hypot(a.x - player.x, a.y - player.y) -
          Math.hypot(b.x - player.x, b.y - player.y),
      )[0];
    if (near) {
      inCar = near;
      near.traffic = false;
      if (near === missionCar && stage === 0) {
        stage = 1;
        toast("Voiture récupérée. Direction le garage du port !");
      } else {
        toast("Au volant · E pour sortir");
      }
    } else {
      toast("Approche-toi d’une voiture pour monter.");
    }
  }
}
function togglePause() {
  if (dead) {
    return;
  }
  paused = !paused;
  $("#overlay").classList.toggle("hidden", !paused);
}
addEventListener("keydown", (e) => {
  let k = e.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
    e.preventDefault();
  }
  if (!keys[k]) {
    if (k === "e") {
      interact();
    }
    if (k === "p" || k === "escape") {
      togglePause();
    }
  }
  keys[k] = true;
});
addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
addEventListener("blur", () => {
  Object.keys(keys).forEach((k) => (keys[k] = false));
  if (!paused && !dead) {
    togglePause();
  }
});
for (const b of document.querySelectorAll("[data-key]")) {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    const k = b.dataset.key;
    if (k === "e") {
      interact();
    }
    keys[k] = true;
  });
  for (const ev of ["pointerup", "pointercancel"]) {
    b.addEventListener(ev, () => (keys[b.dataset.key] = false));
  }
}
$("#resume").onclick = () => {
  if (dead) {
    health = 100;
    wanted = 0;
    heat = 0;
    player.x = 1530;
    player.y = 1610;
    if (inCar) {
      inCar.v = 0;
    }
    inCar = null;
    cops.length = 0;
    dead = false;
    paused = false;
    $("#overlay-title").textContent = "En pause.";
    $("#overlay-text").textContent = "La nuit est encore jeune.";
    $("#resume").textContent = "REPRENDRE LA COURSE ↗";
    $("#overlay").classList.add("hidden");
  } else {
    togglePause();
  }
};
$("#sound").onclick = () => {
  sound = !sound;
  $("#sound").textContent = "SON : " + (sound ? "ON" : "OFF");
  if (sound && !audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = 55;
    gain.gain.value = 0.025;
    osc.connect(gain).connect(audio.destination);
    osc.start();
    audio.engine = osc;
    audio.volume = gain;
  }
  if (audio) {
    audio.resume();
    audio.volume.gain.value = sound ? 0.025 : 0;
  }
};
function addHeat(n) {
  heat = Math.min(100, heat + n);
  wanted = Math.min(5, Math.ceil(heat / 20));
}
function update(dt) {
  clock += dt;
  if (clock > toastUntil) {
    $("#toast").classList.remove("show");
  }
  const up = keys.w || keys.z || keys.arrowup,
    down = keys.s || keys.arrowdown,
    left = keys.a || keys.q || keys.arrowleft,
    right = keys.d || keys.arrowright;
  if (inCar) {
    let c = inCar;
    c.v += (up ? 240 : down ? -160 : 0) * dt;
    c.v *= Math.pow(keys[" "] ? 0.12 : 0.58, dt);
    c.v = Math.max(-110, Math.min(410, c.v));
    c.a +=
      ((right ? 1 : 0) - (left ? 1 : 0)) *
      dt *
      2.6 *
      Math.min(1, Math.abs(c.v) / 65) *
      (c.v < 0 ? -1 : 1);
    if (move(c, Math.cos(c.a) * c.v * dt, Math.sin(c.a) * c.v * dt, 14)) {
      if (Math.abs(c.v) > 75) {
        health -= Math.abs(c.v) * 0.035;
        addHeat(4);
        for (let j = 0; j < 8; j++) {
          sparks.push({
            x: c.x,
            y: c.y,
            vx: range(-100, 100),
            vy: range(-100, 100),
            life: 0.4,
          });
        }
      }
      c.v *= -0.23;
    }
    player.x = c.x;
    player.y = c.y;
    player.a = c.a;
  } else {
    let dx = (right ? 1 : 0) - (left ? 1 : 0),
      dy = (down ? 1 : 0) - (up ? 1 : 0),
      len = Math.hypot(dx, dy);
    if (len) {
      player.a = Math.atan2(dy, dx);
      const speed = keys[" "] ? 200 : 120;
      move(player, (dx / len) * speed * dt, (dy / len) * speed * dt, 8);
    }
  }
  for (const c of cars) {
    if (c !== inCar && c.traffic) {
      c.v = 75;
      move(c, Math.cos(c.a) * c.v * dt, Math.sin(c.a) * c.v * dt, 14);
      if (c.x > 2740) {
        c.x = 70;
      }
      if (c.y > 3120) {
        c.y = 70;
      }
    }
    if (
      c !== inCar &&
      inCar &&
      Math.hypot(c.x - inCar.x, c.y - inCar.y) < 32 &&
      Math.abs(inCar.v) > 55
    ) {
      health -= 2;
      addHeat(8);
      inCar.v *= -0.4;
      toast("Collision signalée · La police te recherche");
    }
  }
  for (const p of people) {
    p.y += Math.sin(p.a) * dt * 15;
    if (p.y < 70 || p.y > 3120) {
      p.a += Math.PI;
    }
    if (
      inCar &&
      Math.hypot(p.x - player.x, p.y - player.y) < 20 &&
      Math.abs(inCar.v) > 40
    ) {
      addHeat(18);
      p.y += 65;
      inCar.v *= 0.7;
      toast("Conduite dangereuse signalée");
    }
  }
  heat = Math.max(0, heat - dt * 1.5);
  wanted = Math.min(5, Math.ceil(heat / 20));
  while (cops.length < wanted) {
    const a = range(0, TAU);
    cops.push({
      x: Math.max(55, Math.min(2750, player.x + Math.cos(a) * 550)),
      y: Math.max(55, Math.min(3150, player.y + Math.sin(a) * 550)),
      a: 0,
      v: 140,
      color: "#d4d9d7",
    });
  }
  if (!wanted) {
    cops.length = 0;
  }
  for (const c of cops) {
    c.a = Math.atan2(player.y - c.y, player.x - c.x);
    move(c, Math.cos(c.a) * 145 * dt, Math.sin(c.a) * 145 * dt, 13);
    if (Math.hypot(c.x - player.x, c.y - player.y) < 35) {
      health -= dt * 12;
      if (inCar) {
        inCar.v *= 0.98;
      }
    }
  }
  if (
    stage === 1 &&
    inCar === missionCar &&
    Math.hypot(player.x - goal.x, player.y - goal.y) < 75 &&
    Math.abs(inCar.v) < 75
  ) {
    money += 2500 + deliveries * 500;
    deliveries++;
    stage = 2;
    heat = Math.max(0, heat - 20);
    toast("Livraison réussie ! + $ " + (2000 + deliveries * 500));
    setTimeout(() => {
      if (stage === 2) {
        goal.x = deliveries % 2 ? 80 : 2720;
        goal.y = [810, 2410, 1610][deliveries % 3];
        stage = 1;
        toast("Nouveau contrat disponible · Rejoins le repère jaune");
      }
    }, 3500);
  }
  if (health <= 0) {
    health = 0;
    dead = true;
    paused = true;
    $("#overlay-title").textContent = "Fin de la cavale.";
    $("#overlay-text").textContent =
      `La ville a eu le dernier mot. Butin : $ ${money.toLocaleString("fr-FR")}. Reprends la route et tente une nouvelle livraison.`;
    $("#resume").textContent = "RETOURNER EN VILLE ↗";
    $("#overlay").classList.remove("hidden");
  }
  for (const s of sparks) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
  }
  while (sparks.length && sparks[0].life < 0) {
    sparks.shift();
  }
  camera.x += (player.x - camera.x) * Math.min(1, dt * 5);
  camera.y += (player.y - camera.y) * Math.min(1, dt * 5);
  $("#cash").textContent = "$ " + String(money).padStart(6, "0");
  $("#stars").textContent = "★".repeat(wanted) + "☆".repeat(5 - wanted);
  $("#health").style.width = health + "%";
  $("#hp").textContent = Math.ceil(health);
  $("#speed").textContent = String(
    inCar ? Math.round(Math.abs(inCar.v) * 0.37) : 0,
  ).padStart(2, "0");
  $("#mode").textContent = inCar ? "AU VOLANT" : "À PIED";
  $("#step").textContent = stage === 0 ? "01" : stage === 1 ? "02" : "✓";
  $("#objective").textContent =
    stage === 0
      ? "Rejoins la voiture de livraison"
      : stage === 1
        ? "Livre la voiture au repère jaune"
        : "Livraison réussie !";
  $("#brief").textContent =
    stage === 1
      ? "Garde la voiture en état. Ralentis dans la zone jaune du garage pour livrer."
      : stage === 2
        ? "Beau travail. Ton prochain contrat arrive…"
        : "Récupère la voiture au repère jaune, puis livre-la au garage du port.";
  $("#reward").textContent =
    "$ " + (2500 + deliveries * 500).toLocaleString("fr-FR");
  const target = stage === 0 ? missionCar : goal;
  $("#distance").textContent =
    Math.round(Math.hypot(target.x - player.x, target.y - player.y)) + " M";
  if (audio) {
    audio.engine.frequency.value = 45 + (inCar ? Math.abs(inCar.v) * 0.35 : 0);
  }
}
function drawCar(c, police = false) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.a);
  rect(-25, -11, 50, 26, "#0005");
  rect(-24, -13, 48, 26, c.color);
  rect(-12, -11, 22, 22, police ? "#233843" : "#253e47");
  rect(-10, -10, 6, 20, "#619294");
  rect(9, -10, 7, 20, "#405c68");
  rect(-22, -15, 10, 3, "#111c21");
  rect(12, -15, 9, 3, "#111c21");
  rect(-22, 12, 10, 3, "#111c21");
  rect(12, 12, 9, 3, "#111c21");
  rect(21, -11, 3, 6, "#fff6c3");
  rect(21, 5, 3, 6, "#fff6c3");
  rect(-24, -10, 3, 5, "#f16d6c");
  rect(-24, 5, 3, 5, "#f16d6c");
  if (police) {
    rect(-1, -10, 5, 10, Math.sin(clock * 15) > 0 ? "#4cafff" : "#fa606f");
    rect(-1, 0, 5, 10, Math.sin(clock * 15) > 0 ? "#fa606f" : "#4cafff");
  }
  if (c === inCar || c.traffic) {
    const beam = ctx.createLinearGradient(20, 0, 125, 0);
    beam.addColorStop(0, "#fff4b824");
    beam.addColorStop(1, "#fff4b800");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(20, -10);
    ctx.lineTo(140, -40);
    ctx.lineTo(140, 40);
    ctx.lineTo(20, 10);
    ctx.fill();
  }
  ctx.restore();
}
function marker(x, y, label) {
  const pulse = 5 * Math.sin(clock * 3);
  ctx.strokeStyle = "#ddff7f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 43 + pulse, 24 + pulse / 2, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "#dbff7717";
  ctx.fill();
  ctx.fillStyle = "#dbff77";
  ctx.beginPath();
  ctx.moveTo(x, y - 62 + Math.sin(clock * 3) * 5);
  ctx.lineTo(x - 9, y - 77 + Math.sin(clock * 3) * 5);
  ctx.lineTo(x + 9, y - 77 + Math.sin(clock * 3) * 5);
  ctx.fill();
  ctx.font = "bold 9px Inter,Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y - 88);
}
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rect(0, 0, width, height, "#142c35");
  ctx.save();
  ctx.translate(width / 2 - camera.x, height / 2 - camera.y);
  rect(0, 0, 2800, 3200, "#263b3d");
  // Coast and harbor
  rect(2800, 0, 400, 3200, "#133442");
  for (let y = 0; y < 3200; y += 32) {
    rect(2820 + (y % 96), y, 160, 1, "#477b8026");
  }
  rect(2780, 0, 22, 3200, "#9b948055");
  for (let y = 400; y < 3200; y += 800) {
    rect(2800, y, 210, 35, "#62686a");
    rect(2990, y - 40, 16, 110, "#5b6669");
  }
  for (let i = 0; i <= 8; i++) {
    rect(i * BLOCK - ROAD / 2, 0, ROAD, 3200, "#192a32");
    rect(0, i * BLOCK - ROAD / 2, 2800, ROAD, "#192a32");
    ctx.strokeStyle = "#b8b79a44";
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 20]);
    ctx.beginPath();
    ctx.moveTo(i * 400, 0);
    ctx.lineTo(i * 400, 3200);
    ctx.moveTo(0, i * 400);
    ctx.lineTo(2800, i * 400);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 8; j++) {
      for (let k = 0; k < 6; k++) {
        rect(i * 400 + 61, j * 400 - 36 + k * 12, 19, 5, "#a5b3a64d");
        rect(i * 400 - 36 + k * 12, j * 400 + 61, 5, 19, "#a5b3a64d");
      }
      rect(i * 400 + 54, j * 400 + 54, 288, 288, "#455451");
      rect(i * 400 + 61, j * 400 + 61, 274, 274, "#334442");
    }
  }
  for (const b of buildings) {
    if (
      Math.abs(b.x - camera.x) > width / 2 + 200 ||
      Math.abs(b.y - camera.y) > height / 2 + 200
    ) {
      continue;
    }
    rect(b.x + 12, b.y + 14, b.w, b.h, "#07131b77");
    rect(b.x, b.y, b.w, b.h, "#62706d");
    rect(b.x + 3, b.y + 3, b.w - 6, b.h - 6, b.color);
    rect(b.x + 10, b.y + 10, b.w - 20, b.h - 20, "#ffffff04");
    rect(b.x + 20, b.y + 20, 27, 29, "#162a33");
    rect(b.x + 22, b.y + 22, 23, 5, "#4e6062");
    for (let k = 0; k < 4; k++) {
      rect(b.x + b.w - 25, b.y + 20 + k * 6, 15, 2, "#182c33");
    }
    for (let k = 0; k < b.w - 10; k += 18) {
      rect(b.x + 8 + k, b.y + b.h - 3, 8, 3, "#f5d19c88");
    }
    if (b.neon) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = b.x % 3 > 1 ? "#ee89a3" : "#75d5ce";
      rect(b.x + 8, b.y + 3, b.w - 16, 2, ctx.shadowColor);
      ctx.shadowBlur = 0;
    }
  }
  ctx.font = "600 17px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#abc1b518";
  ctx.fillText("O C E A N   D R I V E", 2000, 1580);
  ctx.save();
  ctx.translate(2750, 1550);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("V I C E   H A R B O R", 0, 0);
  ctx.restore();
  for (const p of palms) {
    if (
      Math.abs(p.x - camera.x) > width / 2 + 100 ||
      Math.abs(p.y - camera.y) > height / 2 + 100
    ) {
      continue;
    }
    ctx.strokeStyle = "#090f1977";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 15, p.y + 20);
    ctx.stroke();
    ctx.strokeStyle = "#6d7964";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 3, p.y - 5);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      let a = p.a + (i * TAU) / 6;
      ctx.strokeStyle = i % 2 ? "#397d69" : "#296452";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(p.x - 3, p.y - 5);
      ctx.quadraticCurveTo(
        p.x + Math.cos(a) * 18,
        p.y + Math.sin(a) * 18 - 8,
        p.x + Math.cos(a) * 28,
        p.y + Math.sin(a) * 28,
      );
      ctx.stroke();
    }
  }
  for (const p of people) {
    ctx.fillStyle = "#0005";
    ctx.beginPath();
    ctx.ellipse(p.x + 3, p.y + 4, 5, 7, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, TAU);
    ctx.fill();
  }
  for (const c of cars) {
    drawCar(c);
  }
  for (const c of cops) {
    drawCar(c, true);
  }
  if (!inCar) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.a);
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#dbff7755";
    rect(-6, -6, 12, 12, "#e1e3c8");
    rect(-4, -6, 7, 12, "#d6ff85");
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ce9a7e";
    ctx.beginPath();
    ctx.arc(3, 0, 4, 0, TAU);
    ctx.fill();
    ctx.restore();
    const near = cars.some(
      (c) => Math.hypot(c.x - player.x, c.y - player.y) < 65,
    );
    if (near) {
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#e6ffad";
      ctx.fillText("[ E ] MONTER", player.x, player.y - 28);
    }
  }
  if (stage === 0) {
    marker(missionCar.x, missionCar.y, "LA VOITURE");
  } else {
    marker(
      goal.x,
      goal.y,
      stage === 2 ? "LIVRAISON RÉUSSIE" : "GARAGE / RALENTIR",
    );
  }
  for (const s of sparks) {
    rect(s.x, s.y, 3, 3, "#ffd992");
  }
  ctx.restore();
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.15,
    width / 2,
    height / 2,
    width * 0.75,
  );
  vignette.addColorStop(0, "#07121b00");
  vignette.addColorStop(1, "#040e1966");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  // Direction to the active objective, always visible beside the player.
  const target = stage === 0 ? missionCar : goal,
    angle = Math.atan2(target.y - player.y, target.x - player.x);
  if (Math.hypot(target.x - player.x, target.y - player.y) > 240) {
    ctx.save();
    ctx.translate(
      width / 2 + Math.cos(angle) * 100,
      height / 2 + Math.sin(angle) * 100,
    );
    ctx.rotate(angle);
    ctx.fillStyle = "#dbff77";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-5, -6);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 6);
    ctx.fill();
    ctx.restore();
  }
  drawMap();
}
function drawMap() {
  mc.fillStyle = "#142832";
  mc.fillRect(0, 0, 170, 170);
  const scale = 0.16;
  mc.save();
  mc.translate(85 - player.x * scale, 85 - player.y * scale);
  mc.fillStyle = "#344746";
  mc.fillRect(0, 0, 2800 * scale, 3200 * scale);
  mc.fillStyle = "#12212b";
  for (let i = 0; i <= 8; i++) {
    mc.fillRect((i * 400 - 52) * scale, 0, 104 * scale, 3200 * scale);
    mc.fillRect(0, (i * 400 - 52) * scale, 2800 * scale, 104 * scale);
  }
  const target = stage === 0 ? missionCar : goal;
  mc.strokeStyle = "#dbff7780";
  mc.lineWidth = 2;
  mc.setLineDash([3, 3]);
  mc.beginPath();
  mc.moveTo(player.x * scale, player.y * scale);
  mc.lineTo(target.x * scale, player.y * scale);
  mc.lineTo(target.x * scale, target.y * scale);
  mc.stroke();
  mc.setLineDash([]);
  mc.fillStyle = "#dbff77";
  mc.beginPath();
  mc.arc(target.x * scale, target.y * scale, 4, 0, TAU);
  mc.fill();
  for (const c of cops) {
    mc.fillStyle = "#ff707e";
    mc.fillRect(c.x * scale - 2, c.y * scale - 2, 4, 4);
  }
  mc.restore();
  mc.save();
  mc.translate(85, 85);
  mc.rotate(player.a);
  mc.fillStyle = "#f7f8e7";
  mc.beginPath();
  mc.moveTo(7, 0);
  mc.lineTo(-5, -4);
  mc.lineTo(-3, 0);
  mc.lineTo(-5, 4);
  mc.fill();
  mc.restore();
}
function frame(t) {
  let dt = Math.min((t - last) / 1000, 0.04);
  last = t;
  if (!paused) {
    update(dt);
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
toast("Bienvenue à Palm City · Rejoins le repère jaune");
