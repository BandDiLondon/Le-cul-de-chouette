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
// jet() pour l'animation et l'adversaire ordinateur ; jetPartie() pour les dés qui comptent,
// tirés d'une graine commune en ligne pour que les deux appareils voient les mêmes dés
const jet = () => Math.floor(Math.random() * 6) + 1;
const jetPartie = () => Math.floor(P.alea() * 6) + 1;

// Générateur pseudo-aléatoire reproductible (mulberry32)
function generateur(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Un joueur « local » joue sur cet appareil ; sinon c'est l'ordinateur ou un joueur en ligne
const estLocal = j => !j.ia && !j.distant;
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
// Partie en ligne en cours : { hote, nomMoi, nomAutre, pile, premier, revancheMoi, revancheAutre }
let enLigne = null;
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

const nouveauJoueur = (nom, plus = {}) => ({ nom, score: 0, grelottine: false, civet: true, ia: false, distant: false, ...plus });

// manche : { graine, premier } pour une partie en ligne, null sinon
function nouvellePartie(tuto = false, manche = null) {
  jeton++;
  fermerReflexe();
  cacherBulle();
  $("fen-fin").classList.remove("ouvert");
  if (!manche && enLigne) { Reseau.fermer(); enLigne = null; }

  let joueurs, moi = 0, intro;
  if (manche) {
    regles = { ...reglages, pile: enLigne.pile };
    // Les deux appareils rangent les joueurs dans le même ordre : l'hôte d'abord
    const noms = enLigne.hote ? [enLigne.nomMoi, enLigne.nomAutre] : [enLigne.nomAutre, enLigne.nomMoi];
    if (noms[0] === noms[1]) noms[1] += " 2";
    moi = enLigne.hote ? 0 : 1;
    joueurs = noms.map((nom, i) => nouveauJoueur(nom, { distant: i !== moi }));
    intro = `Partie en ligne contre ${noms[1 - moi]}.`;
  } else {
    regles = tuto ? { ...reglages, adv: "arthur", pile: true, aide: true, conseils: true } : { ...reglages };
    const profil = ADVERSAIRES[regles.adv];
    joueurs = [nouveauJoueur(regles.nom.trim() || "Vous"), nouveauJoueur(profil.nom, { ia: true, profil })];
    intro = tuto ? `Tutoriel contre ${profil.nom}.` : `Partie contre ${profil.nom}.`;
  }
  const premier = manche ? manche.premier : 0;
  P = {
    joueurs,
    moi,
    enLigne: !!manche,
    alea: manche ? generateur(manche.graine) : Math.random,
    courant: premier,
    premier,
    tour: 1,
    tuto,
    script: tuto ? SCENARIO_TUTO.map(d => [...d]) : [],
    vus: new Set(),
    recul: false
  };
  journal.innerHTML = "";
  elDes.forEach(el => { dessinerDe(el, 0); el.classList.remove("surligne"); });
  $("combinaison").innerHTML = "&nbsp;";
  log(`${intro} ${regles.pile ? "Il faut tomber sur 343 pile." : "Le premier à 343 gagne."}`, "info");
  majScores();
  boucle().catch(e => { if (e !== ABANDON) throw e; });
}

function majScores() {
  P.joueurs.forEach((j, i) => {
    $("nom-" + i).textContent = j.nom + (P.enLigne && i === P.moi ? " (vous)" : "");
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
  const des = P.script.length ? P.script.shift() : [jetPartie(), jetPartie(), jetPartie()];
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

// Qui perd ou gagne des points, à partir du cri de chaque joueur ({ res: "juste" | "faux" | "rien", ms })
function bilanReflexe(combi, rs) {
  const indices = rs.map((_, i) => i);
  const temps = i => rs[i].res === "juste" ? rs[i].ms : Infinity;
  const bevues = indices.filter(i => rs[i].res === "faux");
  const autres = indices.filter(i => rs[i].res !== "faux");
  let derniers = [];
  let gagnant = null;
  if (combi === "suite") {
    // Le dernier à crier perd 10 pts ; celui qui a fait une Bévue est déjà puni
    if (autres.length >= 2) {
      const pire = Math.max(...autres.map(temps));
      derniers = autres.filter(i => temps(i) === pire);
    }
  } else {
    const justes = indices.filter(i => rs[i].res === "juste");
    if (justes.length) gagnant = justes.reduce((a, b) => temps(b) < temps(a) ? b : a);
  }
  return { bevues, derniers, gagnant };
}

// Trois phases dans la même fenêtre : préparation (première fois, avec conseils), duel, résultat.
// Chaque appareil chronomètre son propre joueur ; en ligne, les deux temps sont échangés puis comparés.
// Renvoie { rs, bilan } : rs[i] est le cri du joueur i
async function reflexe(combi, des, lanceur) {
  const attendu = combi === "suite" ? GRELOTTE : PAS_MOU;
  const moi = P.moi;
  const autre = P.joueurs[1 - moi];
  let min = null, max = null, delaiIA = null;
  if (autre.ia) {
    // Les deux premiers réflexes du tutoriel laissent plus de temps pour apprendre
    const lent = P.tuto && P.tour <= 2 ? 1.8 : 1;
    [min, max] = autre.profil.reflexe.map(x => x * lent);
    delaiIA = hasard(min, max);
  }
  // En ligne, les cris apparaissent après le même délai aléatoire sur les deux appareils : impossible de cliquer d'avance
  const attenteCris = P.enLigne ? 500 + P.alea() * 1200 : 0;
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
    texteReflexe("reflexe-explication", explicationReflexe(combi, des, lanceur, autre, min, max));
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
  if (attenteCris) {
    $("reflexe-titre").textContent = "Attention…";
    await pause(attenteCris);
    $("reflexe-titre").textContent = "RÉFLEXE !";
    Sons.jouer("go");
  }

  const rMoi = await duel(attendu, delaiIA);
  const rs = [];
  rs[moi] = rMoi;
  if (autre.ia) {
    rs[1 - moi] = { res: "juste", ms: delaiIA, cri: attendu };
  } else {
    Reseau.envoyer("cri", rMoi);
    $("reflexe-titre").textContent = "…";
    texteReflexe("reflexe-explication", `En attente du cri de ${autre.nom}…`);
    rs[1 - moi] = await garde(Reseau.recevoir("cri"));
  }
  const bilan = bilanReflexe(combi, rs);

  const gagne = combi === "suite" ? rMoi.res === "juste" && !bilan.derniers.includes(moi) : bilan.gagnant === moi;
  const geste = cri => cri === GRELOTTE ? "poing" : "genoux";
  if (rMoi.cri) Sons.jouer(geste(rMoi.cri));
  if (gagne) { Sons.jouer("bon"); Sons.dire(attendu); }
  else if (rMoi.res === "faux") { Sons.jouer("bevue"); Sons.dire(rMoi.cri); }
  else {
    Sons.jouer("lent");
    if (rs[1 - moi].res === "juste") { Sons.jouer(geste(attendu)); Sons.dire(attendu, true); }
  }

  $("reflexe-titre").textContent = gagne ? "Bien joué !" : rMoi.res === "faux" ? "Bévue !" : "Trop lent !";
  texteReflexe("reflexe-explication", "");
  for (const b of $("reflexe-cris").children) {
    b.disabled = true;
    if (b.dataset.cri === attendu) b.classList.add("juste");
    else if (b.dataset.cri === rMoi.cri) b.classList.add("faux");
  }
  texteReflexe("reflexe-resultat", resultatReflexe(combi, des, rs, moi, bilan));
  await boutonReflexe("Continuer");
  fermerReflexe();
  return { rs, bilan };
}

// Le duel se termine au clic, quand l'ordinateur crie, ou après 5 s en ligne
function duel(attendu, delaiIA) {
  return garde(new Promise(resoudre => {
    const cris = $("reflexe-cris");
    const debut = performance.now();
    let fini = false;
    const terminer = r => {
      if (fini) return;
      fini = true;
      clearTimeout(minuteurReflexe);
      resoudre(r);
    };
    for (const cri of Math.random() < 0.5 ? [PAS_MOU, GRELOTTE] : [GRELOTTE, PAS_MOU]) {
      const b = document.createElement("button");
      b.textContent = "« " + cri + " »";
      b.dataset.cri = cri;
      b.onclick = () => terminer({ res: cri === attendu ? "juste" : "faux", ms: performance.now() - debut, cri });
      cris.appendChild(b);
    }
    minuteurReflexe = setTimeout(() => terminer({ res: "rien", ms: null, cri: null }), delaiIA ?? 5000);
  }));
}

// ---------- Déroulement d'un tour ----------
// Une décision prise par un joueur : à l'écran s'il joue ici (puis transmise à l'autre appareil),
// calculée s'il s'agit de l'ordinateur, ou reçue par le réseau s'il joue en ligne
async function decider(j, type, choixLocal, choixIA, texteAttente) {
  if (j.ia) return choixIA();
  if (j.distant) {
    attente(texteAttente);
    return garde(Reseau.recevoir(type));
  }
  const v = await choixLocal();
  if (P.enLigne) Reseau.envoyer(type, v ?? null);
  return v;
}

async function boucle() {
  if (P.tuto) await expliquer("intro");
  while (true) {
    const j = P.joueurs[P.courant];
    const adv = P.joueurs[1 - P.courant];
    majScores();
    if (P.courant === P.premier) log(`Tour ${P.tour}`, "tour");
    $("banniere").textContent = estLocal(j) ? `À vous de jouer, ${j.nom}` : `Au tour de ${j.nom}`;

    // 1. L'adversaire peut lancer un défi avec sa Grelottine
    let defi = null;
    if (adv.grelottine && estLocal(adv)) await expliquer("defi");
    if (adv.grelottine) {
      defi = await decider(adv, "defi", () => defiHumain(adv, j), () => defiIA(adv, j),
        `${adv.nom} réfléchit à sa Grelottine…`);
    }
    if (defi) {
      adv.grelottine = false;
      majScores();
      log(`🔔 « Grelottine ! » ${adv.nom} défie ${j.nom} sur une ${NOMS[defi.combi]} (mise : ${defi.mise}).`, "alerte");
      Sons.jouer("grelot");
      Sons.dire("Grelottine !", !estLocal(adv));
      if (estLocal(j)) await expliquer("defi-subi");
    }

    // 2. Civet éventuel, puis lancer
    let civet = null;
    if (j.ia) {
      attente(`${j.nom} réfléchit…`);
      await pause(defi ? 1200 : 800);
      civet = civetIA(j);
    } else {
      civet = await decider(j, "lancer", async () => {
        if (j.civet && P.tour >= 4) await expliquer(P.tuto ? "civet-tuto" : "civet");
        const opts = [{ label: "🎲 Lancer les dés", val: "lancer", classe: "" }];
        if (j.civet) opts.push({ label: "🐇 Annoncer un Civet", val: "civet", classe: "second" });
        conseilAvantLancer(j);
        return await choisir("", opts) === "civet" ? civetHumain(j) : null;
      }, null, `${j.nom} s'apprête à lancer les dés…`);
    }
    if (civet) {
      j.civet = false;
      majScores();
      log(`🐇 « Civet ! » ${j.nom} mise ${civet.mise} pts sur : ${NOMS[civet.combi]}.`, "alerte");
      Sons.jouer("civet");
      Sons.dire("Civet !", !estLocal(j));
    }
    if (!estLocal(j)) attente(`${j.nom} lance les dés…`);

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
    if (P.courant === P.premier) P.tour++;
    attente("…");
    await pause(900);
  }
}

async function resoudreCombinaison(j, adv, des, combi) {
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

    case "suite":
    case "chouette-velute": {
      const { rs, bilan } = await reflexe(combi, des, j);
      const detail = rs.map((r, i) => `${P.joueurs[i].nom} ${r.res === "juste" ? secondes(r.ms) : r.res === "faux" ? "mauvais cri" : "pas de cri"}`);
      log(`Cris : ${detail.join(" · ")}`, "info");
      for (const i of bilan.bevues) ajouter(P.joueurs[i], -10, "Bévue");
      for (const i of bilan.derniers) ajouter(P.joueurs[i], -10, "dernier sur la Suite");
      if (bilan.gagnant !== null) ajouter(P.joueurs[bilan.gagnant], points(des, combi), "Chouette-Velute");
      break;
    }
  }
}

async function sirotage(j, adv, des) {
  const v = valeurPaire(des);
  const pts = v * v;
  const gainCul = 40 + 10 * v;

  const siroter = await decider(j, "siroter", () => {
    conseiller(conseilSirotage(j, v));
    return choisir(`Chouette de ${v} ! La garder ou la siroter ?`, [
      { label: `Garder (+${pts})`, val: false, classe: "second" },
      { label: `Siroter (+${gainCul} ou −${pts})`, val: true, classe: "" }
    ]);
  }, () => siroterIA(j, adv, v), `${j.nom} hésite à siroter sa Chouette de ${v}…`);
  if (j.ia) await pause(600);
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
    pari = await decider(adv, "oiseau", async () => {
      await expliquer("oiseaux");
      conseiller(conseilOiseaux());
      return choisir(`${j.nom} sirote ! Pariez sur le dé relancé (+25 si juste) :`,
        [1, 2, 3, 4, 5, 6].map(n => ({ label: `${n} · ${OISEAUX[n]}`, val: n, classe: "second" }))
          .concat([{ label: "Pas de pari", val: 0, classe: "second" }]), true);
    }, null, `${adv.nom} choisit un oiseau…`);
    if (pari) {
      log(estLocal(adv) ? `Vous criez « ${OISEAUX[pari]} ! »` : `${adv.nom} crie « ${OISEAUX[pari]} ! »`, "info");
      Sons.jouer("oiseau");
      Sons.dire(OISEAUX[pari] + " !", !estLocal(adv));
    }
  }
  if (!estLocal(j)) attente(`${j.nom} relance le dé…`);

  const seul = des.findIndex(d => d !== v);
  const nouveau = jetPartie();
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
  const combi = await choisir(`Sur quelle combinaison défier ${cible.nom} ? (vous gagnez si elle est ratée)`,
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
  const humainGagne = estLocal(g);
  log(`🏆 ${g.nom} atteint ${g.score} points et remporte la partie !`, "alerte");
  $("fin-titre").textContent = humainGagne ? "🏆 Victoire !" : `👑 ${g.nom} l'emporte`;
  const perdant = P.joueurs.find(x => x !== g);
  $("fin-texte").textContent = humainGagne
    ? `Vous atteignez ${g.score} points en ${P.tour} tours. ${perdant.nom} finit à ${perdant.score}.`
    : `${g.nom} atteint ${g.score} points en ${P.tour} tours. Vous finissez à ${perdant.score}.`;
  const bouton = $("btn-rejouer");
  bouton.disabled = false;
  bouton.textContent = P.enLigne ? "⚔️ Revanche" : "Rejouer";
  $("fen-fin").classList.add("ouvert");
  Sons.jouer(humainGagne ? "victoire" : "defaite");
  setTimeout(() => Sons.dire("Victoire !", !estLocal(g)), 1300);
}

// ---------- Partie en ligne ----------
// Appelé par Reseau quand les deux joueurs sont connectés
function demarrerEnLigne(infos) {
  $("fen-partie").classList.remove("ouvert");
  enLigne = { ...infos, premier: 0, revancheMoi: false, revancheAutre: false };
  if (enLigne.hote) lancerManche(0);
  else {
    jeton++;
    attente(`Connecté à ${infos.nomAutre}. La partie va commencer…`);
  }
}

// L'hôte tire la graine des dés et l'envoie : les deux appareils jouent alors exactement la même partie
function lancerManche(premier) {
  enLigne.premier = premier;
  enLigne.revancheMoi = enLigne.revancheAutre = false;
  const graine = Math.floor(Math.random() * 2 ** 32);
  Reseau.viderFile();
  Reseau.envoyer("debut", { graine, premier, pile: enLigne.pile });
  nouvellePartie(false, { graine, premier });
}

Reseau.sur("debut", d => {
  if (!enLigne) return;
  Reseau.viderFile();
  enLigne.pile = !!d.pile;
  enLigne.premier = d.premier;
  enLigne.revancheMoi = enLigne.revancheAutre = false;
  nouvellePartie(false, { graine: d.graine, premier: d.premier });
});

Reseau.sur("revanche", () => {
  if (!enLigne) return;
  enLigne.revancheAutre = true;
  log(`⚔️ ${enLigne.nomAutre} veut une revanche !`, "alerte");
  if ($("fen-fin").classList.contains("ouvert") && !enLigne.revancheMoi) {
    $("fin-texte").textContent += ` ${enLigne.nomAutre} veut une revanche !`;
  }
  verifierRevanche();
});

function demanderRevanche() {
  enLigne.revancheMoi = true;
  Reseau.envoyer("revanche");
  const bouton = $("btn-rejouer");
  bouton.disabled = true;
  bouton.textContent = `En attente de ${enLigne.nomAutre}…`;
  verifierRevanche();
}

// Chacun commence à tour de rôle
function verifierRevanche() {
  if (enLigne.hote && enLigne.revancheMoi && enLigne.revancheAutre) lancerManche(1 - enLigne.premier);
}

// Appelé par Reseau quand l'autre joueur est parti ou que la connexion a sauté
function connexionPerdue(nom) {
  if (!enLigne) return;
  enLigne = null;
  jeton++;
  fermerReflexe();
  cacherBulle();
  attente("Connexion perdue.");
  if (P) {
    P.enLigne = false;
    log(`🔌 La connexion avec ${nom} a été coupée.`, "alerte");
  }
  $("banniere").textContent = "Connexion perdue";
  $("fin-titre").textContent = "🔌 Connexion perdue";
  $("fin-texte").textContent = `La connexion avec ${nom} a été coupée : la partie s'arrête là.`;
  $("btn-rejouer").disabled = false;
  $("btn-rejouer").textContent = "Retour au menu";
  $("fen-fin").classList.add("ouvert");
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
$("btn-rejouer").onclick = () => {
  if (enLigne && Reseau.connecte()) return demanderRevanche();
  $("fen-fin").classList.remove("ouvert");
  ouvrirNouvellePartie();
};
$("btn-en-ligne").onclick = () => {
  if (enLigne) { Reseau.fermer(); enLigne = null; jeton++; }
  $("fen-partie").classList.remove("ouvert");
  Reseau.ouvrir();
};
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
// Lien d'invitation (?partie=CODE) : on ouvre directement la fenêtre pour rejoindre
if (Reseau.codeInvitation()) { $("fen-partie").classList.remove("ouvert"); Reseau.ouvrir(Reseau.codeInvitation()); }
