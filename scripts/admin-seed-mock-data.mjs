/**
 * admin-seed-mock-data.mjs
 * ------------------------------------------------------------------------
 * Browser-automation script that logs into the admin panel (/admin/login)
 * and auto-creates one mock record in (almost) every admin menu, in an
 * order that satisfies each form's data dependencies:
 *
 *   Branch -> Category / Brand -> Product -> ERP Employee
 *   -> Coupon, Gallery image, Expense, Bank account -> Bank transaction,
 *      Overtime, Leave, Sales order, Material requisition, Delivery
 *   -> Employee (user account, /admin/employees - not linked in sidebar)
 *
 * Skipped on purpose (see report at the end of the run):
 *   - Reviews: the admin UI has no "add review" form at all (customers only).
 *   - Payroll: there is no plain "add record" button; records are only
 *     produced via the "คำนวณเงินเดือน" (calculate) flow, which needs
 *     employees/branches to already have real hours/leave data behind them.
 *
 * PREREQUISITES
 *   1. Backend API running (dev default: https://localhost:7148)
 *   2. Frontend dev server running: npm start  (http://localhost:4200)
 *   3. A real admin/employee login for this environment
 *
 * USAGE (PowerShell)
 *   $env:ADMIN_EMAIL   = "admin@example.com"
 *   $env:ADMIN_PASSWORD = "your-password"
 *   node scripts/admin-seed-mock-data.mjs
 *
 * USAGE (bash)
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=your-password \
 *     node scripts/admin-seed-mock-data.mjs
 *
 * OPTIONAL ENV VARS
 *   BASE_URL   default: http://localhost:4200
 *   HEADLESS   default: true   (set to "false" to watch the browser)
 *
 * This writes REAL data into whatever database the backend is pointed at.
 * Do not run it against a staging/production API.
 * ------------------------------------------------------------------------
 */

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const HEADLESS = process.env.HEADLESS !== 'false';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    '[FATAL] Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running this script.'
  );
  process.exit(1);
}

// Unique-ish suffix so re-running the script never collides with data from
// a previous run (SKUs, coupon codes, branch codes, emails, etc.).
const STAMP = Date.now().toString().slice(-6);
const today = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

// A minimal valid 1x1 PNG, used for the gallery image upload (required field).
const PNG_1PX_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const FIXTURE_IMAGE_PATH = path.join(os.tmpdir(), `admin-seed-${STAMP}.png`);
fs.writeFileSync(FIXTURE_IMAGE_PATH, Buffer.from(PNG_1PX_BASE64, 'base64'));

const summary = [];

async function step(name, fn) {
  try {
    const result = await fn();
    summary.push({ name, status: 'OK', detail: result ?? '' });
    console.log(`✅ ${name}${result ? ` — ${result}` : ''}`);
    return result;
  } catch (err) {
    summary.push({ name, status: 'SKIPPED/FAILED', detail: err.message });
    console.log(`❌ ${name} — ${err.message}`);
    return null;
  }
}

/** Select an <option> whose visible text exactly matches `label`. */
async function selectByLabel(page, selector, label) {
  await page.locator(selector).selectOption({ label });
}

/** Select an <option> whose visible text merely *contains* `text` (useful
 *  for composite labels like "EMP001 - สมชาย ใจดี" where we only know the
 *  code we generated, not the exact server-rendered full name). */
async function selectOptionContaining(page, selector, text) {
  const opt = page.locator(`${selector} option`, { hasText: text }).first();
  const value = await opt.getAttribute('value');
  if (value === null) throw new Error(`no <option> containing "${text}" in ${selector}`);
  await page.locator(selector).selectOption(value);
}

/** Select the first non-placeholder option (index 1) — used when we don't
 *  control the option list ourselves (e.g. expense categories). */
async function selectFirstRealOption(page, selector) {
  const options = page.locator(`${selector} option`);
  if ((await options.count()) < 2) throw new Error(`no selectable options in ${selector}`);
  const value = await options.nth(1).getAttribute('value');
  await page.locator(selector).selectOption(value);
}

/** Click `submitLocator`, then confirm the create/edit actually succeeded by
 *  waiting for `modalTitleText` (the modal's own heading) to disappear.
 *  These forms only close their modal in the API call's success callback and
 *  stay open (showing a toast) on error - clicking submit never throws by
 *  itself even when the backend rejects the request with a 400, so without
 *  this check a failed create/edit silently reports as a false "OK". */
async function submitAndConfirmClosed(page, submitLocator, modalTitleText) {
  await submitLocator.click();
  // getByRole('heading', ...) rather than getByText(...): the page's own
  // "add new" trigger button (e.g. Sales Order's "สร้างรายการใหม่") can share
  // the exact same text as the modal's <h2> title and stays in the DOM behind
  // the overlay, so a plain text match is ambiguous (strict-mode violation).
  // The modal title always renders as a heading in every form this is used on.
  await page.getByRole('heading', { name: modalTitleText, exact: true }).waitFor({ state: 'hidden', timeout: 6000 });
}

