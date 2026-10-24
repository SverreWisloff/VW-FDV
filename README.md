# Villa Wisløff – vedlikeholdsweb

En web-app for periodisk vedlikehold av Villa Wisløff – og samtidig et
læringsprosjekt i [OpenCode](https://opencode.ai).

Appen og dataene bor i ett offentlig GitHub-repo og kjøres fra GitHub Pages.
GitHub er databasen: `data.json` leses og skrives med GitHub Contents API.

Full plan: [`docs/plans/2026-10-24-villa-wisloeff-vedlikehold.md`](docs/plans/2026-10-24-villa-wisloeff-vedlikehold.md).

## Status

**Milepæl 0 – spike.** Koden for å lese og skrive `data.json` med et
fine-grained PAT fra nettleseren er skrevet og testet i nettleser med mocket
`fetch` (lesing, skriving, UTF-8, 401, 403, 404, 409, konfliktflyt og
tokenlagring). Den er **ikke** prøvd mot ekte GitHub ennå. Repo, token og Pages
må opprettes av brukeren (se sjekklisten under).

## Mål

- Samle vedlikeholdsoppgaver, historikk og dokumentasjon på ett sted.
- Være enkelt nok til at det faktisk blir brukt.
- Være et trygt prosjekt for å lære OpenCode: agenter, skills, kommandoer,
  kontekst og planlegging.

## Teknisk retning

| Valg | Beslutning |
| --- | --- |
| Form | Statisk web-app: HTML, CSS, JavaScript som ES-moduler. |
| Byggesteg | **Ingen.** Det som ligger i repoet, er det som kjører. |
| Vert | GitHub Pages fra ett offentlig repo. |
| Database | `data.json` i repoet, via GitHub Contents API. |
| Lesing | Contents API, ikke Pages-URL-en (Pages caches i minutter). |
| Skriving | Eksplisitt «Lagre»-knapp → én commit per lagring. |
| Auth | Fine-grained PAT, `Contents: Read and write`, ett repo. Lagres i `localStorage`. |
| Uten token | Appen er lesbar, men ikke redigerbar. |
| Avhengigheter | Ingen. Ingen tredjepartsskript, ingen analytics. |
| Datoer | `YYYY-MM-DD`-strenger i dataene. Neste forfall beregnes, lagres aldri. |
| Tester | `tests.html` i nettleseren (Node er ikke installert). |

Bevisste ikke-mål i v1: varsler, offline, innlogging, bilder, kostnadsbudsjett,
flere hus, sanntidssynk, backend.

## Arkitektur

```text
GitHub (offentlig repo)
  index.html, styles.css
  src/*.js
  data.json
  → GitHub Pages

Nettleser
  UI (liste, skjema, historikk, eksport)
  Domene (neste forfall, status)
  GitHub-klient
      GET  /contents/data.json   → data + sha
      PUT  /contents/data.json   → commit
  localStorage: token
```

Ved lagring sendes `sha` med. Er filen endret siden den ble lastet, svarer
GitHub `409`, og appen tilbyr «last på nytt» eller «overskriv».

## Datamodell

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-10-24T12:00:00Z",
  "areas": [{ "id": "a1", "name": "Ute" }],
  "tasks": [
    {
      "id": "t1",
      "title": "Stenge utekrana",
      "areaId": "a1",
      "notes": "",
      "active": true,
      "schedule": { "type": "fixed-annual", "month": 10, "day": 1 }
    }
  ],
  "completions": [
    { "id": "c1", "taskId": "t1", "doneOn": "2026-10-01", "cost": 0, "note": "" }
  ]
}
```

Intervall: `{ "type": "interval", "count": 2, "unit": "month", "anchor": "2026-01-15" }`.

## Struktur

```text
.
├── README.md
├── AGENTS.md                    # prosjektkonvensjoner
├── index.html                   # milepæl 0: spike-UI
├── styles.css
├── data.json                    # databasen
├── src/
│   └── github.js                # Contents API + token
├── docs/
│   ├── plans/                   # planer
│   └── handoffs/                # oppsummeringer mellom sesjoner
└── .opencode/
    ├── commands/                # slash-kommandoer
    │   ├── plan.md
    │   ├── grill-me.md
    │   ├── handoff.md
    │   └── review.md
    └── skills/                  # kontekst som lastes ved behov
        ├── plan/SKILL.md
        ├── grill-me/SKILL.md
        ├── handoff/SKILL.md
        └── review/SKILL.md
