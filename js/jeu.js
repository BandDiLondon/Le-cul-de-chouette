// ---------- Constantes ----------
const CIBLE = 343;
const PAS_MOU = "Pas mou le caillou !";
const GRELOTTE = "Grelotte ça picote !";
const OISEAUX = ["", "Linotte", "Alouette", "Fauvette", "Mouette", "Bergeronnette", "Chouette"];
const NOMS = {
  neant: "Néant", chouette: "Chouette", velute: "Velute",
  "chouette-velute": "Chouette-Velute", suite: "Suite", cul: "Cul de Chouette"
};
// Nombre de lancers sur 216 qui satisfont chaque pari (Chouette et Velute incluent la Chouette-Velute)
const CHANCES = { chouette: 90, velute: 39, suite: 24, cul: 6, neant: 66 };
const PLAFOND_DEFI = { chouette: 0.33, velute: 0.25, cul: 0.16 };
const MISE_CIVET = 102;
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const ADVERSAIRES = {
  karadoc:  { nom: "Karadoc",  reflexe: [1300, 2400], style: "hasard" },
  arthur:   { nom: "Arthur",   reflexe: [850, 1600],  style: "calcul" },
  perceval: { nom: "Perceval", reflexe: [550, 1050],  style: "calcul" }
};

const $ = id => document.getElementById(id);
const elDes = [$("de-0"), $("de-1"), $("de-2")];
const actions = $("actions");
const journal = $("journal");

// ---------- Annulation d'une partie en cours ----------
// Chaque attente est liée au jeton de la partie : si une nouvelle partie démarre, l'ancienne boucle s'arrête.
const ABANDON = Symbol("abandon");
let jeton = 0;
function garde(promesse) {
  const j = jeton;
  return promesse.then(v => { if (j !== jeton) throw ABANDON; return v; });
}
const pause = ms => garde(new Promise(r => setTimeout(r, ms)));

// ---------- Outils ----------
const jet = () => Math.floor(Math.random() * 6) + 1;
const hasard = (min, max) => min + Math.random() * (max - min);
const auHasard = liste => liste[Math.floor(Math.random() * liste.length)];
const pct = n => Math.round(n / 216 * 100) + " %";
const signe = n => (n >= 0 ? "+" : "−") + Math.abs(n);

function dessinerDe(el, v) {
  el.innerHTML = "";
  el.classList.toggle("vide", !v);
  for (let i = 0; i < 9; i++) {
    const pip = document.createElement("div");
    pip.className = "pip" + (v && PIPS[v].includes(i) ? " on" : "");
    el.appendChild(pip);
  }
  el.setAttribute("aria-label", v ? "Dé : " + v : "Dé non lancé");
}

function log(texte, classe = "") {
  const p = document.createElement("p");
  p.textContent = texte;
  if (classe) p.className = classe;
  journal.appendChild(p);
  journal.scrollTop = journal.scrollHeight;
}

// ---------- Règles ----------
function analyser(des) {
  const [a, b, c] = [...des].sort((x, y) => x - y);
  if (a === c) return "cul";
  const paire = a === b || b === c;
  const velute = a + b === c;
  if (paire && velute) return "chouette-velute";
  if (b === a + 1 && c === b + 1) return "suite";
  if (velute) return "velute";
  if (paire) return "chouette";
  return "neant";
}

// Dans trois dés triés contenant une paire, celui du milieu en fait toujours partie
const valeurPaire = des => [...des].sort((x, y) => x - y)[1];

function points(des, combi) {
  const [a, , c] = [...des].sort((x, y) => x - y);
  switch (combi) {
    case "chouette": { const v = valeurPaire(des); return v * v; }
    case "velute":
    case "chouette-velute": return 2 * c * c;
    case "cul": return 40 + 10 * a;
    default: return 0;
  }
}

function correspond(combi, pari) {
  if (pari === "chouette") return combi === "chouette" || combi === "chouette-velute";
  if (pari === "velute") return combi === "velute" || combi === "chouette-velute";
  return combi === pari;
}

function plafondDefi(a, b, combi) {
  const base = Math.max(0, Math.min(a.score, b.score));
  return Math.max(5, Math.floor(base * PLAFOND_DEFI[combi]));
}

// ---------- État de la partie ----------
let P = null;
let reglages = chargerReglages();
// Règles de la partie en cours : celles des réglages, ou celles imposées par le tutoriel
let regles = { ...reglages };

