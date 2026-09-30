/**
 * DRISHTI JSX Localization Scanner
 * Scans components in frontend/src/components for localization coverage.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COMPONENTS_DIR = path.resolve(__dirname, "../src/components");

function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath, fileList);
    } else if (file.endsWith(".jsx")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const usesT = content.includes("t(") || content.includes("useLanguage");
  return {
    file: path.relative(COMPONENTS_DIR, filePath),
    usesT
  };
}

function runScan() {
  console.log("=== DRISHTI Component Localization Scan ===");
  const jsxFiles = scanDirectory(COMPONENTS_DIR);
  console.log(`Found ${jsxFiles.length} JSX components in ${COMPONENTS_DIR}`);

  let integratedCount = 0;
  for (const file of jsxFiles) {
    const analysis = analyzeFile(file);
    if (analysis.usesT) {
      integratedCount++;
      console.log(`✔ [LOCALIZED] ${analysis.file}`);
    }
  }

  console.log(`\nLocalization Summary: ${integratedCount}/${jsxFiles.length} components actively using useLanguage / t()`);
}

runScan();
