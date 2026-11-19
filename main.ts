// Neon Coast — Vice City Cover Maker (gta6-cover-art-01).
// Entrypoint: copies app/ and screenshots/ into the output directory and
// writes /output/dossier.json with the kit's buildDossier library.
// Node 22, standard library only. Deterministic: no timestamps, no network.
import { cp, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");

async function copyTree(from, to) {
  await mkdir(to, { recursive: true });
  await cp(from, to, { recursive: true, dereference: false });
}

async function main() {
  const appDir = join(repoRoot, "app");
  const shotsDir = join(repoRoot, "screenshots");
  await mkdir(outputDir, { recursive: true });
  await copyTree(appDir, join(outputDir, "app"));
  await copyTree(shotsDir, join(outputDir, "screenshots"));
  const dossier = await buildDossier(outputDir, { text_max_bytes: 163840 });
  await writeFile(join(outputDir, "dossier.json"), dossier);
  const check = JSON.parse(Buffer.from(dossier).toString("utf8"));
  console.log(`dossier written: ${Object.keys(check).length} top-level keys`);
  console.log(`output: ${outputDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