function chargerReglages() {
  const defaut = { nom: "Vous", adv: "arthur", pile: true, aide: true, conseils: false };
  try { return { ...defaut, ...JSON.parse(localStorage.getItem("cdc-reglages") || "{}") }; }
  catch { return defaut; }
}
function sauverReglages() {
  try { localStorage.setItem("cdc-reglages", JSON.stringify(reglages)); } catch {}
}

function nouvellePartie(tuto = false) {
  jeton++;
  fermerReflexe();
  cacherBulle();
  regles = tuto ? { ...reglages, adv: "arthur", pile: true, aide: true, conseils: true } : { ...reglages };
  const profil = ADVERSAIRES[regles.adv];
  P = {
    joueurs: [
      { nom: regles.nom.trim() || "Vous", score: 0, grelottine: false, civet: true, ia: false },
      { nom: profil.nom, score: 0, grelottine: false, civet: true, ia: true, profil }
    ],
    courant: 0,
    tour: 1,
    tuto,
    script: tuto ? SCENARIO_TUTO.map(d => [...d]) : [],
    vus: new Set(),
    recul: false
  };
  journal.innerHTML = "";
  elDes.forEach(el => { dessinerDe(el, 0); el.classList.remove("surligne"); });
  $("combinaison").innerHTML = "&nbsp;";
  log(tuto ? `Tutoriel contre ${profil.nom}.` : `Partie contre ${profil.nom}. ${regles.pile ? "Il faut tomber sur 343 pile." : "Le premier à 343 gagne."}`, "info");
  majScores();
  boucle().catch(e => { if (e !== ABANDON) throw e; });
}

function majScores() {
  P.joueurs.forEach((j, i) => {
    $("nom-" + i).textContent = j.nom;
    $("score-" + i).textContent = j.score;
    $("barre-" + i).style.width = Math.max(0, Math.min(100, j.score / CIBLE * 100)) + "%";
    $("carte-" + i).classList.toggle("actif", i === P.courant);
    const badges = $("badges-" + i);
    badges.innerHTML = "";
    const g = document.createElement("span");
    g.className = "badge" + (j.grelottine ? "" : " off");
    g.textContent = "🔔 Grelottine";
    g.title = j.grelottine ? "Peut défier l'adversaire avant son tour" : "Gagnée en faisant un Néant";
    const c = document.createElement("span");
    c.className = "badge" + (j.civet ? "" : " off");
    c.textContent = "🐇 Civet";
    c.title = j.civet ? "Pari disponible une fois par partie" : "Civet déjà utilisé";
    badges.append(g, c);
  });
}

function flottant(i, n) {
  const s = document.createElement("div");
  s.className = "flottant " + (n > 0 ? "plus" : "moins");
  s.textContent = signe(n);
  $("carte-" + i).appendChild(s);
  setTimeout(() => s.remove(), 1400);
}

function ajouter(j, n, motif) {
  if (!n) return;
  let nv = j.score + n;
  log(`${j.nom} : ${signe(n)} (${motif})`, n > 0 ? "gain" : "perte");
  if (regles.pile && nv > CIBLE) {
    const exces = nv - CIBLE;
    nv = CIBLE - exces;
    P.recul = true;
    log(`${j.nom} dépasse 343 de ${exces} et redescend à ${nv}.`, "alerte");
  }
  j.score = nv;
  flottant(P.joueurs.indexOf(j), n);
  Sons.jouer(n > 0 ? "gain" : "perte");
  majScores();
}

function gagnant() {
  const atteint = j => regles.pile ? j.score === CIBLE : j.score >= CIBLE;
  const c = P.joueurs[P.courant];
  if (atteint(c)) return c;
  return P.joueurs.find(atteint) || null;
}

// ---------- Interface des choix ----------
function choisir(question, options, serres = false) {
  return garde(new Promise(resoudre => {
    actions.innerHTML = "";
    if (question) {
      const q = document.createElement("div");
      q.className = "question";
      q.textContent = question;
      actions.appendChild(q);
    }
    const zone = document.createElement("div");
    zone.className = "boutons" + (serres ? " serres" : "");
    for (const o of options) {
      const b = document.createElement("button");
      b.textContent = o.label;
      if (o.classe) b.className = o.classe;
      b.onclick = () => { actions.innerHTML = ""; cacherBulle(); resoudre(o.val); };
      zone.appendChild(b);
    }
    actions.appendChild(zone);
  }));
}

