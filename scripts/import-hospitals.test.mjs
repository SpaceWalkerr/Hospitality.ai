// npm run test:data — the data pipeline's own tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCsv, readTable, writeTable } from "./lib/csv.mjs";
import { importDataset } from "./import-hospitals.mjs";

/* ---------------- CSV ---------------- */

test("csv: quoted commas, doubled quotes, newlines, CRLF and a BOM", () => {
  const rows = parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n"line1\nline2",z\r\n');
  assert.deepEqual(rows.map((r) => r.cells), [["a", "b"], ["x, y", 'say "hi"'], ["line1\nline2", "z"]]);
  assert.equal(rows[2].line, 3, "keeps the line a record starts on");
});

test("csv: blank rows are ignored and an unclosed quote is an error", () => {
  assert.equal(parseCsv("a\n\n1\n,\n").length, 2);
  assert.throws(() => parseCsv('a\n"open'), /Unclosed quote/);
});

test("csv: writing then reading round-trips awkward values", () => {
  const recs = [{ a: 'has "quotes", commas', b: "two\nlines" }];
  const back = readTable(writeTable(["a", "b"], recs)).records;
  assert.equal(back[0].a, recs[0].a);
  assert.equal(back[0].b, recs[0].b);
});

/* ---------------- import ---------------- */

const VALID = {
  "insurers.csv": "id,name,match_terms\nacme,Acme Health,acme; acme health\n",
  "hospitals.csv":
    "id,name,type,area,city,lat,lng,phone,accreditation,specialties,emergency_24x7,icu_beds,total_beds,rating,admission_wait_hours,schemes,source,source_as_of,source_reference\n" +
    "city-gen,City General,multi_specialty,Jayanagar,Bengaluru,12.92,77.59,080 1234,NABH,Cardiology; General Surgery,yes,10,200,4.2,2,,hospital_provided," +
    new Date().toISOString().slice(0, 10) + ",\n",
  "rooms.csv": 'hospital_id,category,rate_per_day,beds_available,amenities\ncity-gen,Single Private,"4,900",3,A/C; TV\n',
  "empanelment.csv": "hospital_id,insurer_id,in_network,cashless,tariff_discount_pct\ncity-gen,acme,yes,yes,10\n",
  "packages.csv": "hospital_id,procedure,est_cost,scheme_rate\ncity-gen,Appendectomy (laparoscopic),68000,\n",
};

function run(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "hosp-"));
  try {
    for (const [f, body] of Object.entries({ ...VALID, ...overrides })) {
      if (body !== null) writeFileSync(join(dir, f), body);
    }
    return importDataset(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const replace = (file, from, to) => ({ [file]: VALID[file].replace(from, to) });

test("a valid sheet imports, and builds the shape the app reads", () => {
  const { dataset, errors, warnings } = run();
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  const h = dataset.hospitals[0];
  assert.equal(h.rooms[0].ratePerDay, 4900, "accepts Indian digit grouping");
  assert.deepEqual(h.specialties, ["Cardiology", "General Surgery"]);
  assert.deepEqual(h.empanelment.acme, { inNetwork: true, cashless: true, tariffDiscountPct: 10 });
  assert.equal(h.source.kind, "hospital_provided");
  assert.deepEqual(dataset.insurers[0].matchTerms, ["acme", "acme health"]);
});

const cases = [
  ["a rate that is not a number", replace("rooms.csv", '"4,900"', "four thousand"), /rooms\.csv line 2, rate_per_day: "four thousand" is not a whole number/],
  ["a room for a hospital that does not exist", replace("rooms.csv", "city-gen,", "nowhere,"), /rooms\.csv line 2, hospital_id: no hospital with id "nowhere"/],
  ["cashless without being in network", replace("empanelment.csv", "yes,yes", "no,yes"), /cashless needs in_network = yes/],
  ["latitude and longitude swapped", replace("hospitals.csv", "12.92,77.59", "77.59,12.92"), /lat: 77\.59 is outside/],
  ["real data with no check date", replace("hospitals.csv", /hospital_provided,\d{4}-\d{2}-\d{2}/, "hospital_provided,"), /needs the date it was last checked/],
  ["the same room category twice", { "rooms.csv": VALID["rooms.csv"] + "city-gen,Single Private,5000,1,\n" }, /already has a Single Private row/],
  ["an unquoted comma that shifts the columns", replace("packages.csv", "Appendectomy (laparoscopic)", "Appendectomy, laparoscopic"), /more cell\(s\) than there are columns/],
  ["an insurer that is not listed", replace("empanelment.csv", ",acme,", ",zeta,"), /"zeta" is not in insurers\.csv/],
  ["a hospital with no rooms", { "rooms.csv": "hospital_id,category,rate_per_day,beds_available,amenities\n" }, /has no rows in rooms\.csv/],
  ["an unknown room category", replace("rooms.csv", "Single Private", "Presidential"), /"Presidential" must be one of/],
  ["a missing file", { "packages.csv": null }, /packages\.csv: missing/],
  ["more ICU beds than beds", replace("hospitals.csv", ",10,200,", ",300,200,"), /300 ICU beds is more than 200 total beds/],
];

for (const [name, overrides, expected] of cases) {
  test(`rejects ${name}`, () => {
    const { errors } = run(overrides);
    assert.ok(errors.some((e) => expected.test(e)), `expected ${expected}, got:\n  ${errors.join("\n  ")}`);
  });
}

test("stale real data is a warning, not an error", () => {
  const { errors, warnings } = run(replace("hospitals.csv", /hospital_provided,\d{4}-\d{2}-\d{2}/, "hospital_provided,2020-01-01"));
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => /over six months ago/.test(w)));
});

test("the committed spreadsheets are valid", () => {
  const { errors } = importDataset("data/hospitals");
  assert.deepEqual(errors, []);
});
