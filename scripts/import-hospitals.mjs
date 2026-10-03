#!/usr/bin/env node
/**
 * Hospital data import.
 *
 * The hospital dataset lives in spreadsheets under data/hospitals/ — one row
 * per hospital, room category, insurer empanelment and procedure package —
 * so the people who actually hold the data (a hospital's insurance desk, an
 * insurer's network team, a pilot customer) can maintain it without touching
 * code. This script validates every row and writes the JSON the app reads.
 *
 *   npm run data:import    validate, then write lib/data/dataset.json
 *   npm run data:check     validate, and fail if dataset.json is out of date (CI)
 *
 * Every hospital carries a source. "illustrative" is invented demo data and is
 * labelled as such on screen; anything else must say when it was last checked.
 * See data/hospitals/README.md for the column-by-column format.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readTable } from "./lib/csv.mjs";

const DIR = process.env.DATA_DIR ?? "data/hospitals";
const OUT = process.env.DATA_OUT ?? "lib/data/dataset.json";
const CHECK = process.argv.includes("--check");

export const ROOM_CATEGORIES = ["General Ward", "Twin Sharing", "Single Private", "Deluxe", "Suite", "ICU", "HDU"];
export const HOSPITAL_TYPES = ["multi_specialty", "super_specialty", "government", "trust"];
export const SOURCES = ["illustrative", "insurer_network_list", "hospital_provided", "government_portal"];

/** Validates the spreadsheets. Returns { dataset, errors, warnings }. */
export function importDataset(dir = DIR) {
  const errors = [];
  const warnings = [];

  const load = (file, required) => {
    const path = join(dir, file);
    if (!existsSync(path)) {
      errors.push(`${file}: missing`);
      return [];
    }
    let table;
    try {
      table = readTable(readFileSync(path, "utf8"));
    } catch (e) {
      errors.push(`${file}: ${e.message}`);
      return [];
    }
    const missing = required.filter((c) => !table.columns.includes(c));
    if (missing.length) errors.push(`${file}: missing column(s) ${missing.join(", ")}`);
    for (const r of table.records) {
      if (r.__extra) errors.push(`${file} line ${r.__line}: ${r.__extra} more cell(s) than there are columns — is there an unquoted comma?`);
    }
    return table.records;
  };

  // ---- field readers: each reports a precise, fixable problem ----
  const at = (file, r, col) => `${file} line ${r.__line}, ${col}`;
  const text = (file, r, col, { required = true } = {}) => {
    const v = r[col] ?? "";
    if (required && !v) errors.push(`${at(file, r, col)}: required`);
    return v;
  };
  const int = (file, r, col, { min = 0, max = Infinity, required = true } = {}) => {
    const v = r[col] ?? "";
    if (!v) {
      if (required) errors.push(`${at(file, r, col)}: required`);
      return null;
    }
    const clean = v.replace(/[,₹\s]/g, "");
    if (!/^-?\d+$/.test(clean)) {
      errors.push(`${at(file, r, col)}: "${v}" is not a whole number`);
      return null;
    }
    const n = Number(clean);
    if (n < min || n > max) errors.push(`${at(file, r, col)}: ${n} is outside ${min}–${max === Infinity ? "∞" : max}`);
    return n;
  };
  const num = (file, r, col, { min, max }) => {
    const v = r[col] ?? "";
    const n = Number(v);
    if (!v || Number.isNaN(n)) {
      errors.push(`${at(file, r, col)}: "${v}" is not a number`);
      return null;
    }
    if (n < min || n > max) errors.push(`${at(file, r, col)}: ${n} is outside ${min}–${max}`);
    return n;
  };
  const oneOf = (file, r, col, allowed) => {
    const v = r[col] ?? "";
    if (!allowed.includes(v)) errors.push(`${at(file, r, col)}: "${v}" must be one of ${allowed.join(", ")}`);
    return v;
  };
  const yesNo = (file, r, col) => {
    const v = (r[col] ?? "").toLowerCase();
    if (!["yes", "no"].includes(v)) errors.push(`${at(file, r, col)}: "${r[col] ?? ""}" must be yes or no`);
    return v === "yes";
  };
  const list = (v) => (v ? v.split(";").map((s) => s.trim()).filter(Boolean) : []);

  // ---- insurers ----
  const insurers = [];
  for (const r of load("insurers.csv", ["id", "name", "match_terms"])) {
    const id = text("insurers.csv", r, "id");
    if (id && !/^[a-z0-9-]+$/.test(id)) errors.push(`${at("insurers.csv", r, "id")}: "${id}" — use lowercase letters, digits and hyphens`);
    if (insurers.some((i) => i.id === id)) errors.push(`${at("insurers.csv", r, "id")}: duplicate id "${id}"`);
    const matchTerms = list(r.match_terms).map((t) => t.toLowerCase());
    if (!matchTerms.length) errors.push(`${at("insurers.csv", r, "match_terms")}: give at least one word that appears in this insurer's policy documents`);
    insurers.push({ id, name: text("insurers.csv", r, "name"), matchTerms });
  }
  const insurerIds = new Set(insurers.map((i) => i.id));

  // ---- hospitals ----
  const hospitals = new Map();
  const F = "hospitals.csv";
  for (const r of load(F, ["id", "name", "type", "area", "city", "lat", "lng", "phone", "specialties", "emergency_24x7", "icu_beds", "total_beds", "admission_wait_hours", "source"])) {
    const id = text(F, r, "id");
    if (id && !/^[a-z0-9-]+$/.test(id)) errors.push(`${at(F, r, "id")}: "${id}" — use lowercase letters, digits and hyphens`);
    if (hospitals.has(id)) errors.push(`${at(F, r, "id")}: duplicate id "${id}"`);

    const source = oneOf(F, r, "source", SOURCES);
    const asOf = r.source_as_of ?? "";
    if (source && source !== "illustrative") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || Number.isNaN(Date.parse(asOf))) {
        errors.push(`${at(F, r, "source_as_of")}: real data needs the date it was last checked, as YYYY-MM-DD`);
      } else if ((Date.now() - Date.parse(asOf)) / 86_400_000 > 180) {
        warnings.push(`${F} line ${r.__line}: ${r.name} was last checked on ${asOf}, over six months ago — empanelment and tariffs change`);
      }
    }

    const specialties = list(r.specialties);
    if (!specialties.length) errors.push(`${at(F, r, "specialties")}: list at least one, separated by semicolons`);

    const icuBeds = int(F, r, "icu_beds");
    const totalBeds = int(F, r, "total_beds", { min: 1 });
    if (icuBeds != null && totalBeds != null && icuBeds > totalBeds) errors.push(`${at(F, r, "icu_beds")}: ${icuBeds} ICU beds is more than ${totalBeds} total beds`);

    hospitals.set(id, {
      id,
      name: text(F, r, "name"),
      type: oneOf(F, r, "type", HOSPITAL_TYPES),
      area: text(F, r, "area"),
      city: text(F, r, "city"),
      // India's mainland bounding box, roughly — catches swapped lat/lng.
      coords: { lat: num(F, r, "lat", { min: 6, max: 37.5 }), lng: num(F, r, "lng", { min: 68, max: 97.5 }) },
      phone: text(F, r, "phone"),
      accreditation: list(r.accreditation),
      specialties,
      emergency24x7: yesNo(F, r, "emergency_24x7"),
      icuBeds,
      totalBeds,
      rating: r.rating ? num(F, r, "rating", { min: 0, max: 5 }) : null,
      admissionWaitHours: int(F, r, "admission_wait_hours", { max: 72 }),
      schemes: list(r.schemes),
      source: {
        kind: source,
        ...(asOf ? { asOf } : {}),
        ...(r.source_reference ? { reference: r.source_reference } : {}),
      },
      empanelment: {},
      rooms: [],
      packages: [],
    });
  }

  const known = (file, r) => {
    const id = r.hospital_id ?? "";
    if (!hospitals.has(id)) {
      errors.push(`${at(file, r, "hospital_id")}: no hospital with id "${id}" in hospitals.csv`);
      return null;
    }
    return hospitals.get(id);
  };

  // ---- rooms ----
  for (const r of load("rooms.csv", ["hospital_id", "category", "rate_per_day", "beds_available"])) {
    const h = known("rooms.csv", r);
    const category = oneOf("rooms.csv", r, "category", ROOM_CATEGORIES);
    const room = {
      category,
      ratePerDay: int("rooms.csv", r, "rate_per_day", { max: 500_000 }),
      amenities: list(r.amenities),
      bedsAvailable: int("rooms.csv", r, "beds_available", { max: 5000 }),
    };
    if (h) {
      if (h.rooms.some((x) => x.category === category)) errors.push(`${at("rooms.csv", r, "category")}: ${h.name} already has a ${category} row`);
      h.rooms.push(room);
    }
  }

  // ---- empanelment ----
  for (const r of load("empanelment.csv", ["hospital_id", "insurer_id", "in_network", "cashless"])) {
    const h = known("empanelment.csv", r);
    const ins = r.insurer_id ?? "";
    if (!insurerIds.has(ins)) errors.push(`${at("empanelment.csv", r, "insurer_id")}: "${ins}" is not in insurers.csv`);
    const inNetwork = yesNo("empanelment.csv", r, "in_network");
    const cashless = yesNo("empanelment.csv", r, "cashless");
    if (cashless && !inNetwork) errors.push(`${at("empanelment.csv", r, "cashless")}: cashless needs in_network = yes`);
    const discount = r.tariff_discount_pct ? int("empanelment.csv", r, "tariff_discount_pct", { max: 100 }) : 0;
    if (h) {
      if (h.empanelment[ins]) errors.push(`${at("empanelment.csv", r, "insurer_id")}: ${h.name} already has a row for ${ins}`);
      h.empanelment[ins] = { inNetwork, cashless, tariffDiscountPct: discount ?? 0 };
    }
  }

  // ---- packages ----
  for (const r of load("packages.csv", ["hospital_id", "procedure", "est_cost"])) {
    const h = known("packages.csv", r);
    const pkg = {
      procedure: text("packages.csv", r, "procedure"),
      estCost: int("packages.csv", r, "est_cost", { min: 1, max: 50_000_000 }),
      ...(r.scheme_rate ? { schemeRate: int("packages.csv", r, "scheme_rate", { min: 1, max: 50_000_000 }) } : {}),
    };
    if (h) h.packages.push(pkg);
  }

  // ---- whole-dataset checks ----
  for (const h of hospitals.values()) {
    if (!h.rooms.length) errors.push(`${F}: ${h.name} (${h.id}) has no rows in rooms.csv`);
    for (const ins of insurerIds) {
      if (!h.empanelment[ins]) warnings.push(`empanelment.csv: ${h.name} has no row for ${ins} — it will be treated as out of network`);
    }
  }

  const dataset = {
    insurers,
    hospitals: [...hospitals.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
  return { dataset, errors, warnings };
}

/* ---------------- CLI ---------------- */

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { dataset, errors, warnings } = importDataset();

  for (const w of warnings) console.warn(`  warning  ${w}`);
  if (errors.length) {
    console.error(`\n${errors.length} problem(s) in ${DIR}:\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error("\nNothing was written. Fix the rows above and run again.");
    process.exit(1);
  }

  const json = JSON.stringify(dataset, null, 2) + "\n";
  const summary = `${dataset.hospitals.length} hospitals, ${dataset.hospitals.reduce((n, h) => n + h.rooms.length, 0)} rooms, ${dataset.insurers.length} insurers`;

  if (CHECK) {
    const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
    if (current !== json) {
      console.error(`${OUT} is out of date with ${DIR}. Run \`npm run data:import\` and commit the result.`);
      process.exit(1);
    }
    console.log(`Data OK — ${summary}, and ${OUT} is up to date.`);
  } else {
    writeFileSync(OUT, json);
    console.log(`Wrote ${OUT} — ${summary}.`);
  }
}
