import puppeteer from "puppeteer-core";
const executablePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });
await page.type('input[name="phone"]', "01000000000");
await page.type('input[name="password"]', "admin123");
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click('button[type="submit"]')]);
await new Promise((r) => setTimeout(r, 1000));

const el = await page.evaluate(() => {
  const node = document.elementFromPoint(80, 25);
  function describe(n, depth) {
    if (!n || depth > 6) return null;
    return {
      tag: n.tagName,
      cls: n.className,
      id: n.id,
      dataSlot: n.getAttribute ? n.getAttribute("data-slot") : null,
      rect: n.getBoundingClientRect ? n.getBoundingClientRect() : null,
      parent: n.parentElement ? describe(n.parentElement, depth + 1) : null,
    };
  }
  return describe(node, 0);
});
console.log(JSON.stringify(el, null, 2));
await browser.close();
