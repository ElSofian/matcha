# Planning — Matcha

Calendrier calé sur le rythme d'alternance (semaines d'école espacées).

## Semaine 1

- Setup Next.js (custom server pour Socket.io dès le départ)
- PostgreSQL + Schema DB complet (11 tables)
- Auth (register/login/JWT + bcrypt)
- Config email (Resend, domaine `boardzen.fr`) — vérification compte + reset password
- Stockage photos : dossier local `/uploads`
- Sécurité de base posée dès ici : requêtes paramétrées dès la première query, jamais
  de concaténation SQL

## Semaines 2-3 — bloc de 10j (24/08 + 31/08/2026)

- Profils + upload photos (validation stricte des fichiers dès l'écriture)
- Géolocalisation (GPS + fallback manuel)
- Recherche + filtres (âge, localisation, fame rating, tags)
- Like/Match system
- UI : version simple/fonctionnelle d'abord, polish visuel (animations, hover
  states, sélecteurs custom) après si le temps le permet

⚠️ Bloc chargé — si l'algo de matching prend plus de temps que prévu, repousser du
polish UI en semaine 4 plutôt que de rusher la sécurité des uploads/requêtes.

## Semaine 4 (21/09/2026)

- Chat temps réel (Socket.io, déjà branché depuis semaine 1)
- Notifications temps réel (like/view/message/match/unlike)
- Report/Block
- XSS : échapper les sorties utilisateur au fur et à mesure, pas en bloc à la fin

## Semaine 5 (12/10/2026)

- Audit sécurité (vérification de ce qui est fait depuis S1-S4, pas ajout de dernière
  minute)
- CSRF tokens si pas encore fait
- Seed 500 profils
- Responsive + tests finaux
- Setup VPS pour démo perso (optionnel, pas requis pour la soutenance)