function choisirMise(question, max, defaut = Math.ceil(max / 2)) {
  return garde(new Promise(resoudre => {
    actions.innerHTML = "";
    const q = document.createElement("div");
    q.className = "question";
    q.textContent = question;
    const ligne = document.createElement("div");
    ligne.className = "mise";
    const curseur = document.createElement("input");
    curseur.type = "range"; curseur.min = 1; curseur.max = max; curseur.value = defaut;
    const sortie = document.createElement("output");
    sortie.textContent = curseur.value;
    curseur.oninput = () => { sortie.textContent = curseur.value; };
    ligne.append(curseur, sortie);
    const b = document.createElement("button");
    b.className = "vert";
    b.textContent = "Valider la mise";
    b.onclick = () => { actions.innerHTML = ""; cacherBulle(); resoudre(Number(curseur.value)); };
    actions.append(q, ligne, b);
  }));
}

function attente(texte) {
  actions.innerHTML = "";
  const d = document.createElement("div");
  d.className = "attente";
  d.textContent = texte;
  actions.appendChild(d);
}

function annoncer(combi) {
  const el = $("combinaison");
  el.textContent = combi ? NOMS[combi] + (combi === "neant" ? "…" : " !") : " ";
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
}

function surligner(des, combi) {
  elDes.forEach(el => el.classList.remove("surligne"));
  if (combi === "chouette") {
    const v = valeurPaire(des);
    des.forEach((d, i) => { if (d === v) elDes[i].classList.add("surligne"); });
  } else if (combi !== "neant") {
    elDes.forEach(el => el.classList.add("surligne"));
  }
}

// ---------- Dés ----------
function animer(indices, valeurs, duree) {
  const j0 = jeton;
  return garde(new Promise(resoudre => {
    indices.forEach(i => { elDes[i].classList.add("roule"); elDes[i].classList.remove("surligne"); });
    Sons.jouer("secoue", duree / 1000);
    const iv = setInterval(() => indices.forEach(i => dessinerDe(elDes[i], jet())), 70);
    setTimeout(() => {
      clearInterval(iv);
      indices.forEach(i => elDes[i].classList.remove("roule"));
      if (j0 === jeton) {
        indices.forEach(i => dessinerDe(elDes[i], valeurs[i]));
        Sons.jouer("pose");
      }
      resoudre();
    }, duree);
  }));
}

async function lancerDes() {
  const des = P.script.length ? P.script.shift() : [jet(), jet(), jet()];
  annoncer(null);
  await animer([0, 1], des, 600);
  await pause(150);
  await animer([2], des, 500);
  return des;
}

// ---------- Réflexes ----------
let minuteurReflexe = null;

function fermerReflexe() {
  clearTimeout(minuteurReflexe);
  $("fen-reflexe").classList.remove("ouvert");
}

function texteReflexe(id, texte) {
  const el = $(id);
  el.hidden = !texte;
  el.innerHTML = texte ? formater(texte) : "";
}

// Bouton unique en bas de la fenêtre de réflexe ; la promesse se résout au clic
function boutonReflexe(texte, classe = "") {
  return garde(new Promise(resoudre => {
    const pied = $("reflexe-pied");
    pied.innerHTML = "";
    const b = document.createElement("button");
    b.textContent = texte;
    b.className = classe;
    b.onclick = () => { pied.innerHTML = ""; resoudre(); };
    pied.appendChild(b);
    b.focus();
  }));
}

