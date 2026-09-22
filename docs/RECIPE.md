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

- `demo-unit` / `MatchaDemo!42`
- `fixture-001` à `fixture-500` / `FixtureMatcha!42`

## Parcours à vérifier

1. Inscription, lien de vérification, connexion, reset et logout.
2. Profil : nom, e-mail (mot de passe actuel), bio, genre, préférence, GPS ou ville,
   tags, cinq photos maximum et photo principale.
3. Discover : compatibilité, tris et filtres âge/fame/lieu/tags.
4. Profil public : visite, like/unlike, report, block ; vérifier qu'un block retire
   la personne de Discover.
5. Activity : visiteurs, likes reçus, notifications et marquage lu.
6. Deux sessions : match mutuel, Messages, chat temps réel, badge et toast.
7. Vérifier qu'un message lu dans une conversation ouverte ne reste pas non lu.

## Points de sécurité à démontrer

- mots de passe bcrypt, tokens e-mail hashés ;
- SQL paramétré et validation Zod côté serveur ;
- upload JPEG/PNG/WebP normalisé, taille et pixels limités ;
- origine requise pour les mutations HTTP ;
- limitation inscription, connexion, reset et renvoi d'activation.
