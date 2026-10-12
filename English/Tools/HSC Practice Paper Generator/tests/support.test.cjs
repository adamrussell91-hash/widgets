const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
let server, browser, page, base, errors;
const root = path.resolve(__dirname, '..');
before(async () => {
  server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png' };
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless:true, ...(process.env.HSC_CHROME ? { executablePath:process.env.HSC_CHROME } : {}) });
});
after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });
beforeEach(async () => {
  errors = []; page = await browser.newPage({ viewport:{width:1280,height:1100} }); page.setDefaultTimeout(8000);
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/HSC-Practice-Paper-Generator.html', { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => app.dataLoaded);
  if (process.env.HSC_CAPTURE && !fs.existsSync('/private/tmp/hsc-setup.png')) await page.screenshot({path:'/private/tmp/hsc-setup.png',fullPage:true});
});
afterEach(async () => { await page?.close(); assert.deepEqual(errors, [], 'No uncaught errors'); });

test('support checklist explains locked question help and resets to the selected level', async () => {
  const card = page.locator('[data-support-section="s1"]');
  assert.equal(await card.count(), 1, 'setup has a support checklist');
  assert.equal(await card.locator('[data-support="question"]').isChecked(), true);
  assert.equal(await card.locator('[data-support="question"]').isDisabled(), true);
  await page.locator('.level-btn[data-level="2"]').click();
  await card.locator('[data-support="question"]').uncheck();
  assert.equal(await page.evaluate(() => isCubeOn()), false);
  await card.locator('[data-support-reset]').click();
  assert.equal(await page.evaluate(() => isCubeOn()), true);
  await page.locator('.level-btn[data-level="3"]').click();
  assert.equal(await card.locator('[data-support="question"]').isChecked(), false);
  assert.equal(await card.locator('[data-support="question"]').isDisabled(), true);
  const pool = await page.evaluate(() => filterBank(3).map(q => ({marks:q.marks,verb:q.verb})));
  assert.ok(pool.length > 0); assert.ok(pool.every(q => q.marks>=3 && q.marks<=7 && ['evaluate','assess','justify','compare','to what extent'].includes(q.verb)));
});

for (const [n,key,prefix] of [[2,'s2','s2'],[3,'moduleA','moduleA'],[4,'moduleB','moduleB'],[5,'moduleC','moduleC']]) {
  test(key + ' shows only its real supports and keeps level defaults consistent', async () => {
    await page.locator('.section-tab[data-section="'+n+'"]').click();
    const card = page.locator('[data-support-section="'+key+'"]');
    await card.waitFor();
    assert.equal(await card.locator('[data-support="question"]').isChecked(), true);
    assert.equal(await card.locator('[data-support="question"]').isDisabled(), true);
    await page.locator('#'+prefix+'-level-btns [data-level="2"]').click();
    await card.locator('[data-support="question"]').uncheck();
    assert.equal(await card.locator('[data-support="question"]').isChecked(), false);
    await card.locator('[data-support-reset]').click();
    assert.equal(await card.locator('[data-support="question"]').isChecked(), true);
    await page.locator('#'+prefix+'-level-btns [data-level="3"]').click();
    assert.equal(await card.locator('[data-support="question"]').isChecked(), false);
    if (key==='moduleC') assert.equal(await card.locator('[data-support="checklist"]').count(),0);
  });
}

test('hidden short-answer timer still counts down and writing reaches self-review', async () => {
  const card=page.locator('[data-support-section="s1"]');
  assert.equal(await card.count(),1);
  await card.locator('[data-support="timer"]').uncheck();
  await page.locator('#generate-btn').click();
  await page.waitForFunction(() => !!app.current.question);
  if (process.env.HSC_CAPTURE) await page.screenshot({path:'/private/tmp/hsc-reading.png',fullPage:true});
  for (let i=0;i<4;i++) { await page.locator('#rp-cube-input').fill('My answer to this prompt'); await page.locator('#rp-cube-next-btn').click(); }
  await page.locator('[data-cv="3"]').click();
  await page.locator('#reading-ready-btn').click();
  if (process.env.HSC_CAPTURE) await page.screenshot({path:'/private/tmp/hsc-writing.png',fullPage:true});
  assert.equal(await page.locator('#write-hide-btn').textContent(),'Show timer');
  const start = await page.locator('#write-timer').textContent();
  await page.waitForFunction(value => document.getElementById('write-timer').textContent !== value,start);
  await page.locator('#write-done-btn').click();
  assert.equal(await page.locator('#screen-selfmark').evaluate(e=>e.classList.contains('active')),true);
});

