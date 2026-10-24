---
name: handoff
description: Oppsummer samtalen til et handoff-dokument som en fersk agent kan ta over fra. Bruk når en sesjon nærmer seg slutten, konteksten blir full, eller brukeren sier "handoff", "oppsummer for neste sesjon" eller "vi fortsetter i morgen".
license: MIT
---

# Handoff

Skriv et handoff-dokument som oppsummerer den nåværende samtalen, slik at en
fersk agent kan fortsette arbeidet uten å lese hele historikken.

## Hvor

Lagre i `docs/handoffs/<ÅÅÅÅ-MM-DD>-<kort-slug>.md` i prosjektet. Prosjektmappen
er riktig her fordi dokumentet skal kunne leses av både deg og neste sesjon, og
følge med prosjektet videre.

## Innhold

- **Mål** – hva vi prøver å oppnå, i én eller to setninger.
- **Status** – hva som faktisk er gjort og verifisert, ikke hva som var tenkt.
- **Beslutninger** – valg som er tatt, med kort begrunnelse. Merk hvem som
  bestemte (bruker eller agent).
- **Åpne spørsmål** – det som fortsatt er uavklart.
- **Neste steg** – konkret og prioritert, helst med filstier.
- **Feller** – ting som ble prøvd og ikke virket, og hvorfor.
- **Foreslåtte skills** – hvilke skills neste agent bør laste, med ID.

## Regler

- Ikke gjenta innhold som allerede står i andre artefakter (planer, spesifikasjoner,
  README). Referer til stien i stedet.
- Skill mellom fakta og antakelser. Er noe usikkert, skriv det.
- Fjern hemmeligheter: API-nøkler, passord, personopplysninger.
- Hvis brukeren oppgir hva neste sesjon skal handle om, tilpass dokumentet til det.
- Avslutt med en kort melding i chatten: hvor filen ligger, og de tre viktigste
  punktene neste agent må vite.

---

Tilpasset [mattpocock/skills](https://github.com/mattpocock/skills) (MIT).
