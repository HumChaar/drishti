/**
 * DRISHTI Language Smoke Test & Regression Verification
 * Verifies:
 * 1. GET /api/language/languages returns 5 languages (en, or, bn, hi, te)
 * 2. POST /api/language/translate returns non-English text for non-en targets
 * 3. Preserves template tokens like {district} and {risk_score} intact
 */

const API_BASE_URL = (process.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

async function runSmokeTest() {
  console.log("=== DRISHTI Language Smoke & Regression Test ===");
  console.log(`Target Backend: ${API_BASE_URL}`);

  let failed = false;

  // 1. Verify Languages Registry
  try {
    const res = await fetch(`${API_BASE_URL}/api/language/languages`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const langs = await res.json();
    const codes = langs.map((l) => l.code);
    console.log(`✔ Supported Languages Registry: [${codes.join(", ")}]`);

    const expected = ["en", "or", "bn", "hi", "te"];
    for (const exp of expected) {
      if (!codes.includes(exp)) {
        console.error(`✖ Missing expected language code: ${exp}`);
        failed = true;
      }
    }
  } catch (err) {
    console.error(`✖ Failed to fetch languages registry: ${err.message}`);
    failed = true;
  }

  // 2. Verify Batch Translation and Token Preservation across all 5 languages
  const testItems = [
    { id: "term_1", text: "COMMAND CENTRE" },
    { id: "tmpl_2", text: "{district} is at {risk_band} risk with storm surge {surge_meters}m" }
  ];

  const targetLangs = ["en", "or", "bn", "hi", "te"];

  for (const lang of targetLangs) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/language/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: testItems,
          targetLanguage: lang,
          context: "Emergency Alert"
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data.translations || data.translations.length !== testItems.length) {
        throw new Error(`Translations length mismatch for ${lang}`);
      }

      const resMap = {};
      data.translations.forEach((t) => {
        resMap[t.id] = t.text;
      });

      // Verify token preservation
      const tmplResult = resMap["tmpl_2"] || "";
      if (!tmplResult.includes("{district}") || !tmplResult.includes("{risk_band}") || !tmplResult.includes("{surge_meters}")) {
        console.error(`✖ Token preservation failed for ${lang}: ${tmplResult}`);
        failed = true;
      } else {
        console.log(`✔ [${lang.toUpperCase()}] Tokens preserved: "${tmplResult}"`);
      }

      // Verify non-English output for non-en languages
      const termResult = resMap["term_1"] || "";
      if (lang !== "en") {
        if (termResult === "COMMAND CENTRE") {
          console.error(`✖ Silent English leak: [${lang}] returned raw English "${termResult}"`);
          failed = true;
        } else {
          console.log(`✔ [${lang.toUpperCase()}] Translated term: "${termResult}"`);
        }
      } else {
        console.log(`✔ [EN] Passthrough verified: "${termResult}"`);
      }
    } catch (err) {
      console.error(`✖ Translation check failed for ${lang}: ${err.message}`);
      failed = true;
    }
  }

  if (failed) {
    console.error("\n❌ Language smoke test FAILED.");
    process.exit(1);
  } else {
    console.log("\n✅ All language tests PASSED successfully.");
  }
}

runSmokeTest();