// Trois phases dans la même fenêtre : préparation (première fois, avec conseils), duel, résultat.
// Renvoie { res: "humain" (bon cri en premier) | "ia" (l'adversaire a crié avant) | "bevue", ms, delaiIA, cri }
async function reflexe(combi, des, lanceur, ia) {
  const attendu = combi === "suite" ? GRELOTTE : PAS_MOU;
  // Les deux premiers réflexes du tutoriel laissent plus de temps pour apprendre
  const lent = P.tuto && P.tour <= 2 ? 1.8 : 1;
  const [min, max] = ia.profil.reflexe.map(x => x * lent);
  const delaiIA = hasard(min, max);
  const premiere = regles.conseils && !P.vus.has("reflexe-" + combi);

  $("reflexe-titre").textContent = premiere ? "Préparez-vous !" : "RÉFLEXE !";
  $("reflexe-indice").textContent = regles.aide ? NOMS[combi] + " !" : "Quel est le bon cri ?";
  const zoneDes = $("reflexe-des");
  zoneDes.innerHTML = "";
  des.forEach((v, i) => {
    const d = document.createElement("div");
    d.className = "de" + (i === 2 ? " cul" : "");
    dessinerDe(d, v);
    zoneDes.appendChild(d);
  });
  $("reflexe-cris").innerHTML = "";
  $("reflexe-pied").innerHTML = "";
  $("reflexe-decompte").hidden = true;
  texteReflexe("reflexe-resultat", "");
  $("fen-reflexe").classList.add("ouvert");

  if (premiere) {
    P.vus.add("reflexe-" + combi);
    texteReflexe("reflexe-explication", explicationReflexe(combi, des, lanceur, ia, min, max));
    await boutonReflexe("Je suis prêt !", "vert");
    texteReflexe("reflexe-explication", "");
    const decompte = $("reflexe-decompte");
    decompte.hidden = false;
    for (const n of ["3", "2", "1"]) { decompte.textContent = n; Sons.jouer("tic"); await pause(650); }
    decompte.hidden = true;
    Sons.jouer("go");
    $("reflexe-titre").textContent = "RÉFLEXE !";
  }
  texteReflexe("reflexe-explication", regles.conseils ? rappelReflexe(combi, des) : "");

  const r = await duel(attendu, delaiIA);
  const geste = cri => cri === GRELOTTE ? "poing" : "genoux";
  if (r.res === "humain") { Sons.jouer(geste(attendu)); Sons.jouer("bon"); Sons.dire(attendu); }
  else if (r.res === "bevue") { Sons.jouer(geste(r.cri)); Sons.jouer("bevue"); Sons.dire(r.cri); }
  else { Sons.jouer(geste(attendu)); Sons.jouer("lent"); Sons.dire(attendu, true); }

  $("reflexe-titre").textContent = { humain: "Bien joué !", ia: "Trop lent !", bevue: "Bévue !" }[r.res];
  texteReflexe("reflexe-explication", "");
  for (const b of $("reflexe-cris").children) {
    b.disabled = true;
    if (b.dataset.cri === attendu) b.classList.add("juste");
    else if (b.dataset.cri === r.cri) b.classList.add("faux");
  }
  texteReflexe("reflexe-resultat", resultatReflexe(combi, des, r, ia));
  await boutonReflexe("Continuer");
  fermerReflexe();
  return r;
}

function duel(attendu, delaiIA) {
  return garde(new Promise(resoudre => {
    const cris = $("reflexe-cris");
    const debut = performance.now();
    let fini = false;
    const terminer = r => {
      if (fini) return;
      fini = true;
      clearTimeout(minuteurReflexe);
      resoudre({ ...r, delaiIA });
    };
    for (const cri of Math.random() < 0.5 ? [PAS_MOU, GRELOTTE] : [GRELOTTE, PAS_MOU]) {
      const b = document.createElement("button");
      b.textContent = "« " + cri + " »";
      b.dataset.cri = cri;
      b.onclick = () => terminer({ res: cri === attendu ? "humain" : "bevue", ms: performance.now() - debut, cri });
      cris.appendChild(b);
    }
    minuteurReflexe = setTimeout(() => terminer({ res: "ia", ms: delaiIA, cri: null }), delaiIA);
  }));
}

