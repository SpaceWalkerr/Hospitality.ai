# Hospital data

Everything Hospitality knows about hospitals comes from the five spreadsheets
in this folder. Open them in Excel, Google Sheets or LibreOffice, edit, save
as CSV, then run:

```bash
npm run data:import
```

That checks every row and, only if all of them are valid, writes
`lib/data/dataset.json`, which the app reads. If anything is wrong, nothing is
written, and every problem is listed with its file, line and column:

```
✗ rooms.csv line 14, rate_per_day: "four thousand" is not a whole number
✗ empanelment.csv line 9, cashless: cashless needs in_network = yes
```

Commit the CSVs **and** the regenerated `dataset.json` together. CI runs
`npm run data:check` and fails if they disagree.

## The bundled data is invented

The 14 Bengaluru hospitals here are fictional, marked `source = illustrative`,
and labelled **Illustrative data** on every card, with a note above the list.
Don't mix real and illustrative rows for a real deployment: replace the lot.

## Where real data comes from

| What | Usually from | Notes |
|---|---|---|
| Which hospitals are in an insurer's network, and cashless | The insurer or its TPA (most publish a network hospital list) | Changes often. Re-check monthly. |
| PM-JAY empanelment | The National Health Authority's public hospital list | Public, but check the terms of use before importing it. |
| Room categories and daily rates | The hospital's billing or insurance desk | Not usually published. The part that needs a partner. |
| Procedure package prices | The hospital, or the insurer's negotiated package list | |
| Scheme package rates | The PM-JAY Health Benefit Package master | |

Every row from a real source needs `source_as_of`, the date it was last
checked. The app shows it ("Insurer network list · checked 3 Oct 2026"), and
the import warns about anything older than six months.

## Columns

Lists inside a cell are separated by semicolons: `Cardiology; Orthopaedics`.
Yes/no columns take `yes` or `no`. Money is whole rupees, and `4,900` or
`₹4,900` are both fine.

**insurers.csv** — one row per insurer or scheme.

| Column | Example | Rules |
|---|---|---|
| `id` | `acme` | lowercase, digits, hyphens; unique |
| `name` | `Acme Health Insurance` | |
| `match_terms` | `acme; acme health` | words that appear in this insurer's policy documents; this is how an uploaded policy is matched to its network |

**hospitals.csv** — one row per hospital.

| Column | Example | Rules |
|---|---|---|
| `id` | `city-general-jayanagar` | lowercase, digits, hyphens; unique |
| `name`, `area`, `city`, `phone` | | required |
| `type` | `multi_specialty` | `multi_specialty`, `super_specialty`, `government` or `trust` |
| `lat`, `lng` | `12.9256`, `77.5836` | decimal degrees, inside India |
| `accreditation` | `NABH Full; NABL` | list, optional |
| `specialties` | `Cardiology; General Surgery` | list, at least one |
| `emergency_24x7` | `yes` | |
| `icu_beds`, `total_beds` | `34`, `280` | whole numbers; ICU ≤ total |
| `rating` | `4.3` | 0–5, or blank — a blank is shown as no rating, never a guessed one |
| `admission_wait_hours` | `2` | typical hours to get a bed, 0–72 |
| `schemes` | `PM-JAY; ESI referral` | list, optional |
| `source` | `insurer_network_list` | `illustrative`, `insurer_network_list`, `hospital_provided` or `government_portal` |
| `source_as_of` | `2026-10-03` | YYYY-MM-DD; required unless `illustrative` |
| `source_reference` | a URL or document name | optional |

**rooms.csv** — one row per room category a hospital offers. Every hospital needs at least one.

| Column | Example | Rules |
|---|---|---|
| `hospital_id` | | must exist in hospitals.csv |
| `category` | `Single Private` | `General Ward`, `Twin Sharing`, `Single Private`, `Deluxe`, `Suite`, `ICU`, `HDU`; once per hospital |
| `rate_per_day` | `4,900` | whole rupees |
| `beds_available` | `4` | whole number |
| `amenities` | `A/C; TV` | list, optional |

**empanelment.csv** — one row per hospital and insurer. A missing row means out of network.

| Column | Example | Rules |
|---|---|---|
| `hospital_id`, `insurer_id` | | must exist |
| `in_network`, `cashless` | `yes`, `yes` | cashless needs in network |
| `tariff_discount_pct` | `10` | 0–100, optional |

**packages.csv** — indicative all-in price for a procedure at a hospital.

| Column | Example | Rules |
|---|---|---|
| `hospital_id` | | must exist |
| `procedure` | `Appendectomy (laparoscopic)` | must match the procedure names in `CONDITION_PRESETS` (lib/data/hospitals.ts) to be used for that condition |
| `est_cost` | `68000` | whole rupees |
| `scheme_rate` | `32000` | optional; the PM-JAY package rate, used for government-scheme policies |
