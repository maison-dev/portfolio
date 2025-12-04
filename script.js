/**
 * Portfolio Bento Grid - Script principal
 * Gère le mode sombre, les animations et les notifications
 */

// ============================================
// CONFIGURATION DU THÈME
// ============================================

const themeToggle = document.getElementById('themeToggle');
const htmlElement = document.documentElement;
const bodyElement = document.body;

/**
 * Initialise le thème en fonction de la préférence sauvegardée
 * ou de la préférence système
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Si pas de thème sauvegardé, utilise la préférence système
    if (!savedTheme) {
        const theme = prefersDark ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        applyTheme(theme);
    } else {
        applyTheme(savedTheme);
    }
}

/**
 * Applique le thème au document
 * @param {string} theme - 'dark' ou 'light'
 */
function applyTheme(theme) {
    if (theme === 'light') {
        bodyElement.classList.add('light-mode');
        updateThemeIcon('sun');
    } else {
        bodyElement.classList.remove('light-mode');
        updateThemeIcon('moon');
    }
    localStorage.setItem('theme', theme);
}

/**
 * Met à jour l'icône du bouton de thème
 * @param {string} icon - 'sun' ou 'moon'
 */
function updateThemeIcon(icon) {
    const iconElement = themeToggle.querySelector('i');
    if (icon === 'sun') {
        iconElement.classList.remove('fa-moon');
        iconElement.classList.add('fa-sun');
    } else {
        iconElement.classList.remove('fa-sun');
        iconElement.classList.add('fa-moon');
    }
}

/**
 * Bascule le thème entre clair et sombre
 */
function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

// ============================================
// EVENT LISTENERS
// ============================================

// Écoute le clic sur le bouton de basculement du thème
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// Écoute les changements de préférence système
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
});

// ============================================
// NOTIFICATIONS TOAST
// ============================================

/**
 * Affiche une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - 'success', 'error', 'info'
 * @param {number} duration - Durée d'affichage en ms
 */
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    
    if (!toast) return;
    
    // Réinitialise le toast
    toast.classList.remove('show', 'success', 'error');
    toast.textContent = message;
    
    // Ajoute la classe du type
    if (type) {
        toast.classList.add(type);
    }
    
    // Affiche le toast
    toast.classList.add('show');
    
    // Cache le toast après la durée spécifiée
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ============================================
// GESTION DU FORMULAIRE FORMSPREE
// ============================================

/**
 * Valide l'email
 * @param {string} email 
 * @returns {boolean}
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valide les champs du formulaire
 * @returns {boolean}
 */
function validateForm(form) {
    let isValid = true;
    
    // Réinitialiser les messages d'erreur
    document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
    
    const name = form.querySelector('#name');
    const email = form.querySelector('#email');
    const message = form.querySelector('#message');
    
    // Validation du nom
    if (!name.value.trim() || name.value.trim().length < 2) {
        document.getElementById('nameError').textContent = 'Le nom doit contenir au moins 2 caractères';
        document.getElementById('nameError').classList.add('show');
        isValid = false;
    }
    
    // Validation de l'email
    if (!email.value.trim()) {
        document.getElementById('emailError').textContent = 'L\'email est obligatoire';
        document.getElementById('emailError').classList.add('show');
        isValid = false;
    } else if (!validateEmail(email.value.trim())) {
        document.getElementById('emailError').textContent = 'L\'email n\'est pas valide';
        document.getElementById('emailError').classList.add('show');
        isValid = false;
    }
    
    // Validation du message
    if (!message.value.trim() || message.value.trim().length < 5) {
        document.getElementById('messageError').textContent = 'Le message doit contenir au moins 5 caractères';
        document.getElementById('messageError').classList.add('show');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Initialise le formulaire de contact
 */
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;
    
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validation
        if (!validateForm(contactForm)) {
            return;
        }
        
        const submitBtn = contactForm.querySelector('.form-submit');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Envoi...';
        
        try {
            // Formspree gère l'envoi en natif, on simule une soumission réussie
            const formData = new FormData(contactForm);
            const response = await fetch(contactForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                showToast('Message envoyé avec succès !', 'success', 4000);
                contactForm.reset();
                document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
            } else {
                showToast('Erreur lors de l\'envoi du message', 'error', 4000);
            }
        } catch (error) {
            console.error('Erreur:', error);
            showToast('Une erreur s\'est produite', 'error', 4000);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
    
    // Réinitialiser les messages d'erreur au focus
    contactForm.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('focus', () => {
            const errorId = input.id + 'Error';
            const errorEl = document.getElementById(errorId);
            if (errorEl) {
                errorEl.classList.remove('show');
            }
        });
    });
}

// ============================================
// SMOOTH SCROLL POUR LES ANCRES
// ============================================

document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href !== '#' && document.querySelector(href)) {
            e.preventDefault();
            document.querySelector(href).scrollIntoView({
                behavior: 'smooth',
            });
        }
    });
});

// ============================================
// ANIMATIONS AU CHARGEMENT
// ============================================

/**
 * Détecte les éléments visibles et ajoute des animations
 */
function observeElements() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
    });

    // Observe toutes les cartes Bento
    document.querySelectorAll('.bento-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        observer.observe(card);
    });
}

// ============================================
// INITIALISATION
// ============================================

// Initialise le thème au chargement de la page
window.addEventListener('load', () => {
    initTheme();
    observeElements();
    initContactForm();
});

// Initialise le thème même si la page est en cache
initTheme();

// ============================================
// UTILITAIRES
// ============================================

/**
 * Copie du texte dans le presse-papiers
 * @param {string} text - Texte à copier
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copié !', 'success');
    }).catch(() => {
        showToast('Erreur lors de la copie', 'error');
    });
}

/**
 * Ouvre un lien dans une nouvelle fenêtre
 * @param {string} url - URL à ouvrir
 */
function openLink(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
}

// Export pour utilisation en console ou dans d'autres scripts
window.portfolio = {
    copyToClipboard,
    openLink,
    showToast,
    toggleTheme,
    validateEmail,
    validateForm,
};