// ---------- Déroulement d'un tour ----------
async function boucle() {
  if (P.tuto) await expliquer("intro");
  while (true) {
    const j = P.joueurs[P.courant];
    const adv = P.joueurs[1 - P.courant];
    majScores();
    if (P.courant === 0) log(`Tour ${P.tour}`, "tour");
    $("banniere").textContent = j.ia ? `Au tour de ${j.nom}` : `À vous de jouer, ${j.nom}`;

    // 1. L'adversaire peut lancer un défi avec sa Grelottine
    let defi = null;
    if (adv.grelottine && !adv.ia) await expliquer("defi");
    if (adv.grelottine) defi = adv.ia ? defiIA(adv, j) : await defiHumain(adv, j);
    if (defi) {
      adv.grelottine = false;
      majScores();
      log(`🔔 « Grelottine ! » ${adv.nom} défie ${j.nom} sur une ${NOMS[defi.combi]} (mise : ${defi.mise}).`, "alerte");
      Sons.jouer("grelot");
      Sons.dire("Grelottine !", adv.ia);
      if (!j.ia) await expliquer("defi-subi");
    }

    // 2. Civet éventuel, puis lancer
    let civet = null;
    if (j.ia) {
      attente(`${j.nom} réfléchit…`);
      await pause(defi ? 1200 : 800);
      civet = civetIA(j);
    } else {
      if (j.civet && P.tour >= 4) await expliquer(P.tuto ? "civet-tuto" : "civet");
      const opts = [{ label: "🎲 Lancer les dés", val: "lancer", classe: "" }];
      if (j.civet) opts.push({ label: "🐇 Annoncer un Civet", val: "civet", classe: "second" });
      conseilAvantLancer(j);
      if (await choisir("", opts) === "civet") civet = await civetHumain(j);
    }
    if (civet) {
      j.civet = false;
      majScores();
      log(`🐇 « Civet ! » ${j.nom} mise ${civet.mise} pts sur : ${NOMS[civet.combi]}.`, "alerte");
      Sons.jouer("civet");
      Sons.dire("Civet !", j.ia);
    }
    if (j.ia) attente(`${j.nom} lance les dés…`);

    const des = await lancerDes();
    const combi = analyser(des);
    log(`🎲 ${j.nom} : ${des.join(" · ")} → ${NOMS[combi]}`);
    annoncer(combi);
    surligner(des, combi);
    Sons.jouer(combi);
    await pause(combi === "suite" || combi === "chouette-velute" ? 250 : 500);
    await expliquer(combi);

    await resoudreCombinaison(j, adv, des, combi);

    // 3. Paris du tour, jugés sur le lancer initial
    if (civet) {
      if (correspond(combi, civet.combi)) ajouter(j, civet.mise, "Civet gagné");
      else ajouter(j, -civet.mise, "Civet perdu");
    }
    if (defi) {
      if (correspond(combi, defi.combi)) {
        log(`${j.nom} relève le défi !`, "info");
        ajouter(j, defi.mise, "défi relevé");
        ajouter(adv, -defi.mise, "Grelottine perdue");
      } else {
        log(`${j.nom} échoue au défi.`, "info");
        ajouter(adv, defi.mise, "Grelottine gagnée");
        ajouter(j, -defi.mise, "défi raté");
      }
    }

    if (P.recul) await expliquer("depassement");

    const g = gagnant();
    if (g) return finDePartie(g);
    if (P.tuto && !P.script.length) await expliquer("fin");

    P.courant = 1 - P.courant;
    if (P.courant === 0) P.tour++;
    attente("…");
    await pause(900);
  }
}

async function resoudreCombinaison(j, adv, des, combi) {
  const humain = j.ia ? adv : j;
  const ia = j.ia ? j : adv;
  switch (combi) {
    case "neant":
      if (j.grelottine) log(`${j.nom} a déjà une Grelottine.`, "info");
      else { j.grelottine = true; majScores(); log(`🔔 ${j.nom} reçoit une Grelottine.`, "info"); Sons.jouer("grelot"); }
      break;

    case "velute":
    case "cul":
      ajouter(j, points(des, combi), NOMS[combi]);
      break;

    case "chouette":
      await sirotage(j, adv, des);
      break;

    case "suite": {
      const r = await reflexe(combi, des, j, ia);
      if (r.res === "humain") {
        log(`« ${GRELOTTE} » en ${(r.ms / 1000).toFixed(2)} s. ${ia.nom} est le dernier !`, "info");
        ajouter(ia, -10, "dernier sur la Suite");
      } else if (r.res === "ia") {
        log(`${ia.nom} frappe la table avant vous !`, "info");
        ajouter(humain, -10, "dernier sur la Suite");
      } else {
        log(`Mauvais cri ! C'était « ${GRELOTTE} ».`, "alerte");
        ajouter(humain, -10, "Bévue");
      }
      break;
    }

    case "chouette-velute": {
      const pts = points(des, combi);
      const r = await reflexe(combi, des, j, ia);
      if (r.res === "humain") {
        log(`« ${PAS_MOU} » en ${(r.ms / 1000).toFixed(2)} s !`, "info");
        ajouter(humain, pts, "Chouette-Velute");
      } else if (r.res === "ia") {
        log(`${ia.nom} se tape les genoux le premier !`, "info");
        ajouter(ia, pts, "Chouette-Velute");
      } else {
        log(`Mauvais cri ! C'était « ${PAS_MOU} ».`, "alerte");
        ajouter(humain, -10, "Bévue");
        ajouter(ia, pts, "Chouette-Velute");
      }
      break;
    }
  }
}

