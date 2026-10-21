// ---------- Tutoriel et conseils ----------
// Chargé avant jeu.js : ne contient que des données et des fonctions appelées pendant la partie.

// Dés imposés pendant le tutoriel, un lancer par tour en alternance (vous, puis l'adversaire)
const SCENARIO_TUTO = [
  [4, 4, 1], // vous : Chouette, choix du Sirotage
  [2, 3, 5], // adversaire : Velute
  [3, 4, 5], // vous : Suite
  [1, 1, 2], // adversaire : Chouette-Velute
  [1, 3, 6], // vous : Néant et Grelottine
  [2, 2, 5], // adversaire : Chouette sirotée, pari des oiseaux
  [6, 6, 6]  // vous : Civet, puis Cul de Chouette
];

// Chaque leçon n'est montrée qu'une fois par partie. **texte** = gras, \n = retour à la ligne.
const LECONS = {
  intro: ["Bienvenue à la table !",
    "Le but : être le premier à atteindre **343 points pile**. À chaque tour, on lance les deux **chouettes**, puis le **cul**.\n" +
    "Pendant ce tutoriel, les dés des premiers tours sont arrangés pour vous montrer chaque règle, et un conseil s'affiche à chaque choix."],
  chouette: ["La Chouette",
    "Deux dés identiques : c'est une **Chouette**. Elle vaut le carré de la paire : deux 4 donnent 4 × 4 = **16 pts**.\n" +
    "Le lanceur peut la garder, ou tenter de la **siroter** pour la changer en Cul de Chouette."],
  velute: ["La Velute",
    "La somme de deux dés égale le troisième (2 + 3 = 5) : c'est une **Velute**. Elle vaut deux fois le carré du plus grand dé : 2 × 5 × 5 = **50 pts**."],
  // La Suite et la Chouette-Velute sont expliquées dans la fenêtre de réflexe (voir explicationReflexe)
  cul: ["Le Cul de Chouette",
    "Trois dés identiques : un **Cul de Chouette** ! Il vaut 40 + 10 × la valeur du dé, de **50 à 100 pts**. C'est la meilleure combinaison du jeu."],
  neant: ["Le Néant",
    "Aucune combinaison : c'est le **Néant**. Pas de points, mais le lanceur reçoit une **Grelottine** 🔔.\n" +
    "Elle sert à défier l'adversaire juste avant son tour."],
  defi: ["La Grelottine",
    "Vous avez une Grelottine : vous pouvez **défier** l'adversaire avant son lancer. Vous choisissez une combinaison et une mise.\n" +
    "S'il la **rate**, vous lui prenez la mise. S'il la **réussit**, c'est lui qui vous la prend. La Grelottine ne sert qu'une fois."],
  "defi-subi": ["Vous êtes défié !",
    "L'adversaire utilise sa Grelottine contre vous. Si votre lancer donne la combinaison annoncée, vous gagnez la mise ; sinon, vous la perdez.\n" +
    "Vous n'avez rien à décider : lancez !"],
  oiseaux: ["Le pari des oiseaux",
    "L'adversaire **sirote** : il relance le dé qui n'est pas dans la paire. S'il retombe sur la valeur de la paire, c'est un Cul de Chouette ; sinon, il perd les points de sa Chouette.\n" +
    "Pendant ce temps, vous pouvez parier sur ce dé en criant un oiseau : 1 Linotte, 2 Alouette, 3 Fauvette, 4 Mouette, 5 Bergeronnette, 6 Chouette. Un pari juste rapporte **25 pts**."],
  civet: ["Le Civet",
    "Une fois par partie, avant de lancer, vous pouvez annoncer un **Civet** : vous pariez jusqu'à **102 pts** sur la combinaison que vous allez faire.\n" +
    "Juste : vous gagnez la mise. Faux : vous la perdez."],
  "civet-tuto": ["Le Civet",
    "Une fois par partie, avant de lancer, vous pouvez annoncer un **Civet** : vous pariez jusqu'à **102 pts** sur la combinaison que vous allez faire.\n" +
    "Juste : vous gagnez la mise. Faux : vous la perdez.\n" +
    "Petit secret : les dés de ce tutoriel sont encore arrangés… Essayez un Civet sur **Cul de Chouette** !"],
  depassement: ["343 pile",
    "Avec la règle des **343 pile**, ce qui dépasse 343 est retiré : à 340, gagner 5 points fait redescendre à 338. En fin de partie, il faut viser juste."],
  fin: ["Fin du tutoriel",
    "Vous connaissez toutes les règles ! À partir de maintenant, les dés ne sont plus arrangés : la partie continue pour de vrai.\n" +
    "Les conseils restent affichés à chaque choix. Pour une partie sans aide, décochez « Conseils » dans « Nouvelle partie »."]
};

// ---------- Bulle d'explication ----------
function formater(texte) {
  const div = document.createElement("div");
  div.textContent = texte;
  return div.innerHTML.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
}

