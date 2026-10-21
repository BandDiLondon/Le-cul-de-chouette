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
// Portraits d'émotion d'un personnage : images/emotions/<clé>-rire.jpg, -pleurs.jpg, -rage.jpg
const emotionsDe = cle => Object.fromEntries(["rire", "pleurs", "rage"].map(e => [e, `images/emotions/${cle}-${e}.jpg`]));

// reflexe : temps de réaction (ms) ; rateJauge : part des lancers ratés ; bevue : part des mauvais cris ;
// portrait : image carrée dans images/ (null = médaillon avec l'initiale)
const ADVERSAIRES = {
  karadoc:  { nom: "Karadoc",  reflexe: [1300, 2400], style: "hasard", rateJauge: 0.18, bevue: 0.08, portrait: "images/karadoc.jpg", emotions: emotionsDe("karadoc") },
  arthur:   { nom: "Arthur",   reflexe: [850, 1600],  style: "calcul", rateJauge: 0.07, bevue: 0.03, portrait: "images/arthur.jpg", emotions: emotionsDe("arthur") },
  perceval: { nom: "Perceval", reflexe: [550, 1050],  style: "calcul", rateJauge: 0.02, bevue: 0,    portrait: "images/perceval.jpg", emotions: emotionsDe("perceval") }
};
const MAX_JOUEURS = 4;

// Portraits que les joueurs peuvent choisir pour eux-mêmes (images/joueurs/<id>.jpg)
const PORTRAITS = [
  { id: "soiffard", nom: "Le soiffard" },
  { id: "illumine", nom: "L'illuminé" },
  { id: "pequenaud", nom: "Le péquenaud" },
  { id: "seigneur", nom: "Le seigneur" },
  { id: "gamin", nom: "Le gamin" },
  { id: "princesse", nom: "La princesse" }
];
// Reçu d'un autre appareil en ligne : seuls les identifiants connus donnent une image
const imagePortrait = id => PORTRAITS.some(p => p.id === id) ? `images/joueurs/${id}.jpg` : null;

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

// Hasard des décisions de l'ordinateur. En ligne, les ordinateurs jouent sur les deux appareils à la fois :
// leur hasard vient donc lui aussi de la graine commune, pour qu'ils y prennent exactement les mêmes décisions
const aleaIA = () => P.aleaIA();
const hasardIA = (min, max) => min + aleaIA() * (max - min);
const choixIA = liste => liste[Math.floor(aleaIA() * liste.length)];

// Les autres joueurs, dans l'ordre du jeu à partir de celui qui suit le joueur i
const autresQue = i => P.joueurs.map((_, k) => P.joueurs[(i + 1 + k) % P.joueurs.length]).slice(0, -1);
// « Arthur », « Arthur et Karadoc », « Arthur, Karadoc et Perceval »
const enumerer = noms => noms.length < 2 ? noms.join("") : noms.slice(0, -1).join(", ") + " et " + noms[noms.length - 1];
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

// Portrait d'un personnage, ou à défaut un médaillon avec son initiale
function dessinerPortrait(el, nom, image) {
  el.innerHTML = "";
  el.classList.toggle("image", !!image);
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = nom;
    el.appendChild(img);
  } else {
    el.textContent = (nom.trim()[0] || "?").toUpperCase();
    el.setAttribute("aria-hidden", "true");
  }
}

// Le nom par défaut « Vous » se conjugue à la 2e personne : accorder(j, "lancez", "lance")
const accorder = (j, vous, autre) => j.nom === "Vous" ? vous : autre;

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

// advs : adversaires ordinateur en solo (1 à 3) ; pcsEnLigne : ordinateurs ajoutés à une partie en ligne (0 à 2)
function chargerReglages() {
  const defaut = { nom: "Vous", advs: ["arthur"], pcsEnLigne: [], pile: true, aide: true, conseils: false, portrait: "", jauge: true, chouetteVolante: true };
  let brut = {};
  try { brut = JSON.parse(localStorage.getItem("cdc-reglages") || "{}"); } catch {}
  const r = { ...defaut, ...brut };
  // Anciens réglages : un seul adversaire, dans « adv »
  if (brut.adv && !brut.advs) r.advs = [brut.adv];
  delete r.adv;
  r.advs = (r.advs || []).filter(c => ADVERSAIRES[c]).slice(0, MAX_JOUEURS - 1);
  if (!r.advs.length) r.advs = ["arthur"];
  r.pcsEnLigne = (r.pcsEnLigne || []).filter(c => ADVERSAIRES[c]).slice(0, MAX_JOUEURS - 2);
  return r;
}
function sauverReglages() {
  try { localStorage.setItem("cdc-reglages", JSON.stringify(reglages)); } catch {}
}

const nouveauJoueur = (nom, plus = {}) => ({ nom, score: 0, grelottine: false, civet: true, ia: false, distant: false, ...plus });
const joueurIA = cle => nouveauJoueur(ADVERSAIRES[cle].nom, { ia: true, profil: ADVERSAIRES[cle], portrait: ADVERSAIRES[cle].portrait });

// Deux joueurs du même nom deviennent « Arthur » et « Arthur 2 »
function nomsUniques(joueurs) {
  const vus = {};
  for (const j of joueurs) {
    vus[j.nom] = (vus[j.nom] || 0) + 1;
    if (vus[j.nom] > 1) j.nom += " " + vus[j.nom];
  }
  return joueurs;
}

