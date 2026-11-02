/* ============================== VERSION INSTALLABLE ==============================
   Hébergé en HTTPS (GitHub Pages…), le jeu s'installe comme une application et tourne hors ligne (manifest.webmanifest + sw.js
   à côté du fichier). En fichier local ou dans un aperçu intégré, rien ne change. */
const App = {
  prompt: null,
  hosted() { return 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && window.top === window && !/claude/i.test(location.hostname); },
  standalone() { try { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true; } catch (e) { return false; } },
  ios() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  init() {
    if (!this.hosted()) return;
    const l = document.createElement('link'); l.rel = 'manifest'; l.href = 'manifest.webmanifest'; document.head.appendChild(l);
    navigator.serviceWorker.register('sw.js').catch(() => {});
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.prompt = e; if (Game.state === 'menu' && !G) UI.showMenu(); });
    window.addEventListener('appinstalled', () => { this.prompt = null; UI.toast('Neon Warfare installé', 'Retrouvez le jeu sur votre écran d\'accueil, même hors ligne.', '#39ff88', 5); });
  },
  // proposer l'installation : invite du navigateur, ou mode d'emploi sur iPhone / iPad
  canOffer() { return this.hosted() && !this.standalone() && (!!this.prompt || this.ios()); },
  install() {
    if (this.prompt) { const e = this.prompt; this.prompt = null; e.prompt(); e.userChoice.finally(() => { if (Game.state === 'menu') UI.showMenu(); }); return; }
    UI.toast('Installer sur iPhone / iPad', 'Dans Safari, touchez <b>Partager</b> ⎋ puis <b>Sur l\'écran d\'accueil</b>.', '#00f3ff', 8);
  }
};

