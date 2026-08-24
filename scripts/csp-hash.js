#!/usr/bin/env node
/**
 * Recalcula el hash del bloque JSON-LD de index.html y lo escribe en el
 * Content-Security-Policy de vercel.json.
 *
 * Por qué existe: el CSP del sitio no lleva 'unsafe-inline' en script-src, de
 * modo que un hipotético HTML inyectado no puede ejecutar nada. El único
 * <script> en línea que queda es el JSON-LD de datos estructurados. Chromium no
 * aplica script-src a los bloques application/ld+json (no son scripts
 * ejecutables), pero se autoriza igualmente por su hash SHA-256 por si algún
 * otro motor es más estricto. Ese hash depende del contenido byte a byte, así
 * que conviene ejecutar esto tras editar el JSON-LD.
 *
 *   npm run csp-hash
 */
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var root = path.join(__dirname, "..");
var htmlPath = path.join(root, "index.html");
var vercelPath = path.join(root, "vercel.json");

var html = fs.readFileSync(htmlPath, "utf8");
var match = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/.exec(html);
if (!match) {
  console.error("No se ha encontrado el bloque JSON-LD en index.html.");
  process.exit(1);
}

var hash = "sha256-" + crypto.createHash("sha256").update(match[1], "utf8").digest("base64");

var vercel = fs.readFileSync(vercelPath, "utf8");
var actual = /'sha256-[A-Za-z0-9+/=]+'/.exec(vercel);
if (!actual) {
  console.error("No se ha encontrado ningún hash sha256 en el CSP de vercel.json.");
  process.exit(1);
}

if (actual[0] === "'" + hash + "'") {
  console.log("El hash del CSP ya está al día: " + hash);
  process.exit(0);
}

fs.writeFileSync(vercelPath, vercel.replace(actual[0], "'" + hash + "'"));
console.log("Hash actualizado en vercel.json:");
console.log("  antes:  " + actual[0]);
console.log("  ahora:  '" + hash + "'");