// manche : { graine, premier } pour une partie en ligne, null sinon
function nouvellePartie(tuto = false, manche = null) {
  jeton++;
  fermerReflexe();
  cacherBulle();
  $("fen-fin").classList.remove("ouvert");
  if (!manche && enLigne) { Reseau.fermer(); enLigne = null; }

  let joueurs, moi = 0, intro;
  if (manche) {
    regles = { ...reglages, pile: enLigne.pile, jauge: enLigne.jauge };
    // Les deux appareils rangent les joueurs dans le même ordre : l'hôte, l'invité, puis les ordinateurs
    const noms = enLigne.hote ? [enLigne.nomMoi, enLigne.nomAutre] : [enLigne.nomAutre, enLigne.nomMoi];
    const portraits = enLigne.hote ? [enLigne.portraitMoi, enLigne.portraitAutre] : [enLigne.portraitAutre, enLigne.portraitMoi];
    moi = enLigne.hote ? 0 : 1;
    joueurs = noms.map((nom, i) => nouveauJoueur(nom, { distant: i !== moi, portrait: imagePortrait(portraits[i]) }));
    joueurs.push(...enLigne.pcs.map(joueurIA));
    intro = `Partie en ligne contre ${enumerer(joueurs.filter((_, i) => i !== moi).map(j => j.nom))}.`;
  } else {
    regles = tuto ? { ...reglages, advs: ["arthur"], pile: true, aide: true, conseils: true } : { ...reglages };
    joueurs = [nouveauJoueur(regles.nom.trim() || "Vous", { portrait: imagePortrait(regles.portrait) }), ...regles.advs.map(joueurIA)];
    const noms = enumerer(joueurs.slice(1).map(j => j.nom));
    intro = tuto ? `Tutoriel contre ${noms}.` : `Partie contre ${noms}.`;
  }
  nomsUniques(joueurs);
  const premier = manche ? manche.premier : 0;
  P = {
    joueurs,
    moi,
    enLigne: !!manche,
    alea: manche ? generateur(manche.graine) : Math.random,
    aleaIA: manche ? generateur(manche.graine ^ 0x5bd1e995) : Math.random,
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
  construireCartes();
  majScores();
  boucle().catch(e => { if (e !== ABANDON) throw e; });
}

// Une carte par joueur ; à partir de 3 joueurs, les cartes deviennent plus compactes
function construireCartes() {
  const zone = $("scores");
  zone.innerHTML = "";
  zone.style.setProperty("--joueurs", P.joueurs.length);
  zone.classList.toggle("compact", P.joueurs.length > 2);
  P.joueurs.forEach((_, i) => {
    const carte = document.createElement("div");
    carte.className = "joueur";
    carte.id = "carte-" + i;
    carte.innerHTML =
      `<div class="entete"><div class="identite">` +
      `<div class="nom" id="nom-${i}"></div>` +
      `<div class="score"><span id="score-${i}">0</span> <small>/ 343</small></div>` +
      `</div></div>` +
      `<div class="barre"><div id="barre-${i}"></div></div>` +
      `<div class="badges" id="badges-${i}"></div>` +
      `<div class="portrait carre" id="portrait-${i}"></div>`;
    zone.appendChild(carte);
  });
}

function majScores() {
  P.joueurs.forEach((j, i) => {
    $("nom-" + i).textContent = j.nom + (P.enLigne && i === P.moi ? " (vous)" : "");
    const portrait = $("portrait-" + i);
    const image = imageDe(j);
    const cle = j.nom + "|" + (image || "");
    if (portrait.dataset.pour !== cle) {
      dessinerPortrait(portrait, j.nom, image);
      // Petit sursaut quand un personnage change de tête
      if (portrait.dataset.pour) {
        portrait.classList.remove("change");
        void portrait.offsetWidth;
        portrait.classList.add("change");
      }
      portrait.dataset.pour = cle;
    }
    $("score-" + i).textContent = j.score;
    $("barre-" + i).style.width = Math.max(0, Math.min(100, j.score / CIBLE * 100)) + "%";
    $("carte-" + i).classList.toggle("actif", i === P.courant);
    const badges = $("badges-" + i);
    badges.innerHTML = "";
    // Le texte du badge est masqué quand les cartes sont compactes : l'icône et l'infobulle suffisent
    const badge = (icone, texte, actif, titre) => {
      const b = document.createElement("span");
      b.className = "badge" + (actif ? "" : " off");
      b.title = titre;
      const t = document.createElement("span");
      t.className = "badge-texte";
      t.textContent = " " + texte;
      b.append(icone, t);
      return b;
    };
    badges.append(
      badge("🔔", "Grelottine", j.grelottine, j.grelottine ? "Grelottine : peut défier un adversaire avant son tour" : "Grelottine : gagnée en faisant un Néant"),
      badge("🐇", "Civet", j.civet, j.civet ? "Civet : pari disponible une fois par partie" : "Civet déjà utilisé")
    );
  });
}

// ---------- Émotions des personnages ----------
// Le portrait affiché : l'émotion du moment si le personnage en a une, sinon son portrait habituel
const imageDe = j => j.humeur && j.profil && j.profil.emotions ? j.profil.emotions[j.humeur] : j.portrait;

// Les personnages de l'ordinateur changent de tête selon ce qui leur arrive, puis reprennent leur air habituel.
// duree = Infinity : l'émotion reste (fin de partie)
function humeur(j, e, duree = 2600) {
  if (!j.profil || !j.profil.emotions) return;
  clearTimeout(j.minuteurHumeur);
  j.humeur = e;
  majScores();
  if (duree !== Infinity) {
    j.minuteurHumeur = setTimeout(() => {
      j.humeur = null;
      if (P && P.joueurs.includes(j)) majScores();
    }, duree);
  }
}

// Réaction à un gain ou une perte de points
function reagir(j, n, motif) {
  if (!j.ia) return;
  if (/Bévue|hors du tapis/.test(motif)) humeur(j, "rage");
  else if (n >= 15) humeur(j, "rire");
  else if (n <= -10 || motif === "Sirotage raté") humeur(j, "pleurs");
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
    log(`${j.nom} ${accorder(j, "dépassez", "dépasse")} 343 de ${exces} et ${accorder(j, "redescendez", "redescend")} à ${nv}.`, "alerte");
  }
  j.score = nv;
  flottant(P.joueurs.indexOf(j), n);
  Sons.jouer(n > 0 ? "gain" : "perte");
  majScores();
  reagir(j, n, motif);
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
const mouvementReduit = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const OMBRE_SOL = "3px 4px 0 #b9ad92, 4px 8px 14px rgba(0,0,0,.5)";
// Moments clés d'un lancer, en fraction de sa durée
const CHOC = 0.6;
const REBOND = 0.86;

// Trajectoire d'un dé lancé sur la table : il arrive d'en haut en tournant, s'écrase un peu au choc,
// rebondit une fois et s'immobilise légèrement de travers. sens = -1 (vient de la gauche) ou 1 (de la droite) ;
// force (0 à 1, donnée par la jauge) : un lancer appuyé vient de plus loin et de plus haut
function trajectoire(el, duree, sens, force = 0.5) {
  const elan = 0.6 + force * 0.8;
  const dx = sens * hasard(35, 75) * elan;
  const dy = -hasard(45, 70) * elan;
  el.style.opacity = "";
  // Un nombre entier de quarts de tour : le dé retombe « droit », à la petite inclinaison près
  const tours = sens * 90 * (5 + Math.floor(Math.random() * 4));
  const penche = hasard(-7, 7);
  const t = (x, y, r, sx = 1, sy = sx) => `translate(${x}px, ${y}px) rotate(${r}deg) scale(${sx}, ${sy})`;
  const chute = "cubic-bezier(.5, 0, .9, .5)";   // accélère en tombant
  const montee = "cubic-bezier(.1, .5, .5, 1)";  // ralentit en remontant
  const anim = el.animate([
    // Le dé du lancer précédent est « ramassé » : il réapparaît en l'air
    { offset: 0, transform: t(dx, dy, 0, 1.3), boxShadow: "3px 4px 0 #b9ad92, 22px 44px 26px rgba(0,0,0,.25)", opacity: 0, easing: chute },
    { offset: 0.1, opacity: 1 },
    { offset: CHOC, transform: t(dx * 0.12, 0, tours * 0.82, 1.12, 0.86), boxShadow: OMBRE_SOL, easing: montee },
    { offset: 0.74, transform: t(dx * 0.05, -14, tours * 0.95, 1.05), boxShadow: "3px 4px 0 #b9ad92, 9px 18px 16px rgba(0,0,0,.4)", easing: chute },
    { offset: REBOND, transform: t(0, 0, tours + penche * 0.6, 1.05, 0.95), boxShadow: OMBRE_SOL },
    { offset: 1, transform: t(0, 0, tours + penche), boxShadow: OMBRE_SOL }
  ], { duration: duree });
  return anim.finished.then(() => {
    // Position de repos équivalente, gardée jusqu'au prochain lancer
    el.style.transform = `rotate(${(tours + penche) % 360}deg)`;
    anim.cancel();
  }).catch(() => {});
}

function animer(indices, valeurs, duree, force) {
  const j0 = jeton;
  const reduit = mouvementReduit();
  return garde(new Promise(resoudre => {
    indices.forEach(i => elDes[i].classList.remove("surligne"));
    Sons.jouer("secoue", duree * CHOC / 1000);
    const vols = reduit ? [] : indices.map((i, n) => trajectoire(elDes[i], duree, indices.length > 1 && n === 0 ? -1 : 1, force));

    // Les faces défilent vite, puis de plus en plus lentement ; la vraie face apparaît au choc
    let ecoule = 0;
    let delai = 40;
    const defiler = () => {
      if (j0 !== jeton || ecoule + delai >= duree * CHOC) return;
      indices.forEach(i => dessinerDe(elDes[i], jet()));
      ecoule += delai;
      delai *= 1.22;
      setTimeout(defiler, delai);
    };
    defiler();
    setTimeout(() => {
      if (j0 !== jeton) return;
      indices.forEach(i => dessinerDe(elDes[i], valeurs[i]));
      Sons.jouer("pose");
    }, duree * CHOC);
    if (!reduit) setTimeout(() => { if (j0 === jeton) Sons.jouer("rebond"); }, duree * REBOND);

    Promise.all([...vols, new Promise(r => setTimeout(r, duree))]).then(resoudre);
  }));
}

// Petit saut des dés qui forment la combinaison ; le Cul de Chouette a droit à un double saut en cascade
function celebrer(combi) {
  if (mouvementReduit() || combi === "neant") return;
  const cibles = combi === "chouette" ? elDes.filter(el => el.classList.contains("surligne")) : elDes;
  const cul = combi === "cul";
  cibles.forEach((el, n) => {
    // Mêmes fonctions dans chaque étape : le navigateur interpole proprement, sans rotation parasite
    const base = el.style.transform || "";
    const etape = (y, s) => ({ transform: `translateY(${y}px) ${base} scale(${s})` });
    el.animate([etape(0, 1), { ...etape(cul ? -24 : -12, 1.08), offset: 0.4 }, etape(0, 1)],
      { duration: cul ? 480 : 380, delay: n * 90, easing: "ease-out", iterations: cul ? 2 : 1 });
  });
}

// ---------- Chouette volante, sur un Cul de Chouette ----------
// Chrome, Edge et Firefox lisent la vidéo WebM transparente. Safari (et tous les navigateurs d'iPhone) n'en gèrent
// pas la transparence : ils reçoivent une image WebP animée, rechargée à chaque vol pour repartir du début
const SANS_WEBM_TRANSPARENT = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Android/.test(navigator.userAgent);
let videoChouette = null;
let finVolChouette = null;
let imageChouette = null; // Blob de l'image WebP, téléchargé une seule fois

async function volChouette() {
  if (!regles.chouetteVolante || mouvementReduit()) return;
  const zone = $("vol-chouette");
  clearTimeout(finVolChouette);
  if (SANS_WEBM_TRANSPARENT) {
    let src = "images/chouette.webp";
    try {
      if (!imageChouette) imageChouette = await (await fetch(src)).blob();
      src = URL.createObjectURL(imageChouette);
    } catch {
      src += "?" + Date.now();
    }
    const img = new Image();
    img.alt = "";
    img.src = src;
    zone.replaceChildren(img);
  } else {
    if (!videoChouette) {
      videoChouette = document.createElement("video");
      videoChouette.src = "images/chouette.webm";
      videoChouette.muted = true;
      videoChouette.playsInline = true;
      videoChouette.preload = "auto";
      videoChouette.onended = () => zone.classList.remove("visible");
    }
    zone.replaceChildren(videoChouette);
    videoChouette.currentTime = 0;
    videoChouette.play().catch(() => zone.classList.remove("visible"));
  }
  zone.classList.add("visible");
  // Le vol dure 5 s ; sécurité si la fin de la vidéo n'est pas signalée
  finVolChouette = setTimeout(() => {
    zone.classList.remove("visible");
    if (SANS_WEBM_TRANSPARENT) {
      const img = zone.querySelector("img");
      if (img && img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
      zone.replaceChildren();
    }
  }, 5300);
}

async function lancerDes(force = 0.5) {
  const des = P.script.length ? P.script.shift() : [jetPartie(), jetPartie(), jetPartie()];
  annoncer(null);
  // Le cul du lancer précédent est repris en main pendant que les chouettes volent
  if (!mouvementReduit()) elDes[2].style.opacity = "0";
  await animer([0, 1], des, 850, force);
  await animer([2], des, 750, force);
  return des;
}

// ---------- Jauge de lancer ----------
const ZONE_VERTE = [0.3, 0.7];
const tirDe = x => x < ZONE_VERTE[0] ? "court" : x > ZONE_VERTE[1] ? "long" : "ok";

// Un curseur va et vient sur la barre ; le joueur l'arrête au clic, à l'Espace ou à l'Entrée.
// Renvoie { tir: "ok" | "court" | "long", force } avec force entre 0 et 1
function jaugeLancer() {
  return garde(new Promise(resoudre => {
    actions.innerHTML = "";
    const q = document.createElement("div");
    q.className = "question";
    q.textContent = "Arrêtez la jauge dans la zone verte !";
    const barre = document.createElement("div");
    barre.className = "jauge";
    barre.setAttribute("role", "slider");
    barre.setAttribute("aria-label", "Force du lancer");
    const zone = document.createElement("div");
    zone.className = "jauge-zone";
    zone.style.left = ZONE_VERTE[0] * 100 + "%";
    zone.style.width = (ZONE_VERTE[1] - ZONE_VERTE[0]) * 100 + "%";
    const curseur = document.createElement("div");
    curseur.className = "jauge-curseur";
    barre.append(zone, curseur);
    const bouton = document.createElement("button");
    bouton.textContent = "🎲 Lancer !";
    actions.append(q, barre, bouton);

    // Vitesse légèrement variable d'un lancer à l'autre, pour qu'on ne puisse pas jouer au rythme
    const periode = hasard(1100, 1500);
    const debut = performance.now();
    let x = 0;
    let image = 0;
    const avancer = maintenant => {
      // Partie abandonnée pendant que la jauge tournait : on arrête tout
      if (!barre.isConnected) { document.removeEventListener("keydown", clavier); return; }
      const p = ((maintenant - debut) % periode) / periode;
      x = p < 0.5 ? p * 2 : 2 - p * 2;
      curseur.style.left = x * 100 + "%";
      barre.setAttribute("aria-valuenow", Math.round(x * 100));
      image = requestAnimationFrame(avancer);
    };
    image = requestAnimationFrame(avancer);

    let fini = false;
    const arreter = () => {
      if (fini) return;
      fini = true;
      cancelAnimationFrame(image);
      document.removeEventListener("keydown", clavier);
      const tir = tirDe(x);
      barre.classList.add(tir === "ok" ? "reussi" : "rate");
      q.textContent = tir === "ok" ? "Joli lancer !" : tir === "court" ? "Trop mou !" : "Trop fort !";
      bouton.disabled = true;
      cacherBulle();
      setTimeout(() => resoudre({ tir, force: x }), 350);
    };
    const clavier = e => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); arreter(); }
    };
    bouton.onclick = arreter;
    barre.onclick = arreter;
    document.addEventListener("keydown", clavier);
    bouton.focus();
  }));
}

