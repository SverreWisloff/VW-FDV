# Prosjektinstrukser

## Formål

Web-app for periodisk vedlikehold av Villa Wisløff. Oppgaver med fast dato eller
intervall, historikk over utført arbeid, redigering og eksport til regneark.
Samtidig et læringsprosjekt i OpenCode.

Planen ligger i `docs/plans/2026-10-24-villa-wisloeff-vedlikehold.md`.

## Stack og begrensninger

- Statisk web-app: HTML, CSS og JavaScript som ES-moduler.
- **Ingen byggesteg.** Det som ligger i repoet, er det som kjører på GitHub Pages.
- **Ingen avhengigheter** uten at brukeren godkjenner det.
- Node, Python og Git er ikke installert på utviklingsmaskinen. Ikke foreslå
  verktøy som krever dem uten å si det eksplisitt.
- Appen kjøres fra GitHub Pages. Lokal `file://` er ikke en støttet kjøremåte.

## Data

- `data.json` i repoet er databasen. GitHub Contents API leser og skriver den.
- Dataene er offentlige. Ikke legg inn hemmeligheter, alarmkoder eller
  personopplysninger utover det brukeren selv har valgt.
- Datoer lagres som `YYYY-MM-DD`-strenger. Aldri `Date`-objekter i JSON.
- `neste forfall` beregnes alltid, lagres aldri.
- `schemaVersion` finnes i filen. Ved formatendring: øk den og skriv migrering.

## Konvensjoner

- Norsk UI-tekst, norske commit-meldinger, engelske kodeidentifikatorer.
- Rene funksjoner for kalenderaritmetikk i `src/dates.js` og
  `src/schedule.js`. Ingen UI- eller nettverkskall der.
- All token-håndtering i `src/github.js`. Token skal aldri logges eller
  serialiseres inn i `data.json`.
- Eksplisitt lagring med «Lagre»-knapp. Ingen autosave.
- Ingen tredjepartsskript, ingen analytics. Streng CSP når appen er på plass.
- Feilmeldinger skal være forståelige på norsk og si hva brukeren kan gjøre.

## Verifisering

- `tests.html` må være grønn etter endringer i datologikk. Nye regler krever nye
  testtilfeller, særlig månedsslutt og skuddår.
- Manuell sjekk før en milepæl regnes som ferdig: legg til, rediger, lagre,
  omlast, se at dataene stemmer.
- CSV-eksport testes i Excel med norske tegn og datoer (semikolon, UTF-8 BOM).

## Arbeidsmåte

- Implementer én milepæl om gangen. Ikke hopp til neste før verifiseringen er
  gjort.
- Hold ikke-mål-listen i planen fast. Varsler, offline, bilder og innlogging er
  utenfor v1.
- Ved usikkerhet om datamodellen: spør før du endrer formatet.
