// Copies pdf.js's worker into public/ so the browser can load it from
// /pdf.worker.min.mjs (used to draw a preview of the first page of attached
// PDFs). Runs after every `npm install` (see "postinstall" in package.json),
// so the worker always matches the installed pdfjs-dist version.
import { copyFileSync, existsSync } from "node:fs";

const from = "node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
const to = "public/pdf.worker.min.mjs";

if (existsSync(from)) {
  copyFileSync(from, to);
  console.log(`copied ${from} -> ${to}`);
} else {
  console.warn(`${from} not found -- PDF previews will fall back to a PDF icon`);
}