// L'ordinateur rate plus ou moins souvent selon son caractère
function jaugeIA(j) {
  if (aleaIA() < j.profil.rateJauge) return aleaIA() < 0.5 ? { tir: "court", force: 0.1 } : { tir: "long", force: 0.9 };
  return { tir: "ok", force: hasardIA(ZONE_VERTE[0], ZONE_VERTE[1]) };
}

// Un lancer raté : un dé roule hors du tapis (trop mou) ou s'envole hors de la table (trop fort).
// Les dés de ce lancer ne comptent pas : aucun tirage n'est consommé, ce qui garde les parties en ligne synchronisées
async function horsDuTapis(j, tir) {
  annoncer(null);
  elDes.forEach(el => el.classList.remove("surligne"));
  elDes[2].style.opacity = "0";
  const perdu = elDes[Math.random() < 0.5 ? 0 : 1];
  const reste = elDes.find(el => el !== perdu && el !== elDes[2]);
  Sons.jouer("secoue", 0.4);
  if (!mouvementReduit()) {
    const sens = Math.random() < 0.5 ? -1 : 1;
    const arrivee = tir === "long"
      ? `translate(${sens * hasard(160, 260)}px, -260px) rotate(${sens * 900}deg) scale(1.6)`
      : `translate(${sens * hasard(60, 120)}px, 170px) rotate(${sens * 540}deg) scale(0.6)`;
    perdu.style.opacity = "";
    reste.style.opacity = "0";
    await garde(perdu.animate([
      { transform: "translate(0px, -60px) rotate(0deg) scale(1.3)", opacity: 0 },
      { offset: 0.15, opacity: 1 },
      { transform: arrivee, opacity: 0 }
    ], { duration: 800, easing: "cubic-bezier(.3, .1, .7, 1)" }).finished.catch(() => {}));
    perdu.style.opacity = "0";
  }
  Sons.jouer("tombe");
  $("combinaison").textContent = "Dé hors du tapis !";
  log(`💥 ${j.nom} ${accorder(j, "lancez", "lance")} ${tir === "long" ? "trop fort" : "trop mollement"} : un dé sort du tapis !`, "alerte");
  ajouter(j, -10, "dé hors du tapis");
  await expliquer("hors-tapis");
  await pause(900);
}

