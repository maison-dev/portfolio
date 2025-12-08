# 📄 Convertisseur PDF - Documentation Complète

## 🎯 Description

Application web moderne permettant de convertir plusieurs fichiers (images, PDF, texte) en un seul document PDF. Fonctionne **100% côté client** - aucun upload vers un serveur, vos fichiers restent privés et sécurisés sur votre appareil.

---

## ✨ Fonctionnalités

✅ **Multi-formats supportés** :
- Images : JPG, PNG, GIF, WEBP, BMP, etc.
- PDF : Fusion de plusieurs PDF en un seul
- Texte : Fichiers TXT convertis en PDF

✅ **Interface intuitive** :
- Drag & drop de fichiers
- Réorganisation de l'ordre des fichiers
- Aperçu de la liste des fichiers
- Barre de progression en temps réel

✅ **100% Local & Sécurisé** :
- Aucun upload vers un serveur
- Traitement entièrement côté client
- Fonctionne hors ligne après le premier chargement

✅ **Responsive Design** :
- Adapté mobile, tablette, desktop
- Interface moderne et épurée

---

## 🚀 Installation & Utilisation

### Option 1 : Utilisation directe (recommandée)

1. **Téléchargez les fichiers** :
   - `index.html`
   - `style.css`
   - `script.js`

2. **Placez-les dans le même dossier**

3. **Ouvrez `index.html`** dans votre navigateur web

C'est tout ! L'application est prête à l'emploi.

### Option 2 : Serveur local (optionnel)

Si vous préférez utiliser un serveur local :

```bash
# Avec Python 3
python3 -m http.server 8000

# Avec Python 2
python -m SimpleHTTPServer 8000

# Avec Node.js (npx)
npx http-server

# Avec PHP
php -S localhost:8000
```

Puis ouvrez `http://localhost:8000` dans votre navigateur.

---

## 📖 Mode d'emploi

### 1. Ajouter des fichiers

**Méthode A : Drag & Drop**
- Glissez-déposez vos fichiers dans la zone prévue

**Méthode B : Sélection manuelle**
- Cliquez sur "Sélectionner des fichiers"
- Choisissez un ou plusieurs fichiers

### 2. Organiser les fichiers

- Les fichiers apparaissent dans l'ordre d'ajout
- **Réorganiser** : Glissez-déposez les fichiers pour changer l'ordre
- **Supprimer** : Cliquez sur l'icône 🗑️ pour retirer un fichier
- **Tout supprimer** : Cliquez sur "Tout supprimer" pour recommencer

### 3. Convertir en PDF

- Cliquez sur le bouton **"🚀 Convertir en PDF"**
- Patientez pendant la conversion (barre de progression)
- Le PDF se télécharge automatiquement

### 4. Nouvelle conversion

- Cliquez sur "Nouvelle conversion" pour recommencer

---

## 🎨 Personnalisation de l'interface

### Modifier les couleurs

Ouvrez `style.css` et modifiez les variables CSS (lignes 5-15) :

```css
:root {
    --primary-color: #4f46e5;      /* Couleur principale */
    --primary-hover: #4338ca;      /* Couleur au survol */
    --secondary-color: #6366f1;    /* Couleur secondaire */
    --success-color: #10b981;      /* Couleur de succès */
    --danger-color: #ef4444;       /* Couleur de danger */
    --text-primary: #1f2937;       /* Texte principal */
    --text-secondary: #6b7280;     /* Texte secondaire */
    /* ... */
}
```

### Exemples de thèmes

**Thème Bleu océan** :
```css
--primary-color: #0ea5e9;
--primary-hover: #0284c7;
--secondary-color: #06b6d4;
```

**Thème Vert nature** :
```css
--primary-color: #10b981;
--primary-hover: #059669;
--secondary-color: #34d399;
```

**Thème Rouge/Rose** :
```css
--primary-color: #f43f5e;
--primary-hover: #e11d48;
--secondary-color: #fb7185;
```

**Thème Violet/Mauve** :
```css
--primary-color: #a855f7;
--primary-hover: #9333ea;
--secondary-color: #c084fc;
```

### Modifier le titre et le logo

Dans `index.html`, ligne 8-9 :
```html
<h1>📄 Convertisseur PDF</h1>
<p class="subtitle">Convertissez vos fichiers en PDF - 100% gratuit, sécurisé et local</p>
```

---

## 🔧 Ajouter le support de nouveaux formats

### Ajouter un type de fichier image

Les formats image standards (JPG, PNG, WEBP, GIF, BMP, etc.) sont déjà supportés automatiquement grâce à `image/*`.

### Ajouter le support de fichiers Word (DOCX)

⚠️ **Note** : La conversion de DOCX en PDF nécessite des librairies supplémentaires et est complexe côté client. Voici une alternative :

