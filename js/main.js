document.addEventListener('DOMContentLoaded', async () => {
  const navEl = document.getElementById('nav');

  // Injecte la nav (si possible)
  try {
    const res = await fetch('nav.html');
    if (!res.ok) throw new Error('Impossible de charger nav.html');
    const html = await res.text();
    if (navEl) navEl.innerHTML = html;
  } catch (e) {
    console.warn('Chargement du menu échoué :', e);
  }

  // attache le listener au toggle s'il existe
  const attachToggle = () => {
    const toggle = document.getElementById('dark-toggle') || document.getElementById('dark-toggle-fallback');
    if (toggle && !toggle.dataset.listener) {
      toggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark-mode')) disableDarkMode();
        else enableDarkMode();
      });
      toggle.dataset.listener = '1';
    }
  };

  // observer pour détecter insertion de contenu dans #nav (si injection asynchrone)
  if (navEl) {
    const mo = new MutationObserver(() => {
      attachToggle();
      // si dark-mode est actif et nav vient d'être injecté, rescanner la nav
      if (document.body.classList.contains('dark-mode')) {
        setTimeout(() => scanAndReplaceBlackText(true), 10);
      }
    });
    mo.observe(navEl, { childList: true, subtree: true });
  }

  // fallback : si pas de toggle trouvé, créer un bouton discret (dans .footer-logo-contact si présent)
  const ensureFallbackToggle = () => {
    if (document.getElementById('dark-toggle') || document.getElementById('dark-toggle-fallback')) return;
    const container = document.querySelector('.footer-logo-contact') || document.getElementById('nav') || document.body;
    const btn = document.createElement('button');
    btn.id = 'dark-toggle-fallback';
    btn.className = 'dark-toggle';
    btn.setAttribute('aria-pressed', 'false');
    btn.title = 'Activer le mode sombre';
    btn.innerHTML = '<span class="visu">🌓</span>';
    container.appendChild(btn);
    attachToggle();
  };

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
        // Si on avait sauvegardé une couleur d'origine, on supprime l'inline color pour laisser le CSS reprendre la main
        if (el.dataset.origColor) {
          el.style.removeProperty('color');
          delete el.dataset.origColor;
        } else {
          // Supprimer aussi les couleurs inline blanches résiduelles
          if (el.style && el.style.color) {
            const inlineColor = el.style.color.trim().toLowerCase();
            if (inlineColor === '#fff' || inlineColor === '#ffffff' || inlineColor === 'rgb(255, 255, 255)' || inlineColor === 'white') {
              el.style.removeProperty('color');
            }
          }
        }
      }
    }
  }

  // helper : met à jour la meta[name="theme-color"]
  function setMetaThemeColor(color) {
    try {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.content = color;
    } catch (e) {
      // silent
    }
  }

  function enableDarkMode() {
    document.documentElement.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
    scanAndReplaceBlackText(true);
    const btn = document.getElementById('dark-toggle') || document.getElementById('dark-toggle-fallback');
    if (btn) { btn.setAttribute('aria-pressed', 'true'); btn.title = 'Désactiver le mode sombre'; }
    localStorage.setItem('theme', 'dark');
    setMetaThemeColor('#0b0b0d');
  }
  function disableDarkMode() {
    document.documentElement.classList.remove('dark-mode');
    document.body.classList.remove('dark-mode');
    scanAndReplaceBlackText(false);
    const btn = document.getElementById('dark-toggle') || document.getElementById('dark-toggle-fallback');
    if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.title = 'Activer le mode sombre'; }
    localStorage.setItem('theme', 'light');
    setMetaThemeColor('#ffffff');
  }

  // initialisation : attacher le toggle et créer fallback si nécessaire
  attachToggle();
  setTimeout(() => {
    attachToggle();
    ensureFallbackToggle();
  }, 300);

  // Initialisation du thème : respecter la préférence utilisateur si elle existe.
  // - si saved === 'dark' => activer le dark mode (persistance entre pages)
  // - sinon démarrer en clair (sans écraser une préférence précédente)
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    setMetaThemeColor('#0b0b0d');
    enableDarkMode();
  } else {
    setMetaThemeColor('#ffffff');
    disableDarkMode();
  }

  // enlever la classe no-transitions / preload après le premier rendu (évite flash)
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('no-transitions', 'preload');
    document.body.classList.remove('no-transitions', 'preload');
  });

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