```

`model.js`, `schedule.js`, `dates.js`, `csv.js`, `tests.html` og `app.js`
kommer i milepæl 1–4.

## Kom i gang

1. Opprett et offentlig repo (forslag: `vw-fdv`) og legg inn filene.
2. Aktiver GitHub Pages: **Settings → Pages → Deploy from a branch → main / (root)**.
3. Opprett et fine-grained PAT: kun dette repoet, **Contents: Read and write**,
   utløpsdato om 90 dager.
4. Åpne Pages-URL-en, lim inn eier, repo og token i spike-skjemaet.
5. Trykk **Les data**, legg til et område, trykk **Lagre**. Commiten skal vises
   på GitHub, og endringen skal være der etter omlasting.

Tokenet ligger kun i nettleserens `localStorage`. Det skal aldri skrives inn i
koden, i `data.json` eller i en commit. Bruk **Logg ut** for å slette det.

## Milepæl 0 – sjekkliste

- [x] Minimal `data.json` med `schemaVersion`, tomme `areas`, `tasks`, `completions`
- [x] `index.html` som henter `data.json` via Contents API
- [x] `src/github.js` med lesing, skriving, `sha` og norske feilmeldinger
- [x] Token i `localStorage`, «Logg ut» sletter det
- [x] Håndtering av 401, 409 og 404
- [ ] Opprett offentlig repo og push filene
- [ ] Opprett fine-grained PAT og lim det inn
- [ ] Verifiser at en commit dukker opp på GitHub
- [ ] Verifiser at appen ser endringen etter omlasting
- [ ] Test feilveier: ugyldig token (401), utløpt token, 409 ved to faner

Milepæl 0 er en spike: `index.html` og `styles.css` kan kastes. `src/github.js`
skal bli stående.

## Bruk i OpenCode

| Kommando           | Hva den gjør                                                      |
| ------------------ | ----------------------------------------------------------------- |
| `/plan <oppgave>`  | Bytter til plan-agenten og lager en plan uten å endre filer.       |
| `/grill-me <emne>` | Bytter til plan-agenten og intervjuer deg til idéen er skarp.      |
| `/review <omfang>` | To-akset gjennomgang: prosjektstandarder og opprinnelig oppgave.  |
| `/handoff <fokus>` | Skriver `docs/handoffs/<dato>-<slug>.md` for neste sesjon.        |

Skillene kan også lastes manuelt med `@plan`, `@grill-me`, `@review` og
`@handoff` i en prompt.

Anbefalt arbeidsflyt:

1. `/grill-me <idé>` – få alle uavklarte valg på bordet.
2. `/plan <oppgave>` – få en plan med alternativer, risiko og milepæler.
3. Bytt til Build-agenten og implementer én milepæl om gangen.
4. Be om review og oppdater README/AGENTS.md når noe varig endres.

## Kontekst

- `AGENTS.md` beskriver formål, tekniske valg og konvensjoner.
- Skills skal ligge i `.opencode/skills/<id>/SKILL.md`. ID-en er mappenavnet,
  ikke `name:`-feltet.
- Lastede skills fra nettet bør være prosjektlokale, gjennomgått og festet til
  en kjent versjon.

## Neste steg

- [ ] Fullfør milepæl 0-sjekklisten over (krever GitHub-repo og PAT).
- [ ] Milepæl 1: `dates.js`, `schedule.js` og `tests.html`.
- [ ] Installer Git eller GitHub Desktop for å publisere fra maskinen.