function afficherBulle(titre, texte, type) {
  const b = document.getElementById("bulle");
  b.className = "bulle " + type;
  b.querySelector(".bulle-titre").textContent = titre;
  b.querySelector(".bulle-texte").innerHTML = formater(texte);
  b.hidden = false;
}

function cacherBulle() {
  document.getElementById("bulle").hidden = true;
}

// Leçon bloquante : le jeu attend que le joueur clique sur « Compris »
async function expliquer(cle) {
  if (!regles.conseils || !LECONS[cle] || P.vus.has(cle)) return;
  P.vus.add(cle);
  const [titre, texte] = LECONS[cle];
  afficherBulle("📜 " + titre, texte, "lecon");
  Sons.jouer("lecon");
  await choisir("", [{ label: "Compris ▸", val: true, classe: "vert" }]);
}

// Conseil non bloquant, affiché à côté des boutons de choix et effacé au clic
function conseiller(texte) {
  if (regles.conseils) afficherBulle("🦉 Conseil", texte, "conseil");
}

// ---------- Textes de la fenêtre de réflexe ----------
const secondes = ms => (ms / 1000).toFixed(2).replace(".", ",") + " s";
const ASTUCE_CRIS = "**Pour reconnaître le bon cri :** trois dés qui se suivent → « Grelotte ça picote ! » ; " +
  "une paire dont la somme fait le troisième dé → « Pas mou le caillou ! ».";

// Explication complète, montrée avant le premier réflexe de chaque type
function explicationReflexe(combi, des, lanceur, ia, min, max) {
  const [a, b, c] = [...des].sort((x, y) => x - y);
  const deroulement = "**Comment ça se passe :** cliquez sur « Je suis prêt ». Après le compte à rebours 3, 2, 1, " +
    `les deux cris apparaissent dans un ordre au hasard : cliquez vite le bon. ${ia.nom} crie au bout de ${secondes(min)} à ${secondes(max)}.`;
  if (combi === "suite") {
    return [
      `**Pourquoi ?** ${a} · ${b} · ${c} : les trois dés se suivent, c'est une **Suite**.`,
      `**Que faire ?** Tout le monde, lanceur compris, frappe la table en criant **« ${GRELOTTE} »**.`,
      `**L'enjeu :** le **dernier** à crier perd **10 pts**. Criez avant ${ia.nom} et c'est lui qui les perd.`,
      `**Le piège :** l'autre bouton, « ${PAS_MOU} », est le cri de la Chouette-Velute. Se tromper de cri est une **Bévue** : −10 pts.`,
      deroulement
    ].join("\n\n");
  }
  const pts = points(des, combi);
  const chez = lanceur.ia
    ? `C'est le lancer ${/^[aeiouyhàâéèêîôû]/i.test(lanceur.nom) ? "d'" : "de "}${lanceur.nom}, mais peu importe : le premier qui crie prend les points. Volez-les-lui !`
    : `C'est votre lancer, mais si ${ia.nom} crie avant vous, c'est lui qui prend les points !`;
  return [
    `**Pourquoi ?** ${a} · ${b} · ${c} : une paire de ${a} (Chouette) et ${a} + ${b} = ${c} (Velute). C'est une **Chouette-Velute**.`,
    `**Que faire ?** Se taper les genoux en criant **« ${PAS_MOU} »**.`,
    `**L'enjeu :** le **premier** à crier gagne la Velute : 2 × ${c} × ${c} = **${pts} pts**. ${chez}`,
    `**Le piège :** « ${GRELOTTE} » est le cri de la Suite. Se tromper est une **Bévue** : −10 pts, et ${ia.nom} empoche les ${pts} pts.`,
    deroulement
  ].join("\n\n");
}

// Rappel court, affiché pendant le duel quand les conseils sont activés
function rappelReflexe(combi, des) {
  return combi === "suite"
    ? `Dés qui se suivent → **« ${GRELOTTE} »**. Le dernier perd 10 pts.`
    : `Une paire + sa somme → **« ${PAS_MOU} »**. Le premier gagne ${points(des, combi)} pts.`;
}

// Bilan du duel, toujours affiché
function resultatReflexe(combi, des, r, ia) {
  const attendu = combi === "suite" ? GRELOTTE : PAS_MOU;
  const pts = points(des, combi);
  const astuce = regles.conseils ? "\n\n" + ASTUCE_CRIS : "";
  if (r.res === "humain") {
    return combi === "suite"
      ? `Bon cri, en **${secondes(r.ms)}** ! ${ia.nom} a crié après vous (il lui fallait ${secondes(r.delaiIA)}) : c'est lui le dernier, il perd **10 pts**.`
      : `Premier, en **${secondes(r.ms)}** ! Vous gagnez les **${pts} pts** de la Velute. ${ia.nom} aurait crié en ${secondes(r.delaiIA)}.`;
  }
  if (r.res === "ia") {
    return (combi === "suite"
      ? `${ia.nom} a crié « ${GRELOTTE} » en **${secondes(r.delaiIA)}**, avant vous : vous êtes le dernier, **−10 pts**.`
      : `${ia.nom} s'est tapé les genoux en **${secondes(r.delaiIA)}** : il gagne les **${pts} pts** de la Velute.`) + astuce;
  }
  const autre = combi === "suite" ? "celui de la Chouette-Velute" : "celui de la Suite";
  return `Vous avez crié « ${r.cri} » en ${secondes(r.ms)}, mais c'est ${autre}. Sur une ${NOMS[combi]}, il fallait **« ${attendu} »**.\n` +
    (combi === "suite" ? "**−10 pts** pour la Bévue." : `**−10 pts** pour la Bévue, et ${ia.nom} prend les ${pts} pts.`) + astuce;
}

