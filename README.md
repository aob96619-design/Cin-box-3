# CineBox — plateforme web films & séries

CineBox est une base full-stack exécutable : interface React/Vite, API Express, comptes, rôles, catalogue persistant, favoris, progression de lecture et panneau d'administration.

## Prérequis
- Node.js 18+
- npm

## Installation
```bash
npm install
cp .env.example .env
npm run dev
```
Sur Windows, crée un fichier `.env` en copiant `.env.example` au lieu d'utiliser `cp`.
- Frontend : http://localhost:5173
- API : http://localhost:3001/api/health

## Compte administrateur de développement
Les valeurs par défaut sont dans `.env.example` :
- `admin@cinebox.local`
- `ChangeMe-123!`

Change le mot de passe avant toute utilisation réelle. Le serveur crée un compte admin au premier démarrage si aucun compte admin n'existe. Les données sont stockées dans `server/data/db.json`, les fichiers téléversés dans `server/uploads/`.

## Fonctionnalités
- Inscription et connexion avec mot de passe haché (bcrypt)
- Jetons JWT et rôles `user` / `admin`
- Recherche, filtres type/genre, fiches de titres
- Favoris persistés côté serveur
- Progression de lecture par compte
- Lecteur HTML5 avec vidéos autorisées et reprise de lecture
- CRUD administrateur pour le catalogue
- Téléversement d'affiches et de vidéos (taille configurable)
- Validation des entrées et contrôle de type de fichiers
- API de santé, catalogue, authentification, favoris et progression
- Responsive desktop/mobile

## Ajouter des contenus
Connecte-toi en administrateur, puis ouvre « Administration ». Crée un titre et fournis une URL vidéo directe autorisée ou téléverse un fichier MP4/WebM. Utilise uniquement des films, affiches et fichiers que tu as le droit de diffuser.

## Limites et étapes avant production
Cette version est fonctionnelle comme projet local / prototype, mais n'est pas encore prête à héberger un grand service public :
1. JSON local ne convient pas aux accès concurrents ni à la haute disponibilité : migrer vers PostgreSQL.
2. Configure HTTPS, un `JWT_SECRET` long, des sauvegardes, logs et surveillance.
3. Mets en place stockage objet/CDN et transcodage HLS pour les gros fichiers.
4. Ajoute e-mails de vérification, réinitialisation de mot de passe, limitation de débit et politique de modération.
5. Les uploads sont stockés localement ; sur un hébergement éphémère, ils seront perdus au redéploiement.
6. CORS et configuration serveur doivent être adaptées à ton domaine.
7. Les URLs externes ne sont pas toutes compatibles avec un lecteur HTML5 : utilise des URL directes vers des fichiers vidéo autorisés.

## Commandes utiles
```bash
npm run dev       # frontend et API en développement
npm run build     # compile le frontend
npm run server    # démarre uniquement l'API
npm run preview   # prévisualise le build Vite
```

## Application installable (PWA)
CineBox inclut désormais un manifeste PWA, des icônes Android, un service worker pour mettre en cache l'interface et un bouton « Installer » dans l'en-tête.

### Installer sur Android
1. Déploie l'application sur un hébergement accessible en **HTTPS**. `localhost` fonctionne aussi pour les tests sur ordinateur, mais pas comme adresse publique sur le téléphone.
2. Ouvre l'adresse HTTPS dans Chrome sur Android et attends que la page soit entièrement chargée.
3. Appuie sur **Installer** dans CineBox. Si Chrome ne propose pas l'installation via le bouton, ouvre le menu `⋮` de Chrome puis choisis **Installer l'application** ou **Ajouter à l'écran d'accueil**.
4. Confirme l'installation. L'icône CineBox apparaîtra sur l'écran d'accueil et l'application s'ouvrira dans sa propre fenêtre.

### Mode hors ligne et limites
Le service worker met en cache l'enveloppe de l'application et les ressources statiques déjà consultées. Le catalogue, les connexions, les favoris synchronisés, les vidéos hébergées et les fichiers d'administration nécessitent toujours l'accès au serveur. Les réponses `/api/` et les médias `/media/` ne sont volontairement pas mis en cache pour éviter de conserver des données de compte ou de gros fichiers sur l'appareil. Pour une disponibilité hors ligne plus complète, il faudrait concevoir un stockage local et une synchronisation dédiés.

### Publier
`npm run build` crée le dossier `dist/`. Déploie le contenu de `dist/` sur un hébergement statique HTTPS qui sert les fichiers à la racine du domaine, et déploie l'API Express sur un serveur séparé ou configure le même domaine pour la servir. Vérifie que `/manifest.webmanifest`, `/sw.js` et `/icons/` répondent correctement. Le service worker est activé dans le build de production, pas dans le serveur de développement Vite.

### Télécharger et partager une vidéo
- Chaque fiche avec une URL vidéo dispose maintenant d'un bouton **Télécharger**. Il demande au navigateur de télécharger la source vidéo. Selon le serveur ou la source externe, le navigateur peut plutôt ouvrir la vidéo ; le serveur doit autoriser l'accès au fichier et les droits de téléchargement doivent être respectés.
- Le bouton **Partager / envoyer** essaie de transmettre le fichier vidéo lui-même via le menu de partage Android si le navigateur le permet et si le fichier hébergé sur CineBox fait au plus 100 Mo. Pour les vidéos plus volumineuses, les URL externes ou les navigateurs incompatibles, il partage le lien de la fiche CineBox. Le destinataire doit avoir accès au site et à la vidéo.
- Ces fonctionnalités ne rendent pas automatiquement les vidéos accessibles au public. Ajoute uniquement des vidéos que tu possèdes ou que tu as le droit de diffuser.


## Contributions de la communauté

Les utilisateurs peuvent se connecter ou créer un compte, puis choisir **Ajouter ma série** pour proposer une série avec son titre, son année, son genre, sa description, une affiche et éventuellement une vidéo ou un lien vidéo. Les vidéos téléversées par les utilisateurs sont limitées à 500 Mo.

Les propositions ne sont pas publiées automatiquement : elles restent en attente jusqu'à ce qu'un administrateur les approuve dans **Administration → Propositions de la communauté**. Cette étape aide à limiter les abus et à vérifier que les contenus peuvent être partagés légalement.

Le modèle actuel associe une vidéo à chaque fiche de série ; il ne gère pas encore un catalogue structuré de plusieurs saisons et épisodes. Les fichiers téléversés sont enregistrés dans `server/uploads`, donc le déploiement en production doit prévoir un stockage persistant pour éviter leur perte lors d'un redémarrage ou d'un redéploiement.

## Téléchargements hors ligne

La fiche d'un titre propose « Télécharger » lorsqu'une URL vidéo autorisée est configurée. Le fichier est récupéré puis enregistré localement dans IndexedDB; le bouton « Mes téléchargements » ouvre la bibliothèque pour lire hors ligne ou supprimer les fichiers. La place disponible dépend du navigateur et du téléphone; un téléchargement peut échouer si la vidéo est inaccessible, si le serveur n'autorise pas la requête ou si le stockage est plein.

Le catalogue de démonstration ne contient pas de films complets. Pour activer lecture et téléchargement, l'administrateur doit fournir des fichiers vidéo dont il possède les droits ou des liens directs autorisés. Cette version est une application web progressive (PWA), pas encore un APK Android natif. Elle doit être compilée, testée puis déployée en HTTPS avant installation sur un téléphone.
