document.addEventListener('DOMContentLoaded', async () => {
  // Injecte la nav
  try {
    const res = await fetch('nav.html');
    if (!res.ok) throw new Error('Impossible de charger nav.html');
    const html = await res.text();
    const navEl = document.getElementById('nav');
    if (navEl) {
      navEl.innerHTML = html;

      // attacher le toggle dès que la nav est insérée
      const toggle = document.getElementById('dark-toggle');
      if (toggle && !toggle.dataset.listener) {
        toggle.addEventListener('click', () => {
          if (document.body.classList.contains('dark-mode')) disableDarkMode();
          else enableDarkMode();
        });
        toggle.dataset.listener = '1';
      }

      // si dark-mode actif avant injection, rescanner la nav pour ajuster les couleurs
      if (document.body.classList.contains('dark-mode')) {
        // petit délai pour que le navigateur calcule les styles du DOM injecté
        setTimeout(() => scanAndReplaceBlackText(true), 10);
      }
    }
  } catch (e) {
    console.warn('Chargement du menu échoué :', e);
  }

  // Fonctions dark mode
  function scanAndReplaceBlackText(enable) {
    const els = document.querySelectorAll('body *');
    for (const el of els) {
      if (el instanceof HTMLImageElement || el.dataset.darkSkip === 'true') continue;
      const cs = getComputedStyle(el);
      const color = cs.color;
      if (enable) {
        if ((color === 'rgb(0, 0, 0)' || color === 'rgba(0, 0, 0, 1)') && !el.dataset.origColor) {
          el.dataset.origColor = color;
          el.style.color = '#ffffff';
        }
      } else {
        // Au lieu de remettre un style inline (qui masque le CSS), on supprime la couleur inline
        if (el.dataset.origColor) {
          el.style.removeProperty('color');
          delete el.dataset.origColor;
        }
      }
    }
  }

  function enableDarkMode() {
    document.body.classList.add('dark-mode');
    scanAndReplaceBlackText(true);
    const btn = document.getElementById('dark-toggle');
    if (btn) { btn.setAttribute('aria-pressed', 'true'); btn.title = 'Désactiver le mode sombre'; }
    localStorage.setItem('theme', 'dark');
  }
  function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    scanAndReplaceBlackText(false);
    const btn = document.getElementById('dark-toggle');
    if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.title = 'Activer le mode sombre'; }
    localStorage.setItem('theme', 'light');
  }

  // Initialisation depuis localStorage ou préférence système
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') enableDarkMode();
  else if (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    enableDarkMode();
  }

  // Gestion du formulaire de contact (si présent)
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const data = new FormData(form);
      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
          form.reset();
          const popup = document.getElementById('confirmation-popup');
          if (popup) popup.classList.remove('hidden');
        } else {
          alert('Une erreur est survenue. Merci de réessayer.');
        }
      } catch (err) {
        console.warn('Erreur envoi formulaire :', err);
        alert('Une erreur réseau est survenue. Merci de réessayer.');
      }
    });
  }
});
