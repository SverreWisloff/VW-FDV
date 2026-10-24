---
name: Review
description: To-akset gjennomgang av endringer – etter prosjektets standarder og mot opprinnelig oppgave/spesifikasjon. Bruk når brukeren vil reviewe en branch, en PR, arbeid underveis, eller sier "review", "se over dette" eller "hva er galt her".
license: MIT
---

# Review

Gjennomgå endringene langs to akser:

- **Standarder**: følger koden prosjektets dokumenterte regler?
- **Spesifikasjon**: gjør koden det oppgaven faktisk ba om?

Aksene holdes bevisst adskilt. En endring kan bestå den ene og feile den andre,
og det er nettopp det som er poenget: kode som følger alle konvensjoner, men løser
feil problem, skal ikke kunne skjules av en pen implementasjon.

## 1. Fest utgangspunktet

Brukeren oppgir hva som skal gjennomgås. I prioritert rekkefølge:

1. En commit, branch, tag eller `main` – bruk `git diff <punkt>...HEAD`.
2. Konkrete filer eller mapper.
3. Endringer gjort i denne sesjonen.
4. Ingenting oppgitt: spør.

Sjekk at referansen finnes og at diffen ikke er tom før du går videre. Er Git
ikke tilgjengelig, les filene direkte og sammenlign mot det du vet om tilstanden
før – skriv i rapporten at sammenligningsgrunnlaget er filbasert, ikke en diff.

## 2. Finn spesifikasjonen

Se etter opprinnelig oppgave i denne rekkefølgen:

1. Referanse i commit-melding eller oppgave (issue).
2. Sti brukeren oppgir.
3. Fil under `docs/`, `specs/` eller `docs/plans/` som matcher endringen.
4. Finnes ingen, spør hvor den er. Sier brukeren at det ikke finnes noen,
   hopper du over spesifikasjonsaksen og sier det i rapporten.

## 3. Finn standardene

Let etter filer som dokumenterer hvordan kode skal skrives: `AGENTS.md`,
`CONTRIBUTING.md`, `CODING_STANDARDS.md`, `README.md` med konvensjoner.

I tillegg gjelder alltid **smell-baseline** under. To regler binder den:

- **Prosjektet vinner.** En dokumentert regel slår alltid baseline. Der prosjektet
  bevisst gjør noe baseline ville flagget, undertrykkes lukten.
- **Alltid skjønn.** Hver lukt er en merket heuristikk («mulig Feature Envy»),
  aldri en hard overtredelse. Hopp over det verktøy allerede håndhever.

Hver lukt leses som *hva det er* → *hvordan fikse det*. Match mot endringen:

- **Mysterious Name**: navn som ikke avslører hva noe gjør eller holder. → gi det
  et ærlig navn; finnes ikke navnet, er designet uklart.
- **Duplicated Code**: samme logikk-form dukker opp flere steder i endringen. →
  trekk ut formen og kall den fra begge steder.
- **Feature Envy**: en metode henter mer fra en annen objekt enn sitt eget. →
  flytt metoden dit dataene bor.
- **Data Clumps**: de samme feltene eller parameterne reiser alltid sammen. →
  samle dem i én type.
- **Primitive Obsession**: en primitiv eller streng står for et domenebegrep. →
  gi begrepet sin egen lille type.
- **Repeated Switches**: samme `switch`/`if`-kaskade på samme type gjentas. →
  polymorfi, eller ett delt kart.
- **Shotgun Surgery**: én logisk endring krever spredte endringer i mange filer.
  → samle det som endres sammen i én modul.
- **Divergent Change**: én fil endres av flere urelaterte grunner. → splitt, slik
  at hver modul endres av én grunn.
- **Speculative Generality**: abstraksjoner, parametere eller kroker for behov
  spesifikasjonen ikke har. → slett dem; innline til behovet er reelt.
- **Message Chains**: lange `a.b().c().d()`-kjeder som kalleren ikke bør avhenge
  av. → skjul vandringen bak én metode på første objekt.
- **Middle Man**: en klasse eller funksjon som stort sett bare videresender. →
  fjern den, kall målet direkte.
- **Refused Bequest**: en subklasse som ignorerer eller overstyrer det meste den
  arver. → dropp arv, bruk komposisjon.

## 4. Kjør de to aksene

Kjør Standarder og Spesifikasjon som **parallelle subagenter** når verktøyet er
tilgjengelig, slik at de ikke forurenser hverandres kontekst. Er det ikke
tilgjengelig, gjør dem sekvensielt og hold funnene strengt adskilt.

**Standarder** skal få:

- Hva som gjennomgås (diff-kommando eller filliste).
- Listen over standardkilder du fant, **pluss hele smell-baseline over**.
- Brief: «Rapporter per fil/hunk der det er relevant: (a) hvert sted endringen
  bryter en dokumentert standard – siter standarden (fil + regel); (b) hver
  baseline-lukt du ser – navngi den og siter hunken. Skiller harde brudd fra
  skjønnsvurderinger: dokumenterte brudd kan være harde, baseline-lukter er
  alltid skjønn, og prosjektets standard overstyrer baseline. Hopp over det
  verktøy håndhever. Under 400 ord.»

**Spesifikasjon** skal få:

- Hva som gjennomgås.
- Stien til eller innholdet i spesifikasjonen.
- Brief: «Rapporter: (a) krav som mangler eller er delvis oppfylt; (b) atferd som
  ikke var bedt om (scope creep); (c) krav som ser implementert ut, men der
  implementasjonen er feil. Siter spesifikasjonslinjen for hvert funn. Under 400
  ord.»

Mangler spesifikasjonen, hopp over den aksen og noter det.

## 5. Sett sammen

Presenter de to rapportene under `## Standarder` og `## Spesifikasjon`. Ikke slå
sammen eller omranger funnene – aksene er bevisst separate.

Avslutt med én linje: antall funn per akse, og det alvorligste funnet *innenfor
hver akse*. Ikke kår én vinner på tvers av aksene.

---

Tilpasset [mattpocock/skills](https://github.com/mattpocock/skills) (MIT).
