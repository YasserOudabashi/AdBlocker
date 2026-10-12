# AdBlocker

Userscript personali per l'app **Userscripts** su iOS (Safari, senza Mac). Un file per sito.

| File | Sito | Cosa fa |
|------|------|---------|
| `empirenovel.user.js` | www.empirenovel.com | overlay finto "Installa AdsBlocker", popup al primo tocco (`po.js`) |
| `animeworld.user.js` | *.animeworld.ac | popunder al click, banner `#dl-banner-*` e iframe a-ads |
| `streamingcommunity.user.js` | streamingcommunity*/streamingunity* (dominio variabile) | script `spbgc.com`, contenitori fuori da `<body>`, popup |

## Installazione
1. App Userscripts dall'App Store; abilitala in Impostazioni → Apps → Safari → Estensioni (consenti i siti).
2. Copia i `.user.js` nella cartella scelta nell'app.
3. Safari → aA → Gestisci estensioni → Userscripts attivo.

## Limiti
- Bloccano la pagina, non la rete: gli script nell'HTML iniziale vengono comunque scaricati.
- Un redirect nella stessa scheda (`location = ...`) non si blocca da uno userscript.
- Se il dominio di StreamingCommunity cambia nome oltre `streamingcommunity*`/`streamingunity*`, aggiorna la regex all'inizio del file.
- Non toccare le esche anti-adblock (`.ad_slot`, `#adex`): i siti le usano per accorgersi del blocco.