/** Click the "แก้ไข" (edit) action inside a <tr> containing `rowText`.
 *  Tables in this app use one of three patterns for the edit button:
 *    1. plain text "แก้ไข"                          (Brand, Category, Product, Coupon)
 *    2. icon-only button with title="แก้ไข"          (Branch, ERP Employee, Delivery, ...)
 *    3. icon-only button with NO accessible name     (Expense, Bank Account, ...)
 *  In every template read for this script, the edit button is always the
 *  FIRST action button in the row (delete comes second), so that's the
 *  final fallback. */
async function clickEditInRow(page, rowText) {
  const row = page.locator('tr', { hasText: rowText }).first();
  await row.scrollIntoViewIfNeeded();
  const byRole = row.getByRole('button', { name: 'แก้ไข', exact: true });
  if ((await byRole.count()) > 0) {
    await byRole.first().click();
    return;
  }
  const byTitle = row.locator('button[title="แก้ไข"]');
  if ((await byTitle.count()) > 0) {
    await byTitle.first().click();
    return;
  }
  await row.locator('button').first().click();
}

/** Same idea as clickEditInRow but for grid/card-based lists (e.g. Gallery,
 *  which renders `.gallery-item` divs instead of table rows). */
async function clickEditInCard(page, cardSelector, rowText) {
  const card = page.locator(cardSelector, { hasText: rowText }).first();
  await card.scrollIntoViewIfNeeded();
  const byTitle = card.locator('button[title="แก้ไข"]');
  if ((await byTitle.count()) > 0) {
    await byTitle.first().click();
    return;
  }
  await card.locator('button').first().click();
}

/** Generic modal-based edit round-trip: open edit for the row identified by
 *  `rowText`, confirm the target field pre-fills with `expectedBefore` (if
 *  given), change it to `newValue`, save, then reopen the same row and
 *  confirm the new value actually persisted server-side (not just in the
 *  in-memory form). Returns nothing; throws on any mismatch. */
async function verifyModalEdit(page, {
  listUrl,
  rowText,
  fieldSelector,
  isSelect = false,
  expectedBefore,
  newValue,
  submitName,
  scopeSubmitToForm = true,
  usesCardLayout = false,
  cardSelector,
  searchPlaceholder,
}) {
  const openEdit = async () => {
    await page.goto(listUrl);
    await page.waitForTimeout(500);
    // After many script runs the list can span multiple pages (default page
    // size 10), pushing the row this run just created past page 1 - if the
    // list has a search box, filter down to just this row first so pagination
    // never hides it.
    if (searchPlaceholder) {
      await page.getByPlaceholder(searchPlaceholder).fill(rowText);
      await page.waitForTimeout(500);
    }
    if (usesCardLayout) await clickEditInCard(page, cardSelector, rowText);
    else await clickEditInRow(page, rowText);
    await page.waitForTimeout(600);
  };

  await openEdit();
  const field = page.locator(fieldSelector);
  const before = isSelect ? await field.evaluate((el) => el.value) : await field.inputValue();
  if (expectedBefore !== undefined && before !== expectedBefore) {
    throw new Error(`edit form did not pre-fill correctly: expected "${expectedBefore}", got "${before}"`);
  }
  if (isSelect) await field.selectOption(newValue);
  else await field.fill(newValue);
  const submitBtn = scopeSubmitToForm
    ? page.locator('form').getByRole('button', { name: submitName, exact: true })
    : page.getByRole('button', { name: submitName, exact: true });
  await submitBtn.click();
  await page.waitForTimeout(1200);

  // Reopen and confirm the change actually persisted (round-trips through the backend).
  await openEdit();
  const field2 = page.locator(fieldSelector);
  const after = isSelect ? await field2.evaluate((el) => el.value) : await field2.inputValue();
  if (after !== newValue) {
    throw new Error(`edit did not persist: expected "${newValue}", got "${after}" after reopening`);
  }
  return `pre-fill OK ("${before}"), edit persisted ("${after}")`;
}

