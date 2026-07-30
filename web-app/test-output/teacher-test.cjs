const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT = path.resolve(__dirname);
const BASE_URL = 'http://localhost:8890';

const CHROMIUM_PATH = 'C:/Users/admin/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';

const menuGroups = [
  { name: 'teacher-menu-teaching', label: '教学管理' },
  { name: 'teacher-menu-ai', label: 'AI 与备课' },
  { name: 'teacher-menu-classroom', label: '课堂工具' },
  { name: 'teacher-menu-office', label: '教师办公' },
  { name: 'teacher-menu-personal', label: '个人空间' },
];

// Verified routes from app source
const submenuRoutes = [
  { name: '班级成员', url: '/#/teacher/classes' },
  { name: 'AI 对话', url: '/#/teacher/ai-chat' },
  { name: '考试管理', url: '/#/teacher/exams' },
];

const results = [];

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
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);

  try {
    console.log('[Teacher] Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    let url = page.url();
    console.log('[Teacher] Current URL:', url);

    if (!url.includes('/teacher')) {
      const usernameInput = page.locator('input[type="text"], input[placeholder*="用户"], input[placeholder*="账号"], input[name="username"], input[name="account"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const loginBtn = page.locator('button:has-text("登录"), button:has-text("登 录"), button[type="submit"]').first();

      if (await usernameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[Teacher] Filling teacher credentials...');
        await usernameInput.fill('teacher1');
        await passwordInput.fill('123456');
        await page.waitForTimeout(500);
        await loginBtn.click();
        await page.waitForTimeout(4000);
      }
    }

    url = page.url();
    console.log('[Teacher] Post-login URL:', url);

    results.push({
      page: '登录跳转',
      url: url,
      status: url.includes('/teacher') ? 'OK' : 'FAIL',
      buttonCount: 0,
      tableRows: 0,
      issues: url.includes('/teacher') ? '无' : '未跳转到教师页面',
      screenshot: '',
    });

    // For each menu group: click to expand and screenshot
    for (const group of menuGroups) {
      try {
        console.log(`[Teacher] Expanding menu group: ${group.label}`);

        const groupBtn = page.locator(`text="${group.label}"`).first();
        const isVisible = await groupBtn.isVisible({ timeout: 2000 }).catch(() => false);

        if (!isVisible) {
          results.push({
            page: group.label,
            url: page.url(),
            status: 'WARN',
            buttonCount: 0,
            tableRows: 0,
            issues: '菜单组未找到',
            screenshot: '',
          });
          continue;
        }

        await groupBtn.click();
        await page.waitForTimeout(1500);

        const screenshotPath = path.join(OUTPUT, `${group.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        // Count visible submenu items (icons in the panel) - the submenu items are buttons in a separate panel
        const submenuButtons = await page.locator('button[class*="submenu"], [class*="submenu"] button, .menu-item, [role="button"]').count().catch(() => 0);

        results.push({
          page: `${group.label} (展开)`,
          url: page.url(),
          status: 'OK',
          buttonCount: submenuButtons,
          tableRows: 0,
          issues: '无',
          screenshot: screenshotPath,
        });

        console.log(`[Teacher] ${group.label} expanded, total buttons: ${submenuButtons}`);
      } catch (err) {
        results.push({
          page: group.label,
          url: page.url(),
          status: 'FAIL',
          buttonCount: 0,
          tableRows: 0,
          issues: err.message,
          screenshot: '',
        });
        console.error(`[Teacher] Error expanding ${group.label}:`, err.message);
      }
    }

    // Step 3: Navigate to 3 submenu pages via direct URLs (verified from source)
    console.log('[Teacher] Navigating to 3 submenu pages...');

    let clickIdx = 0;
    for (const route of submenuRoutes) {
      try {
        console.log(`[Teacher] Navigating to ${route.name}: ${route.url}`);

        await page.goto(BASE_URL + route.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(3000);

        const finalUrl = page.url();
        const buttonCount = await page.locator('button, [role="button"], a.btn, .btn').count().catch(() => 0);
        const screenshotPath = path.join(OUTPUT, `teacher-submenu-${clickIdx + 1}-${route.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const has404 = await page.locator('text="404", text="页面不存在"').count() > 0;

        results.push({
          page: `子菜单导航 ${clickIdx + 1} - ${route.name}`,
          url: finalUrl,
          status: has404 ? '404' : 'OK',
          buttonCount,
          tableRows: 0,
          issues: has404 ? '页面不存在 (404)' : '无',
          screenshot: screenshotPath,
        });

        console.log(`[Teacher] Submenu ${clickIdx + 1} (${route.name}): URL=${finalUrl}, buttons=${buttonCount}, 404=${has404}`);
        clickIdx++;
      } catch (err) {
        console.error(`[Teacher] Error navigating to ${route.name}:`, err.message);
        results.push({
          page: `子菜单 ${clickIdx + 1} - ${route.name}`,
          url: route.url,
          status: 'FAIL',
          buttonCount: 0,
          tableRows: 0,
          issues: err.message,
          screenshot: '',
        });
      }
    }

  } catch (err) {
    console.error('[Teacher] Fatal error:', err.message);
  } finally {
    try {
      await browser.close();
      console.log('[Teacher] Browser closed');
    } catch (e) {
      console.error('[Teacher] Error closing browser:', e.message);
    }

    try {
      fs.writeFileSync(path.join(OUTPUT, 'teacher-results.json'), JSON.stringify(results, null, 2));
      console.log('[Teacher] Results saved to teacher-results.json');
    } catch (e) {
      console.error('[Teacher] Error saving results:', e.message);
    }

    console.log('\n=== TEACHER TEST RESULTS ===');
    console.table(results.map(r => ({
      '页面名': r.page,
      'URL': r.url,
      '状态': r.status,
      '按钮数': r.buttonCount,
      '异常': r.issues,
    })));
  }
}

run().catch(err => {
  console.error('Uncaught error:', err);
  try {
    fs.writeFileSync(path.join(OUTPUT, 'teacher-results.json'), JSON.stringify(results, null, 2));
  } catch (e) {}
});
