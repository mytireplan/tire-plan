const { chromium } = require('playwright');

(async () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5175';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('Opening app...');
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Login as master with default password
    await page.fill('input[placeholder="예: 250001"]', '999999');
    await page.fill('input[placeholder="비밀번호 입력"]', '1234');
    await page.click('button[type="submit"]');

    // Wait for Super Admin header
    await page.waitForSelector('text=Super Admin', { timeout: 5000 });
    console.log('Logged in as Master successfully with initial password.');

    // Find the row with Owner ID 999999 and click 수정
    const ownerCell = page.locator('td', { hasText: '999999' }).first();
    if (!await ownerCell.count()) throw new Error('Master owner row not found');
    const row = ownerCell.locator('xpath=ancestor::tr');
    await row.locator('button', { hasText: '수정' }).click();

    // Wait for edit modal and change password
    await page.waitForSelector('input[placeholder="변경할 비밀번호 입력"]', { timeout: 3000 });
    const newPass = 'newpass123';
    await page.fill('input[placeholder="변경할 비밀번호 입력"]', newPass);
    // Click 저장하기 in the modal
    await page.click('button:has-text("저장하기")');
    console.log('Master password changed to:', newPass);

    // Logout
    await page.click('button:has-text("로그아웃")');
    await page.waitForSelector('button[type="submit"] >> text=로그인', { timeout: 3000 });
    console.log('Logged out after password change.');

    // Login with new password
    await page.fill('input[placeholder="예: 250001"]', '999999');
    await page.fill('input[placeholder="비밀번호 입력"]', newPass);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Super Admin', { timeout: 5000 });
    console.log('Logged in with new password - success.');

    // Logout again
    await page.click('button:has-text("로그아웃")');
    await page.waitForSelector('button[type="submit"] >> text=로그인', { timeout: 3000 });

    // Attempt wrong password and expect error
    await page.fill('input[placeholder="예: 250001"]', '999999');
    await page.fill('input[placeholder="비밀번호 입력"]', 'wrong-password');
    await page.click('button[type="submit"]');
    // Wait for error message
    await page.waitForSelector('text=아이디 또는 비밀번호가 잘못되었습니다.', { timeout: 3000 });
    console.log('Error message shown for wrong password as expected.');

    console.log('E2E login flow test PASSED');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E test failed:', err);
    await page.screenshot({ path: 'e2e-failure.png', fullPage: true }).catch(() => {});
    await browser.close();
    process.exit(2);
  }
})();