// ---------- Calcul des conseils ----------
// Points réellement gagnés, en tenant compte du recul au-delà de 343
function gainReel(score, n) {
  const nv = score + n;
  return (regles.pile && nv > CIBLE ? 2 * CIBLE - nv : nv) - score;
}

const virgule = n => String(Math.round(n * 10) / 10).replace(".", ",").replace("-", "−");

function conseilSirotage(j, v) {
  const pts = v * v;
  const garder = gainReel(j.score, pts);
  const reussite = gainReel(j.score, 40 + 10 * v);
  const moyenne = reussite / 6 - pts * 5 / 6;
  let reco;
  if (regles.pile && j.score + pts === CIBLE) reco = `**gardez** : +${pts} vous amène pile à 343, vous gagnez !`;
  else if (regles.pile && j.score + 40 + 10 * v === CIBLE) reco = "**sirotez** : un Cul de Chouette vous ferait gagner la partie.";
  else if (moyenne > garder) reco = "**sirotez**, c'est plus rentable en moyenne avec une petite Chouette.";
  else reco = "**gardez**, le sirotage ne vaut pas le risque avec une Chouette aussi grosse.";
  let t = `Garder : **${signe(garder)}** à coup sûr.\n` +
    `Siroter : 1 chance sur 6 de **${signe(reussite)}** (Cul de Chouette de ${v}), sinon **−${pts}**. En moyenne, siroter rapporte ${virgule(moyenne)} pts.\n` +
    `Conseil : ${reco}`;
  if (garder !== pts) t += "\nAttention : vous êtes près de 343, les points en trop vous feront reculer.";
  return t;
}

function conseilOiseaux() {
  return "Chaque oiseau a **1 chance sur 6** de sortir. Parier ne coûte rien : choisissez n'importe lequel plutôt que « Pas de pari » !";
}

function analyseDefi(grelottin, cible) {
  return ["chouette", "velute", "cul"].map(c => {
    const p = CHANCES[c] / 216;
    const mise = plafondDefi(grelottin, cible, c);
    return { combi: c, mise, moyenne: (1 - 2 * p) * mise };
  });
}

function conseilDefi(grelottin, cible) {
  const options = analyseDefi(grelottin, cible);
  const meilleur = options.reduce((a, b) => b.moyenne > a.moyenne ? b : a);
  return `Vous gagnez si ${cible.nom} **rate** la combinaison : plus elle est rare, plus vous avez de chances, mais la mise maximale baisse.\n` +
    options.map(o => `${NOMS[o.combi]} : il réussit ${pct(CHANCES[o.combi])} du temps, mise max ${o.mise}, gain moyen ${signe(Math.round(o.moyenne))}.`).join("\n") +
    `\nConseil : défiez sur **${NOMS[meilleur.combi]}** avec la mise maximale. Attendre peut aussi payer : les mises montent avec les scores.`;
}

function conseilCivet(j) {
  const reste = CIBLE - j.score;
  let t = "Aucune combinaison ne sort plus d'une fois sur deux : en moyenne, le Civet **fait perdre** des points.\n" +
    "Chances : Chouette 42 %, Néant 31 %, Velute 18 %, Suite 11 %, Cul de Chouette 3 %.\n";
  if (regles.pile && reste > 0 && reste <= MISE_CIVET) {
    t += `Mais il vous manque **${reste} pts** : un Civet sur **Néant** misé à ${reste} vous fait gagner pile (31 %), car un Néant ne rapporte rien d'autre.`;
  } else {
    t += "Conseil : gardez-le pour la fin de partie, il sert surtout à atteindre 343 pile.";
  }
  return t;
}

// Conseil affiché avant le lancer, seulement quand il y a quelque chose d'utile à dire
function conseilAvantLancer(j) {
  const reste = CIBLE - j.score;
  if (j.civet && regles.pile && reste > 0 && reste <= MISE_CIVET) {
    conseiller(`Il vous manque **${reste} pts** : c'est le moment idéal pour un **Civet sur Néant** misé à ${reste}.`);
  }
}

function miseConseillee(j, combi) {
  const reste = CIBLE - j.score;
  return combi === "neant" && regles.pile && reste > 0 && reste <= MISE_CIVET ? reste : null;
}