async function sirotage(j, adv, des) {
  const v = valeurPaire(des);
  const pts = v * v;
  const gainCul = 40 + 10 * v;

  let siroter;
  if (j.ia) {
    siroter = siroterIA(j, adv, v);
    await pause(600);
  } else {
    conseiller(conseilSirotage(j, v));
    siroter = await choisir(`Chouette de ${v} ! La garder ou la siroter ?`, [
      { label: `Garder (+${pts})`, val: false, classe: "second" },
      { label: `Siroter (+${gainCul} ou −${pts})`, val: true, classe: "" }
    ]);
  }
  if (!siroter) {
    ajouter(j, pts, `Chouette de ${v}`);
    return;
  }

  log(`🍷 ${j.nom} sirote sa Chouette de ${v}…`, "info");
  Sons.jouer("sirote");
  let pari;
  if (adv.ia) {
    pari = jet();
    log(`${adv.nom} crie « ${OISEAUX[pari]} ! »`, "info");
    Sons.jouer("oiseau");
    Sons.dire(OISEAUX[pari] + " !", true);
  } else {
    await expliquer("oiseaux");
    conseiller(conseilOiseaux());
    pari = await choisir(`${j.nom} sirote ! Pariez sur le dé relancé (+25 si juste) :`,
      [1, 2, 3, 4, 5, 6].map(n => ({ label: `${n} · ${OISEAUX[n]}`, val: n, classe: "second" }))
        .concat([{ label: "Pas de pari", val: 0, classe: "second" }]), true);
    if (pari) {
      log(`Vous criez « ${OISEAUX[pari]} ! »`, "info");
      Sons.jouer("oiseau");
      Sons.dire(OISEAUX[pari] + " !");
    }
  }
  if (j.ia) attente(`${j.nom} relance le dé…`);

  const seul = des.findIndex(d => d !== v);
  const nouveau = jet();
  des[seul] = nouveau;
  await animer([seul], des, 700);

  if (nouveau === v) {
    annoncer("cul");
    Sons.jouer("cul");
    surligner(des, "cul");
    log(`✨ Le dé tombe sur ${nouveau} : Cul de Chouette !`, "info");
    ajouter(j, gainCul, "Sirotage réussi");
  } else {
    $("combinaison").textContent = "Sirotage raté…";
    Sons.jouer("neant");
    log(`Le dé tombe sur ${nouveau}. Raté !`, "info");
    ajouter(j, -pts, "Sirotage raté");
  }
  if (pari && pari === nouveau) ajouter(adv, 25, `pari « ${OISEAUX[pari]} »`);
  await pause(400);
}

// ---------- Décisions du joueur ----------
async function defiHumain(grelottin, cible) {
  conseiller(conseilDefi(grelottin, cible));
  const ok = await choisir(`Utiliser votre Grelottine pour défier ${cible.nom} avant son lancer ?`, [
    { label: "Garder la Grelottine", val: false, classe: "second" },
    { label: `🔔 Défier ${cible.nom}`, val: true, classe: "" }
  ]);
  if (!ok) return null;
  conseiller(conseilDefi(grelottin, cible));
  const combi = await choisir(`Sur quelle combinaison défier ${cible.nom} ? (vous gagnez s'il la rate)`,
    ["chouette", "velute", "cul"].map(c => ({
      label: `${NOMS[c]} — réussite ${pct(CHANCES[c])}, mise max ${plafondDefi(grelottin, cible, c)}`,
      val: c, classe: "second"
    })));
  const max = plafondDefi(grelottin, cible, combi);
  conseiller(`Plus la mise est haute, plus le gain moyen est grand : misez **${max}**, le maximum.`);
  const mise = await choisirMise(`Combien miser sur le défi « ${NOMS[combi]} » ?`, max, max);
  return { combi, mise };
}

async function civetHumain(j) {
  conseiller(conseilCivet(j));
  const combi = await choisir("Civet : sur quelle combinaison pariez-vous ?",
    ["chouette", "velute", "suite", "cul", "neant"].map(c => ({
      label: `${NOMS[c]} (${pct(CHANCES[c])})`, val: c, classe: "second"
    })).concat([{ label: "Annuler", val: null, classe: "" }]), true);
  if (!combi) return null;
  const conseillee = miseConseillee(j, combi);
  if (conseillee) conseiller(`Misez exactement **${conseillee}** : si le Néant sort, vous arrivez pile à 343.`);
  const mise = await choisirMise(`Combien miser sur « ${NOMS[combi]} » ? (max ${MISE_CIVET})`, MISE_CIVET, conseillee || undefined);
  return { combi, mise };
}

