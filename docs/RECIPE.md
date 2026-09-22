# Recette de soutenance Matcha

Le sujet `fr.subject.pdf` est la référence en cas de divergence avec la grille.

## Démarrage propre

```sh
npm ci
# terminal 1
npm run db:start
# terminal 2
npm run setup
npm run dev
```

Contrôles avant soutenance :

```sh
npm run check
npm run build
```

## Comptes locaux

Après `npm run setup` :

- `demo-unit` / `MatchaDemo!42` : compte local vérifié, déjà renseigné ;
- `fixture-001` à `fixture-500` / `FixtureMatcha!42` : profils de test vérifiés.

Le seed est idempotent : relancer `npm run db:seed` recrée les comptes absents et
met à jour les fixtures sans devoir réinitialiser la base.

## Parcours à vérifier

1. Inscription : e-mail, pseudo, identité, mot de passe **et date de naissance**.
   Une personne de moins de 18 ans est refusée côté client et côté serveur. Le
   compte reste inaccessible avant activation par le lien envoyé par e-mail.
   Tester aussi connexion, renvoi d'un lien expiré, reset de mot de passe et logout.
2. Premier accès : après activation, le compte passe par l'onboarding obligatoire :
   genre/préférence, localisation (GPS avec consentement ou ville manuelle), puis
   photo principale. La géolocalisation précise tente de renseigner la ville ; la
   saisie manuelle reste disponible si elle échoue. Bio et tags sont proposés mais
   facultatifs.
3. Profil : nom, e-mail (mot de passe actuel), bio, genre, préférence, GPS ou ville,
   tags, cinq photos maximum et photo principale. Tester la confirmation avant la
   suppression d'une photo, y compris lorsqu'elle est la seule photo.
4. Compte : modifier l'e-mail et supprimer définitivement le compte (confirmation
   par mot de passe actuel), puis vérifier la déconnexion et l'impossibilité de se
   reconnecter.
5. Discover : compatibilité, tris et filtres âge/fame/lieu/tags. Un profil incomplet
   (majeur, localisation, genre et photo principale requis) ne peut pas accéder au
   matching.
6. Profil public : visite, like/unlike, report, block ; vérifier qu'un block retire
   la personne de Discover. Après un unlike, les notifications provenant de cette
   personne sont masquées jusqu'à une nouvelle interaction volontaire.
7. Activity : visiteurs, likes reçus, notifications et marquage lu. Les visites ne
   génèrent pas de notification répétée pour la même personne pendant 24 heures.
8. Deux sessions : match mutuel, Messages, chat temps réel, badge et toast. Vérifier
   qu'un message lu dans une conversation ouverte ne reste pas non lu et que le toast
   affiche l'expéditeur avec un aperçu tronqué du message.

## Points de sécurité à démontrer

- mots de passe bcrypt, tokens e-mail hashés ;
- SQL paramétré et validation Zod côté serveur ;
- upload JPEG/PNG/WebP normalisé, taille et pixels limités ;
- origine requise pour les mutations HTTP ;
- limitation inscription, connexion, reset et renvoi d'activation.

## À ne pas oublier avant de rendre

- Exécuter `npm run db:migrate` sur une base existante, notamment pour la migration
  `003_notification_mutes.sql`.
- Lancer `npm run check` puis `npm run build`.
- Vérifier que `.env`, `node_modules`, la base locale et les uploads de test ne sont
  pas ajoutés à Git ; ne jamais commit une clé Resend ou un `JWT_SECRET` réel.
