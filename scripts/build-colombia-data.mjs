// Genera src/data/colombia.json desde DIVIPOLA (DANE) en datos.gov.co.
// Uso: node scripts/build-colombia-data.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_SOURCE = 'https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=5000';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/colombia.json');
const CONNECTORS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e']);

export function titleCase(input) {
  const lower = input.trim().toLocaleLowerCase('es');
  let wordIndex = 0;
  // Palabras = secuencias de letras; el resto (espacios, puntuación) se conserva.
  return lower.replace(/\p{L}+/gu, (word) => {
    const first = wordIndex++ === 0;
    if (!first && CONNECTORS.has(word)) return word;
    return word.charAt(0).toLocaleUpperCase('es') + word.slice(1);
  });
}

async function main() {
  const res = await fetch(URL_SOURCE);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();

  const depts = new Map();
  const seen = new Set();
  for (const r of rows) {
    const d = String(r.cod_dpto ?? '').trim();
    const m = String(r.cod_mpio ?? '').trim();
    if (d.length !== 2 || m.length !== 5 || !m.startsWith(d)) {
      throw new Error(`Fila inválida: ${JSON.stringify(r)}`);
    }
    if (seen.has(m)) throw new Error(`Municipio duplicado: ${m}`);
    seen.add(m);
    if (!depts.has(d)) depts.set(d, { code: d, name: titleCase(r.dpto), municipalities: [] });
    depts.get(d).municipalities.push({ code: m, name: titleCase(r.nom_mpio) });
  }

  const departments = [...depts.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  for (const d of departments) d.municipalities.sort((a, b) => a.name.localeCompare(b.name, 'es'));

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ departments }, null, 2) + '\n', 'utf8');
  console.log(`OK: ${departments.length} departamentos, ${seen.size} municipios -> ${OUT}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
