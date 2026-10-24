// Run with Electron, not node:test. Uses isolated user data and an invisible window.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert').strict;
const { THEMES } = require('../shared/themes');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pofi-smoke-'));
app.setPath('userData', profile);
const packagedRoot = process.env.POFI_SMOKE_APP_ROOT;
const entry = path.resolve(packagedRoot || path.join(__dirname, '..'), 'elect.js');
if (packagedRoot) {
  Object.defineProperty(app, 'isPackaged', { value: true });
  Object.defineProperty(process, 'resourcesPath', { value: path.dirname(packagedRoot) });
  assert.equal(JSON.parse(fs.readFileSync(path.join(packagedRoot, 'package.json'), 'utf8')).version, require('../package.json').version);
  for (const sound of ['success-fanfare-trumpets-6185.mp3','simple-notification-152054.mp3']) assert.ok(fs.statSync(path.join(process.resourcesPath,'sounds',sound)).size>0);
  console.log('Testing packaged application:', packagedRoot);
}
const NativeWindow = BrowserWindow;
// Exercise the real application entry point with its real preload and IPC handlers.
const Module = require('module');
const originalLoad = Module._load;
const electron = require('electron');
Module._load = function (request, parent, ...args) {
  if (request === 'electron' && parent.filename === entry) return {
    ...electron,
    BrowserWindow: class extends NativeWindow {
      constructor(options) { super({ ...options, show: false, webPreferences: { ...options.webPreferences, backgroundThrottling: false, offscreen: Boolean(process.env.POFI_SMOKE_SCREENSHOT) } }); }
      show() { /* Integration fixtures stay hidden when the real app reveals its window. */ }
      focus() { /* Do not take focus away from the user's application. */ }
    }
  };
  return originalLoad.call(this, request, parent, ...args);
};
let finished = false;
const playerErrors = [];
const timeout = setTimeout(() => finish(new Error('Application smoke test timed out')), 60000);
function finish(error) {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  if (error) console.error(error);
  else console.log('PASS: preload, IPC, timer, themes, glass, frameless controls, dock with automatic pin/restore, preserved player and timer, responsive layout without app scrolling');
  app.exit(error ? 1 : 0);
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', (_event, level, message) => { if (level >= 2 && message.startsWith('YouTube player:')) playerErrors.push(message); });
  contents.once('did-finish-load', async () => {
    try {
      const evaluate = code => contents.executeJavaScript(`(async () => (${code}))()`)
        .catch(error => { throw new Error(`Renderer check failed: ${code.slice(0, 100)}\n${error.message}`); });
      const clickNavigation = async selector => {
        if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}).closest('.app-nav')?.inert)`)) {
          await evaluate(`document.querySelector('.menu-toggle').click()`);
          await delay(250);
        }
        await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
      };
      const compactMenuFits = async () => {
        assert.equal(await evaluate(`document.querySelector('.app-nav').inert`), true);
        const before = await evaluate(`document.querySelector('.app-header').getBoundingClientRect().height`);
        await evaluate(`document.querySelector('.menu-toggle').click()`);
        await delay(270);
        for(let attempts=0; attempts<15; attempts++) {
          if(await evaluate(`Math.abs(document.querySelector('.app-nav').getBoundingClientRect().right-document.querySelector('.app-header').getBoundingClientRect().right)<.5`)) break;
          await delay(80);
        }
        const layout = await evaluate(`(() => {
          const header=document.querySelector('.app-header').getBoundingClientRect(), nav=document.querySelector('.app-nav').getBoundingClientRect();
          return {height:header.height,absolute:getComputedStyle(document.querySelector('.app-nav')).position==='absolute',
            anchored:Math.abs(nav.top-header.bottom-8)<1&&Math.abs(nav.right-header.right)<1,
            fits:nav.left>=0&&nav.right<=innerWidth&&nav.bottom<=innerHeight,
            noScroll:document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight};
        })()`);
        if(process.env.POFI_SMOKE_SCREENSHOT) fs.writeFileSync(process.env.POFI_SMOKE_SCREENSHOT.replace('.png', '-menu-' + (await evaluate(`innerWidth`)) + '.png'),(await contents.capturePage()).toPNG());
        if(!layout.anchored || !layout.fits) console.log('Menu bounds:',await evaluate(`({header:document.querySelector('.app-header').getBoundingClientRect().toJSON(),nav:document.querySelector('.app-nav').getBoundingClientRect().toJSON(),classes:document.querySelector('.app-header').className,style:getComputedStyle(document.querySelector('.app-nav')).transform})`));
        assert.deepEqual(layout,{height:before,absolute:true,anchored:true,fits:true,noScroll:true});
        await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
        await delay(250);
        assert.equal(await evaluate(`document.querySelector('.app-nav').inert`),true);
        assert.equal(await evaluate(`document.activeElement===document.querySelector('.menu-toggle')`),true);
        await evaluate(`document.querySelector('.menu-toggle').click()`);
        await evaluate(`document.querySelector('.timer-digits').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`);
        await delay(250);
        assert.equal(await evaluate(`document.querySelector('.app-nav').inert`),true);
      };
      const fits = async () => {
        const result = await evaluate(`(() => {
          const header=document.querySelector('.app-header').getBoundingClientRect();
          const timer=document.querySelector('.timer-digits').getBoundingClientRect();
          const controls=document.querySelector('.timer-actions').getBoundingClientRect();
          const dock=document.querySelector('.music-dock').getBoundingClientRect();
          return { noScroll:document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight,
            timerFits:timer.top>=header.bottom-1 && timer.bottom<=dock.top+1,
            controlsFit:controls.top>=header.bottom-1 && controls.bottom<=dock.top+1,
            dockFits:dock.left>=0 && dock.right<=innerWidth+1 && dock.bottom<=innerHeight+1 };
        })()`);
        assert.deepEqual(result, { noScroll: true, timerFits: true, controlsFit: true, dockFits: true });
      };
      for (let attempts = 0; attempts < 100; attempts++) {
        if (await evaluate(`Boolean(document.querySelector('#duration'))`)) break;
        await delay(100);
      }
      assert.equal(await evaluate(`typeof window.electronAPI.startPomodoroTimer`), 'function');
      assert.equal(await evaluate(`typeof window.electronAPI.searchYouTube`), 'function');
      assert.equal(await evaluate(`typeof window.electronAPI.closeWindow`), 'function');
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.desktop-header')).getPropertyValue('-webkit-app-region')`), 'drag');
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.window-controls')).getPropertyValue('-webkit-app-region')`), 'no-drag');
      assert.equal(await evaluate(`document.documentElement.dataset.glass`), 'false');
      await compactMenuFits();
      assert.equal(await evaluate(`document.querySelector('.brand-logo').complete && document.querySelector('.brand-logo').naturalWidth>0`), true);
      await fits();
      assert.equal(await evaluate(`document.querySelectorAll('iframe').length <= 1`), true);
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('#drawer-todo')).display`), 'none');
      await clickNavigation("[aria-label=\"Danh sách công việc\"]");
      assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('#drawer-todo')).display`), 'none');
      await evaluate(`(() => {
        const input = document.querySelector('.task-input');
        input.value = 'Smoke test task'; input.dispatchEvent(new Event('input', {bubbles:true}));
        document.querySelector('.add-btn').click();
      })()`);
      await delay(150);
      assert.equal(await evaluate(`JSON.parse((await window.electronAPI.initializeStorage({})).pofi_tasks)[0].title`), 'Smoke test task');
      await clickNavigation("[aria-controls=\"drawer-right-example\"]");
      await delay(300);
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('#drawer-todo')).display`), 'none');
      await evaluate(`(() => {const input=document.querySelector('#duration');input.value='1';input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await delay(100);
      assert.equal(await evaluate(`(await window.electronAPI.initializeStorage({})).duration_pomodoro`), '1');
      await evaluate(`(() => { const input=document.querySelector('#duration');input.value='-2';input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
      assert.equal(await evaluate(`document.querySelector('#duration').value`), '1');
      await evaluate(`window.electronAPI.startPomodoroTimer(1, 1)`);
      await delay(1250);
      let state = await evaluate(`window.electronAPI.getPomodoroTimerStatus()`);
      assert.equal(state.status, 'running');
      assert.equal(state.minutes, 0);
      await evaluate(`window.electronAPI.pausePomodoroTimer()`);
      const paused = await evaluate(`window.electronAPI.getPomodoroTimerStatus()`);
      await delay(1100);
      assert.deepEqual(await evaluate(`window.electronAPI.getPomodoroTimerStatus()`), paused);
      state = await evaluate(`window.electronAPI.resumePomodoroTimer()`);
      assert.equal(state.status, 'running');
      state = await evaluate(`window.electronAPI.stopPomodoroTimer()`);
      assert.equal(state.status, 'ready');
      await delay(200);
      assert.equal(await evaluate(`document.querySelector('[data-testid="timer-caption"]').textContent`), 'Một việc thôi. Thật thong thả.');
      assert.equal(fs.existsSync(path.join(profile, 'settings.json')), true);
      assert.deepEqual(playerErrors, []);
      await evaluate(`(() => {const input=document.querySelector('#duration');input.value='45';input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
      await delay(300);
      for (const { id: theme, image: artwork } of THEMES) {
        await clickNavigation("[aria-label=\"Chọn giao diện\"]");
        await delay(250);
        await evaluate(`document.querySelector('[data-theme-option="${theme}"]').click()`);
        await delay(150);
        assert.equal(await evaluate(`document.documentElement.dataset.theme`), theme);
        assert.equal(await evaluate(`(await window.electronAPI.initializeStorage({})).ui_theme`), theme);
        assert.equal(await evaluate(`document.querySelector('[data-theme-option="${theme}"]').getAttribute('aria-checked')`), 'true');
        assert.equal(await evaluate(`document.querySelectorAll('[data-theme-option]').length`), 3);
        if (await evaluate(`document.documentElement.dataset.glass === 'true'`)) await evaluate(`document.querySelector('[data-testid="liquid-glass-toggle"]').click()`);
        for (const background of ['scene','youtube','video']) {
          await evaluate(`document.querySelector('[data-background-mode="${background}"]').click()`);
          await delay(30);
          const before = await evaluate(`document.querySelector('.scene-art').style.backgroundImage`);
          await evaluate(`document.querySelector('[data-testid="liquid-glass-toggle"]').click()`);
          await delay(30);
          assert.equal(await evaluate(`document.documentElement.dataset.theme`), theme);
          assert.equal(await evaluate(`document.querySelector('.scene-art').style.backgroundImage`), before);
          assert.equal(await evaluate(`(await window.electronAPI.initializeStorage({})).background_mode`), background);
          assert.equal(await evaluate(`(await window.electronAPI.initializeStorage({})).liquid_glass`), 'true');
          assert.equal(await evaluate(`document.querySelector('[data-testid="liquid-glass-toggle"]').getAttribute('aria-checked')`), 'true');
          assert.match(await evaluate(`getComputedStyle(document.querySelector('.primary-button')).backgroundImage`), /radial-gradient/);
          await evaluate(`document.querySelector('[data-testid="liquid-glass-toggle"]').click()`);
          await delay(30);
          assert.equal(await evaluate(`document.documentElement.dataset.glass`), 'false');
          assert.equal(await evaluate(`getComputedStyle(document.querySelector('.primary-button')).backgroundImage`), 'none');
        }
        await evaluate(`document.querySelector('[data-background-mode="scene"]').click()`);
        await fits();
        await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
        await delay(300);
        if (process.env.POFI_SMOKE_SCREENSHOT) {
          await evaluate(`new Promise(resolve => { const img=new Image();img.onload=resolve;img.onerror=resolve;img.src=${JSON.stringify(artwork)}; })`);
          await delay(150);
          const image = await contents.capturePage();
          fs.writeFileSync(process.env.POFI_SMOKE_SCREENSHOT.replace('.png', '-' + theme + '.png'), image.toPNG());
        }
        await clickNavigation("[aria-label=\"Chọn giao diện\"]");
        await delay(250);
        await evaluate(`document.querySelector('[data-testid="liquid-glass-toggle"]').click()`);
        await delay(100);
        await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
        await delay(250);
        if (process.env.POFI_SMOKE_SCREENSHOT) fs.writeFileSync(process.env.POFI_SMOKE_SCREENSHOT.replace('.png', '-' + theme + '-glass.png'), (await contents.capturePage()).toPNG());
      }
      const loaded = new Promise(resolve => contents.once('did-finish-load', resolve));
      contents.reload();
      await loaded;
      for (let attempts = 0; attempts < 100; attempts++) {
        if (await evaluate(`Boolean(document.querySelector('#duration'))`)) break;
        await delay(100);
      }
      assert.equal(await evaluate(`document.documentElement.dataset.theme`), 'garden');
      assert.equal(await evaluate(`document.documentElement.dataset.glass`), 'true');
      await clickNavigation("[aria-label=\"Chọn giao diện\"]");
      await delay(250);
      assert.equal(await evaluate(`document.querySelector('#drawer-themes-title').textContent`), 'Giao diện & nền');
      assert.match(await evaluate(`getComputedStyle(document.querySelector('#drawer-themes-title')).fontFamily`), /Segoe UI/);
      if (process.env.POFI_SMOKE_SCREENSHOT) fs.writeFileSync(process.env.POFI_SMOKE_SCREENSHOT.replace('.png', '-glass-panel.png'), (await contents.capturePage()).toPNG());
      await evaluate(`(() => {const selected=document.querySelector('[data-theme-option="garden"]');selected.focus();selected.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));})()`);
      await delay(150);
      assert.equal(await evaluate(`document.documentElement.dataset.theme`), 'warm');
      assert.equal(await evaluate(`document.activeElement.dataset.themeOption`), 'warm');
      await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}))`);
      await delay(100);
      assert.equal(await evaluate(`document.activeElement.dataset.themeOption`), 'garden');
      await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}))`);
      await delay(100);
      assert.equal(await evaluate(`document.activeElement.dataset.themeOption`), 'warm');
      await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}))`);
      await delay(100);
      assert.equal(await evaluate(`document.activeElement.dataset.themeOption`), 'garden');
      await evaluate(`document.querySelector('[data-background-mode="youtube"]').click()`);
      await delay(150);
      assert.equal(await evaluate(`(await window.electronAPI.initializeStorage({})).background_mode`), 'youtube');
      assert.equal(await evaluate(`document.querySelector('.scene-art').classList.contains('youtube-background')`), true);
      if (process.env.POFI_SMOKE_SCREENSHOT) {
        fs.writeFileSync(process.env.POFI_SMOKE_SCREENSHOT.replace('.png', '-themes.png'), (await contents.capturePage()).toPNG());
      }
      await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
      await delay(250);
      await clickNavigation("[aria-controls=\"drawer-right-example\"]");
      await delay(250);
      if (process.env.POFI_SMOKE_SCREENSHOT) {
        fs.writeFileSync(process.env.POFI_SMOKE_SCREENSHOT.replace('.png', '-settings.png'), (await contents.capturePage()).toPNG());
      }
      await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
      await delay(250);
      const owner = NativeWindow.fromWebContents(contents);
      assert.equal(owner.getTitle(), 'Pofi · Góc tập trung');
      await evaluate(`document.querySelector('[aria-label="Phóng to cửa sổ"]').click()`);
      await delay(350);
      assert.equal(owner.isMaximized(), true);
      assert.equal(await evaluate(`Boolean(document.querySelector('[aria-label="Khôi phục cửa sổ"]'))`), true);
      await evaluate(`document.querySelector('[aria-label="Khôi phục cửa sổ"]').click()`);
      await delay(350);
      assert.equal(owner.isMaximized(), false);
      // OS maximize/restore events must also update the app button's icon.
      owner.maximize();
      await delay(250);
      assert.equal(await evaluate(`Boolean(document.querySelector('[aria-label="Khôi phục cửa sổ"]'))`), true);
      owner.unmaximize();
      await delay(250);
      await evaluate(`document.querySelector('[aria-label="Thu nhỏ cửa sổ"]').click()`);
      await delay(250);
      assert.equal(owner.isMinimized(), true);
      owner.restore();
      await delay(250);
      owner.setSize(480, 760);
      await delay(250);
      assert.equal(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), true);
      await clickNavigation("[aria-label=\"Danh sách công việc\"]");
      await delay(250);
      if (process.env.POFI_SMOKE_SCREENSHOT) {
        fs.writeFileSync(process.env.POFI_SMOKE_SCREENSHOT.replace('.png', '-compact.png'), (await contents.capturePage()).toPNG());
      }
      owner.setSize(450, 400);
      await delay(250);
      await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
      await delay(250);
      for (const [width,height] of [[450,400],[360,480],[320,340],[640,360],[1240,820]]) {
        owner.setSize(width,height);
        await delay(150);
        await fits();
        if(width<520) await compactMenuFits();
        assert.equal(await evaluate(`(() => {const rect=document.querySelector('.window-controls').getBoundingClientRect();return rect.top>=0 && rect.left>=0 && rect.right<=innerWidth+1;})()`), true);
        await evaluate(`document.querySelector('.search-toggle').click()`);
        await delay(250);
        assert.equal(await evaluate(`(() => {const rect=document.querySelector('.search-panel').getBoundingClientRect();return rect.top>=0 && rect.left>=0 && rect.right<=innerWidth+1 && rect.bottom<=innerHeight+1;})()`), true);
        assert.equal(await evaluate(`document.activeElement === document.querySelector('.search-form input')`), true);
        assert.match(await evaluate(`getComputedStyle(document.querySelector('.search-panel')).backgroundColor`), /^rgb\(/);
        await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
        await delay(250);
        if (process.env.POFI_SMOKE_SCREENSHOT) fs.writeFileSync(process.env.POFI_SMOKE_SCREENSHOT.replace('.png', '-' + width + 'x' + height + '.png'), (await contents.capturePage()).toPNG());
      }
      await clickNavigation("[aria-label=\"Ghim cửa sổ\"]");
      await delay(100);
      assert.equal(await evaluate(`(await window.electronAPI.getWindowState()).pinned`), true);
      await clickNavigation("[aria-label=\"Ghim cửa sổ\"]");
      await delay(100);
      assert.equal(await evaluate(`(await window.electronAPI.getWindowState()).pinned`), false);
      owner.setBounds({ x: 60, y: 60, width: 460, height: 620 });
      await delay(200);
      const originalBounds = owner.getBounds();
      await evaluate(`(() => {window.pofiDockFrame=document.querySelector('.video-layer iframe');window.pofiDockTimer=document.querySelector('.timer-digits');})()`);
      await evaluate(`window.electronAPI.startPomodoroTimer(1, 1)`);
      await delay(200);
      const beforeDock = await evaluate(`window.electronAPI.getPomodoroTimerStatus()`);
      const appearance = await evaluate(`({theme:document.documentElement.dataset.theme,glass:document.documentElement.dataset.glass,background:document.querySelector('.scene-art').style.backgroundImage})`);
      await evaluate(`document.querySelector('[aria-label="Chuyển sang chế độ dock"]').click()`);
      await delay(300);
      assert.deepEqual(owner.getSize(), [320,72]);
      assert.equal(owner.isAlwaysOnTop(), true);
      assert.equal(await evaluate(`document.querySelector('.lofi-shell').classList.contains('dock-mode')`), true);
      assert.equal(await evaluate(`window.pofiDockFrame === document.querySelector('.video-layer iframe') && window.pofiDockTimer === document.querySelector('.timer-digits')`), true);
      assert.deepEqual(await evaluate(`({theme:document.documentElement.dataset.theme,glass:document.documentElement.dataset.glass,background:document.querySelector('.scene-art').style.backgroundImage})`), appearance);
      const dockContents = await evaluate(`(() => {
        const elements=[document.querySelector('.timer-digits'),document.querySelector('.play-button'),document.querySelector('.dock-expand')];
        return {buttons:[...document.querySelectorAll('button')].filter(button=>button.getBoundingClientRect().width>0).length,
          fits:elements.every(element=>{const rect=element.getBoundingClientRect();return rect.top>=0&&rect.left>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight;}),
          noScroll:document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight,
          drag:getComputedStyle(document.querySelector('.app-layout')).getPropertyValue('-webkit-app-region')};
      })()`);
      assert.deepEqual(dockContents, {buttons:2,fits:true,noScroll:true,drag:'drag'});
      await delay(1200);
      const inDock = await evaluate(`window.electronAPI.getPomodoroTimerStatus()`);
      assert.equal(inDock.status, 'running');
      assert.ok(inDock.minutes*60+inDock.seconds < beforeDock.minutes*60+beforeDock.seconds);
      if (process.env.POFI_SMOKE_SCREENSHOT) fs.writeFileSync(process.env.POFI_SMOKE_SCREENSHOT.replace('.png', '-mini-dock.png'), (await contents.capturePage()).toPNG());
      await evaluate(`window.electronAPI.setDockMode(true)`);
      await evaluate(`document.querySelector('[aria-label="Mở rộng ứng dụng"]').click()`);
      await delay(300);
      assert.deepEqual(owner.getBounds(), originalBounds);
      assert.equal(owner.isAlwaysOnTop(), false);
      assert.equal(await evaluate(`window.pofiDockFrame === document.querySelector('.video-layer iframe')`), true);
      assert.equal((await evaluate(`window.electronAPI.getPomodoroTimerStatus()`)).status, 'running');
      // Preserve an existing pin and a maximized window when expanding the dock.
      await evaluate(`window.electronAPI.togglePinWindow(true)`);
      owner.maximize();
      await delay(300);
      await evaluate(`document.querySelector('[aria-label="Chuyển sang chế độ dock"]').click()`);
      await delay(400);
      assert.deepEqual(owner.getSize(), [320,72]);
      assert.equal(owner.isAlwaysOnTop(), true);
      await evaluate(`document.querySelector('[aria-label="Mở rộng ứng dụng"]').click()`);
      await delay(400);
      assert.equal(owner.isMaximized(), true);
      assert.equal(owner.isAlwaysOnTop(), true);
      owner.unmaximize();
      await evaluate(`window.electronAPI.togglePinWindow(false)`);
      await evaluate(`window.electronAPI.stopPomodoroTimer()`);
      await delay(250);
      if (process.env.POFI_SEARCH_SMOKE) {
        owner.setSize(320,340);
        await delay(150);
        await evaluate(`document.querySelector('.search-toggle').click()`);
        await delay(250);
        await evaluate(`(() => { const input=document.querySelector('.search-form input');input.value='lofi chill';input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.search-form').requestSubmit(); })()`);
        for (let attempts=0; attempts<200; attempts++) {
          if (await evaluate(`Boolean(document.querySelector('.result-row'))`)) break;
          await delay(100);
        }
        const initialCount = await evaluate(`document.querySelectorAll('.result-row').length`);
        assert.ok(initialCount > 10);
        const formTop = await evaluate(`document.querySelector('.search-form').getBoundingClientRect().top`);
        const layout = await evaluate(`(() => {
          const panel=document.querySelector('.search-panel').getBoundingClientRect(), list=document.querySelector('.search-results'), rect=list.getBoundingClientRect();
          return {scrolls:list.scrollHeight>list.clientHeight,fits:rect.bottom<=panel.bottom&&rect.left>=panel.left&&rect.right<=panel.right,
            rows:[...document.querySelectorAll('.result-row')].every(row=>row.querySelector('.result-copy').getBoundingClientRect().right<=row.querySelector(':scope>i').getBoundingClientRect().left),
            noScroll:document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight};
        })()`);
        assert.deepEqual(layout,{scrolls:true,fits:true,rows:true,noScroll:true});
        if (process.env.POFI_SMOKE_SCREENSHOT) fs.writeFileSync(process.env.POFI_SMOKE_SCREENSHOT.replace('.png', '-search-small.png'), (await contents.capturePage()).toPNG());
        await evaluate(`(() => {const list=document.querySelector('.search-results');list.scrollTop=list.scrollHeight;document.querySelector('.load-more').click();})()`);
        for (let attempts=0; attempts<200; attempts++) {
          if (await evaluate(`document.querySelectorAll('.result-row').length > ${initialCount}`)) break;
          await delay(100);
        }
        const expandedCount = await evaluate(`document.querySelectorAll('.result-row').length`);
        assert.ok(expandedCount > initialCount);
        assert.equal(await evaluate(`document.querySelector('.search-form').getBoundingClientRect().top`), formTop);
        const result = await evaluate(`fetch('/api/youtube/search?q=lofi%20chill').then(response=>response.json())`);
        assert.ok(Array.isArray(result.items) && result.items.length > 0, result.error || 'HTTP search returned no videos');
        const continuation = await evaluate(`fetch('/api/youtube/search?q=lofi%20chill&cursor='+${JSON.stringify(result.nextCursor)}).then(response=>response.json())`);
        assert.ok(continuation.items?.length>0,continuation.error||'HTTP continuation returned no videos');
        console.log('Live paginated search:', initialCount, 'then', expandedCount, 'videos via IPC; HTTP pagination also passed');
        await evaluate(`document.querySelector('.search-results').scrollTop=0`);
        if (process.env.POFI_SMOKE_SCREENSHOT) fs.writeFileSync(process.env.POFI_SMOKE_SCREENSHOT.replace('.png', '-search-more.png'), (await contents.capturePage()).toPNG());
        await evaluate(`document.querySelector('.result-row').click()`);
        await delay(250);
        assert.equal(await evaluate(`getComputedStyle(document.querySelector('#drawer-search')).display`), 'none');
      }
      owner.once('closed', () => finish());
      await evaluate(`document.querySelector('[aria-label="Đóng ứng dụng"]').click()`);
    } catch (error) { finish(error); }
  });
});
require(entry);
Module._load = originalLoad;
