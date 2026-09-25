# KITT AI Strategy Lab backend module

A modul 60 másodpercenként összeveti a lezárt tradeket a friss piaci mintákkal, több kockázati/stratégiai jelöltet szimulál, majd javítási javaslatot készít.

## Biztonsági modell

- Felhasználói jóváhagyás kötelező.
- A JavaScript forráskódot nem írja át automatikusan.
- PAPER módban a jóváhagyott próbaverzió hot-reload segítségével azonnal alkalmazható.
- LIVE módban az AI alkalmazása alapból blokkolt (`ALLOW_AI_LIVE_APPLY=true` nélkül).
- Mentéskor új stratégia-verzió jön létre.
- A korábbi verziók rollbackkel azonnal visszaállíthatók.

## Elvárt Trading Engine API

Az engine-nek ezeket kell biztosítania:

```js
engine.getState()
engine.getTuningConfig()
engine.applyTuningConfig(config, { source })
engine.createStrategy(name, params)
engine.marketHistory
engine.state.paperTrade
```

## Bekötés

```js
const createAILab = require('./backend-ai-lab/aiLab');
const aiLab = createAILab(engine);

app.use('/api/ai-lab', aiLab.router);
aiLab.start();
```

Leállításkor:

```js
aiLab.stop();
```

## API

- `GET /api/ai-lab/status`
- `POST /api/ai-lab/analyze`
- `POST /api/ai-lab/proposals/:id/stage`
- `POST /api/ai-lab/proposals/:id/reject`
- `POST /api/ai-lab/trial/save`
- `POST /api/ai-lab/trial/discard`
- `POST /api/ai-lab/versions/:id/rollback`

## Ellenőrzött működés

A teljes MancsBot-KITT-AI backend smoke tesztjén ellenőrizve:

- 720 piaci minta
- AI proposal létrehozás
- hot-apply
- új AI verzió mentése
- rollback az eredeti konfigurációra

A szimuláció nem garantál jövőbeni profitot; célja a paramétermódosítások kontrollált PAPER tesztelése.
