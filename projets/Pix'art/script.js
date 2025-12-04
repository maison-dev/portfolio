// ========== STATE & GLOBALS ==========
let gridSize = 8;
let currentColor = '#FF0000';
let isErasing = false;
let pixelArray = [];
let basePixelSize = 15;
let resizeTimeout;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    initializeGrid();
    setupEventListeners();
    handleResize();
});

// ========== GRID MANAGEMENT ==========

/**
 * Initializes the grid with dynamically calculated pixel sizes
 * Ensures grid fills the available space on mobile
 */
function initializeGrid() {
    const grid = document.getElementById('grid');
    const canvasArea = document.querySelector('.canvas-area');
    
    if (!grid || !canvasArea) return;
    
    grid.innerHTML = '';
    
    // Calculate available space
    const containerWidth = canvasArea.clientWidth - 24; // 12px padding * 2
    const containerHeight = canvasArea.clientHeight - 24;
    
    // Calculate pixel size based on grid dimensions
    const pixelWidth = Math.floor(containerWidth / gridSize);
    const pixelHeight = Math.floor(containerHeight / gridSize);
    
    // Use the smaller dimension to keep aspect ratio square
    basePixelSize = Math.min(pixelWidth, pixelHeight);
    basePixelSize = Math.max(3, Math.min(basePixelSize, 60)); // Clamp between 3-60px for mobile
    
    // Set grid template
    grid.style.gridTemplateColumns = `repeat(${gridSize}, ${basePixelSize}px)`;
    grid.style.gridTemplateRows = `repeat(${gridSize}, ${basePixelSize}px)`;
    
    // Create pixels
    pixelArray = [];
    const totalPixels = gridSize * gridSize;
    
    for (let i = 0; i < totalPixels; i++) {
        const pixel = document.createElement('div');
        pixel.className = 'pixel';
        pixel.style.backgroundColor = 'white';
        
        // Touch-friendly event handling
        pixel.addEventListener('click', () => paintPixel(pixel));
        pixel.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const targetPixel = document.elementFromPoint(touch.clientX, touch.clientY);
            if (targetPixel && targetPixel.classList.contains('pixel')) {
                paintPixel(targetPixel);
            }
        });
        pixel.addEventListener('mouseover', (e) => {
            if (e.buttons === 1) paintPixel(pixel);
        });
        
        grid.appendChild(pixel);
        pixelArray.push(pixel);
    }
    
    // Close menu after grid changes size
    closeMenu();
}

/**
 * Paints a pixel with current color or erases it
 */
function paintPixel(pixel) {
    if (isErasing) {
        pixel.style.backgroundColor = 'white';
    } else {
        pixel.style.backgroundColor = currentColor;
    }
}

// ========== EVENT SETUP ==========
function setupEventListeners() {
    // Grid size selector
    const gridSizeSelect = document.getElementById('grid-size');
    if (gridSizeSelect) {
        gridSizeSelect.addEventListener('change', (e) => {
            gridSize = parseInt(e.target.value);
            initializeGrid();
        });
    }

    // Color preset buttons
    document.querySelectorAll('.color-btn').forEach((btn) => {
        btn.addEventListener('click', () => selectColor(btn.dataset.color));
    });

    // Color picker
    const colorPicker = document.getElementById('color-picker');
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            selectColor(e.target.value);
        });
    }

    // Eraser tool
    const eraserBtn = document.getElementById('eraser-btn');
    if (eraserBtn) {
        eraserBtn.addEventListener('click', () => {
            isErasing = !isErasing;
            eraserBtn.classList.toggle('active', isErasing);
        });
    }

    // Clear canvas
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            pixelArray.forEach((pixel) => {
                pixel.style.backgroundColor = 'white';
            });
        });
    }

    // Download
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadDrawing);
    }

    // Menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMenu);
    }

    // Backdrop click to close menu
    const backdrop = document.getElementById('backdrop');
    if (backdrop) {
        backdrop.addEventListener('click', closeMenu);
    }

    // Prevent scroll when menu is open
    const controlPanel = document.getElementById('control-panel');
    if (controlPanel) {
        controlPanel.addEventListener('touchmove', (e) => {
            // Allow scrolling within the panel
            if (e.target === controlPanel || controlPanel.contains(e.target)) {
                e.stopPropagation();
            }
        });
    }

    // Window resize
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
}

// ========== COLOR MANAGEMENT ==========

/**
 * Selects a color and updates UI
 */
function selectColor(color) {
    currentColor = color;
    isErasing = false;
    
    // Update color picker
    const colorPicker = document.getElementById('color-picker');
    if (colorPicker) {
        colorPicker.value = color;
    }
    
    // Update current color display
    const colorPreview = document.getElementById('current-color');
    if (colorPreview) {
        colorPreview.style.backgroundColor = color;
    }
    
    // Update active button
    updatePresetButtons();
    
    // Deactivate eraser
    const eraserBtn = document.getElementById('eraser-btn');
    if (eraserBtn) {
        eraserBtn.classList.remove('active');
    }
}

/**
 * Updates preset color button active states
 */
function updatePresetButtons() {
    document.querySelectorAll('.color-btn').forEach((btn) => {
        const btnColor = btn.dataset.color.toUpperCase();
        const currentColorUpper = currentColor.toUpperCase();
        btn.classList.toggle('active', btnColor === currentColorUpper);
    });
}

// ========== EXPORT FUNCTION ==========

/**
 * Downloads the drawing as PNG
 */
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

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `pixart-${new Date().getTime()}.png`;
    link.click();
}

// ========== MENU MANAGEMENT ==========

/**
 * Toggles the control panel menu
 */
function toggleMenu() {
    const container = document.querySelector('.app-container');
    const menuToggle = document.getElementById('menu-toggle');
    const isOpen = container.classList.toggle('menu-open');
    
    if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', isOpen);
    }
}

/**
 * Closes the control panel menu
 */
function closeMenu() {
    const container = document.querySelector('.app-container');
    const menuToggle = document.getElementById('menu-toggle');
    
    container.classList.remove('menu-open');
    if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', 'false');
    }
}

// ========== RESPONSIVE HANDLING ==========

/**
 * Handles window resize and orientation change
 */
function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        initializeGrid();
        // Close menu if transitioning to tablet/desktop
        if (window.innerWidth >= 768) {
            closeMenu();
        }
    }, 200);
}

// ========== PREVENT ZOOM ON DOUBLE-TAP (mobile) ==========
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);