// ---------- Décisions de l'adversaire ----------
function siroterIA(j, adv, v) {
  if (j.profil.style === "hasard") return Math.random() < 0.5;
  if (regles.pile) {
    if (j.score + 40 + 10 * v === CIBLE) return true;
    if (j.score + v * v === CIBLE) return false;
  }
  // Espérance du sirotage : (40 + 10v)/6 − 5v²/6, meilleure que v² seulement pour v ≤ 2
  if (v <= 2) return true;
  if (v === 3 && adv.score - j.score > 80) return Math.random() < 0.5;
  return false;
}

function defiIA(grelottin, cible) {
  if (grelottin.profil.style === "hasard") {
    const combi = auHasard(["chouette", "velute", "cul"]);
    return { combi, mise: Math.ceil(plafondDefi(grelottin, cible, combi) * hasard(0.3, 1)) };
  }
  // La Velute est rarement réussie : c'est le défi le plus rentable pour le grelottin
  return { combi: "velute", mise: plafondDefi(grelottin, cible, "velute") };
}

function civetIA(j) {
  if (!j.civet) return null;
  const reste = CIBLE - j.score;
  if (j.profil.style === "hasard") {
    return Math.random() < 0.08
      ? { combi: auHasard(["chouette", "velute", "suite", "neant"]), mise: Math.round(hasard(20, MISE_CIVET)) }
      : null;
  }
  // Un Néant ne rapporte rien d'autre : parfait pour finir pile à 343
  if (regles.pile && reste > 0 && reste <= MISE_CIVET && Math.random() < 0.5) return { combi: "neant", mise: reste };
  const adv = P.joueurs.find(x => x !== j);
  if (adv.score - j.score > 150 && Math.random() < 0.3) return { combi: "chouette", mise: MISE_CIVET };
  return null;
}

// ---------- Fin de partie ----------
function finDePartie(g) {
  attente("Partie terminée.");
  $("banniere").textContent = "Partie terminée";
  const humainGagne = !g.ia;
  log(`🏆 ${g.nom} atteint ${g.score} points et remporte la partie !`, "alerte");
  $("fin-titre").textContent = humainGagne ? "🏆 Victoire !" : `👑 ${g.nom} l'emporte`;
  const perdant = P.joueurs.find(x => x !== g);
  $("fin-texte").textContent = humainGagne
    ? `Vous atteignez ${g.score} points en ${P.tour} tours. ${perdant.nom} finit à ${perdant.score}.`
    : `${g.nom} atteint ${g.score} points en ${P.tour} tours. Vous finissez à ${perdant.score}.`;
  $("fen-fin").classList.add("ouvert");
  Sons.jouer(humainGagne ? "victoire" : "defaite");
  setTimeout(() => Sons.dire("Victoire !", g.ia), 1300);
}

// ---------- Fenêtres ----------
function ouvrirNouvellePartie() {
  $("opt-nom").value = reglages.nom;
  $("adv-" + reglages.adv).checked = true;
  $("opt-pile").checked = reglages.pile;
  $("opt-aide").checked = reglages.aide;
  $("opt-conseils").checked = reglages.conseils;
  $("btn-annuler-partie").style.display = P ? "" : "none";
  $("fen-partie").classList.add("ouvert");
}

function demarrer(tuto) {
  reglages = {
    nom: $("opt-nom").value.trim() || "Vous",
    adv: document.querySelector("input[name=adv]:checked").value,
    pile: $("opt-pile").checked,
    aide: $("opt-aide").checked,
    conseils: $("opt-conseils").checked
  };
  sauverReglages();
  $("fen-partie").classList.remove("ouvert");
  nouvellePartie(tuto);
}

$("btn-lancer-partie").onclick = () => demarrer(false);
$("btn-tuto").onclick = () => demarrer(true);
$("btn-annuler-partie").onclick = () => $("fen-partie").classList.remove("ouvert");
$("btn-nouvelle").onclick = ouvrirNouvellePartie;
$("btn-regles").onclick = () => $("fen-regles").classList.add("ouvert");
$("btn-fermer-regles").onclick = () => $("fen-regles").classList.remove("ouvert");
$("btn-rejouer").onclick = () => { $("fen-fin").classList.remove("ouvert"); ouvrirNouvellePartie(); };
$("fen-regles").onclick = e => { if (e.target.id === "fen-regles") $("fen-regles").classList.remove("ouvert"); };

