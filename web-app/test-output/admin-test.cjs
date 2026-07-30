const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT = path.resolve(__dirname);
const BASE_URL = 'http://localhost:8890';

const pages = [
  { name: 'admin-workbench', route: '/#/super', label: '工作台' },
  { name: 'admin-schools', route: '/#/super/schools', label: '学校管理' },
  { name: 'admin-admins', route: '/#/super/admins', label: '管理员管理' },
  { name: 'admin-audit', route: '/#/super/audit', label: '审计日志' },
  { name: 'admin-config', route: '/#/super/config', label: '平台配置' },
  { name: 'admin-ai-providers', route: '/#/super/ai-providers', label: 'AI 服务商' },
];

const results = [];

const CHROMIUM_PATH = 'C:/Users/admin/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  try {
    // Step 1: Navigate to home
    console.log('[Admin] Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if we're on login page or already authenticated
    const currentUrl = page.url();
    console.log('[Admin] Current URL after load:', currentUrl);

    // Look for login form
    const usernameInput = page.locator('input[type="text"], input[placeholder*="用户"], input[placeholder*="账号"], input[name="username"], input[name="account"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.locator('button:has-text("登录"), button:has-text("登 录"), button[type="submit"]').first();

    if (await usernameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[Admin] Login form detected, filling credentials...');
      await usernameInput.fill('admin');
      await passwordInput.fill('admin');
      await page.waitForTimeout(500);
      await loginBtn.click();
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle');
      console.log('[Admin] After login URL:', page.url());
    } else {
      console.log('[Admin] No login form visible, URL:', page.url());
    }

    // Verify redirect to /#/super
    await page.waitForTimeout(2000);
    let postLoginUrl = page.url();
    console.log('[Admin] Post-login URL:', postLoginUrl);

    // Test each page
    for (const pg of pages) {
      try {
        console.log(`[Admin] Navigating to ${pg.label} (${pg.route})`);
        await page.goto(BASE_URL + pg.route, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(2000);

        // Collect metrics
        const title = await page.title().catch(() => 'N/A');
        const url = page.url();

        // Count buttons
        const buttonCount = await page.locator('button, [role="button"], a.btn, .btn').count().catch(() => 0);

        // Check for blank areas - check if main content exists
        const hasContent = await page.locator('.main, main, #app > div, .content, .page-content, [class*="page"]').first().isVisible().catch(() => false);

        // Check for table data
        const tableRows = await page.locator('table tbody tr, .table tbody tr, [class*="table"] tbody tr').count().catch(() => 0);

        const screenshotPath = path.join(OUTPUT, `${pg.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const issues = [];
        if (!hasContent) issues.push('内容区可能为空');
        if (postLoginUrl && !postLoginUrl.includes('/#/super') && pg.route === '/#/super') {
          issues.push('登录后未跳转到超管页面');
        }

        results.push({
          page: pg.label,
          url: url,
          status: 'OK',
          buttonCount,
          tableRows,
          issues: issues.length ? issues.join('; ') : '无',
          screenshot: screenshotPath,
        });

        console.log(`[Admin] ${pg.label}: buttons=${buttonCount}, tableRows=${tableRows}, issues=${issues.length}`);
      } catch (err) {
        results.push({
          page: pg.label,
          url: pg.route,
          status: 'FAIL',
          buttonCount: 0,
          tableRows: 0,
          issues: err.message,
          screenshot: '',
        });
        console.error(`[Admin] Error on ${pg.label}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Admin] Fatal error:', err.message);
  } finally {
    await browser.close();
    console.log('[Admin] Browser closed');

    // Write results JSON
    fs.writeFileSync(path.join(OUTPUT, 'admin-results.json'), JSON.stringify(results, null, 2));
    console.log('[Admin] Results saved to admin-results.json');

    // Print summary table
    console.log('\n=== ADMIN TEST RESULTS ===');
    console.table(results.map(r => ({
      '页面名': r.page,
      'URL': r.url,
      '状态': r.status,
      '按钮数': r.buttonCount,
      '表格行': r.tableRows,
      '异常': r.issues,
    })));
  }
}

run().catch(console.error);
