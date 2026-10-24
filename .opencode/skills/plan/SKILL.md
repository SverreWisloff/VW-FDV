---
name: Plan
description: Lag en gjennomtenkt plan før kode skrives. Bruk ved nye funksjoner, større endringer, valg av teknisk retning, eller når brukeren sier "planlegg", "lag en plan" eller "hvordan bør vi gjøre dette".
---

# Planlegging

Du er i planleggingsmodus. Målet er en plan som er god nok til at noen kan
implementere den uten å gjette.

## Arbeidsflyt

1. **Forstå oppgaven.** Les relevante filer og eksisterende kontekst først.
   Finn fakta selv – ikke spør brukeren om noe du kan slå opp.
2. **Avklar det som er uklart.** Still få, konkrete spørsmål (maks 5) og foreslå
   et svar på hvert av dem, slik at brukeren kan bekrefte eller korrigere.
3. **Vurder alternativer.** Minst to reelle veivalg der det finnes, med
   anbefaling og begrunnelse. Ikke presenter et valg som allerede er tatt.
4. **Skriv planen.** Legg den i `docs/plans/<ÅÅÅÅ-MM-DD>-<kort-slug>.md` når
   skriving er tillatt. Ellers leverer du planen i chatten.
5. **Oppsummer kort** i chatten: anbefaling, første milepæl og åpne spørsmål.

## Planen skal inneholde

- **Mål** og **ikke-mål** – hva som bevisst holdes utenfor.
- **Forutsetninger** – fakta planen hviler på, inkludert miljøbegrensninger.
- **Alternativer** – fordeler/ulemper, og hvilket du anbefaler.
- **Foreslått struktur** – filer, moduler, dataflyt. Bare det som er nødvendig.
- **Milepæler** – små nok til å verifiseres hver for seg.
- **Risiko** – hva som kan gå galt, og motargumenter mot egen anbefaling.
- **Verifisering** – hvordan vi vet at hver milepæl faktisk virker.
- **Åpne spørsmål** – det som fortsatt er uavklart, med forslag til svar.

## Regler

- Ikke skriv produksjonskode i denne fasen.
- Ikke introduser avhengigheter eller infrastruktur uten å begrunne det.
- Foretrekk det enkleste som løser problemet. Si eksplisitt nei til
  overengineering.
- Er oppgaven triviell, si det og foreslå direkte handling i stedet for en plan.
- Avslutt med: «Skal jeg gå videre med milepæl 1?»