// ---------- Fenêtre « Sons et voix » ----------
function majBoutonSon() {
  const etat = Sons.etat();
  $("btn-son").textContent = etat.icone;
  $("btn-son").title = etat.libelle + " (réglages du son)";
  $("btn-son").setAttribute("aria-label", "Réglages du son : " + etat.libelle);
}

function remplirVoix(idSelect, adversaire) {
  const select = $(idSelect);
  const liste = Sons.voixFrancaises();
  const choisie = Sons.obtenir()[adversaire ? "voixAdversaire" : "voixJoueur"];
  const auto = Sons.voixPour(adversaire);
  select.innerHTML = "";
  const optAuto = document.createElement("option");
  optAuto.value = "";
  optAuto.textContent = "Automatique" + (auto ? ` (${auto.name})` : "");
  select.appendChild(optAuto);
  for (const v of liste) {
    const o = document.createElement("option");
    o.value = v.name;
    o.textContent = (Sons.estNaturelle(v) ? "★ " : "") + `${v.name} (${v.lang})`;
    select.appendChild(o);
  }
  select.value = liste.some(v => v.name === choisie) ? choisie : "";
  select.disabled = !liste.length;
}

function majFenetreSon() {
  const r = Sons.obtenir();
  document.querySelector(`input[name=son-mode][value=${r.mode}]`).checked = true;
  $("son-volume").value = r.volume;
  remplirVoix("voix-joueur", false);
  remplirVoix("voix-adversaire", true);
  const enregistres = Cris.nombre(false) + Cris.nombre(true);
  $("btn-cris").textContent = "🎙️ Enregistrer vos cris au micro" + (enregistres ? ` (${enregistres} enregistrés)` : "");
  const liste = Sons.voixFrancaises();
  const astuce = $("voix-astuce");
  if (!Sons.disponible || !liste.length) {
    astuce.innerHTML = "Aucune voix française n'est disponible dans ce navigateur : les cris ne seront pas prononcés. " +
      "Essayez <b>Microsoft Edge</b> ou <b>Google Chrome</b>, ou installez une voix française dans les paramètres de votre système.";
  } else if (liste.some(Sons.estNaturelle)) {
    astuce.innerHTML = "★ = voix naturelle de bonne qualité. Les voix « en ligne » demandent une connexion Internet.";
  } else {
    astuce.innerHTML = "Les voix de ce navigateur sont assez robotiques. Pour des voix bien plus naturelles, ouvrez le jeu dans " +
      "<b>Microsoft Edge</b> (voix « Natural » comme Denise ou Henri) ou dans <b>Google Chrome</b> (voix « Google français »).";
  }
}

$("btn-son").onclick = () => { majFenetreSon(); $("fen-son").classList.add("ouvert"); };
$("btn-fermer-son").onclick = () => $("fen-son").classList.remove("ouvert");
$("fen-son").onclick = e => { if (e.target.id === "fen-son") $("fen-son").classList.remove("ouvert"); };
document.querySelectorAll("input[name=son-mode]").forEach(r => {
  r.onchange = () => { Sons.definir("mode", r.value); majBoutonSon(); };
});
$("son-volume").oninput = e => Sons.definir("volume", Number(e.target.value));
$("son-volume").onchange = () => Sons.jouer("gain");
$("voix-joueur").onchange = e => { Sons.definir("voixJoueur", e.target.value); majFenetreSon(); Sons.tester(false); };
$("voix-adversaire").onchange = e => { Sons.definir("voixAdversaire", e.target.value); majFenetreSon(); Sons.tester(true); };
$("test-joueur").onclick = () => { Sons.jouer("genoux"); Sons.tester(false); };
$("test-adversaire").onclick = () => { Sons.jouer("poing"); Sons.tester(true); };
Sons.surChangementVoix(() => { if ($("fen-son").classList.contains("ouvert")) majFenetreSon(); });
majBoutonSon();

// Petit clic sur chaque bouton ; ce premier geste autorise aussi le navigateur à jouer des sons
document.addEventListener("click", e => { if (e.target.closest("button")) Sons.jouer("clic"); });

elDes.forEach(el => dessinerDe(el, 0));
ouvrirNouvellePartie();
