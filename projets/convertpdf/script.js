// ==========================================
// VARIABLES GLOBALES
// ==========================================
let filesArray = [];
let dragCounter = 0;

// ==========================================
// ÉLÉMENTS DOM
// ==========================================
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const selectFilesBtn = document.getElementById('selectFilesBtn');
const filesSection = document.getElementById('filesSection');
const filesList = document.getElementById('filesList');
const fileCount = document.getElementById('fileCount');
const convertBtn = document.getElementById('convertBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const successMessage = document.getElementById('successMessage');
const newConversionBtn = document.getElementById('newConversionBtn');

// ==========================================
// INITIALISATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    initBackToTop();
});

// ==========================================
// BOUTON RETOUR EN HAUT
// ==========================================
function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    if (!backToTopBtn) return;
    
    // Afficher/masquer le bouton selon le scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    }, { passive: true });
    
    // Remonter en haut au clic
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function initEventListeners() {
    // Bouton de sélection de fichiers
    selectFilesBtn.addEventListener('click', () => fileInput.click());
    
    // Input file change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drop zone events
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragenter', handleDragEnter);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // Boutons d'action
    convertBtn.addEventListener('click', convertToPDF);
    clearAllBtn.addEventListener('click', clearAllFiles);
    newConversionBtn.addEventListener('click', resetApp);
}

// ==========================================
// GESTION DU DRAG & DROP
// ==========================================
function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    if (dragCounter === 1) {
        dropZone.classList.add('drag-over');
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter === 0) {
        dropZone.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter = 0;
    dropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    handleFiles(files);
}

// ==========================================
// GESTION DES FICHIERS
// ==========================================
function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    const newFiles = Array.from(files).filter(file => {
        // Vérifier les types de fichiers acceptés
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        const isText = file.type === 'text/plain' || file.name.endsWith('.txt');
        
        return isImage || isPDF || isText;
    });
    
    if (newFiles.length === 0) {
        alert('Aucun fichier valide sélectionné. Formats acceptés : images, PDF, TXT');
        return;
    }
    
    // Ajouter les fichiers à la liste
    newFiles.forEach(file => {
        const fileObj = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: formatFileSize(file.size),
            type: getFileType(file)
        };
        filesArray.push(fileObj);
    });
    
    updateUI();
}

function getFileType(file) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) return 'text';
    return 'unknown';
}

function getFileIcon(type) {
    const icons = {
        'image': '🖼️',
        'pdf': '📄',
        'text': '📝',
        'unknown': '📎'
    };
    return icons[type] || icons['unknown'];
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ==========================================
// MISE À JOUR DE L'INTERFACE
// ==========================================
function updateUI() {
    if (filesArray.length === 0) {
        filesSection.style.display = 'none';
        dropZone.style.display = 'block';
        return;
    }
    
    // Afficher la section des fichiers
    filesSection.style.display = 'block';
    dropZone.style.display = 'none';
    
    // Mettre à jour le compteur
    fileCount.textContent = filesArray.length;
    
    // Générer la liste des fichiers
    filesList.innerHTML = '';
    filesArray.forEach((fileObj, index) => {
        const fileItem = createFileItem(fileObj, index);
        filesList.appendChild(fileItem);
    });
}

function createFileItem(fileObj, index) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.draggable = true;
    div.dataset.index = index;
    
    div.innerHTML = `
        <div class="file-icon">${getFileIcon(fileObj.type)}</div>
        <div class="file-info-content">
            <div class="file-name">${fileObj.name}</div>
            <div class="file-size">${fileObj.size}</div>
        </div>
        <div class="file-actions">
            <button class="btn-icon btn-move" title="Déplacer">↕️</button>
            <button class="btn-icon btn-remove" title="Supprimer" onclick="removeFile(${fileObj.id})">🗑️</button>
        </div>
    `;
    
    // Événements de drag & drop pour réorganiser
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragover', handleDragOverItem);
    div.addEventListener('drop', handleDropItem);
    div.addEventListener('dragend', handleDragEnd);
    
    return div;
}

// ==========================================
// RÉORGANISATION DES FICHIERS
// ==========================================
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = e.currentTarget;
    e.currentTarget.style.opacity = '0.5';
}

function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    draggedItem = null;
}

function handleDragOverItem(e) {
    e.preventDefault();
    const afterElement = getDragAfterElement(filesList, e.clientY);
    const draggable = draggedItem;
    
    if (afterElement == null) {
        filesList.appendChild(draggable);
    } else {
        filesList.insertBefore(draggable, afterElement);
    }
}

