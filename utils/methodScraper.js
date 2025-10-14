// utils/methodScraper.js
const puppeteer = require("puppeteer");

async function fetchMethodGuide(url) {
  console.log(`[METHOD] Scraping guide from ${url}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    await page.waitForSelector("h1", { timeout: 10000 });
    const title = await page.$eval("h1", el => el.innerText.trim());

    const sections = [];

    // Grab all tab buttons (Overview, Phase 1, Phase 2, etc.)
    const tabButtons = await page.$$(".guide-tabs button, .tabs button, .tabs li");

    if (tabButtons.length > 0) {
      console.log(`[METHOD] Found ${tabButtons.length} tabs. Scraping each one...`);

      for (let i = 0; i < tabButtons.length; i++) {
        try {
          const btn = tabButtons[i];

          // Click tab
          await btn.click();
          await page.waitForTimeout(1000);

          // Tab title
          const tabTitle = await page.evaluate(el => el.innerText.trim(), btn);

          // Extract tab content
          const rawText = await page.evaluate(() => {
            const active = document.querySelector(
              ".tab-content.active, .guide__section.active, .tab-pane.active"
            );
            return active ? active.innerText.trim() : null;
          });

          if (rawText) {
            // Split into Discord-safe chunks (<= 1024 chars each)
            const chunks = rawText.match(/[\s\S]{1,1000}/g) || [rawText];
            chunks.forEach((chunk, idx) => {
              sections.push({
                title: idx === 0 ? tabTitle : `${tabTitle} (cont.)`,
                text: chunk,
              });
            });
          }
        } catch (err) {
          console.warn(`[METHOD] Could not scrape tab ${i + 1}:`, err.message);
        }
      }
    }

    // Fallback if no tabs exist (just grab paragraphs)
    if (sections.length === 0) {
      console.log("[METHOD] No tabs found. Using fallback...");
      const fallback = await page.$$eval("p", els =>
        els.map(p => p.innerText.trim()).filter(Boolean).slice(0, 5)
      );
      if (fallback.length) {
        sections.push({ title: "Overview", text: fallback.join("\n\n") });
      }
    }

    return { title, sections };
  } catch (err) {
    console.error("[METHOD] Scraper error:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

module.exports = { fetchMethodGuide };






