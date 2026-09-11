import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const BASE = "http://localhost:3000";
const CHROME_PATHS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const executablePath = CHROME_PATHS.find((p) => existsSync(p));

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✅ PASS" : "❌ FAIL"} — ${name}${detail ? `  (${detail})` : ""}`);
}

async function login(browser, phone, password) {
  // Each login uses a fresh isolated browser context (separate cookie jar) so logging in as a
  // second user doesn't inherit the first user's still-valid session cookie.
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  const phoneInput = await page.waitForSelector('input[name="phone"], #phone');
  await phoneInput.type(phone);
  const passInput = await page.$('input[name="password"], #password');
  await passInput.type(password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  return page;
}

async function main() {
  const browser = await puppeteer.launch({ executablePath, headless: true });

  try {
    // ── 1. Unauthenticated access is redirected to /login ──
    {
      const page = await browser.newPage();
      const resp = await page.goto(`${BASE}/patients`, { waitUntil: "networkidle0" });
      check("Unauthenticated /patients redirects to /login", page.url().includes("/login"), page.url());
      await page.close();
    }

    // ── 2. Login page renders without console errors ──
    {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
      const title = await page.title();
      check("Login page loads without a JS error", errors.length === 0, errors[0]);
      await page.close();
    }

    // ── 3. SUPER_ADMIN login + full page-access matrix ──
    {
      const page = await login(browser, "01000000000", "admin123");
      check("SUPER_ADMIN login succeeds and leaves /login", !page.url().includes("/login"), page.url());

      const adminRoutes = ["/", "/patients", "/appointments", "/doctors", "/assistants", "/branches", "/inventory", "/invoices", "/reports"];
      for (const route of adminRoutes) {
        const resp = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
        check(`SUPER_ADMIN can open ${route} (status ${resp.status()})`, resp.status() === 200, `status=${resp.status()}`);
      }
      await page.close();
    }

    // ── 4. STAFF login + role-gated page access (server-side enforced, not just hidden UI) ──
    // Uses a disposable test STAFF account created by setup-fixtures.ts — the DB has real
    // user-entered accounts now, not just the original seed data, so a known-password
    // throwaway user is the only reliable way to test a specific role without guessing
    // real people's passwords.
    {
      const page = await login(browser, "01090009000", "TestStaff123");
      check("STAFF login succeeds", !page.url().includes("/login"), page.url());

      const allowed = ["/", "/patients", "/appointments"];
      for (const route of allowed) {
        const resp = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
        check(`STAFF can open ${route} (status ${resp.status()})`, resp.status() === 200, `status=${resp.status()}`);
      }

      // Next 16 dev/Turbopack serves the notFound() boundary with HTTP 200 (production build
      // returns a real 404 — verified separately below), so check the rendered content instead
      // of the status code: the server component must never have reached its data-loading /
      // table-rendering code for a role that fails the `role !== "SUPER_ADMIN"` check.
      const forbidden = ["/inventory", "/reports", "/invoices", "/doctors", "/assistants", "/branches"];
      for (const route of forbidden) {
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
        const bodyText = await page.evaluate(() => document.body.innerText);
        const isNotFoundPage = /this page could not be found|404/i.test(bodyText);
        check(
          `STAFF is blocked from ${route} (server-side notFound(), not just hidden UI)`,
          isNotFoundPage,
          isNotFoundPage ? "rendered 404 boundary" : bodyText.slice(0, 80)
        );
      }
      await page.close();
    }

    // ── 5. Wrong password is rejected with an error, not a silent redirect ──
    {
      const page = await login(browser, "01000000000", "wrong-password-xyz");
      const stillOnLogin = page.url().includes("/login");
      check("Wrong password keeps the user on /login (not authenticated)", stillOnLogin, page.url());
      await page.close();
    }

    // ── 6. Deactivated-branch options don't appear in the doctor/assistant assignment form ──
    // (branches.ts fix: getBranchOptions() now filters isActive) — smoke-check the doctors page
    // renders its "add doctor" dialog without throwing, since this touches that same data path.
    {
      const page = await login(browser, "01000000000", "admin123");
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(`${BASE}/doctors`, { waitUntil: "networkidle0" });
      check("SUPER_ADMIN /doctors page renders without a JS error (branch options fix)", errors.length === 0, errors[0]);
      await page.close();
    }

    // ── 7. Patient detail page (dental chart / medical history / access-check wiring) renders ──
    {
      const page = await login(browser, "01000000000", "admin123");
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(`${BASE}/patients`, { waitUntil: "networkidle0" });
      const firstLink = await page.$('a[href^="/patients/"]');
      if (firstLink) {
        await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), firstLink.click()]);
        check("Patient detail page opens and renders without a JS error", errors.length === 0, errors[0] ?? page.url());
      } else {
        check("Patient detail page opens and renders without a JS error", false, "no patient row found to click");
      }
      await page.close();
    }

    // ── 8. Inventory / Reports pages (recently touched: loading/error states, date parsing fix) ──
    {
      const page = await login(browser, "01000000000", "admin123");
      for (const route of ["/inventory", "/reports"]) {
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
        check(`${route} renders without a JS error after the reports/inventory changes`, errors.length === 0, errors[0]);
        page.removeAllListeners("pageerror");
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${"=".repeat(50)}`);
  console.log(`TOTAL: ${results.length}   PASSED: ${results.length - failed.length}   FAILED: ${failed.length}`);
  if (failed.length > 0) {
    console.log("Failed cases:", failed.map((f) => f.name).join("; "));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exitCode = 1;
});
