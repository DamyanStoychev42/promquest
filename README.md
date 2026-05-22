# PromQuest MVP v5 — Polished Games

Includes:
- Poker with fake money, community cards, betting actions, winner evaluation, dealer/blinds-lite, showdown reveal
- Warships with 3-cell ship placement, fog of war, explosions, turn-based combat
- Quiz with customizable questions
- Google Maps GeoGuessr with:
  - Europe start position
  - pin guessing
  - distance score
  - correct-location reveal
  - memory unlock
- Reward unlock system
- Final prom reveal screen

## Run backend

```bash
cd server
npm install
npm run dev
```

## Run frontend

```bash
cd client
npm install
npm run dev -- --host 0.0.0.0
```

## Google Maps

Inside `client`, create `.env`:

```text
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Restart frontend after changing `.env`.

## v5.1 fix

Warships now has a real placement flow:
1. Place 3 connected ship cells.
2. Press **Commit placement**.
3. Battle starts only after both players are ready.


## v5.2 Warships fleet update

Warships now has:
- 1 ship of size 2
- 2 ships of size 3
- 1 ship of size 4
- lock each ship individually
- commit full fleet
- enemy remaining ships meter


## v5.3 Warships balance update

Warships now uses a smaller mobile-friendly fleet:
- 1 Patrol Boat, size 2
- 1 Destroyer, size 3
- 1 Battleship, size 4

The remaining-ships meters now automatically use the fleet size instead of hardcoded 4.


## v5.4 Final reveal update

Added:
- RUNWAY MP3 as `client/public/runway.mp3`
- final reveal audio with volume fade-in
- Bulgarian final clue sequence
- final question: "Ще бъдеш ли моята буба на Бала?"
- animated purple hearts
- animated floating blueberries
- personalized quiz questions

Note: Browsers require a tap/click before audio can play, so the final reveal starts after pressing the button.


## v5.5 update

Changed:
- GeoGuessr renamed to BubaGuesser
- wrong BubaGuesser guesses no longer block progress
- unlocked rewards now show the four final reveal clue sentences


## v5.6 Clue animation update

Changed:
- New funny clue sequence:
  1. Обича да пие много чай,
  2. Бубата тормози с любов,
  3. Гушките много харесва,
  4. Въпрос голям го чака:
- After each game, a full-screen clue animation appears.
- The clue animation marks that part of the puzzle as completed.
- After the 4th clue, the continue button leads naturally back to the map, where the final reveal button appears.


## v5.9 Final reveal fix

Fixed the final reveal render and added the photo background slideshow safely.


## v6 update

Separated the two text systems:
- Game completion clue overlays use the funny clues.
- Final reveal uses the romantic/emotional sentence sequence:
  1. На Реденка внезапно ноември месец се запознахме...
  2. На 1-ви/5-ти декември станах най-щастливият човек на света.
  3. Любовта ми към теб вече 18 месеца експоненциално расте...
  4. Затова сега искам с нетърпение да ти задам въпроса:


## v7 final polish

Added:
- Buba Protocol loading/intro screen
- better room wording
- button/game-card micro animations
- final YES celebration state
- cleaner BubaGuesser map styling
- deployment guide in DEPLOYMENT.md
- .env.example for frontend deployment
- backend /health route


## v7.1 room fix

Room create/join now uses server acknowledgements and visible status messages.
Joining a non-existing room now shows a clear error instead of silently creating/blanking.
