console.log('Script lightbox.js chargé');

// Fonction pour ouvrir la lightbox avec l'image cliquée
function openLightbox(element) {
    console.log('Fonction openLightbox appelée', element);
    // Créer l'élément de la lightbox s'il n'existe pas
    let lightbox = document.getElementById('imageLightbox');
    
    if (!lightbox) {
        // Créer les éléments de la lightbox
        lightbox = document.createElement('div');
        lightbox.id = 'imageLightbox';
        lightbox.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 hidden';
        lightbox.innerHTML = `
            <div class="relative max-w-4xl w-full p-4">
                <button onclick="closeLightbox()" class="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300">
                    &times;
                </button>
                <img src="" alt="Image en grand format" class="max-h-[80vh] max-w-full mx-auto">
                <p class="text-white mt-2 text-center"></p>
            </div>
        `;
        document.body.appendChild(lightbox);
    }
    
    // Mettre à jour l'image et l'alt text
    const img = lightbox.querySelector('img');
    const caption = lightbox.querySelector('p');
    img.src = element.src;
    img.alt = element.alt;
    caption.textContent = element.alt;
    
    // Afficher la lightbox
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Fonction pour fermer la lightbox
function closeLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Fermer la lightbox avec la touche Échap
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeLightbox();
    }
});

// Fermer la lightbox en cliquant en dehors de l'image
document.addEventListener('click', function(event) {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox && !lightbox.querySelector('div').contains(event.target)) {
        closeLightbox();
    }
});