function handleDropItem(e) {
    e.preventDefault();
    
    // Mettre à jour l'ordre dans filesArray
    const items = Array.from(filesList.children);
    const newOrder = items.map(item => {
        const index = parseInt(item.dataset.index);
        return filesArray[index];
    });
    
    filesArray = newOrder;
    updateUI();
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.file-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ==========================================
// SUPPRESSION DE FICHIERS
// ==========================================
function removeFile(fileId) {
    filesArray = filesArray.filter(f => f.id !== fileId);
    updateUI();
}

function clearAllFiles() {
    if (confirm('Voulez-vous vraiment supprimer tous les fichiers ?')) {
        filesArray = [];
        updateUI();
        fileInput.value = '';
    }
}

// ==========================================
// CONVERSION EN PDF
// ==========================================
async function convertToPDF() {
    if (filesArray.length === 0) {
        alert('Veuillez ajouter au moins un fichier');
        return;
    }
    
    // Désactiver le bouton et afficher la progression
    convertBtn.disabled = true;
    convertBtn.textContent = '⏳ Conversion en cours...';
    progressContainer.style.display = 'block';
    
    try {
        // Créer un nouveau document PDF
        const { PDFDocument, rgb } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        
        const totalFiles = filesArray.length;
        
        for (let i = 0; i < filesArray.length; i++) {
            const fileObj = filesArray[i];
            const progress = ((i + 1) / totalFiles) * 100;
            
            updateProgress(progress, `Traitement de ${fileObj.name}...`);
            
            try {
                if (fileObj.type === 'image') {
                    await addImageToPDF(pdfDoc, fileObj.file);
                } else if (fileObj.type === 'pdf') {
                    await mergePDFPages(pdfDoc, fileObj.file);
                } else if (fileObj.type === 'text') {
                    await addTextToPDF(pdfDoc, fileObj.file);
                }
            } catch (error) {
                console.error(`Erreur lors du traitement de ${fileObj.name}:`, error);
                // Continuer avec les autres fichiers
            }
        }
        
        // Sauvegarder et télécharger le PDF
        updateProgress(100, 'Génération du PDF final...');
        const pdfBytes = await pdfDoc.save();
        downloadPDF(pdfBytes);
        
        // Afficher le message de succès
        showSuccess();
        
    } catch (error) {
        console.error('Erreur lors de la conversion:', error);
        alert('Une erreur est survenue lors de la conversion. Veuillez réessayer.');
        resetConversionUI();
    }
}

// ==========================================
// AJOUT D'IMAGES AU PDF
// ==========================================
async function addImageToPDF(pdfDoc, file) {
    const arrayBuffer = await file.arrayBuffer();
    const { width, height } = await getImageDimensions(file);
    
    let image;
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        image = await pdfDoc.embedJpg(arrayBuffer);
    } else if (file.type === 'image/png') {
        image = await pdfDoc.embedPng(arrayBuffer);
    } else {
        // Pour les autres formats, on essaie PNG
        const convertedImage = await convertImageToPng(file);
        image = await pdfDoc.embedPng(convertedImage);
    }
    
    // Créer une page avec les dimensions de l'image
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height
    });
}

function getImageDimensions(file) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = function() {
            URL.revokeObjectURL(url);
            resolve({ width: this.width, height: this.height });
        };
        img.src = url;
    });
}

async function convertImageToPng(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
                blob.arrayBuffer().then(resolve);
                URL.revokeObjectURL(url);
            }, 'image/png');
        };
        
        img.onerror = reject;
        img.src = url;
    });
}

// ==========================================
// FUSION DE FICHIERS PDF
// ==========================================
async function mergePDFPages(pdfDoc, file) {
    const arrayBuffer = await file.arrayBuffer();
    const existingPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    
    const pageIndices = existingPdfDoc.getPageIndices();
    const pages = await pdfDoc.copyPages(existingPdfDoc, pageIndices);
    
    pages.forEach(page => {
        pdfDoc.addPage(page);
    });
}

// ==========================================
// AJOUT DE TEXTE AU PDF
// ==========================================
async function addTextToPDF(pdfDoc, file) {
    const text = await file.text();
    const { rgb } = PDFLib;
    
    // Paramètres de la page
    const pageWidth = 595;  // A4 width in points
    const pageHeight = 842; // A4 height in points
    const margin = 50;
    const fontSize = 12;
    const lineHeight = fontSize * 1.5;
    const maxWidth = pageWidth - (margin * 2);
    
    // Diviser le texte en lignes
    const lines = text.split('\n');
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;
    
    for (const line of lines) {
        // Diviser les lignes trop longues
        const wrappedLines = wrapText(line, maxWidth, fontSize);
        
        for (const wrappedLine of wrappedLines) {
            if (yPosition < margin + lineHeight) {
                // Créer une nouvelle page si nécessaire
                page = pdfDoc.addPage([pageWidth, pageHeight]);
                yPosition = pageHeight - margin;
            }
            
            page.drawText(wrappedLine, {
                x: margin,
                y: yPosition,
                size: fontSize,
                color: rgb(0, 0, 0)
            });
            
            yPosition -= lineHeight;
        }
    }
}

function wrapText(text, maxWidth, fontSize) {
    if (!text || text.trim() === '') return [''];
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    // Estimation approximative : 1 caractère = fontSize * 0.5 points
    const charWidth = fontSize * 0.5;
    
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = testLine.length * charWidth;
        
        if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [''];
}

// ==========================================
// TÉLÉCHARGEMENT DU PDF
// ==========================================
function downloadPDF(pdfBytes) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==========================================
// GESTION DE LA PROGRESSION
// ==========================================
function updateProgress(percent, message) {
    progressFill.style.width = `${percent}%`;
    progressText.textContent = message;
}

function resetConversionUI() {
    convertBtn.disabled = false;
    convertBtn.textContent = '🚀 Convertir en PDF';
    progressContainer.style.display = 'none';
    progressFill.style.width = '0%';
}

// ==========================================
// AFFICHAGE DU SUCCÈS
// ==========================================
function showSuccess() {
    filesSection.style.display = 'none';
    successMessage.style.display = 'block';
}

// ==========================================
// RÉINITIALISATION DE L'APPLICATION
// ==========================================
function resetApp() {
    filesArray = [];
    fileInput.value = '';
    successMessage.style.display = 'none';
    dropZone.style.display = 'block';
    resetConversionUI();
    updateUI();
}