1. **Ajoutez la bibliothèque Mammoth.js** dans `index.html` :
```html
<script src="https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js"></script>
```

2. **Modifiez l'attribut `accept`** dans `index.html` :
```html
<input type="file" id="fileInput" multiple accept="image/*,.pdf,.txt,.docx" hidden>
```

3. **Ajoutez la logique** dans `script.js` (après la ligne 96) :
```javascript
function getFileType(file) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) return 'text';
    if (file.name.endsWith('.docx')) return 'docx';  // NOUVEAU
    return 'unknown';
}

function getFileIcon(type) {
    const icons = {
        'image': '🖼️',
        'pdf': '📄',
        'text': '📝',
        'docx': '📘',  // NOUVEAU
        'unknown': '📎'
    };
    return icons[type] || icons['unknown'];
}
```

4. **Ajoutez la fonction de conversion** (après la ligne 280) :
```javascript
async function addDocxToPDF(pdfDoc, file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    const text = result.value;
    
    // Réutiliser la fonction addTextToPDF
    await addTextToPDFContent(pdfDoc, text);
}

// Renommer addTextToPDF en addTextToPDFContent et ajouter :
async function addTextToPDFContent(pdfDoc, text) {
    // ... (même code que addTextToPDF mais avec le texte en paramètre)
}
```

5. **Modifiez la fonction convertToPDF** (ligne 230) :
```javascript
if (fileObj.type === 'image') {
    await addImageToPDF(pdfDoc, fileObj.file);
} else if (fileObj.type === 'pdf') {
    await mergePDFPages(pdfDoc, fileObj.file);
} else if (fileObj.type === 'text') {
    await addTextToPDF(pdfDoc, fileObj.file);
} else if (fileObj.type === 'docx') {  // NOUVEAU
    await addDocxToPDF(pdfDoc, fileObj.file);
}
```

---

## 🛠️ Technologies utilisées

- **HTML5** : Structure de l'application
- **CSS3** : Design moderne et responsive
- **JavaScript ES6+** : Logique et manipulation de fichiers
- **pdf-lib** : Bibliothèque de manipulation PDF
  - CDN : `https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js`

---

## 📊 Limites connues

- **Taille des fichiers** : Les très gros fichiers (>50 MB) peuvent ralentir la conversion
- **Mémoire du navigateur** : Limité par la RAM disponible
- **Formats complexes** : Certains PDF avec formulaires interactifs peuvent perdre des fonctionnalités
- **Polices personnalisées** : Les fichiers texte utilisent les polices par défaut

---

## 🐛 Résolution de problèmes

### Le PDF ne se génère pas

1. Vérifiez la console du navigateur (F12)
2. Assurez-vous que pdf-lib est bien chargé
3. Essayez avec des fichiers plus petits

### Les images sont pixelisées

Les images sont conservées dans leur résolution d'origine. Utilisez des images de meilleure qualité.

### Le drag & drop ne fonctionne pas

- Assurez-vous d'utiliser un navigateur moderne (Chrome, Firefox, Safari, Edge)
- Vérifiez que JavaScript est activé

### Erreur "PDFLib is not defined"

Vérifiez que la ligne suivante est présente dans `index.html` **avant** `script.js` :
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"></script>
```

---

## 🌐 Compatibilité navigateurs

| Navigateur | Version minimale |
|-----------|------------------|
| Chrome    | 90+             |
| Firefox   | 88+             |
| Safari    | 14+             |
| Edge      | 90+             |

---

## 📝 Licence

Ce projet est libre d'utilisation. Vous pouvez le modifier, le distribuer et l'utiliser comme bon vous semble.

---

## 🤝 Contribution

Pour améliorer l'application :

1. Modifiez les fichiers selon vos besoins
2. Testez vos modifications dans plusieurs navigateurs
3. Documentez vos changements

---

## 📞 Support

Pour toute question ou problème :

1. Consultez la section "Résolution de problèmes"
2. Vérifiez la console du navigateur (F12) pour les erreurs
3. Testez avec différents fichiers pour isoler le problème

---

## 🎉 Crédits

- **pdf-lib** : https://pdf-lib.js.org/
- **Design** : Inspiration Material Design & Tailwind CSS

---

## 🚀 Améliorations futures possibles

- [ ] Ajout de watermarks (filigranes)
- [ ] Compression du PDF final
- [ ] Protection par mot de passe
- [ ] Prévisualisation du PDF avant téléchargement
- [ ] Support de Microsoft Word (DOCX)
- [ ] Export en différentes tailles (A4, Letter, etc.)
- [ ] Mode sombre / clair

---

**Version** : 1.0.0  
**Dernière mise à jour** : Décembre 2024
