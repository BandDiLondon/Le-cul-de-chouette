// ---------- Sons ----------
// Tous les sons sont synthétisés avec la Web Audio API : aucun fichier à charger, le jeu reste jouable hors ligne.
// Les cris sont prononcés par la synthèse vocale du navigateur, si une voix française est disponible.

const Sons = (() => {
  const ICONES = { tout: "🔊", sons: "🔈", muet: "🔇" };
  const LIBELLES = { tout: "Sons et voix", sons: "Sons seulement", muet: "Muet" };

  // voixJoueur / voixAdversaire : nom de la voix choisie, ou "" pour le choix automatique
  const DEFAUT = { mode: "tout", volume: 70, voixJoueur: "", voixAdversaire: "" };
  let reglages = { ...DEFAUT };
  try { reglages = { ...DEFAUT, ...JSON.parse(localStorage.getItem("cdc-son") || "{}") }; } catch {}
  if (!ICONES[reglages.mode]) reglages.mode = "tout";

  function sauver() {
    try { localStorage.setItem("cdc-son", JSON.stringify(reglages)); } catch {}
  }

  let ctx = null;
  let maitre = null;

  // Le contexte audio ne peut démarrer qu'après un clic : il est créé au premier son
  function contexte() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      maitre = ctx.createGain();
      maitre.gain.value = reglages.volume / 140;
      maitre.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function note(freq, debut, duree, { type = "sine", volume = 0.25, glisse = null, attaque = 0.01 } = {}) {
    const t = ctx.currentTime + debut;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glisse) o.frequency.exponentialRampToValueAtTime(glisse, t + duree);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + attaque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g).connect(maitre);
    o.start(t);
    o.stop(t + duree + 0.05);
  }

  function bruit(debut, duree, { volume = 0.25, filtre = 2000, q = 1, glisse = null, type = "bandpass" } = {}) {
    const t = ctx.currentTime + debut;
    const tampon = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duree), ctx.sampleRate);
    const donnees = tampon.getChannelData(0);
    for (let i = 0; i < donnees.length; i++) donnees[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = tampon;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(filtre, t);
    if (glisse) f.frequency.exponentialRampToValueAtTime(glisse, t + duree);
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    src.connect(f).connect(g).connect(maitre);
    src.start(t);
  }

  const alerte = () => {
    for (let i = 0; i < 4; i++) note(i % 2 ? 660 : 880, i * 0.11, 0.1, { type: "square", volume: 0.12 });
  };

  const SONS = {
    // Les dés qui s'entrechoquent dans la main, puis tombent sur la table
    secoue: (duree = 0.5) => {
      for (let t = 0; t < duree - 0.05; t += 0.06 + Math.random() * 0.03) {
        bruit(t, 0.035, { volume: 0.22, filtre: 2500 + Math.random() * 2500, q: 4 });
      }
    },
    pose: () => {
      note(160, 0, 0.12, { type: "triangle", volume: 0.35, glisse: 70 });
      bruit(0, 0.06, { volume: 0.25, filtre: 1200, q: 1 });
    },
    // Un dé qui tombe par terre : choc sourd, puis il roule un peu
    tombe: () => {
      note(95, 0, 0.25, { type: "sine", volume: 0.45, glisse: 50, attaque: 0.004 });
      bruit(0, 0.12, { volume: 0.3, filtre: 500, type: "lowpass" });
      for (let i = 0; i < 4; i++) bruit(0.2 + i * 0.07, 0.03, { volume: 0.12 - i * 0.025, filtre: 2500, q: 2 });
    },
    // Petit rebond après le choc, plus léger
    rebond: () => {
      note(220, 0, 0.06, { type: "triangle", volume: 0.14, glisse: 120 });
      bruit(0, 0.03, { volume: 0.1, filtre: 1800, q: 1 });
    },
    // Hululement « hou-hou »
    chouette: () => {
      note(440, 0, 0.22, { volume: 0.22, glisse: 400, attaque: 0.04 });
      note(440, 0.32, 0.5, { volume: 0.22, glisse: 360, attaque: 0.05 });
    },
    velute: () => [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.08, 0.35, { type: "triangle", volume: 0.18 })),
    cul: () => {
      [392, 523, 659].forEach((f, i) => note(f, i * 0.12, 0.14, { type: "square", volume: 0.1 }));
      note(784, 0.36, 0.7, { type: "square", volume: 0.12 });
      note(1047, 0.36, 0.7, { type: "triangle", volume: 0.12 });
    },
    neant: () => {
      note(330, 0, 0.3, { type: "triangle", volume: 0.2, glisse: 260 });
      note(260, 0.32, 0.5, { type: "triangle", volume: 0.2, glisse: 180 });
    },
    suite: alerte,
    "chouette-velute": alerte,
    // Compte à rebours et départ du duel
    tic: () => note(880, 0, 0.08, { type: "square", volume: 0.1 }),
    go: () => note(1320, 0, 0.22, { type: "square", volume: 0.12 }),
    bon: () => {
      note(660, 0, 0.1, { type: "triangle", volume: 0.2 });
      note(990, 0.08, 0.1, { type: "triangle", volume: 0.2 });
      note(1320, 0.16, 0.3, { type: "triangle", volume: 0.2 });
    },
    bevue: () => {
      note(110, 0, 0.55, { type: "sawtooth", volume: 0.18 });
      note(117, 0, 0.55, { type: "square", volume: 0.1 });
    },
    lent: () => note(440, 0, 0.45, { type: "triangle", volume: 0.2, glisse: 200 }),
    gain: () => {
      note(988, 0.1, 0.08, { type: "square", volume: 0.07 });
      note(1319, 0.17, 0.25, { type: "square", volume: 0.07 });
    },
    perte: () => note(330, 0.1, 0.3, { type: "triangle", volume: 0.15, glisse: 160 }),
    // Aspiration du sirotage, puis quelques bulles
    sirote: () => {
      bruit(0, 0.6, { volume: 0.18, filtre: 400, glisse: 1600, q: 6 });
      for (let i = 0; i < 4; i++) note(500 + Math.random() * 500, 0.55 + i * 0.07, 0.06, { volume: 0.1, glisse: 1200 });
    },
    oiseau: () => {
      note(2200, 0, 0.08, { volume: 0.1, glisse: 3200 });
      note(2400, 0.11, 0.1, { volume: 0.1, glisse: 3400 });
    },
    // Petits grelots pour la Grelottine
    grelot: () => {
      for (let i = 0; i < 6; i++) {
        const f = 2400 + Math.random() * 1200;
        note(f, i * 0.05, 0.35, { volume: 0.06 });
        note(f * 2.76, i * 0.05, 0.2, { volume: 0.02 });
      }
    },
    // Roulement de tambour pour le Civet
    civet: () => {
      for (let i = 0; i < 8; i++) bruit(i * 0.045, 0.05, { volume: 0.12 + i * 0.02, filtre: 300, q: 1, type: "lowpass" });
      note(110, 0.38, 0.25, { type: "triangle", volume: 0.3, glisse: 60 });
    },
    lecon: () => bruit(0, 0.25, { volume: 0.06, filtre: 3000, glisse: 6000, q: 0.8 }),
    clic: () => note(1200, 0, 0.03, { type: "square", volume: 0.03 }),
    victoire: () => {
      [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => {
        note(f, [0, .12, .24, .36, .6, .78, .9, 1.1][i], i === 7 ? 0.9 : 0.16, { type: "square", volume: 0.1 });
      });
    },
    // Trombone triste
    defaite: () => [392, 370, 349].forEach((f, i) => note(f, i * 0.4, i === 2 ? 1 : 0.38, { type: "sawtooth", volume: 0.12, glisse: i === 2 ? 300 : null })),
    // Gestes qui accompagnent les cris : poing sur la table (Suite), claques sur les genoux (Chouette-Velute)
    poing: () => {
      for (const t of [0, 0.16]) {
        note(90, t, 0.18, { type: "sine", volume: 0.5, glisse: 45, attaque: 0.003 });
        bruit(t, 0.08, { volume: 0.3, filtre: 600, type: "lowpass" });
      }
    },
    genoux: () => {
      for (const t of [0, 0.14]) bruit(t, 0.07, { volume: 0.45, filtre: 1800, q: 0.7 });
    }
  };

  function jouer(nom, ...args) {
    if (reglages.mode === "muet" || !SONS[nom] || !contexte()) return;
    try { SONS[nom](...args); } catch {}
  }

  // ---------- Voix ----------
  const synthese = "speechSynthesis" in window ? window.speechSynthesis : null;

  // Une ponctuation plus marquée aide les voix à mettre le ton
  const PRONONCIATION = {
    "Grelotte ça picote !": "Grelotte, ça picote !",
    "Pas mou le caillou !": "Pas mou, le caillou !"
  };

  const PRENOMS_MASCULINS = /henri|paul|claude|r[eé]my|thomas|antoine|jean|alain|g[eé]rard|fabrice|j[eé]r[oô]me|maurice|yves|thierry|guillaume|nicolas|louis|mathieu|daniel|jacques|pierre|olivier|sylvain|alexandre|arnaud|christophe|xavier/i;

  // Les voix « Natural » d'Edge et « Google » de Chrome sont nettement plus naturelles que les voix système
  function qualite(v) {
    const n = v.name.toLowerCase();
    let s = 0;
    if (/natural|neural/.test(n)) s += 100;
    else if (/online/.test(n)) s += 80;
    if (/google/.test(n)) s += 60;
    if (/premium|enhanced|amélior/.test(n)) s += 50;
    if (!v.localService) s += 5;
    if (v.lang.toLowerCase().replace("_", "-") === "fr-fr") s += 3;
    return s;
  }

  function voixFrancaises() {
    if (!synthese) return [];
    return synthese.getVoices()
      .filter(v => v.lang && v.lang.toLowerCase().startsWith("fr"))
      .sort((a, b) => qualite(b) - qualite(a));
  }

  const estNaturelle = v => qualite(v) >= 50;

  // Choix automatique : une voix masculine pour l'adversaire si possible, une autre voix pour le joueur
  function voixPour(adversaire) {
    const liste = voixFrancaises();
    if (!liste.length) return null;
    const choisie = liste.find(v => v.name === (adversaire ? reglages.voixAdversaire : reglages.voixJoueur));
    if (choisie) return choisie;
    const adv = liste.find(v => v.name === reglages.voixAdversaire)
      || liste.find(v => PRENOMS_MASCULINS.test(v.name) && qualite(v) >= qualite(liste[0]) - 60)
      || liste[0];
    if (adversaire) return adv;
    return liste.find(v => v !== adv) || adv;
  }

  function dire(texte, adversaire = false) {
    if (reglages.mode !== "tout") return;
    // Un cri enregistré au micro passe avant la synthèse vocale
    if (typeof Cris !== "undefined" && Cris.jouer(texte, adversaire)) {
      if (synthese) synthese.cancel();
      return;
    }
    if (!synthese) return;
    const voix = voixPour(adversaire);
    if (!voix) return;
    synthese.cancel();
    const u = new SpeechSynthesisUtterance(PRONONCIATION[texte] || texte);
    u.voice = voix;
    u.lang = voix.lang;
    u.rate = 1.1;
    u.volume = reglages.volume / 100;
    // Si les deux joueurs partagent la même voix, on les distingue par la hauteur
    const memeVoix = voixPour(!adversaire) === voix;
    u.pitch = memeVoix ? (adversaire ? 0.75 : 1.2) : 1;
    synthese.speak(u);
  }

  function tester(adversaire) {
    const ancien = reglages.mode;
    reglages.mode = "tout";
    dire(adversaire ? "Grelotte ça picote !" : "Pas mou le caillou !", adversaire);
    reglages.mode = ancien;
  }

  // ---------- Réglages ----------
  function definir(cle, valeur) {
    reglages[cle] = valeur;
    sauver();
    if (cle === "volume" && maitre) maitre.gain.value = valeur / 140;
    if (cle === "mode" && valeur !== "tout" && synthese) synthese.cancel();
  }

  const obtenir = () => ({ ...reglages });
  // Contexte audio et sortie principale, partagés avec les cris enregistrés
  const sortie = () => (contexte() ? { ctx, maitre } : null);
  const etat = () => ({ icone: ICONES[reglages.mode], libelle: LIBELLES[reglages.mode] });

  // La liste des voix arrive souvent après le chargement de la page
  function surChangementVoix(rappel) {
    if (synthese) synthese.addEventListener("voiceschanged", rappel);
  }
  if (synthese) synthese.getVoices();

  return { jouer, dire, tester, definir, obtenir, etat, sortie, voixFrancaises, voixPour, estNaturelle, surChangementVoix, disponible: !!synthese };
})();
