# SpeedGuard HUD — PWA

Tachymètre numérique avec alertes sonores de vitesse, installable comme application native (PWA).

## Structure des fichiers

```
speedguard/
├── index.html          ← Interface principale
├── app.js              ← Logique (alarmes, GPS, état)
├── sw.js               ← Service Worker (mode hors ligne)
├── manifest.json       ← Manifest PWA (icônes, nom, couleurs)
├── generate_icons.py   ← Script de génération des icônes
└── icons/
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png     ← Android / Chrome (maskable)
    ├── icon-384.png
    ├── icon-512.png     ← Splash screen (maskable)
    └── icon-apple.png   ← iOS Safari (180×180)
```

---

## Déploiement

### Option 1 — Netlify (gratuit, le plus simple)

1. Créez un compte sur https://netlify.com
2. Glissez-déposez le dossier `speedguard/` sur le dashboard Netlify
3. Votre app est en ligne en HTTPS → la PWA est installable immédiatement

### Option 2 — GitHub Pages (gratuit)

```bash
# Créez un repo GitHub, puis :
cd speedguard
git init
git add .
git commit -m "SpeedGuard PWA"
git branch -M main
git remote add origin https://github.com/VOTRE_USER/speedguard.git
git push -u origin main
```
Activez GitHub Pages dans Settings → Pages → Branch: main.

### Option 3 — Serveur local (test)

```bash
# Python 3
cd speedguard
python3 -m http.server 8080
# Ouvrez http://localhost:8080
```

> ⚠️ La PWA nécessite HTTPS pour l'installation et le GPS.
> En local, utilisez `localhost` (considéré comme sécurisé par les navigateurs).

---

## Installation sur téléphone

### Android (Chrome)
1. Ouvrez l'URL dans Chrome
2. Une bannière "Installer SpeedGuard" apparaît en bas de l'écran
3. Appuyez sur **Installer** → l'icône apparaît sur l'écran d'accueil

### iOS (Safari)
1. Ouvrez l'URL dans Safari
2. Appuyez sur le bouton **Partager** (carré avec flèche)
3. Choisissez **Sur l'écran d'accueil**
4. Confirmez avec **Ajouter**

---

## Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| GPS réel | Vitesse calculée via l'API Geolocation |
| Alertes sonores | Bip cadencé / Alarme continue / Bip rapide |
| 3 zones d'état | Vert (sûr) → Ambré (avertissement) → Rouge (alerte) |
| Limite réglable | De 10 à 150 km/h par paliers de 10 |
| Mode hors ligne | Fonctionne sans internet (Service Worker) |
| Wake Lock | L'écran reste allumé pendant la navigation |
| Mémoire | La limite et le mode sont sauvegardés |
| Raccourcis PWA | Accès direct à 50 / 90 / 130 km/h depuis l'icône |

---

## Regénérer les icônes

Si vous souhaitez personnaliser l'icône, modifiez la variable `SVG` dans `generate_icons.py` puis :

```bash
pip install Pillow cairosvg
python3 generate_icons.py
```

---

## Permissions requises

- **Geolocation** — pour la vitesse GPS réelle
- **Notifications** (optionnel) — non utilisé dans cette version

La géolocalisation n'est demandée qu'au premier lancement. Sans permission, l'app fonctionne en mode manuel.