test('dynamically rendered question-help fields use the shared form recipe', async () => {
  await page.locator('#generate-btn').click();
  await page.locator('#rp-cube-input').waitFor();
  const radius=await page.locator('#rp-cube-input').evaluate(e=>getComputedStyle(e).borderRadius);
  const token=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--radius-sm').trim());
  const expected=await page.evaluate(value=>{const node=document.createElement('div');node.style.borderRadius=value;document.body.append(node);const result=getComputedStyle(node).borderRadius;node.remove();return result;},token);
  assert.equal(radius,expected,'Dynamic guide fields follow kit input radius');
});

test('activity selections announce the current choice to keyboard and screen-reader users', async () => {
  await page.locator('.section-tab[data-section="2"]').click();
  await page.locator('.s2-mode-btn[data-mode="timedEssay"]').click();
  assert.equal(await page.locator('.s2-mode-btn[data-mode="timedEssay"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.s2-mode-btn[data-mode="essay"]').getAttribute('aria-pressed'),'false');
});

test('Section II new session does not restore duplicate support menus', async () => {
  await page.locator('.section-tab[data-section="2"]').click();
  // Dispatch the existing report's new-session action to isolate the rerender.
  await page.evaluate(() => document.getElementById('s2-report-home').click());
  const supportMenus = await page.locator('#s2-screen-setup select[data-key]').evaluateAll(nodes=>nodes.map(n=>n.dataset.key));
  assert.deepEqual(supportMenus,['verbFamily']);
});

test('full-paper progress follows reading and writing', async () => {
  await page.locator('#exam-btn').click();
  assert.match(await page.locator('[data-practice-step][aria-current="step"]').textContent(),/Read & unpack/);
  await page.locator('#exam-start-writing-btn').click();
  assert.match(await page.locator('[data-practice-step][aria-current="step"]').textContent(),/Write/);
});

test('full-paper honors hidden writing timer without hiding or shortening reading', async () => {
  await page.locator('[data-support-section="s1"] [data-support="timer"]').uncheck();
  await page.locator('#exam-btn').click();
  assert.equal(await page.locator('#exam-timer').textContent(),'5:00');
  await page.locator('#exam-start-writing-btn').click();
  assert.equal(await page.locator('#exam-hide-btn').textContent(),'Show timer');
  assert.equal(await page.locator('#exam-timer').textContent(),'•••');
  await page.waitForFunction(() => examSeconds < CONFIG.paper.writingSeconds);
  await page.locator('#exam-hide-btn').click();
  assert.equal(await page.evaluate(()=>HscSupport.timerHidden('s1')),false);
  await page.locator('#exam-finish-btn').click();
  assert.equal(await page.locator('#screen-exam-review').isVisible(),true);
});

for(const [n,key] of [[2,'s2'],[3,'moduleA'],[4,'moduleB'],[5,'moduleC']]) {
  test(key+' carries hidden-clock selection through real writing and review', async () => {
    await page.locator('.section-tab[data-section="'+n+'"]').click();
    const card=page.locator('[data-support-section="'+key+'"]'); await card.waitFor();
    await card.locator('[data-support="timer"]').uncheck();
    await page.locator('#'+key+'-start-btn').click();
    const done=page.locator('#'+key+'-write-done');
    for(let i=0;i<10 && !await done.isVisible();i++) {
      const skip=key==='s2'?page.locator('#s2-nav-skip'):page.locator('#'+key+'-navbar [data-nav="skip"]');
      await skip.locator('..').evaluate(e=>e.open=true);
      await skip.click();
    }
    assert.equal(await done.isVisible(),true,'Reached writing');
    assert.equal(await page.locator('#'+key+'-write-hide').textContent(),'Show timer');
    assert.equal(await page.locator('#'+key+'-write-timer').textContent(),'•••');
    await page.locator('#'+key+'-write-hide').click();
    assert.notEqual(await page.locator('#'+key+'-write-timer').textContent(),'•••');
    await done.click();
    if(key==='moduleC') for(let i=0;i<3 && await done.isVisible();i++) await done.click();
    const review = key==='s2'?page.locator('#s2-screen-selfmark'):page.locator('#app-'+key+'-main');
    assert.match(await review.textContent(),/Self-mark/i);
    assert.match(await page.locator('[data-practice-step][aria-current="step"]').textContent(),/Review & reflect/);
  });
}

test('paper/section navigation, progress and canonical type survive setup and practice', async () => {
  assert.equal(await page.locator('.section-tab').count(),5);
  assert.equal(await page.locator('.paper-group').count(),2);
  assert.equal(await page.locator('[data-practice-step][aria-current="step"]').textContent(),'1Set up');
  const type = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  assert.match(type,/Inter/);
  await page.locator('#generate-btn').click();
  await page.waitForFunction(() => document.getElementById('screen-reading').classList.contains('active'));
  assert.match(await page.locator('[data-practice-step][aria-current="step"]').textContent(),/Read & unpack/);
  for(const width of [1024,736,360]){
    await page.setViewportSize({width,height:1100});
    const size = await page.evaluate(() => ({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(size.scroll<=size.width+1, 'No horizontal overflow at '+width);
  }
});
