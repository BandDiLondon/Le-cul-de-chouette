// ---------- Jeu en ligne ----------
// Les deux navigateurs se connectent directement (WebRTC) grâce à PeerJS, qui ne sert qu'à se trouver.
// Chaque appareil fait tourner la même partie : les dés viennent d'un tirage commun (même graine),
// et seules les décisions des joueurs et leurs temps de réaction passent par le réseau.

const Reseau = (() => {
  // À augmenter dès que les messages échangés changent (2 : jauge de lancer ; 3 : ordinateurs ajoutés)
  const VERSION = 3;
  const PREFIXE = "cul-de-chouette-";
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const URL_EN_LIGNE = "https://banddilondon.github.io/Le-cul-de-chouette/";
  const PEERJS = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  const BATTEMENT = 5000;
  const SILENCE_MAX = 70000;

  let peer = null;
  let conn = null;
  let hote = false;
  let nomMoi = "";
  let nomAutre = "";
  let partieLancee = false;
  let derniereReception = 0;
  let battement = null;
  let delaiConnexion = null;

  // Messages de jeu en attente, rangés par type ; ils sont lus dans l'ordre par recevoir()
  const file = new Map();
  const attentes = new Map();
  // Messages de contrôle (début de manche, revanche) traités dès leur arrivée
  const ecouteurs = new Map();

  const el = id => document.getElementById(id);

  // ---------- Messages ----------
  function envoyer(t, d = null) {
    if (conn && conn.open) conn.send({ t, d });
  }

  function recevoir(t) {
    const f = file.get(t);
    if (f && f.length) return Promise.resolve(f.shift());
    return new Promise(ok => {
      if (!attentes.has(t)) attentes.set(t, []);
      attentes.get(t).push(ok);
    });
  }

  function viderFile() {
    file.clear();
    attentes.clear();
  }

  const sur = (t, rappel) => ecouteurs.set(t, rappel);

  function traiter(msg) {
    derniereReception = Date.now();
    if (!msg || typeof msg.t !== "string") return;
    if (msg.t === "ping") return;
    if (msg.t === "quitter") return perdu();
    if (msg.t === "bonjour") return accueillir(msg.d);
    if (ecouteurs.has(msg.t)) return ecouteurs.get(msg.t)(msg.d);
    const w = attentes.get(msg.t);
    if (w && w.length) w.shift()(msg.d);
    else {
      if (!file.has(msg.t)) file.set(msg.t, []);
      file.get(msg.t).push(msg.d);
    }
  }

  function accueillir(d) {
    if (!d || d.version !== VERSION) {
      erreur("Votre adversaire n'a pas la même version du jeu : rechargez la page tous les deux.");
      nettoyer();
      return;
    }
    nomAutre = String(d.nom || "Adversaire").slice(0, 20);
    partieLancee = true;
    clearTimeout(delaiConnexion);
    el("fen-ligne").classList.remove("ouvert");
    demarrerEnLigne({
      hote, nomMoi, nomAutre,
      pile: el("ligne-pile").checked,
      portraitMoi: reglages.portrait,
      portraitAutre: String(d.portrait || "")
    });
  }

  // ---------- Connexion ----------
  function chargerPeerJS() {
    if (window.Peer) return Promise.resolve();
    return new Promise((ok, ko) => {
      const s = document.createElement("script");
      s.src = PEERJS;
      s.onload = ok;
      s.onerror = () => ko({ type: "chargement" });
      document.head.appendChild(s);
    });
  }

  function brancher(c) {
    conn = c;
    c.on("open", () => {
      derniereReception = Date.now();
      c.send({ t: "bonjour", d: { nom: nomMoi, version: VERSION, portrait: reglages.portrait } });
      statut("Connecté ! Lancement de la partie…");
      clearInterval(battement);
      battement = setInterval(() => {
        envoyer("ping");
        if (Date.now() - derniereReception > SILENCE_MAX) perdu();
      }, BATTEMENT);
    });
    c.on("data", traiter);
    c.on("close", perdu);
    c.on("error", perdu);
  }

  const nouveauCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

  function creer() {
    hote = true;
    const code = nouveauCode();
    peer = new Peer(PREFIXE + code, { debug: 0 });
    peer.on("open", () => afficherCode(code));
    peer.on("connection", c => {
      // Une seule partie à la fois : les connexions suivantes sont refusées
      if (conn) { c.on("open", () => c.close()); return; }
      brancher(c);
    });
    peer.on("error", e => {
      if (e.type === "unavailable-id") { peer.destroy(); creer(); return; }
      erreurPeer(e);
    });
  }

  function rejoindre(code) {
    hote = false;
    peer = new Peer({ debug: 0 });
    peer.on("open", () => brancher(peer.connect(PREFIXE + code, { reliable: true })));
    peer.on("error", erreurPeer);
    clearTimeout(delaiConnexion);
    delaiConnexion = setTimeout(() => {
      if (partieLancee) return;
      nettoyer();
      erreur("La connexion n'aboutit pas. Vérifiez le code ; certains réseaux (entreprise, école, 4G) bloquent ce type de connexion.");
      formulaireActif(true);
    }, 20000);
  }

  function erreurPeer(e) {
    const messages = {
      "peer-unavailable": "Aucune partie ne correspond à ce code. Vérifiez-le, ou demandez à votre ami d'en créer une nouvelle.",
      "browser-incompatible": "Ce navigateur ne permet pas le jeu en ligne. Essayez Microsoft Edge, Google Chrome ou Firefox.",
      network: "Impossible de joindre le service de mise en relation. Vérifiez votre connexion Internet.",
      "server-error": "Le service de mise en relation ne répond pas. Réessayez dans un instant.",
      "socket-error": "Impossible de joindre le service de mise en relation. Vérifiez votre connexion Internet.",
      chargement: "Impossible de charger le module de jeu en ligne. Vérifiez votre connexion Internet."
    };
    if (partieLancee) return perdu();
    nettoyer();
    erreur(messages[e && e.type] || "La connexion a échoué. Réessayez.");
    formulaireActif(true);
  }

  function nettoyer() {
    clearInterval(battement);
    clearTimeout(delaiConnexion);
    const c = conn;
    const p = peer;
    conn = null;
    peer = null;
    partieLancee = false;
    viderFile();
    try { if (c) c.close(); } catch {}
    try { if (p) p.destroy(); } catch {}
  }

  function perdu() {
    if (!conn && !peer) return;
    const etaitLancee = partieLancee;
    nettoyer();
    if (etaitLancee) connexionPerdue(nomAutre);
    else {
      erreur("La connexion a été coupée avant le début de la partie.");
      formulaireActif(true);
    }
  }

  // Quitte proprement : l'autre joueur est prévenu tout de suite
  function fermer() {
    envoyer("quitter");
    nettoyer();
  }

  window.addEventListener("pagehide", () => { if (conn) envoyer("quitter"); });

  // ---------- Fenêtre « Jouer en ligne » ----------
  function erreur(texte) {
    el("ligne-erreur").textContent = texte || "";
    el("ligne-erreur").hidden = !texte;
  }

  const statut = texte => { el("ligne-statut").textContent = texte; };

  function formulaireActif(actif) {
    ["btn-creer", "btn-rejoindre", "ligne-nom", "ligne-code", "ligne-pile"].forEach(id => { el(id).disabled = !actif; });
    if (actif) {
      el("ligne-accueil").hidden = false;
      el("ligne-attente").hidden = true;
    }
  }

  function lienInvitation(code) {
    const base = location.protocol === "file:" ? URL_EN_LIGNE : location.origin + location.pathname;
    return base + "?partie=" + code;
  }

  function afficherCode(code) {
    el("ligne-accueil").hidden = true;
    el("ligne-attente").hidden = false;
    el("code-partie").textContent = code;
    el("lien-partie").value = lienInvitation(code);
    statut("En attente de votre adversaire…");
  }

  function lireNom() {
    const nom = el("ligne-nom").value.trim();
    if (!nom) { erreur("Entrez votre nom : il sera affiché chez votre adversaire."); el("ligne-nom").focus(); return null; }
    reglages.nom = nom;
    sauverReglages();
    return nom;
  }

  async function lancer(action) {
    erreur("");
    formulaireActif(false);
    try {
      await chargerPeerJS();
      action();
    } catch (e) {
      erreurPeer(e);
    }
  }

  function ouvrir(code = "") {
    if (conn || peer) fermer();
    erreur("");
    formulaireActif(true);
    el("ligne-nom").value = reglages.nom === "Vous" ? "" : reglages.nom;
    el("ligne-code").value = code;
    remplirChoixPortraits();
    remplirChoixPcs();
    el("fen-ligne").classList.add("ouvert");
    (el("ligne-nom").value ? (code ? el("btn-rejoindre") : el("ligne-code")) : el("ligne-nom")).focus();
  }

  el("btn-creer").onclick = () => {
    const nom = lireNom();
    if (nom) { nomMoi = nom; lancer(creer); }
  };
  el("btn-rejoindre").onclick = () => {
    const nom = lireNom();
    if (!nom) return;
    const code = el("ligne-code").value.trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(code)) { erreur("Le code de partie fait 5 caractères (lettres et chiffres)."); el("ligne-code").focus(); return; }
    nomMoi = nom;
    lancer(() => { statut("Connexion…"); rejoindre(code); });
  };
  el("ligne-code").oninput = e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); };
  el("ligne-code").onkeydown = e => { if (e.key === "Enter") el("btn-rejoindre").click(); };
  el("btn-copier-lien").onclick = async () => {
    const champ = el("lien-partie");
    try { await navigator.clipboard.writeText(champ.value); }
    catch { champ.select(); document.execCommand("copy"); }
    el("btn-copier-lien").textContent = "✓ Lien copié !";
    setTimeout(() => { el("btn-copier-lien").textContent = "📋 Copier le lien"; }, 2000);
  };
  el("btn-fermer-ligne").onclick = () => {
    if (!partieLancee) nettoyer();
    el("fen-ligne").classList.remove("ouvert");
    if (!P) ouvrirNouvellePartie();
  };

  const codeInvitation = () => (new URLSearchParams(location.search).get("partie") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  const connecte = () => !!(conn && conn.open);

  return { envoyer, recevoir, viderFile, sur, fermer, connecte, ouvrir, codeInvitation };
})();
