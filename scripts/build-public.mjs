import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ["index.html", "app.js", "styles.css", "_headers"]) {
  await cp(join(root, file), join(dist, file));
}
await cp(join(root, "config.example.js"), join(dist, "config.js"));
await cp(join(root, "assets"), join(dist, "assets"), { recursive: true });

const forbidden = [
  "rittacoth-my.sharepoint.com",
  "IQCU0J6nUw-uT78aKb2SF",
  "drive.google.com/file/d/1wQbffeHzphCPCz1ULruFByYP9u8H7yfb",
  "MrbwCVn2XJE",
  "KvpzvD8Zko",
];

for (const file of ["index.html", "app.js", "styles.css", "config.js", "_headers"]) {
  const content = await readFile(join(dist, file), "utf8");
  const leaked = forbidden.find((value) => content.includes(value));
  if (leaked) throw new Error(`Post-exam resource URL leaked into ${file}`);
}

console.log("Public artifact created safely in dist/");
