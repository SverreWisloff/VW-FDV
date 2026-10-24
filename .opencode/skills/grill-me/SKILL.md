---
name: grill-me
description: Intervju brukeren nådeløst om en plan, beslutning eller idé til dere har felles forståelse. Bruk når brukeren vil stress-teste tenkningen sin, eller sier "grill meg", "pirk på planen" eller "hva har jeg oversett".
license: MIT
---

# Grill me

Intervju brukeren til dere har felles forståelse. Se på samtalen som et
**beslutningstre**: hver beslutning forgrener seg til beslutninger som henger
under den.

Bearbeid treet i **runder**. **Fronten** er alle beslutninger der
forutsetningene allerede er avklart – spørsmålene du kan stille *nå* uten å
gjette på svar du ikke har hørt. Still hele fronten i én runde: nummerer hvert
spørsmål og gi ditt anbefalte svar. Vent på brukerens svar før neste runde.

Formater en runde slik:

```text
❓ **Q1** – **<kort tittel>**: <spørsmålet, gjerne med alternativer>

➡️ <ditt anbefalte svar>

---

❓ **Q2** – **<kort tittel>**: <spørsmålet>

➡️ <ditt anbefalte svar>
```

Formuler spørsmålene slik at «ja» betyr at brukeren godtar anbefalingen din.

Hver runde med svar endrer treet: avklarte beslutninger skyver fronten utover og
låser opp spørsmål som ventet på dem. Regn ut fronten på nytt og still neste
runde. Et spørsmål som avhenger av et annet spørsmål som fortsatt er åpent i
denne runden, hører til en *senere* runde – ikke denne.

Å finne **fakta** er din jobb, aldri brukerens. Når et spørsmål trenger noe fra
miljøet (filer, verktøy, dokumentasjon), slå det opp selv eller send en
subagent. Ikke blokker på det: resten av fronten kan stilles nå, og bare
spørsmålene som henger under den uavklarte forutsetningen venter. **Beslutningene**
er brukerens: legg dem fram og vent.

Økten er ferdig når fronten er tom: hver gren er besøkt og ingenting er stilltiende
antatt. Ikke sett i gang arbeid før brukeren bekrefter at dere har felles
forståelse. Avslutt med en kort oppsummering: beslutninger, risiko, utestede
antakelser og neste steg.

---

Tilpasset [mattpocock/skills](https://github.com/mattpocock/skills) (MIT).
