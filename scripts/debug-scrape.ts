/**
 * Debug script to see actual page content
 */
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  
  const page = await browser.newPage();
  
  // Try EdgeProp
  console.log("Checking EdgeProp...");
  await page.goto("https://www.edgeprop.sg/new-launches", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const edgePropHtml = await page.content();
  console.log("EdgeProp title:", await page.title());
  console.log("EdgeProp content length:", edgePropHtml.length);
  
  // Look for any project-like elements
  const edgeElements = await page.$$("article, [class*='card'], [class*='project'], [class*='listing']");
  console.log("EdgeProp card-like elements:", edgeElements.length);
  
  // Get some text snippets
  const texts = await page.$$eval("h2, h3, h4", els => els.slice(0, 10).map(e => e.textContent?.trim()));
  console.log("EdgeProp headings:", texts);
  
  await page.screenshot({ path: "/tmp/edgeprop.png", fullPage: false });
  console.log("Screenshot saved to /tmp/edgeprop.png");
  
  // Try 99.co
  console.log("\nChecking 99.co...");
  await page.goto("https://www.99.co/singapore/new-launches/condos-apartments", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const ninetyNineTitle = await page.title();
  console.log("99.co title:", ninetyNineTitle);
  
  const ninetyNineElements = await page.$$("article, [class*='card'], [class*='listing']");
  console.log("99.co card-like elements:", ninetyNineElements.length);
  
  const ninetyNineTexts = await page.$$eval("h2, h3, h4", els => els.slice(0, 10).map(e => e.textContent?.trim()));
  console.log("99.co headings:", ninetyNineTexts);
  
  await page.screenshot({ path: "/tmp/99co.png", fullPage: false });
  console.log("Screenshot saved to /tmp/99co.png");
  
  await browser.close();
}

main().catch(console.error);