async function main() {
  const browser = await chromium.launch({ headless: HEADLESS });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  // ---------------------------------------------------------------- LOGIN
  await step('Login', async () => {
    await page.goto(`${BASE_URL}/admin/login`);
    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await page.waitForURL('**/admin/dashboard**', { timeout: 15000 });
    return 'signed in';
  });

  // -------------------------------------------------------------- BRANCH
  const branchName = `สาขาทดสอบ ${STAMP}`;
  await step('Branch (erp/branches)', async () => {
    await page.goto(`${BASE_URL}/admin/erp/branches`);
    await page.getByRole('button', { name: 'เพิ่มสาขาใหม่' }).click();
    await page.getByPlaceholder('เช่น ST01, JK01').fill(`BR${STAMP}`);
    await page.getByPlaceholder('เช่น ร้านแสงทอง, ร้านใจกล้า').fill(branchName);
    await page.getByPlaceholder('ที่อยู่ของสาขา').fill('99 ถ.ทดสอบ กรุงเทพฯ 10110');
    await page.getByPlaceholder('0XX-XXX-XXXX').fill('02-123-4567');
    await page.getByPlaceholder('email@example.com').fill(`branch${STAMP}@example.com`);
    await page.locator('#isActive').check(); // explicit, even though it defaults checked
    await page.getByRole('button', { name: 'เพิ่มสาขา', exact: true }).click();
    await page.waitForTimeout(800);
    return branchName;
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/erp/branches`,
    rowText: branchName,
    // Branch's edit modal has no <form> wrapper and its fields have no
    // name attribute (only [(ngModel)]) - placeholder is the only stable hook.
    fieldSelector: 'textarea[placeholder="ที่อยู่ของสาขา"]',
    expectedBefore: '99 ถ.ทดสอบ กรุงเทพฯ 10110',
    newValue: '100 ถ.ทดสอบ (แก้ไขแล้ว) กรุงเทพฯ 10110',
    submitName: 'บันทึก',
    searchPlaceholder: 'ค้นหาสาขา (ชื่อ, รหัส, ที่อยู่)...',
    scopeSubmitToForm: false,
  }));

  // ----------------------------------------------------------- CATEGORY
  const categoryName = `หมวดหมู่ทดสอบ ${STAMP}`;
  await step('Category', async () => {
    await page.goto(`${BASE_URL}/admin/categories`);
    await page.getByRole('button', { name: 'เพิ่มหมวดหมู่ใหม่' }).click();
    await page.locator('input[name="name"]').fill(categoryName);
    await page.locator('input[name="slug"]').fill(`cat-${STAMP}`);
    await page.locator('textarea[name="description"]').fill('หมวดหมู่ทดสอบ สร้างโดยสคริปต์อัตโนมัติ');
    await page.locator('input[name="displayOrder"]').fill('1');
    await page.locator('#isActive').check(); // explicit, even though it defaults checked
    await page.getByRole('button', { name: 'เพิ่มหมวดหมู่', exact: true }).click();
    await page.waitForTimeout(800);
    return categoryName;
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/categories`,
    rowText: categoryName,
    fieldSelector: 'textarea[name="description"]',
    expectedBefore: 'หมวดหมู่ทดสอบ สร้างโดยสคริปต์อัตโนมัติ',
    newValue: 'หมวดหมู่ทดสอบ (แก้ไขแล้ว)',
    submitName: 'บันทึกการแก้ไข',
  }));

  // -------------------------------------------------------------- BRAND
  const brandName = `แบรนด์ทดสอบ ${STAMP}`;
  await step('Brand', async () => {
    await page.goto(`${BASE_URL}/admin/brands`);
    await page.getByRole('button', { name: 'เพิ่มแบรนด์ใหม่' }).click();
    await page.locator('input[name="name"]').fill(brandName);
    await page.locator('input[name="slug"]').fill(`brand-${STAMP}`);
    await page
      .locator('textarea[name="description"]')
      .fill('แบรนด์สำหรับทดสอบระบบ (สร้างโดยสคริปต์อัตโนมัติ)');
    await page.getByPlaceholder('https://example.com/logo.png').fill(`https://placehold.co/200x200?text=${STAMP}`);
    await page.getByPlaceholder('https://www.example.com').fill(`https://example.com/brand-${STAMP}`);
    await page.locator('input[name="isActive"]').check(); // explicit, even though it defaults checked
    await page.getByRole('button', { name: 'เพิ่มแบรนด์', exact: true }).click();
    await page.waitForTimeout(800);
    return brandName;
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/brands`,
    rowText: brandName,
    fieldSelector: 'textarea[name="description"]',
    expectedBefore: 'แบรนด์สำหรับทดสอบระบบ (สร้างโดยสคริปต์อัตโนมัติ)',
    newValue: 'แบรนด์สำหรับทดสอบระบบ (แก้ไขแล้ว)',
    submitName: 'บันทึกการแก้ไข',
    searchPlaceholder: 'ค้นหาแบรนด์ (ชื่อ, Slug)...',
  }));

  // ------------------------------------------------------------ PRODUCT
  const productSku = `SKU-${STAMP}`;
  await step('Product', async () => {
    await page.goto(`${BASE_URL}/admin/products/create`);
    await page.locator('[formcontrolname="name"]').fill(`สินค้าทดสอบ ${STAMP}`);
    await page.locator('[formcontrolname="sku"]').fill(productSku);
    await selectByLabel(page, '[formcontrolname="categoryId"]', categoryName);
    await selectByLabel(page, '[formcontrolname="brandId"]', brandName);
    await page.locator('[formcontrolname="basePrice"]').fill('199');
    await page.locator('[formcontrolname="compareAtPrice"]').fill('259');
    await page
      .locator('[formcontrolname="shortDescription"]')
      .fill('สินค้าตัวอย่างที่สร้างโดยสคริปต์ทดสอบอัตโนมัติ');
    await page
      .locator('[formcontrolname="fullDescription"]')
      .fill('คำอธิบายแบบเต็มของสินค้าทดสอบ สร้างโดยสคริปต์อัตโนมัติเพื่อทดสอบระบบ');
    // Checkboxes default unchecked except isActive - check every one explicitly.
    await page.locator('[formcontrolname="isFeatured"]').check();
    await page.locator('[formcontrolname="isBestseller"]').check();
    await page.locator('[formcontrolname="isNewArrival"]').check();
    await page.locator('[formcontrolname="isActive"]').check();
    const submit = page.getByRole('button', { name: 'เพิ่มสินค้า', exact: true });
    await submit.waitFor({ state: 'visible' });
    await submit.click();
    await page.waitForURL('**/admin/products', { timeout: 15000 });
    return productSku;
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/products`,
    rowText: productSku,
    fieldSelector: '[formcontrolname="shortDescription"]',
    expectedBefore: 'สินค้าตัวอย่างที่สร้างโดยสคริปต์ทดสอบอัตโนมัติ',
    newValue: 'สินค้าตัวอย่าง (แก้ไขแล้ว)',
    submitName: 'บันทึกการแก้ไข',
    searchPlaceholder: 'ค้นหาสินค้า (ชื่อ, SKU)...',
  }));

  // -------------------------------------------------------- ERP EMPLOYEE
  const erpEmployeeCode = `E${STAMP}`;
  await step('ERP Employee (erp/employees)', async () => {
    await page.goto(`${BASE_URL}/admin/erp/employees`);
    // .first(): the trigger button and the modal's submit button share the exact
    // same accessible name ("เพิ่มพนักงาน"); .first() keeps this deterministic
    // even though only the trigger exists in the DOM before the click.
    await page.getByRole('button', { name: 'เพิ่มพนักงาน', exact: true }).first().click();
    await page.locator('input[name="employeeCode"]').fill(erpEmployeeCode);
    await selectByLabel(page, 'select[name="branchId"]', branchName);
    await page.locator('input[name="firstNameTh"]').fill('สมชาย');
    await page.locator('input[name="lastNameTh"]').fill(`ทดสอบ${STAMP}`);
    await page.locator('input[name="email"]').fill(`erpemp${STAMP}@example.com`);
    await page.locator('input[name="phone"]').fill('080-111-2222');
    await page.locator('input[name="position"]').fill('พนักงานคลังสินค้า');
    // employmentType defaults to "monthly" -> salary field is shown
    await page.locator('input[name="salary"]').fill('15000');
    await page.locator('input[name="hireDate"]').fill(today());
    await page.locator('input[name="bankName"]').fill('ธนาคารทดสอบ');
    await page.locator('input[name="bankAccountNumber"]').fill(`${STAMP}98765`);
    await page.locator('textarea[name="notes"]').fill('พนักงานทดสอบ สร้างโดยสคริปต์อัตโนมัติ');
    await page.locator('input[name="hasSocialSecurity"]').check(); // explicit, even though it defaults checked
    // Scoped to <form>: the header trigger button (same exact text) is still
    // in the DOM behind the modal, so an unscoped lookup would be ambiguous.
    await page.locator('form').getByRole('button', { name: 'เพิ่มพนักงาน', exact: true }).click();
    await page.waitForTimeout(1000);
    return erpEmployeeCode;
  });

  await step('  ↳ edit round-trip (salary field)', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/erp/employees`,
    rowText: erpEmployeeCode,
    fieldSelector: 'input[name="salary"]',
    expectedBefore: '15000',
    newValue: '18000',
    submitName: 'บันทึก',
    searchPlaceholder: 'ค้นหาด้วย ชื่อ, รหัสพนักงาน, อีเมล, ตำแหน่ง...',
  }));

  await step('  ↳ regression check: employmentType/nationality dropdown pre-fill', async () => {
    // This is the exact bug reported earlier: openEditModal() used to load
    // employmentType/nationality/status verbatim, and the <select> options
    // are lowercase-only ("monthly"/"thai"), so any casing mismatch left the
    // dropdown showing nothing selected. Confirm the fix holds.
    await page.goto(`${BASE_URL}/admin/erp/employees`);
    await clickEditInRow(page, erpEmployeeCode);
    await page.waitForTimeout(600);
    const employmentType = await page.locator('select[name="employmentType"]').evaluate((el) => el.value);
    const nationality = await page.locator('select[name="nationality"]').evaluate((el) => el.value);
    if (employmentType !== 'monthly') throw new Error(`employmentType select shows "${employmentType}", expected "monthly"`);
    if (nationality !== 'thai') throw new Error(`nationality select shows "${nationality}", expected "thai"`);
    return `employmentType="${employmentType}", nationality="${nationality}" both pre-selected correctly`;
  });

  // --------------------------------------------------------------- COUPON
  await step('Coupon', async () => {
    await page.goto(`${BASE_URL}/admin/coupons/create`);
    await page.locator('[formcontrolname="code"]').fill(`SAVE${STAMP}`);
    await page.locator('[formcontrolname="value"]').fill('10');
    await page.locator('[formcontrolname="minPurchaseAmount"]').fill('200');
    await page.locator('[formcontrolname="maxDiscountAmount"]').fill('100');
    await page.locator('[formcontrolname="usageLimitTotal"]').fill('100');
    await page.locator('[formcontrolname="usageLimitPerUser"]').fill('1');
    await page.locator('[formcontrolname="validFrom"]').fill(today());
    await page.locator('[formcontrolname="validUntil"]').fill(today(30));
    await page.locator('[formcontrolname="isActive"]').check(); // explicit, even though it defaults checked
    const submit = page.getByRole('button', { name: 'เพิ่มคูปอง', exact: true });
    await submit.waitFor({ state: 'visible' });
    await submit.click();
    await page.waitForURL('**/admin/coupons', { timeout: 15000 });
    return `SAVE${STAMP}`;
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/coupons`,
    rowText: `SAVE${STAMP}`,
    fieldSelector: '[formcontrolname="usageLimitPerUser"]',
    expectedBefore: '1',
    newValue: '3',
    submitName: 'บันทึกการแก้ไข',
    searchPlaceholder: 'ค้นหาคูปอง (โค้ด)...',
  }));

  // -------------------------------------------------------------- GALLERY
  await step('Gallery image', async () => {
    await page.goto(`${BASE_URL}/admin/gallery`);
    await page.getByRole('button', { name: 'เพิ่มรูปภาพ' }).click();
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles(FIXTURE_IMAGE_PATH);
    await page.locator('#title').fill(`รูปทดสอบ ${STAMP}`);
    await page.locator('#description').fill('รูปภาพทดสอบ สร้างโดยสคริปต์อัตโนมัติ');
    await page.locator('#category').fill('Interior');
    await page.locator('#altText').fill(`รูปทดสอบ ${STAMP}`);
    await page.locator('#displayOrder').fill('1');
    // Checkboxes: isFeatured defaults unchecked, isActive defaults checked — check both
    // explicitly. The image preview loading in just above this row keeps shifting layout
    // right as the click lands, so Playwright's own .check()/.click() (even with force:true)
    // intermittently reports "did not change its state" - go around actionability entirely
    // by flipping the DOM checkbox directly and firing the 'change' event Angular listens for.
    for (const name of ['isFeatured', 'isActive']) {
      await page.locator(`input[formcontrolname="${name}"]`).evaluate((el) => {
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    await submitAndConfirmClosed(page, page.getByRole('button', { name: 'สร้างรูปภาพ' }), 'เพิ่มรูปภาพใหม่');
    return `รูปทดสอบ ${STAMP}`;
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/gallery`,
    rowText: `รูปทดสอบ ${STAMP}`,
    usesCardLayout: true,
    cardSelector: '.gallery-item',
    fieldSelector: '#displayOrder',
    expectedBefore: '1',
    newValue: '2',
    submitName: 'บันทึกการแก้ไข',
    // NOT searchPlaceholder: 'ค้นหา...' matches 2 inputs (this page's own
    // search box AND the site header's global search, which shares the exact
    // same generic placeholder text) - not worth disambiguating for a page
    // that hasn't actually shown pagination-related flakiness.
    scopeSubmitToForm: false, // save button lives in .modal-footer, outside the <form>
  }));

  // -------------------------------------------------------------- EXPENSE
  await step('Expense (erp/expenses)', async () => {
    await page.goto(`${BASE_URL}/admin/erp/expenses`);
    await page.getByRole('button', { name: 'รายจ่าย', exact: true }).click(); // ensure "expenses" tab active
    await page.getByRole('button', { name: 'เพิ่มรายจ่าย' }).click();
    await selectByLabel(page, 'select[name="branchId"]', branchName);
    await selectFirstRealOption(page, 'select[name="categoryId"]');
    await page.locator('input[name="amount"]').fill('500');
    await page.locator('input[name="expenseDate"]').fill(today());
    await page.locator('input[name="reference"]').fill(`REF-${STAMP}`);
    await page
      .locator('textarea[name="description"]')
      .fill('ค่าใช้จ่ายทดสอบจากสคริปต์อัตโนมัติ');
    await page.getByRole('button', { name: 'เพิ่ม', exact: true }).click();
    await page.waitForTimeout(1000);
    return 'expense created';
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/erp/expenses`,
    rowText: `REF-${STAMP}`,
    fieldSelector: 'textarea[name="description"]',
    expectedBefore: 'ค่าใช้จ่ายทดสอบจากสคริปต์อัตโนมัติ',
    newValue: 'ค่าใช้จ่ายทดสอบ (แก้ไขแล้ว)',
    submitName: 'บันทึก',
    searchPlaceholder: 'ค้นหาด้วย รายละเอียด, เลขที่อ้างอิง...',
  }));

  // ---------------------------------------------------------- BANK ACCOUNT
  const bankAccountNumber = `${STAMP}00123`;
  await step('Bank account (erp/banking)', async () => {
    await page.goto(`${BASE_URL}/admin/erp/banking?tab=accounts`);
    await page.getByRole('button', { name: 'บัญชีธนาคาร', exact: true }).click(); // ensure "accounts" tab
    await page.getByRole('button', { name: 'เพิ่มบัญชี' }).click();
    await selectByLabel(page, 'select[name="branchId"]', branchName);
    await page.locator('input[name="bankName"]').fill('ธนาคารทดสอบ');
    await page.locator('input[name="accountNumber"]').fill(bankAccountNumber);
    await page.locator('input[name="accountName"]').fill(`บัญชีทดสอบ ${STAMP}`);
    await page.locator('input[name="initialBalance"]').fill('10000');
    await page.getByRole('button', { name: 'เพิ่ม', exact: true }).click();
    await page.waitForTimeout(1000);
    return bankAccountNumber;
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/erp/banking?tab=accounts`,
    rowText: bankAccountNumber,
    fieldSelector: 'input[name="accountName"]',
    expectedBefore: `บัญชีทดสอบ ${STAMP}`,
    newValue: `บัญชีทดสอบ ${STAMP} (แก้ไขแล้ว)`,
    submitName: 'บันทึก',
    // After many script runs, accounts spill past page 1 (default page size
    // 10) - this is exactly what made this specific check flaky before.
    searchPlaceholder: 'ค้นหาด้วย ธนาคาร, เลขบัญชี, ชื่อบัญชี...',
  }));

  // ------------------------------------------------------ BANK TRANSACTION
  await step('Bank transaction (erp/banking)', async () => {
    await page.goto(`${BASE_URL}/admin/erp/banking?tab=transactions`);
    await page.getByRole('button', { name: 'ธุรกรรมธนาคาร', exact: true }).click();
    await page.getByRole('button', { name: 'เพิ่มธุรกรรม' }).click();
    await selectOptionContaining(page, 'select[name="bankAccountId"]', bankAccountNumber);
    await page.locator('input[name="transactionDate"]').fill(today());
    await page.locator('input[name="amount"]').fill('1000');
    await page
      .locator('textarea[name="description"]')
      .fill('ธุรกรรมทดสอบจากสคริปต์อัตโนมัติ');
    await page.getByRole('button', { name: 'เพิ่ม', exact: true }).click();
    await page.waitForTimeout(1000);
    return 'transaction created';
  });

  // ------------------------------------------------------------- OVERTIME
  await step('Overtime record (erp/overtime)', async () => {
    await page.goto(`${BASE_URL}/admin/erp/overtime`);
    await page.getByRole('button', { name: 'รายการ OT ทั้งหมด' }).click(); // ensure "records" tab
    await page.getByRole('button', { name: '+ เพิ่มรายการ OT' }).click();
    await selectOptionContaining(page, 'select[name="employeeId"]', erpEmployeeCode);
    await page.locator('input[name="overtimeDate"]').fill(today());
    await page.locator('input[name="startTime"]').fill('18:00');
    await page.locator('input[name="endTime"]').fill('20:00');
    await page.locator('input[name="hours"]').fill('2');
    await page.locator('textarea[name="notes"]').fill('โอทีทดสอบจากสคริปต์อัตโนมัติ');
    const submit = page.getByRole('button', { name: 'บันทึก', exact: true });
    await submit.waitFor({ state: 'visible' });
    await submitAndConfirmClosed(page, submit, 'เพิ่มรายการ OT');
    return 'overtime created';
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/erp/overtime`,
    rowText: erpEmployeeCode,
    fieldSelector: 'textarea[name="notes"]',
    expectedBefore: 'โอทีทดสอบจากสคริปต์อัตโนมัติ',
    newValue: 'โอทีทดสอบ (แก้ไขแล้ว)',
    submitName: 'บันทึก',
  }));

  // ---------------------------------------------------------------- LEAVE
  await step('Leave record (erp/leave)', async () => {
    await page.goto(`${BASE_URL}/admin/erp/leave`);
    await page.getByRole('button', { name: 'รายการลาทั้งหมด' }).click(); // ensure "records" tab
    await page.getByRole('button', { name: '+ เพิ่มรายการลา' }).click();
    await selectOptionContaining(page, 'select[name="employeeId"]', erpEmployeeCode);
    await page.locator('input[name="startDate"]').fill(today());
    await page.locator('input[name="endDate"]').fill(today(1));
    await page.locator('input[name="isPaid"]').check(); // annual leave already defaults to paid, but be explicit
    await page.locator('textarea[name="reason"]').fill('ลาทดสอบจากสคริปต์อัตโนมัติ');
    const submit = page.getByRole('button', { name: 'บันทึก', exact: true });
    await submit.waitFor({ state: 'visible' });
    await submitAndConfirmClosed(page, submit, 'เพิ่มรายการลา');
    return 'leave record created';
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/erp/leave`,
    rowText: erpEmployeeCode,
    fieldSelector: 'textarea[name="reason"]',
    expectedBefore: 'ลาทดสอบจากสคริปต์อัตโนมัติ',
    newValue: 'ลาทดสอบ (แก้ไขแล้ว)',
    submitName: 'บันทึก',
  }));

  // --------------------------------------------------------- SALES ORDER
  await step('Sales order (erp/sales)', async () => {
    await page.goto(`${BASE_URL}/admin/erp/sales`);
    await page.getByRole('button', { name: 'สร้างรายการใหม่' }).click();
    await selectByLabel(page, 'select[name="branchId"]', branchName);
    await page.locator('input[name="orderDate"]').fill(today());
    await page.locator('input[name="customerName"]').fill(`ลูกค้าทดสอบ ${STAMP}`);
    await page.locator('input[name="customerPhone"]').fill('086-555-4444');
    await page.locator('textarea[name="customerAddress"]').fill('789 ถ.ทดสอบ กรุงเทพฯ 10110');
    // The backend rejects orders with zero items ("ต้องมีรายการสินค้าอย่างน้อย
    // 1 รายการ") even though the UI doesn't block submission without one - add
    // one real line item so the create actually succeeds.
    //
    // The item row's product/qty/price/discount fields use `[name]="'itemX' +
    // $index"` (a property binding) together with ngModel - NgModel's own
    // `@Input('name')` captures that binding for its internal form-control
    // registration and never reflects it back onto the actual DOM `name`
    // attribute, so `select[name="itemProduct0"]` never matches anything
    // (confirmed via `.getAttribute('name')` returning null on that exact
    // element even though its options are populated correctly). This doesn't
    // affect real users - two-way binding still works fine by mouse/keyboard -
    // it only breaks name-attribute-based automation, so work around it
    // structurally by scoping into the item row container instead.
    await page.getByRole('button', { name: 'เพิ่มสินค้า' }).click();
    const itemRow = page.locator('div.bg-gray-50.rounded-lg.p-4.border.border-gray-200').first();
    await itemRow.locator('select').waitFor({ state: 'visible' });
    const productOption = itemRow.locator('select option', { hasText: productSku }).first();
    const productValue = await productOption.getAttribute('value');
    if (productValue === null) throw new Error(`no product option containing "${productSku}" in sales order item row`);
    await itemRow.locator('select').selectOption(productValue);
    await itemRow.locator('input[type="number"]').nth(0).fill('2'); // quantity
    await page.locator('input[name="discountAmount"]').fill('0');
    await page.locator('input[name="depositAmount"]').fill('0');
    await page.locator('input[name="deliveryAppointmentDate"]').fill(today(3));
    await page.locator('textarea[name="notes"]').fill('รายการทดสอบ สร้างโดยสคริปต์อัตโนมัติ');
    // vatEnabled defaults checked, revealing vatPercentage — check explicitly and fill it.
    await page.locator('input[name="vatEnabled"]').check();
    await page.locator('input[name="vatPercentage"]').fill('7');
    const submit = page.getByRole('button', { name: 'สร้าง', exact: true });
    await submit.waitFor({ state: 'visible' });
    await submitAndConfirmClosed(page, submit, 'สร้างรายการใหม่');
    return 'sales order created';
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/erp/sales`,
    rowText: `ลูกค้าทดสอบ ${STAMP}`,
    fieldSelector: 'textarea[name="notes"]',
    expectedBefore: 'รายการทดสอบ สร้างโดยสคริปต์อัตโนมัติ',
    newValue: 'รายการทดสอบ (แก้ไขแล้ว)',
    submitName: 'บันทึก',
    searchPlaceholder: 'ค้นหาเลขที่, ลูกค้า, เบอร์โทร...',
  }));

  // ------------------------------------------------- MATERIAL REQUISITION
  await step('Material requisition (erp/material-requisitions)', async () => {
    await page.goto(`${BASE_URL}/admin/erp/material-requisitions`);
    await page.getByRole('button', { name: 'สร้างใบเบิก' }).click();
    await selectByLabel(page, 'select[name="branchId"]', branchName);
    // This <select> renders only fullNameTh (no employeeCode), so search by
    // the STAMP embedded in lastNameTh instead of the employee code.
    await selectOptionContaining(page, 'select[name="requestedBy"]', STAMP);
    await page.locator('input[name="requisitionDate"]').fill(today());
    await page.locator('input[name="purpose"]').fill(`เบิกสินค้าไปขายสาขา (ทดสอบ ${STAMP})`);
    await selectByLabel(page, 'select[name="status"]', 'รอดำเนินการ');
    await page.locator('textarea[name="notes"]').fill('ใบเบิกทดสอบ สร้างโดยสคริปต์อัตโนมัติ');
    // Backend rejects zero-item requisitions ("ต้องมีรายการเบิกอย่างน้อย 1
    // รายการ") - add one. Scoped into the item row container rather than by
    // [name="itemProductN"]/[name="itemQtyN"]: those are property bindings
    // combined with ngModel, and ngModel's own @Input('name') swallows that
    // binding for its internal form-control registration without reflecting
    // it back onto the real DOM name attribute (same issue as Sales Order's
    // item rows) - a name-attribute selector never matches.
    await page.getByRole('button', { name: 'เพิ่มสินค้า' }).click();
    const itemRow = page.locator('div.bg-gray-50.rounded-lg.p-4.border.border-gray-200').first();
    await itemRow.locator('select').waitFor({ state: 'visible' });
    const productOption = itemRow.locator('select option', { hasText: productSku }).first();
    const productValue = await productOption.getAttribute('value');
    if (productValue === null) throw new Error(`no product option containing "${productSku}" in material requisition item row`);
    await itemRow.locator('select').selectOption(productValue);
    await itemRow.locator('input[type="number"]').fill('3'); // quantity
    const submit = page.getByRole('button', { name: 'สร้าง', exact: true });
    await submit.waitFor({ state: 'visible' });
    await submitAndConfirmClosed(page, submit, 'สร้างใบเบิกใหม่');
    return 'material requisition created';
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/erp/material-requisitions`,
    rowText: `ทดสอบ ${STAMP}`,
    fieldSelector: 'textarea[name="notes"]',
    expectedBefore: 'ใบเบิกทดสอบ สร้างโดยสคริปต์อัตโนมัติ',
    newValue: 'ใบเบิกทดสอบ (แก้ไขแล้ว)',
    submitName: 'บันทึก',
    searchPlaceholder: 'ค้นหาเลขที่, วัตถุประสงค์...',
  }));

  // ------------------------------------------------------------- DELIVERY
  await step('Delivery (erp/deliveries)', async () => {
    await page.goto(`${BASE_URL}/admin/erp/deliveries`);
    // .first(): trigger and modal submit button share the exact same text.
    await page.getByRole('button', { name: 'สร้างการจัดส่ง' }).first().click();
    await selectByLabel(page, 'select[name="branchId"]', branchName);
    await page.locator('input[name="scheduledDate"]').fill(today(2));
    await page.locator('input[name="vehicleNumber"]').fill('กข-1234');
    await page.locator('textarea[name="deliveryAddress"]').fill('456 ถ.ทดสอบ เขตทดสอบ กรุงเทพฯ');
    await page.locator('input[name="contactPerson"]').fill(`ผู้รับทดสอบ ${STAMP}`);
    await page.locator('input[name="contactPhone"]').fill('087-777-8888');
    await page.locator('textarea[name="notes"]').fill('การจัดส่งทดสอบ สร้างโดยสคริปต์อัตโนมัติ');
    try {
      // This <select> renders only fullNameTh (no employeeCode) too.
      await selectOptionContaining(page, 'select[name="driverId"]', STAMP);
    } catch {
      /* driver list may not include this employee — field is optional, skip silently */
    }
    // Scoped to <form>: the header trigger button (same exact text) is still
    // in the DOM behind the modal, so an unscoped lookup would be ambiguous.
    const submit = page.locator('form').getByRole('button', { name: 'สร้างการจัดส่ง' });
    await submitAndConfirmClosed(page, submit, 'สร้างการจัดส่งใหม่');
    return 'delivery created';
  });

  await step('  ↳ edit round-trip', () => verifyModalEdit(page, {
    listUrl: `${BASE_URL}/admin/erp/deliveries`,
    rowText: `ผู้รับทดสอบ ${STAMP}`,
    fieldSelector: 'textarea[name="notes"]',
    expectedBefore: 'การจัดส่งทดสอบ สร้างโดยสคริปต์อัตโนมัติ',
    newValue: 'การจัดส่งทดสอบ (แก้ไขแล้ว)',
    submitName: 'บันทึก',
    searchPlaceholder: 'ค้นหาเลขที่, ผู้รับ, ที่อยู่...',
  }));

  // ----------------------------------------------- EMPLOYEE (user account)
  await step('Employee user account (/admin/employees, direct link only)', async () => {
    await page.goto(`${BASE_URL}/admin/employees`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'เพิ่มพนักงานใหม่' }).click({ force: true });
    await page.locator('input[name="email"]').fill(`employee${STAMP}@example.com`);
    await page.locator('input[name="password"]').fill(`Passw0rd${STAMP}`);
    await page.locator('input[name="firstName"]').fill('ทดสอบ');
    await page.locator('input[name="lastName"]').fill(`ระบบ${STAMP}`);
    await page.locator('input[name="phone"]').fill('089-999-9999');
    await page.locator('input[name="employeeCode"]').fill(`EMP${STAMP}`);
    await page.locator('input[name="position"]').fill('พนักงานทั่วไป');
    await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await page.waitForTimeout(1000);
    return `employee${STAMP}@example.com`;
  });

  console.log('\n⚠️  Skipped by design:');
  console.log('   - Reviews: no "add" form exists in the admin UI (customer-submitted only).');
  console.log('   - Payroll: no plain "add" button; records only come from the "คำนวณเงินเดือน" calculate flow.');
  console.log('   - Bank transactions: no edit action exists (only delete) — create-only, not edit-tested.');
  console.log('   - Employee user account (/admin/employees): editEmployee() navigates to');
  console.log('     "/admin/employees/:id", but admin.routes.ts only declares the bare "employees"');
  console.log('     path (no ":id" child route) — clicking "แก้ไข" there currently has nowhere to');
  console.log('     land. Separate bug from what was asked here; not fixed by this pass.');

  console.log('\n===== SUMMARY =====');
  for (const s of summary) {
    console.log(`${s.status === 'OK' ? '✅' : '❌'} ${s.name}${s.detail ? ` — ${s.detail}` : ''}`);
  }

  await browser.close();
  fs.unlinkSync(FIXTURE_IMAGE_PATH);

  const failed = summary.filter((s) => s.status !== 'OK').length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
