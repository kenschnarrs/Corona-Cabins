// Guards the bilingual site: every Spanish UI key must exist in English
// (and vice versa), and the three known cabins must have marketing copy in
// both languages. Run with `npm test`.
import { readFileSync } from "node:fs";

const es = JSON.parse(readFileSync(new URL("../lib/i18n/es.json", import.meta.url)));
const en = JSON.parse(readFileSync(new URL("../lib/i18n/en.json", import.meta.url)));

function keys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

const esKeys = new Set(keys(es));
const enKeys = new Set(keys(en));
const missingInEn = [...esKeys].filter((k) => !enKeys.has(k));
const missingInEs = [...enKeys].filter((k) => !esKeys.has(k));

let failed = false;
if (missingInEn.length || missingInEs.length) {
  failed = true;
  console.error("i18n key mismatch:");
  for (const k of missingInEn) console.error(`  missing in en.json: ${k}`);
  for (const k of missingInEs) console.error(`  missing in es.json: ${k}`);
}

const cabins = ["Cabaña Grande", "Cabaña Mediana", "Cabaña Pequeña"];
for (const lang of ["es", "en"]) {
  const dict = lang === "es" ? es : en;
  for (const cabin of cabins) {
    const copy = dict.cabinCopy?.[cabin];
    for (const field of ["name", "tag", "desc", "details"]) {
      if (!copy?.[field]) {
        failed = true;
        console.error(`missing ${lang} cabinCopy for "${cabin}".${field}`);
      }
    }
  }
}

if (failed) process.exit(1);
console.log(`i18n check passed: ${esKeys.size} keys in each language, ${cabins.length} cabins covered.`);
