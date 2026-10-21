// ---------- Cris enregistrés au micro ----------
// Les enregistrements remplacent la synthèse vocale. Ils sont nettoyés (silences coupés, volume normalisé),
// convertis en WAV léger et conservés dans le navigateur (IndexedDB).

const Cris = (() => {
  const PHRASES = [
    { cle: "grelotte", texte: "Grelotte ça picote !", aide: "Suite" },
    { cle: "pasmou", texte: "Pas mou le caillou !", aide: "Chouette-Velute" },
    { cle: "grelottine", texte: "Grelottine !", aide: "Défi" },
    { cle: "civet", texte: "Civet !", aide: "Pari du Civet" },
    { cle: "linotte", texte: "Linotte !", aide: "Pari sur le 1" },
    { cle: "alouette", texte: "Alouette !", aide: "Pari sur le 2" },
    { cle: "fauvette", texte: "Fauvette !", aide: "Pari sur le 3" },
    { cle: "mouette", texte: "Mouette !", aide: "Pari sur le 4" },
    { cle: "bergeronnette", texte: "Bergeronnette !", aide: "Pari sur le 5" },
    { cle: "chouette", texte: "Chouette !", aide: "Pari sur le 6" },
    { cle: "victoire", texte: "Victoire !", aide: "Fin de partie : criez ce que vous voulez !" }
  ];
  const DUREE_MAX = 4000;
  const FREQUENCE = 24000;

  const blobs = new Map();   // "joueur:grelotte" → Blob WAV
  const tampons = new Map(); // même clé → AudioBuffer décodé, pour une lecture immédiate
  let enLecture = null;
  let stockageOk = true;

  const cleComplete = (adversaire, cle) => (adversaire ? "adversaire:" : "joueur:") + cle;

  // ---------- Stockage ----------
  function ouvrirBase() {
    return new Promise((ok, ko) => {
      const req = indexedDB.open("cdc-cris", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("cris");
      req.onsuccess = () => ok(req.result);
      req.onerror = () => ko(req.error);
    });
  }

  async function transaction(mode, action) {
    const base = await ouvrirBase();
    return new Promise((ok, ko) => {
      const tx = base.transaction("cris", mode);
      const req = action(tx.objectStore("cris"));
      tx.oncomplete = () => { base.close(); ok(req && req.result); };
      tx.onerror = () => { base.close(); ko(tx.error); };
    });
  }

  async function charger() {
    try {
      const cles = await transaction("readonly", s => s.getAllKeys());
      const valeurs = await transaction("readonly", s => s.getAll());
      cles.forEach((c, i) => blobs.set(c, valeurs[i]));
    } catch {
      stockageOk = false;
    }
  }

  async function sauver(cle, blob) {
    blobs.set(cle, blob);
    tampons.delete(cle);
    try { await transaction("readwrite", s => s.put(blob, cle)); } catch { stockageOk = false; }
  }

  async function effacer(cle) {
    blobs.delete(cle);
    tampons.delete(cle);
    try { await transaction("readwrite", s => s.delete(cle)); } catch { stockageOk = false; }
  }

  // ---------- Lecture ----------
  async function tampon(cle) {
    if (tampons.has(cle)) return tampons.get(cle);
    const sortie = Sons.sortie();
    if (!sortie) return null;
    const decode = await sortie.ctx.decodeAudioData(await blobs.get(cle).arrayBuffer());
    tampons.set(cle, decode);
    return decode;
  }

  async function lire(cle) {
    const sortie = Sons.sortie();
    const buf = await tampon(cle);
    if (!sortie || !buf) return;
    if (enLecture) try { enLecture.stop(); } catch {}
    const src = sortie.ctx.createBufferSource();
    src.buffer = buf;
    // Le gain maître est réglé pour les bruitages : on remonte un peu la voix
    const g = sortie.ctx.createGain();
    g.gain.value = 1.6;
    src.connect(g).connect(sortie.maitre);
    src.start();
    enLecture = src;
  }

  // Appelé par Sons.dire : renvoie true si un enregistrement remplace la synthèse
  function jouer(texte, adversaire) {
    const phrase = PHRASES.find(p => p.texte === texte);
    if (!phrase) return false;
    const cle = cleComplete(adversaire, phrase.cle);
    if (!blobs.has(cle)) return false;
    lire(cle).catch(() => {});
    return true;
  }

  // ---------- Nettoyage du son ----------
  async function traiter(blob) {
    const sortie = Sons.sortie();
    if (!sortie || typeof OfflineAudioContext === "undefined") return blob;
    const brut = await sortie.ctx.decodeAudioData(await blob.arrayBuffer());
    const sr = brut.sampleRate;
    const mono = new Float32Array(brut.length);
    for (let c = 0; c < brut.numberOfChannels; c++) {
      const canal = brut.getChannelData(c);
      for (let i = 0; i < canal.length; i++) mono[i] += canal[i] / brut.numberOfChannels;
    }
    let pic = 0;
    for (const x of mono) pic = Math.max(pic, Math.abs(x));
    if (pic < 0.02) throw new Error("silence");

    // Coupe les silences : garde 40 ms avant le premier son et 150 ms après le dernier
    const seuil = Math.max(0.01, pic * 0.1);
    let debut = mono.findIndex(x => Math.abs(x) > seuil);
    let fin = mono.length - 1;
    while (fin > debut && Math.abs(mono[fin]) <= seuil) fin--;
    debut = Math.max(0, debut - Math.round(0.04 * sr));
    fin = Math.min(mono.length, fin + Math.round(0.15 * sr));

    // Volume normalisé, avec un fondu de 10 ms aux extrémités pour éviter les clics
    const longueur = fin - debut;
    const morceau = new Float32Array(longueur);
    const fondu = Math.round(0.01 * sr);
    for (let i = 0; i < longueur; i++) {
      const enveloppe = Math.min(1, i / fondu, (longueur - 1 - i) / fondu);
      morceau[i] = mono[debut + i] * (0.9 / pic) * enveloppe;
    }

    // Rééchantillonnage à 24 kHz : largement suffisant pour une voix, et deux fois plus léger
    const hors = new OfflineAudioContext(1, Math.ceil(longueur * FREQUENCE / sr), FREQUENCE);
    const source = hors.createBufferSource();
    const b = hors.createBuffer(1, longueur, sr);
    b.copyToChannel(morceau, 0);
    source.buffer = b;
    source.connect(hors.destination);
    source.start();
    const rendu = await hors.startRendering();
    return wav(rendu.getChannelData(0), FREQUENCE);
  }

  function wav(echantillons, frequence) {
    const octets = new ArrayBuffer(44 + echantillons.length * 2);
    const v = new DataView(octets);
    const texte = (pos, s) => [...s].forEach((c, i) => v.setUint8(pos + i, c.charCodeAt(0)));
    texte(0, "RIFF");
    v.setUint32(4, 36 + echantillons.length * 2, true);
    texte(8, "WAVE");
    texte(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);              // PCM
    v.setUint16(22, 1, true);              // mono
    v.setUint32(24, frequence, true);
    v.setUint32(28, frequence * 2, true);  // octets par seconde
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);             // 16 bits
    texte(36, "data");
    v.setUint32(40, echantillons.length * 2, true);
    echantillons.forEach((x, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * 0x7fff, true));
    return new Blob([octets], { type: "audio/wav" });
  }

  // ---------- Micro ----------
  let flux = null;
  let enregistreur = null;

  async function micro() {
    if (flux) return flux;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("indisponible");
    }
    flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    return flux;
  }

  // Le micro reste ouvert tant que la fenêtre est affichée, pour éviter de redemander l'autorisation à chaque cri
  function libererMicro() {
    if (enregistreur && enregistreur.state !== "inactive") enregistreur.stop();
    if (flux) flux.getTracks().forEach(t => t.stop());
    flux = null;
  }

  async function enregistrer() {
    const f = await micro();
    return new Promise(ok => {
      const morceaux = [];
      const rec = new MediaRecorder(f);
      enregistreur = rec;
      rec.ondataavailable = e => { if (e.data.size) morceaux.push(e.data); };
      rec.onstop = () => ok(new Blob(morceaux, { type: rec.mimeType }));
      rec.start();
      setTimeout(() => { if (rec.state !== "inactive") rec.stop(); }, DUREE_MAX);
    });
  }

  function arreter() {
    if (enregistreur && enregistreur.state !== "inactive") enregistreur.stop();
  }

  function messageErreur(e) {
    if (e && e.message === "silence") return "Je n'ai rien entendu : rapprochez-vous du micro et criez plus fort !";
    if (e && e.message === "indisponible") return "Ce navigateur ne permet pas d'utiliser le micro ici. Essayez Microsoft Edge ou Google Chrome.";
    if (e && e.name === "NotAllowedError") return "L'accès au micro a été refusé. Autorisez-le avec l'icône 🔒 ou 🎙️ dans la barre d'adresse, puis réessayez.";
    if (e && e.name === "NotFoundError") return "Aucun micro n'a été trouvé sur cet appareil.";
    return "L'enregistrement a échoué. Réessayez.";
  }

  // ---------- Fenêtre « Vos cris » ----------
  const el = id => document.getElementById(id);
  let cote = false; // false = vous, true = l'adversaire
  let occupe = false;

  function erreur(texte) {
    el("cris-erreur").textContent = texte || "";
    el("cris-erreur").hidden = !texte;
  }

  function afficher() {
    el("onglet-joueur").classList.toggle("actif", !cote);
    el("onglet-adversaire").classList.toggle("actif", cote);
    el("cris-astuce").textContent = cote
      ? "Prenez une grosse voix de chevalier, ou faites crier quelqu'un d'autre ! Ces cris seront ceux de votre adversaire."
      : "Criez avec conviction ! Les silences au début et à la fin sont coupés automatiquement (4 secondes maximum).";
    const liste = el("liste-cris");
    liste.innerHTML = "";
    for (const p of PHRASES) {
      const cle = cleComplete(cote, p.cle);
      const present = blobs.has(cle);
      const ligne = document.createElement("div");
      ligne.className = "cri" + (present ? " present" : "");

      const titre = document.createElement("div");
      titre.className = "cri-texte";
      titre.textContent = "« " + p.texte + " »";
      const aide = document.createElement("small");
      aide.textContent = present ? "✓ Enregistré · " + p.aide : p.aide;
      titre.appendChild(aide);

      const rec = document.createElement("button");
      rec.className = "petit";
      rec.textContent = present ? "⏺ Refaire" : "⏺ Enregistrer";
      rec.onclick = () => (occupe ? arreter() : capturer(cle, rec));

      const ecouter = document.createElement("button");
      ecouter.className = "second petit";
      ecouter.textContent = "▶";
      ecouter.title = "Écouter";
      ecouter.disabled = !present;
      ecouter.onclick = () => lire(cle);

      const suppr = document.createElement("button");
      suppr.className = "second petit";
      suppr.textContent = "🗑";
      suppr.title = "Effacer";
      suppr.disabled = !present;
      suppr.onclick = async () => { await effacer(cle); afficher(); };

      ligne.append(titre, rec, ecouter, suppr);
      liste.appendChild(ligne);
    }
    if (!stockageOk) erreur("Ce navigateur ne permet pas de conserver les enregistrements : ils seront perdus en fermant la page.");
  }

  async function capturer(cle, bouton) {
    erreur("");
    occupe = true;
    document.querySelectorAll("#liste-cris button").forEach(b => { if (b !== bouton) b.disabled = true; });
    bouton.textContent = "⏹ Stop";
    bouton.classList.add("enregistre");
    try {
      const brut = await enregistrer();
      bouton.textContent = "…";
      const propre = await traiter(brut);
      await sauver(cle, propre);
      occupe = false;
      afficher();
      lire(cle);
    } catch (e) {
      occupe = false;
      afficher();
      erreur(messageErreur(e));
    }
  }

  function ouvrir() {
    erreur("");
    afficher();
    el("fen-cris").classList.add("ouvert");
  }

  function fermer() {
    arreter();
    libererMicro();
    el("fen-cris").classList.remove("ouvert");
  }

  el("btn-cris").onclick = ouvrir;
  el("btn-fermer-cris").onclick = fermer;
  el("onglet-joueur").onclick = () => { if (!occupe) { cote = false; afficher(); } };
  el("onglet-adversaire").onclick = () => { if (!occupe) { cote = true; afficher(); } };
  el("btn-effacer-cris").onclick = async () => {
    if (occupe || !confirm(`Effacer tous les cris ${cote ? "de l'adversaire" : "de votre côté"} ?`)) return;
    for (const p of PHRASES) await effacer(cleComplete(cote, p.cle));
    afficher();
  };

  charger();

  const nombre = adversaire => PHRASES.filter(p => blobs.has(cleComplete(adversaire, p.cle))).length;

  return { jouer, nombre };
})();
