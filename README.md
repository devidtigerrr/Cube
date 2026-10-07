# Kocka.io

Agar.io-szerű, saját multiplayer játék négyzet alakú játékosokkal.

## Mi van benne?

- valódi online multiplayer Socket.IO-val
- négyzet alakú játékosok
- növekedés étel felvételével
- nagyobb játékos megeszi a kisebbet
- botok, hogy üres szerveren se legyen üres a pálya
- ranglista
- mobil joystick
- PC-n WASD / nyilak
- reszponzív mobil felület
- saját név és színek
- 5000×5000-es világ

## Futtatás a saját gépeden

Telepíts Node.js 18+ verziót, majd a projekt mappájában:

```bash
npm install
npm start
```

Ezután nyisd meg:

http://localhost:3000

## Hogyan lesz belőle publikus weboldal?

A legegyszerűbb egy Node.js-t támogató hostingra feltölteni. Például Render, Railway vagy egy saját VPS.

A build parancs nem kell. A start command:

```bash
npm start
```

A szolgáltatásnak a `PORT` környezeti változót kell használnia; a szerver ezt automatikusan kezeli.

## Fontos

Ez egy saját játék, nem az Agar.io hivatalos klónja: ne használd az Agar.io nevét, logóját vagy védett grafikai elemeit úgy, mintha az eredeti játék lenne.

## Következő fejlesztések

A kód könnyen bővíthető:
- account / bejelentkezés
- skin shop
- XP és szintek
- privát szobák
- szerverlista
- chat
- mobil app (PWA / Android / iOS)
- jobb bot AI
- leaderboard adatbázissal
