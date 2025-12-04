// État de l'application
let gridSize = 32;
let currentColor = '#FF0000';
let isErasing = false;
let pixelArray = [];
let basePixelSize = 15;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initializeGrid();
    setupEventListeners();
});

// Créer la grille
function initializeGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    
    // Définir les colonnes en fonction de la taille
    basePixelSize = Math.max(15, Math.floor(600 / gridSize));
    updateGridSize();
    
    // Créer les pixels
    pixelArray = [];
    for (let i = 0; i < gridSize * gridSize; i++) {
        const pixel = document.createElement('div');
        pixel.className = 'pixel';
        pixel.style.backgroundColor = 'white';
        pixel.addEventListener('click', () => paintPixel(pixel));
        pixel.addEventListener('mouseover', (e) => {
            if (e.buttons === 1) paintPixel(pixel);
        });
        grid.appendChild(pixel);
        pixelArray.push(pixel);
    }
}

// Mettre à jour la taille de la grille en fonction du zoom
function updateGridSize() {
    const grid = document.getElementById('grid');
    grid.style.gridTemplateColumns = `repeat(${gridSize}, ${basePixelSize}px)`;
    grid.style.gridTemplateRows = `repeat(${gridSize}, ${basePixelSize}px)`;
}

// Peindre un pixel
function paintPixel(pixel) {
    if (isErasing) {
        pixel.style.backgroundColor = 'white';
    } else {
        pixel.style.backgroundColor = currentColor;
    }
}

// Configuration des événements
function setupEventListeners() {
    // Changement de taille de grille
    document.getElementById('grid-size').addEventListener('change', (e) => {
        gridSize = parseInt(e.target.value);
        initializeGrid();
    });

    // Couleurs prédéfinies
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectPresetColor(btn);
        });
    });

    // Roue des couleurs
    document.getElementById('color-picker').addEventListener('input', (e) => {
        currentColor = e.target.value;
        isErasing = false;
        updateCurrentColorDisplay();
        updatePresetButtons();
    });

    // Gomme
    document.getElementById('eraser-btn').addEventListener('click', () => {
        isErasing = !isErasing;
        const eraserBtn = document.getElementById('eraser-btn');
        eraserBtn.classList.toggle('active');
        
        if (isErasing) {
            eraserBtn.style.background = '#ffa500';
            eraserBtn.style.boxShadow = '0 0 10px rgba(255, 165, 0, 0.5)';
        } else {
            eraserBtn.style.background = '#667eea';
            eraserBtn.style.boxShadow = 'none';
        }
    });

    // Effacer tout
    document.getElementById('clear-btn').addEventListener('click', () => {
        pixelArray.forEach(pixel => {
            pixel.style.backgroundColor = 'white';
        });
    });

    // Télécharger
    document.getElementById('download-btn').addEventListener('click', downloadDrawing);
}

// Sélectionner une couleur prédéfinie
function selectPresetColor(btn) {
    currentColor = btn.dataset.color;
    isErasing = false;
    document.getElementById('color-picker').value = currentColor;
    updateCurrentColorDisplay();
    updatePresetButtons();
    
    // Désactiver la gomme
    document.getElementById('eraser-btn').classList.remove('active');
    document.getElementById('eraser-btn').style.background = '#667eea';
    document.getElementById('eraser-btn').style.boxShadow = 'none';
}

// Mettre à jour l'affichage de la couleur actuelle
function updateCurrentColorDisplay() {
    document.getElementById('current-color').style.backgroundColor = currentColor;
}

// Mettre à jour les boutons de couleur prédéfinie
function updatePresetButtons() {
    document.querySelectorAll('.color-btn').forEach(btn => {
        if (btn.dataset.color === currentColor.toUpperCase()) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Télécharger le dessin en tant qu'image PNG
function downloadDrawing() {
    const canvas = document.createElement('canvas');
    const pixelSize = 16;
    canvas.width = gridSize * pixelSize;
    canvas.height = gridSize * pixelSize;
    const ctx = canvas.getContext('2d');

    pixelArray.forEach((pixel, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const color = pixel.style.backgroundColor || 'white';
        
        ctx.fillStyle = color;
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
    });

    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `pixart-${new Date().getTime()}.png`;
    link.click();
}
