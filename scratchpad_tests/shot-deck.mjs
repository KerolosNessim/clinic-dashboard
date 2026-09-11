import puppeteer from "puppeteer-core";
const executablePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const file = "file:///C:/Users/Dell/AppData/Local/Temp/claude/d--medicare-dentaflow/cf495531-5b2e-47b3-beae-3a66c0199344/scratchpad/dentaflow-deck.html";
const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 810 });
await page.goto(file, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: "scratchpad_tests/deck-01.png" });
// jump to the dental chart slide (06)
for (let i = 0; i < 5; i++) { await page.keyboard.press("ArrowLeft"); await new Promise((r) => setTimeout(r, 120)); }
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: "scratchpad_tests/deck-06.png" });
// roles table slide (04) — check table + callout
for (let i = 0; i < 2; i++) { await page.keyboard.press("ArrowRight"); await new Promise((r) => setTimeout(r, 120)); }
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: "scratchpad_tests/deck-04.png" });
await browser.close();
