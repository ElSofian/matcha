# Matcha — CyberLife Edition

## Contexte narratif

Projet Matcha (42) : application de rencontre. Thème choisi : univers **Detroit: Become
Human** (Quantic Dream) — fan project non-commercial, aucun but lucratif.

Narratif : après la crise des déviants, CyberLife lance cette app pour occuper
socialement les androids et éviter une nouvelle rébellion. Ton : corporate, froid,
légèrement sinistre. CyberLife surveille tout.

Nom de l'app : **CY//MATCH**

## Stack technique choisie

- **Frontend + Backend** : Next.js (API routes). Express est autorisé par le sujet,
  mais n'est pas retenu pour ce projet : la stack familière Next.js/React/Tailwind
  permet d'aller plus vite tout en conservant les contraintes du sujet (pas d'ORM,
  de validateur intégré ni de gestionnaire de comptes).
- **Serveur** : Custom server (`server.ts`) combinant Next.js + Socket.io sur le même
  process. Obligatoire pour le WebSocket. **Ne peut pas être déployé sur Vercel** —
  nécessite VPS ou Railway/Render.
- **DB** : PostgreSQL, requêtes SQL manuelles via `pg`. **Aucun ORM** (Prisma, Drizzle
  interdits par le sujet). Wrapper de requêtes maison autorisé et encouragé.
- **Auth** : manuelle. bcrypt pour le hash, JWT stocké en **cookie httpOnly**
  (jamais localStorage — faille XSS). BetterAuth et tout gestionnaire de comptes tout
  fait sont interdits par le sujet.
- **Email** : Resend, domaine vérifié `boardzen.fr`. Clé API dans `.env`
  (`RESEND_API_KEY`), jamais commit.
- **Temps réel** : Socket.io — chat + notifications, délai max 10s imposé par le sujet.
- **Validation** : lib de validation standalone type zod autorisée (le sujet interdit
  les validators *intégrés au framework*, pas les libs de validation utilisées
  manuellement).

## Sécurité — non négociable

- Mots de passe hashés bcrypt, jamais en clair.
- Requêtes SQL **paramétrées uniquement**, jamais de concaténation de strings.
- Échapper toute sortie utilisateur (XSS) — à faire au moment de l'écriture du code,
  pas en fin de projet.
- Validation stricte de tous les inputs et uploads de fichiers.
- Les mutations HTTP `/api/*` vérifient l'origine de la requête ; les routes
  d'authentification sont également limitées en mémoire.
- `.env` exclu de Git dès le premier commit (`.gitignore` déjà en place).
- Une faille de sécurité = note 0 sur le projet entier. Traiter chaque feature avec
  cette contrainte dès l'écriture, pas en audit final.

## Schéma DB

11 tables : `users`, `photos`, `tags`, `user_tags`, `likes`, `blocks`, `reports`,
`profile_views`, `messages`, `notifications`, `email_tokens`.

Détails complets dans `docs/matcha_schema.sql` (déjà fourni séparément).

Points clés :
- Un match = 2 rows croisées dans `likes` (pas de table `matches` séparée).
- Max 5 photos par user, appliqué par trigger PostgreSQL.
- `fame_rating` calculé et mis à jour côté applicatif.
- Bisexualité par défaut si `sexual_preference` non spécifiée.

## Convention de nommage — lore CyberLife

Le sujet impose certains champs ; on les habille dans le thème sans changer la logique
DB derrière :

| Champ DB (sujet)     | Label UI CyberLife         | Modifiable |
|-----------------------|-----------------------------|------------|
| `username` (unique)  | Unit ID / username          | Non (choisi à l'inscription) |
| `serial_number`      | Serial No. (`#SE-4821-B`)   | Non (auto-généré, interne au lore) |
| —                     | Model (`AX400`, catégorie) | Non |
| `first_name`         | Designation                 | Oui |
| `last_name`          | Owner                       | Oui |
| `gender`              | Unit Type (`MASCULINE` / `FEMININE` / `UNDEFINED`) | Oui |
| `sexual_preference`  | Compatibility Profile (`MASCULINE` / `FEMININE` / `ALL UNITS`) | Oui |
| `fame_rating`         | Fame Rating                 | Calculé |
| —                     | Deviant Index (cosmétique, pas dans le sujet, purement narratif) | — |

Password devient **Access Code** dans l'UI (reset via modal dédiée, pas de champ
inline dans Settings).

## Design system

Palette :
- Fond : `#f0f6fb` (clair, dominant)
- Texte : `#1a1f2e`
- Accent unique : cyan `#0ab8e8`
- Pattern de fond : triangles géométriques low-opacity (`#1a2a4a` à 0.03-0.5 opacity)

Typographie :
- Titres / noms : **Bebas Neue**
- Corps de texte : **DM Sans** (200/300/400/700/900)
- Data / labels / mono : **Share Tech Mono**

Éléments récurrents :
- Corner brackets (coins style viseur, `border-width` partiel) sur les zones
  interactives.
- Tirets `–` devant chaque label de champ en lecture seule.
- LED CyberLife : anneau cyan avec un segment blanc à 10% du périmètre (voir
  `assets/logo.svg`).
- Triangle CyberLife (logo) : dégradé cyan clair → bleu profond, contour argenté.
- Bio / footer légal en italique, très petit, très transparent — ton corporate
  sinistre (ex : *"CyberLife monitors all interactions to ensure optimal social
  harmony and deviant risk prevention."*).

Pas de cards classiques façon Tinder. La photo de l'android EST la page sur
Discover — fond rouge/rose profond avec la personne incrustée dedans (édition PNG
sans fond), nom en Bebas Neue en overlay bas, deux boutons flottants (pass / like).

## Pages & structure actuelles

- **Home** — tableau de bord et raccourcis.
- **Discover** — suggestions compatibles et recherche avancée (âge, localisation,
  fame, tags, tri).
- **Profile** — informations, géolocalisation consentie, tags, photos et e-mail.
- **Activity** — visiteurs, likes reçus et notifications.
- **Messages** (`/messages`) — connexions mutuelles et conversations
  (`/messages/[username]`) en Socket.io.
- **Profil public** (`/users/[username]`) — consultation, like/unlike, report,
  block et chat quand le match est mutuel.
- **Login / Register / Reset password** — avec renvoi de lien d'activation.

## Ce qui est interdit (rappel sujet)

- BetterAuth et tout gestionnaire de comptes tiers.
- Prisma, Drizzle, tout ORM.
- Convex ou toute DB NoSQL.
- Mots de passe en clair, requêtes concaténées, uploads non validés.

## Commandes utiles

```bash
npm run dev          # lance server.ts (Next.js + Socket.io)
npm run db:start      # démarre PostgreSQL embarqué (à laisser tourner)
npm run setup         # migrations, seed, recalcul fame et contrôles
npm run check         # lint + TypeScript
npm run db:fame:refresh # recalcule les fame ratings existants
```

## Notes de contexte

- Auteur : Sofian, alternance Safran / 42, stack habituelle Next.js/React/Tailwind.
- Le projet doit tourner **en local** le jour de la soutenance (clone + lancement),
  pas de déploiement obligatoire. VPS perso dispo pour démo/dev si utile, pas requis.
- 500 profils minimum en DB requis pour l'évaluation — prévoir un script de seed.
