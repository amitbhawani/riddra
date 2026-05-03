# Riddra Freshness Final Verification Report

Date: 2026-04-30  
Command run: `npm run stocks:generate-freshness`

## Final Freshness State

1. Active stocks: `2157`
2. Fresh today count: `137`
3. Stale count: `2020`
4. Missing today price: `1998`
5. Missing today snapshot: `2020`

## Interpretation

This is a real post-regeneration durability check after:

- the staged manual daily update
- the stale-remainder retry slice

The result is clear:

- only `137 / 2157` stocks are currently fully fresh for `2026-04-30`
- `2020` stocks are still stale
- snapshot freshness is the bigger gap, because all `2020` stale stocks are still missing a `2026-04-30` snapshot
- `1998` are also still missing `2026-04-30` price data

## Remaining Stale Symbols

There are `2020` remaining stale symbols in total.  
Representative leading symbols from the current stale set are:

- `SALSTEEL.NS`
- `KRBL.NS`
- `GVT&D.NS`
- `J&KBANK.NS`
- `RAYMONDREL.NS`
- `PIRAMALFIN.NS`
- `JOCIL.NS`
- `LOVABLE.NS`
- `OMAXE.NS`
- `SDBL.NS`
- `NYKAA.NS`
- `MODISONLTD.NS`
- `BODALCHEM.NS`
- `INDUSINDBK.NS`
- `GODIGIT.NS`
- `BUILDPRO.NS`
- `AVL.NS`
- `CHOICEIN.NS`
- `WAAREEENER.NS`
- `LAHOTIOV.NS`
- `RAIN.NS`
- `BERGEPAINT.NS`
- `BALMLAWRIE.NS`
- `FEDDERSHOL.NS`
- `LTM.NS`
- `VALIANTORG.NS`
- `ORKLAINDIA.NS`
- `RATNAMANI.NS`
- `INNOVISION.NS`
- `LANDSMILL.NS`
- `SCODATUBES.NS`
- `KPL.NS`
- `NTPC.NS`
- `PRINCEPIPE.NS`
- `DMCC.NS`
- `RADAAN.NS`
- `OIL.NS`
- `UFO.NS`
- `CENTEXT.NS`
- `TEAMLEASE.NS`
- `PRAKASHSTL.NS`
- `APOLLOHOSP.NS`
- `MMWL.NS`
- `ICICIGI.NS`
- `REMSONSIND.NS`
- `GLOBAL.NS`
- `METROGLOBL.NS`
- `QPOWER.NS`
- `APLLTD.NS`
- `MMTC.NS`
- `REPRO.NS`
- `VPRPL.NS`
- `GODREJIND.NS`
- `LAMBODHARA.NS`
- `ARFIN.NS`
- `APARINDS.NS`
- `OAL.NS`
- `BETA.NS`
- `APCOTEXIND.NS`
- `RUPA.NS`
- `PFIZER.NS`
- `ZENSARTECH.NS`
- `CEATLTD.NS`
- `VADILALIND.NS`
- `VSSL.NS`
- `SPANDANA.NS`
- `CARRARO.NS`
- `SAMPANN.NS`
- `EMAMIPAP.NS`
- `V2RETAIL.NS`
- `CIEINDIA.NS`
- `INDOBORAX.NS`
- `NAGREEKEXP.NS`
- `RANEHOLDIN.NS`
- `CELEBRITY.NS`
- `CLEANMAX.NS`
- `BAJAJHCARE.NS`
- `MOHITIND.NS`
- `SHRIPISTON.NS`
- `PLATIND.NS`
- `SHARDACROP.NS`
- `MUTHOOTMF.NS`
- `TMB.NS`
- `ELPROINTL.NS`
- `UNIENTER.NS`
- `TAJGVK.NS`
- `JINDWORLD.NS`
- `SAURASHCEM.NS`
- `MFSL.NS`
- `SICAGEN.NS`
- `ZFCVINDIA.NS`
- `VINDHYATEL.NS`
- `SURAKSHA.NS`
- `NEULANDLAB.NS`
- `MANAPPURAM.NS`
- `MONTECARLO.NS`
- `DECCANCE.NS`
- `FSL.NS`
- `FABTECH.NS`
- `GREENPLY.NS`
- `PICCADIL.NS`
- `TIIL.NS`

Pattern note:

- most remaining stale symbols currently show `lastPriceDate = 2026-04-29`
- most remaining stale symbols currently show `lastSnapshotDate = 2026-04-29`
- a smaller subset already has `2026-04-30` price data but is still missing the `2026-04-30` snapshot

## Is The Remaining Stale Count Acceptable?

No.

`2020 / 2157` stale stocks is not acceptable for production daily freshness.

That means:

- the manual staged update and retry passes improved coverage
- but they did not come close to full daily freshness completion
- the current importer behavior is still too heavy for efficient full-universe same-day catch-up

## Cron Recommendation

Recommendation: **NO-GO**

Reasons:

- stale count is still extremely high
- missing same-day snapshot coverage is still extremely high
- missing same-day price coverage is still extremely high
- the current historical refresh path is still behaving more like partial backfill than a tight same-day daily updater

Cron should remain disabled until:

1. the daily update path is forced to stay strictly recent-only for freshness runs
2. full-universe stale count is brought down to an operationally acceptable level
3. a follow-up staged live run proves broad completion without hidden backfill inflation
