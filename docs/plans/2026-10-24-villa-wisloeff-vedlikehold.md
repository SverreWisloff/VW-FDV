# Plan: Vedlikeholdsweb for Villa Wisløff

**Dato:** 2026-10-24
**Status:** Ferdig planlagt, klar for implementering
**Neste steg:** Milepæl 0 (spike for GitHub-skriving)

---

## Mål

En web-app som holder orden på periodisk vedlikehold: oppgaver med fast dato
eller intervall, historikk over utført arbeid, redigering, og eksport til
regneark. Appen og dataene bor i ett offentlig GitHub-repo og kjøres fra GitHub
Pages.

## Ikke-mål (v1)

- Varsler: ingen e-post, ingen kalenderabonnement, ingen push. Appen er en
  sjekkliste du åpner.
- Offline: ingen cache, ingen synkkø. Nett kreves.
- Innlogging: ingen brukere, ingen roller. Dataene er offentlige.
- Bilder, dokumentarkiv, kostnadsbudsjett, flere hus, sanntidssynk.
- Backend, database, serverless.

Varsler er den største produktrisikoen i denne planen. Uten dem må brukeren huske
å åpne appen. Det er akseptert nå, og kan løses senere med en liten Cloudflare
Worker uten å endre datamodellen.

## Forutsetninger

- Ett offentlig repo, f.eks. `vw-fdv`, med app og `data.json`.
- GitHub Pages serverer repoet.
- Brukeren oppretter et fine-grained PAT med `Contents: Read and write` på dette
  repoet, og limer det inn i appen. Det lagres i `localStorage`.
- GitHub-konto og Pages må være aktivert (gjøres i milepæl 5).
- Ingen Node-installasjon kreves. Appen har ikke byggesteg: det som ligger i
  repoet, er det som kjører.
- **Git eller GitHub Desktop må installeres** for å publisere endringer. Dette er
  ikke løst ennå (se `neste-sesjon.md`).
- Datoer lagres som `YYYY-MM-DD`-strenger, aldri som `Date`-objekter i dataene.

## Valgte og forkastede alternativer

| Valg | Beslutning | Motivet |
| --- | --- | --- |
| Ett offentlig repo | **Valgt** | Enklest mulig; Pages serverer både app og data; ingen hemmeligheter for lesing. |
| Token i `localStorage` | **Valgt** | Komfort på PC og telefon. Scopes til ett repo. |
| Eksplisitt lagring | **Valgt** | Én commit per lagring gir lesbar historikk og færre konflikter. |
| Egen backend / database | Forkastet | Løser bare varsler og synk, som er utenfor v1. |
| Cloudflare Worker-proxy | Forkastet | Sikrere token-håndtering, men en server er nettopp det vi unngår. |
| GitHub Actions for cron/e-post | Forkastet | Upålitelig som scheduler, og repoet blir en rar database. |
| Kalenderabonnement / ICS | Forkastet (v1) | Ikke ønsket. |
| Rammeverk (React o.l.) | Forkastet | Skjermbildene er en liste og et skjema. Byggesteg uten gevinst. |

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
      GET  /contents/data.json   → data + sha (alltid fersk)
      PUT  /contents/data.json   → commit
  localStorage: token
```

Lesing gjøres via **Contents API**, ikke via Pages-URL-en. Pages caches i
minutter, og etter en lagring vil brukeren se sin egen endring umiddelbart.
API-svaret gir også `sha` som trengs for å skrive.

Uten token er appen **lesbar** (offentlig repo), men ikke redigerbar. Det er en
nyttig standardtilstand.

Ved lagring: PUT med `sha`. Ved `409` er filen endret siden den ble lastet;
appen tilbyr «last på nytt» eller «overskriv».

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
    {
      "id": "c1",
      "taskId": "t1",
      "doneOn": "2026-10-01",
      "cost": 0,
      "note": ""
    }
  ]
}
```

Intervall-typen:

```json
{ "type": "interval", "count": 2, "unit": "month", "anchor": "2026-01-15" }
```

- `fixed-annual`: neste forekomst av måned/dag på eller etter i dag. 29. februar
  klemmes til 28. februar i ikke-skuddår.