// ---------- Réflexes ----------
let minuteursReflexe = [];

function fermerReflexe() {
  minuteursReflexe.forEach(clearTimeout);
  minuteursReflexe = [];
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
// Chaque appareil chronomètre son propre joueur ; le cri de chaque ordinateur est tiré à l'avance,
// et en ligne les temps des humains sont échangés avant d'être comparés.
// Renvoie { rs, bilan } : rs[i] est le cri du joueur i
async function reflexe(combi, des, lanceur) {
  const attendu = combi === "suite" ? GRELOTTE : PAS_MOU;
  const mauvais = attendu === GRELOTTE ? PAS_MOU : GRELOTTE;
  const moi = P.moi;
  const rs = [];
  // Les deux premiers réflexes du tutoriel laissent plus de temps pour apprendre
  const lent = P.tuto && P.tour <= 2 ? 1.8 : 1;
  const ordis = [];
  P.joueurs.forEach((j, i) => {
    if (!j.ia) return;
    const [min, max] = j.profil.reflexe.map(x => x * lent);
    const ms = hasardIA(min, max);
    const faux = aleaIA() < j.profil.bevue;
    rs[i] = { res: faux ? "faux" : "juste", ms, cri: faux ? mauvais : attendu };
    ordis.push({ nom: j.nom, ms, min, max, faux });
  });
  const distants = P.joueurs.map((j, i) => i).filter(i => P.joueurs[i].distant);
  // En ligne, les cris apparaissent après le même délai aléatoire sur les deux appareils : impossible de cliquer d'avance
  const attenteCris = P.enLigne ? 500 + P.alea() * 1200 : 0;
  // Sans joueur en ligne, le duel s'arrête dès que l'issue est jouée : sur une Chouette-Velute, au premier bon cri
  // d'un ordinateur ; sur une Suite, quand le dernier ordinateur a crié
  let limite = 5000;
  const justes = ordis.filter(o => !o.faux).map(o => o.ms);
  if (!distants.length && justes.length) limite = combi === "suite" ? Math.max(...justes) : Math.min(...justes);
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
  $("reflexe-autres").innerHTML = "";
  $("reflexe-pied").innerHTML = "";
  $("reflexe-decompte").hidden = true;
  texteReflexe("reflexe-resultat", "");
  $("fen-reflexe").classList.add("ouvert");

  if (premiere) {
    P.vus.add("reflexe-" + combi);
    texteReflexe("reflexe-explication", explicationReflexe(combi, des, lanceur, ordis, distants.map(i => P.joueurs[i])));
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

  const rMoi = await duel(attendu, limite, ordis);
  rs[moi] = rMoi;
  if (distants.length) {
    Reseau.envoyer("cri", rMoi);
    $("reflexe-titre").textContent = "…";
    texteReflexe("reflexe-explication", `En attente du cri de ${enumerer(distants.map(i => P.joueurs[i].nom))}…`);
    for (const i of distants) rs[i] = await garde(Reseau.recevoir("cri"));
  }
  const bilan = bilanReflexe(combi, rs);

  const gagne = combi === "suite" ? rMoi.res === "juste" && !bilan.derniers.includes(moi) : bilan.gagnant === moi;
  const geste = cri => cri === GRELOTTE ? "poing" : "genoux";
  if (rMoi.cri) Sons.jouer(geste(rMoi.cri));
  if (gagne) { Sons.jouer("bon"); Sons.dire(attendu); }
  else if (rMoi.res === "faux") { Sons.jouer("bevue"); Sons.dire(rMoi.cri); }
  else {
    Sons.jouer("lent");
    if (rs.some((r, i) => i !== moi && r.res === "juste")) { Sons.jouer(geste(attendu)); Sons.dire(attendu, true); }
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

// Le duel se termine au clic, ou à la limite (issue jouée, ou 5 s en ligne).
// Pendant ce temps, les cris des ordinateurs s'affichent au moment où ils les poussent
function duel(attendu, limite, ordis) {
  return garde(new Promise(resoudre => {
    const cris = $("reflexe-cris");
    const autres = $("reflexe-autres");
    const debut = performance.now();
    let fini = false;
    const terminer = r => {
      if (fini) return;
      fini = true;
      minuteursReflexe.forEach(clearTimeout);
      minuteursReflexe = [];
      resoudre(r);
    };
    for (const cri of Math.random() < 0.5 ? [PAS_MOU, GRELOTTE] : [GRELOTTE, PAS_MOU]) {
      const b = document.createElement("button");
      b.textContent = "« " + cri + " »";
      b.dataset.cri = cri;
      b.onclick = () => terminer({ res: cri === attendu ? "juste" : "faux", ms: performance.now() - debut, cri });
      cris.appendChild(b);
    }
    for (const o of ordis) {
      if (o.ms > limite) continue;
      minuteursReflexe.push(setTimeout(() => {
        const s = document.createElement("span");
        s.className = "cri-autre" + (o.faux ? " faux" : "");
        s.textContent = o.faux ? `❌ ${o.nom} se trompe !` : `🗣️ ${o.nom} !`;
        autres.appendChild(s);
        Sons.jouer(o.faux ? "bevue" : attendu === GRELOTTE ? "poing" : "genoux");
      }, o.ms));
    }
    minuteursReflexe.push(setTimeout(() => terminer({ res: "rien", ms: null, cri: null }), limite));
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
    majScores();
    if (P.courant === P.premier) log(`Tour ${P.tour}`, "tour");
    $("banniere").textContent = estLocal(j) ? `À vous de jouer, ${j.nom}` : `Au tour de ${j.nom}`;

    // 1. Un adversaire qui a une Grelottine peut défier le lanceur ; on les consulte dans l'ordre du jeu,
    // et le premier qui défie prend la place : un seul défi par tour
    let defi = null;
    for (const g of autresQue(P.courant)) {
      if (!g.grelottine) continue;
      if (estLocal(g)) await expliquer("defi");
      const d = await decider(g, "defi", () => defiHumain(g, j), () => defiIA(g, j), `${g.nom} réfléchit à sa Grelottine…`);
      if (d) { defi = { ...d, par: g }; break; }
    }
    if (defi) {
      const g = defi.par;
      g.grelottine = false;
      majScores();
      const defiQui = j.nom === "Vous" ? `${g.nom} vous défie` : `${g.nom} ${accorder(g, "défiez", "défie")} ${j.nom}`;
      log(`🔔 « Grelottine ! » ${defiQui} sur une ${NOMS[defi.combi]} (mise : ${defi.mise}).`, "alerte");
      Sons.jouer("grelot");
      Sons.dire("Grelottine !", !estLocal(g));
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
      log(`🐇 « Civet ! » ${j.nom} ${accorder(j, "misez", "mise")} ${civet.mise} pts sur : ${NOMS[civet.combi]}.`, "alerte");
      Sons.jouer("civet");
      Sons.dire("Civet !", !estLocal(j));
    }
    // 3. La jauge de lancer : trop mou ou trop fort, un dé sort du tapis
    let lancer = { tir: "ok", force: 0.5 };
    if (regles.jauge) {
      lancer = await decider(j, "jauge", async () => {
        await expliquer("jauge");
        conseiller("Arrêtez le curseur dans la **zone verte** : clic, Espace ou Entrée. Trop mou ou trop fort, un dé sort du tapis : **−10 pts**.");
        return jaugeLancer();
      }, () => jaugeIA(j), `${j.nom} prend son élan…`);
    }
    attente(estLocal(j) ? "Les dés roulent…" : `${j.nom} lance les dés…`);
    if (lancer.tir !== "ok") await horsDuTapis(j, lancer.tir);

    const des = await lancerDes(lancer.force);
    const combi = analyser(des);
    log(`🎲 ${j.nom} : ${des.join(" · ")} → ${NOMS[combi]}`);
    annoncer(combi);
    surligner(des, combi);
    celebrer(combi);
    if (combi === "cul") volChouette();
    Sons.jouer(combi);
    await pause(combi === "suite" || combi === "chouette-velute" ? 250 : 500);
    await expliquer(combi);

    await resoudreCombinaison(j, des, combi);

    // 3. Paris du tour, jugés sur le lancer initial
    if (civet) {
      if (correspond(combi, civet.combi)) ajouter(j, civet.mise, "Civet gagné");
      else ajouter(j, -civet.mise, "Civet perdu");
    }
    if (defi) {
      if (correspond(combi, defi.combi)) {
        log(`${j.nom} ${accorder(j, "relevez", "relève")} le défi !`, "info");
        ajouter(j, defi.mise, "défi relevé");
        ajouter(defi.par, -defi.mise, "Grelottine perdue");
      } else {
        log(`${j.nom} ${accorder(j, "échouez", "échoue")} au défi.`, "info");
        ajouter(defi.par, defi.mise, "Grelottine gagnée");
        ajouter(j, -defi.mise, "défi raté");
      }
    }

    if (P.recul) await expliquer("depassement");

    const g = gagnant();
    if (g) return finDePartie(g);
    if (P.tuto && !P.script.length) await expliquer("fin");

    P.courant = (P.courant + 1) % P.joueurs.length;
    if (P.courant === P.premier) P.tour++;
    attente("…");
    await pause(900);
  }
}

async function resoudreCombinaison(j, des, combi) {
  switch (combi) {
    case "neant":
      if (j.grelottine) log(`${j.nom} ${accorder(j, "avez", "a")} déjà une Grelottine.`, "info");
      else { j.grelottine = true; majScores(); log(`🔔 ${j.nom} ${accorder(j, "recevez", "reçoit")} une Grelottine.`, "info"); Sons.jouer("grelot"); }
      break;

    case "velute":
    case "cul":
      ajouter(j, points(des, combi), NOMS[combi]);
      break;

    case "chouette":
      await sirotage(j, des);
      break;

    case "suite":
    case "chouette-velute": {
      const { rs, bilan } = await reflexe(combi, des, j);
      const detail = rs.map((r, i) => `${P.joueurs[i].nom} ${r.res === "juste" ? secondes(r.ms) : r.res === "faux" ? "mauvais cri" : "pas de cri"}`);
      log(`Cris : ${detail.join(" · ")}`, "info");
      for (const i of bilan.bevues) ajouter(P.joueurs[i], -10, "Bévue");
      for (const i of bilan.derniers) ajouter(P.joueurs[i], -10, "dernier sur la Suite");
      if (bilan.gagnant !== null) ajouter(P.joueurs[bilan.gagnant], points(des, combi), "Chouette-Velute");
      // Se faire voler la Chouette-Velute de son propre lancer, ça énerve
      if (bilan.gagnant !== null && P.joueurs[bilan.gagnant] !== j) humeur(j, "rage");
      break;
    }
  }
}

async function sirotage(j, des) {
  const v = valeurPaire(des);
  const pts = v * v;
  const gainCul = 40 + 10 * v;

  const siroter = await decider(j, "siroter", () => {
    conseiller(conseilSirotage(j, v));
    return choisir(`Chouette de ${v} ! La garder ou la siroter ?`, [
      { label: `Garder (+${pts})`, val: false, classe: "second" },
      { label: `Siroter (+${gainCul} ou −${pts})`, val: true, classe: "" }
    ]);
  }, () => siroterIA(j, v), `${j.nom} hésite à siroter sa Chouette de ${v}…`);
  if (j.ia) await pause(600);
  if (!siroter) {
    ajouter(j, pts, `Chouette de ${v}`);
    return;
  }

  log(`🍷 ${j.nom} ${accorder(j, "sirotez votre", "sirote sa")} Chouette de ${v}…`, "info");
  Sons.jouer("sirote");
  // Chaque adversaire peut parier sur le dé relancé, dans l'ordre du jeu
  const paris = [];
  for (const a of autresQue(P.joueurs.indexOf(j))) {
    const n = await decider(a, "oiseau", async () => {
      await expliquer("oiseaux");
      conseiller(conseilOiseaux());
      return choisir(`${j.nom} sirote ! Pariez sur le dé relancé (+25 si juste) :`,
        [1, 2, 3, 4, 5, 6].map(n => ({ label: `${n} · ${OISEAUX[n]}`, val: n, classe: "second" }))
          .concat([{ label: "Pas de pari", val: 0, classe: "second" }]), true);
    }, () => 1 + Math.floor(aleaIA() * 6), `${a.nom} choisit un oiseau…`);
    if (!n) continue;
    paris.push({ joueur: a, n });
    log(estLocal(a) ? `Vous criez « ${OISEAUX[n]} ! »` : `${a.nom} crie « ${OISEAUX[n]} ! »`, "info");
    Sons.jouer("oiseau");
    Sons.dire(OISEAUX[n] + " !", !estLocal(a));
    if (a.ia) await pause(450);
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
    celebrer("cul");
    volChouette();
    log(`✨ Le dé tombe sur ${nouveau} : Cul de Chouette !`, "info");
    ajouter(j, gainCul, "Sirotage réussi");
  } else {
    $("combinaison").textContent = "Sirotage raté…";
    Sons.jouer("neant");
    log(`Le dé tombe sur ${nouveau}. Raté !`, "info");
    ajouter(j, -pts, "Sirotage raté");
  }
  for (const p of paris) if (p.n === nouveau) ajouter(p.joueur, 25, `pari « ${OISEAUX[p.n]} »`);
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

// ---------- Décisions de l'ordinateur ----------
// Toutes passent par aleaIA() : en ligne, elles sont identiques sur les deux appareils
const meilleurAutre = j => Math.max(...P.joueurs.filter(x => x !== j).map(x => x.score));

function siroterIA(j, v) {
  if (j.profil.style === "hasard") return aleaIA() < 0.5;
  if (regles.pile) {
    if (j.score + 40 + 10 * v === CIBLE) return true;
    if (j.score + v * v === CIBLE) return false;
  }
  // Espérance du sirotage : (40 + 10v)/6 − 5v²/6, meilleure que v² seulement pour v ≤ 2
  if (v <= 2) return true;
  if (v === 3 && meilleurAutre(j) - j.score > 80) return aleaIA() < 0.5;
  return false;
}

function defiIA(grelottin, cible) {
  if (grelottin.profil.style === "hasard") {
    const combi = choixIA(["chouette", "velute", "cul"]);
    return { combi, mise: Math.ceil(plafondDefi(grelottin, cible, combi) * hasardIA(0.3, 1)) };
  }
  // La Velute est rarement réussie : c'est le défi le plus rentable pour le grelottin
  return { combi: "velute", mise: plafondDefi(grelottin, cible, "velute") };
}

function civetIA(j) {
  if (!j.civet) return null;
  const reste = CIBLE - j.score;
  if (j.profil.style === "hasard") {
    return aleaIA() < 0.08
      ? { combi: choixIA(["chouette", "velute", "suite", "neant"]), mise: Math.round(hasardIA(20, MISE_CIVET)) }
      : null;
  }
  // Un Néant ne rapporte rien d'autre : parfait pour finir pile à 343
  if (regles.pile && reste > 0 && reste <= MISE_CIVET && aleaIA() < 0.5) return { combi: "neant", mise: reste };
  if (meilleurAutre(j) - j.score > 150 && aleaIA() < 0.3) return { combi: "chouette", mise: MISE_CIVET };
  return null;
}

// ---------- Fin de partie ----------
function finDePartie(g) {
  attente("Partie terminée.");
  $("banniere").textContent = "Partie terminée";
  const humainGagne = estLocal(g);
  log(`🏆 ${g.nom} ${accorder(g, "atteignez", "atteint")} ${g.score} points et ${accorder(g, "remportez", "remporte")} la partie !`, "alerte");
  $("fin-titre").textContent = humainGagne ? "🏆 Victoire !" : `👑 ${g.nom} l'emporte`;
  const classement = P.joueurs.filter(x => x !== g).sort((a, b) => b.score - a.score)
    .map(x => `${estLocal(x) ? "vous" : x.nom} ${x.score}`).join(", ");
  $("fin-texte").textContent = humainGagne
    ? `Vous atteignez ${g.score} points en ${P.tour} tours. Les autres : ${classement}.`
    : `${g.nom} atteint ${g.score} points en ${P.tour} tours. Classement des autres : ${classement}.`;
  // Le vainqueur rit, les perdants pleurent, jusqu'à la partie suivante
  P.joueurs.forEach(x => humeur(x, x === g ? "rire" : "pleurs", Infinity));
  // Le portrait du vainqueur
  const image = imageDe(g);
  $("fin-portrait").hidden = !image;
  if (image) dessinerPortrait($("fin-portrait"), g.nom, image);
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
  // La jauge et les ordinateurs ajoutés suivent les réglages de l'hôte ; l'invité les reçoit avec chaque manche
  enLigne = { ...infos, jauge: reglages.jauge, pcs: [...reglages.pcsEnLigne], premier: 0, revancheMoi: false, revancheAutre: false };
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
  Reseau.envoyer("debut", { graine, premier, pile: enLigne.pile, jauge: enLigne.jauge, pcs: enLigne.pcs });
  nouvellePartie(false, { graine, premier });
}

Reseau.sur("debut", d => {
  if (!enLigne) return;
  Reseau.viderFile();
  enLigne.pile = !!d.pile;
  enLigne.jauge = !!d.jauge;
  // Seuls les personnages connus sont acceptés
  enLigne.pcs = (Array.isArray(d.pcs) ? d.pcs : []).filter(c => ADVERSAIRES[c]).slice(0, MAX_JOUEURS - 2);
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
  $("fin-portrait").hidden = true;
  $("fin-titre").textContent = "🔌 Connexion perdue";
  $("fin-texte").textContent = `La connexion avec ${nom} a été coupée : la partie s'arrête là.`;
  $("btn-rejouer").disabled = false;
  $("btn-rejouer").textContent = "Retour au menu";
  $("fen-fin").classList.add("ouvert");
}

// ---------- Fenêtres ----------
// Choix de votre portrait, présent dans « Nouvelle partie » et dans « Jouer en ligne »
function remplirChoixPortraits() {
  document.querySelectorAll(".choix-portrait").forEach(zone => {
    zone.innerHTML = "";
    for (const p of [{ id: "", nom: "Votre initiale" }, ...PORTRAITS]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "vignette" + (reglages.portrait === p.id ? " choisie" : "");
      b.title = p.nom;
      b.setAttribute("aria-label", p.nom);
      b.setAttribute("aria-pressed", reglages.portrait === p.id);
      const rond = document.createElement("span");
      rond.className = "portrait";
      dessinerPortrait(rond, p.id ? p.nom : reglages.nom, imagePortrait(p.id));
      b.appendChild(rond);
      b.onclick = () => { reglages.portrait = p.id; sauverReglages(); remplirChoixPortraits(); };
      zone.appendChild(b);
    }
  });
}

// Choix des ordinateurs ajoutés à une partie en ligne (0 à 2), dans la fenêtre « Jouer en ligne »
function remplirChoixPcs() {
  const zone = $("ligne-pcs");
  zone.innerHTML = "";
  for (const [cle, a] of Object.entries(ADVERSAIRES)) {
    const pris = reglages.pcsEnLigne.includes(cle);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "vignette" + (pris ? " choisie" : "");
    b.title = a.nom;
    b.setAttribute("aria-label", "Ajouter " + a.nom);
    b.setAttribute("aria-pressed", pris);
    const rond = document.createElement("span");
    rond.className = "portrait";
    dessinerPortrait(rond, a.nom, a.portrait);
    b.appendChild(rond);
    b.onclick = () => {
      const liste = reglages.pcsEnLigne.filter(c => c !== cle);
      // Au plus deux ordinateurs : en choisir un troisième remplace le plus ancien
      reglages.pcsEnLigne = pris ? liste : [...liste, cle].slice(-(MAX_JOUEURS - 2));
      sauverReglages();
      remplirChoixPcs();
    };
    zone.appendChild(b);
  }
  const n = reglages.pcsEnLigne.length;
  $("ligne-pcs-resume").textContent = n
    ? `${2 + n} joueurs : vous, votre ami, ${enumerer(reglages.pcsEnLigne.map(c => ADVERSAIRES[c].nom))}.`
    : "2 joueurs : vous et votre ami.";
}

function ouvrirNouvellePartie() {
  $("opt-nom").value = reglages.nom;
  document.querySelectorAll("input[name=adv]").forEach(c => { c.checked = reglages.advs.includes(c.value); });
  $("opt-pile").checked = reglages.pile;
  $("opt-aide").checked = reglages.aide;
  $("opt-conseils").checked = reglages.conseils;
  $("opt-jauge").checked = reglages.jauge;
  $("opt-chouette").checked = reglages.chouetteVolante;
  remplirChoixPortraits();
  $("btn-annuler-partie").style.display = P ? "" : "none";
  $("fen-partie").classList.add("ouvert");
}

function demarrer(tuto) {
  const advs = [...document.querySelectorAll("input[name=adv]:checked")].map(c => c.value);
  reglages = {
    ...reglages,
    nom: $("opt-nom").value.trim() || "Vous",
    advs: advs.length ? advs : ["arthur"],
    pile: $("opt-pile").checked,
    aide: $("opt-aide").checked,
    conseils: $("opt-conseils").checked,
    jauge: $("opt-jauge").checked,
    chouetteVolante: $("opt-chouette").checked,
    portrait: reglages.portrait
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

// Tableau des 56 lancers possibles dans les règles, calculé avec les fonctions du jeu pour ne jamais les contredire
function remplirTableLancers() {
  const effet = (des, combi) => {
    const n = points(des, combi);
    const pts = `${n} ${n > 1 ? "pts" : "pt"}`;
    switch (combi) {
      case "chouette": return `${pts} au lanceur (ou sirotage)`;
      case "chouette-velute": return `${pts} au premier qui crie`;
      case "suite": return "−10 pts au dernier qui crie";
      case "neant": return "0 pt, Grelottine";
      default: return `${pts} au lanceur`;
    }
  };
  const table = $("table-lancers");
  table.innerHTML = "<tr><th>Dés</th><th>Combinaison</th><th>Résultat</th></tr>";
  for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) for (let c = b; c <= 6; c++) {
    const des = [a, b, c];
    const combi = analyser(des);
    const ligne = document.createElement("tr");
    ligne.className = "combi-" + combi;
    for (const texte of [des.join(" · "), NOMS[combi], effet(des, combi)]) {
      const td = document.createElement("td");
      td.textContent = texte;
      ligne.appendChild(td);
    }
    table.appendChild(ligne);
  }
}

elDes.forEach(el => dessinerDe(el, 0));
remplirTableLancers();
// Les portraits d'émotion sont chargés d'avance : pas de clignotement quand un personnage change de tête
Object.values(ADVERSAIRES).forEach(a => Object.values(a.emotions).forEach(src => { new Image().src = src; }));
document.querySelectorAll("[data-adversaire]").forEach(el => {
  const a = ADVERSAIRES[el.dataset.adversaire];
  dessinerPortrait(el, a.nom, a.portrait);
});
ouvrirNouvellePartie();
// Lien d'invitation (?partie=CODE) : on ouvre directement la fenêtre pour rejoindre
if (Reseau.codeInvitation()) { $("fen-partie").classList.remove("ouvert"); Reseau.ouvrir(Reseau.codeInvitation()); }