- `interval`: legg `count` enheter til siste fullføring. Finnes ingen fullføring,
  bruk `anchor`; mangler den, bruk `createdAt`.
- **Neste forfall lagres ikke.** Det beregnes. Er datoen passert, vises den som
  forfalt — den flyttes ikke stille.
- Status: `ok`, `snart` (≤ 30 dager), `forfalt`.

## Filstruktur

```text
index.html
styles.css
src/
  app.js        oppstart, UI-kobling
  model.js      validering, id-er, normalisering
  schedule.js   neste forfall (rene funksjoner)
  dates.js      kalenderaritmetikk, månedsklemming
  github.js     Contents API
  csv.js        CSV-generering
tests.html      testløper i nettleseren, ingen avhengigheter
tests/
  dates.test.js
  schedule.test.js
data.json
README.md
AGENTS.md       prosjektkonvensjoner
```

Testene kjører i nettleseren fordi det ikke finnes Node. Poenget er ikke
verktøyet, men at datologikken har en tabell med tilfeller den må bestå.

## Milepæler

| # | Leveranse | Verifisering |
| --- | --- | --- |
| 0 | Spike: les og skriv `data.json` med PAT fra nettleseren | En commit dukker opp på GitHub, og appen ser sin egen endring |
| 1 | `dates.js` + `schedule.js` + `tests.html` | Testtabell: månedsslutt, skuddår, fast dato, intervall, forfalt, ingen historikk |
| 2 | Liste + skjema: legg til, endre, deaktiver; lagre til GitHub | Overlever omlasting; to faner gir håndterbar 409 |
| 3 | Fullfør oppgave → historikk → nytt forfall | Fullføringskjede gir forventet neste dato; kostnad og notat lagres |
| 4 | CSV- og JSON-eksport | CSV åpnes riktig i Excel (semikolon, UTF-8 BOM); JSON kan importeres tilbake |
| 5 | Pages-oppsett, token-veiledning, README/AGENTS.md | Fungerer fra telefon og PC; uten token er appen lesbar |
| 6 | (Senere) Varsler via Cloudflare Worker | Bare hvis sjekklisten viser seg utilstrekkelig |

Rekkefølgen er bevisst: milepæl 0 tester den ene antakelsen som kan velte
designet, før noe UI bygges.

## Risiko

| Risiko | Tiltak |
| --- | --- |
| Glemmer å åpne appen fordi det ikke finnes varsler | Tydlig «forfalt»-visning; Worker-fase klar hvis det blir et problem |
| Datoberegning feil ved månedsslutt/skuddår | Rene funksjoner + testtabell i milepæl 1 |
| 409-konflikt mellom PC og telefon | Eksplisitt lagring, SHA-sjekk, velg «last på nytt» eller «overskriv» |
| Token utløper eller tilbakekalles | Tydelig feilmelding og «lim inn nytt token»-flyt |
| Pages cacher gammel data | Les via Contents API, ikke Pages |
| CSV feil i norsk Excel | Semikolon og UTF-8 med BOM, verifisert i milepæl 4 |
| Offentlige data | Akseptert. Ikke skriv inn alarmkoder eller annet som ikke skal publiseres. |
| Omfanget vokser | Ikke-mål-listen holdes fast til milepæl 5 er ferdig |
| Git mangler lokalt | Installer Git eller GitHub Desktop før milepæl 0 |

## Verifisering av hele løsningen

1. `tests.html` er grønn.
2. Legg til en oppgave på PC, lagre, åpne på telefon: oppgaven vises.
3. Fullfør den på telefonen, lagre, se at neste forfall er riktig på PC.
4. Eksporter CSV, åpne i Excel: norske tegn og datoer korrekte.
5. Slett tokenet: appen er lesbar, men lagring blokkeres med forklaring.
6. Klon repoet: `data.json` er forståelig uten appen.

## Åpne spørsmål

Ingen som blokkerer koding. Avgjøres underveis:

- Reponavn og om Pages allerede er aktivert på kontoen.
- Om JSON-import skal med i milepæl 4 eller vente. Anbefaling: ta det med, det er
  billig og gjør backup meningsfull.
