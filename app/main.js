const { app, BrowserWindow, Tray, Menu, shell, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

const SITE = 'https://jin0047.github.io/jobtracker/';
const ICON = path.join(__dirname, 'icon.png');
const cfgPath = () => path.join(app.getPath('userData'), 'window.json');
let cfg = { w: 1000, h: 760, x: undefined, y: undefined, top: true, lock: false, opacity: 1 };
let win, tray, full;

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

function load() { try { Object.assign(cfg, JSON.parse(fs.readFileSync(cfgPath(), 'utf8'))); } catch (e) {} }
function save() { try { fs.writeFileSync(cfgPath(), JSON.stringify(cfg)); } catch (e) {} }

function openFull(url) {
  url = url.split('#')[0].replace(/[?&](widget|app)\b/g, '');
  url += (url.includes('?') ? '&' : '?') + 'full';
  if (full && !full.isDestroyed()) { full.loadURL(url); full.show(); full.focus(); return; }
  full = new BrowserWindow({ width: 1500, height: 1000, icon: ICON, autoHideMenuBar: true, backgroundColor: '#161826', title: '진플래너' });
  full.loadURL(url);
  full.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

function createWin() {
  win = new BrowserWindow({
    width: cfg.w, height: cfg.h, x: cfg.x, y: cfg.y,
    minWidth: 420, minHeight: 360,
    frame: false, skipTaskbar: true, backgroundColor: '#000000', icon: ICON, title: '진플래너',
    alwaysOnTop: cfg.top, resizable: !cfg.lock, movable: !cfg.lock, show: false,
  });
  win.setOpacity(cfg.opacity);
  win.loadURL(SITE + '?widget&app');
  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS('body::before{content:"";position:fixed;top:0;left:0;right:0;height:12px;-webkit-app-region:drag;z-index:99999}');
  });
  win.webContents.on('did-fail-load', () => setTimeout(() => win && !win.isDestroyed() && win.loadURL(SITE + '?widget&app'), 5000));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(SITE) && !/widget/.test(url)) openFull(url); else shell.openExternal(url);
    return { action: 'deny' };
  });
  const rec = () => { if (win.isDestroyed()) return; const b = win.getBounds(); Object.assign(cfg, { x: b.x, y: b.y, w: b.width, h: b.height }); save(); };
  win.on('moved', rec); win.on('resized', rec);
  win.on('close', e => { if (!app.isQuitting) { e.preventDefault(); win.hide(); } });
}

function menu() {
  const auto = app.getLoginItemSettings().openAtLogin;
  return Menu.buildFromTemplate([
    { label: '보이기 / 숨기기   (Ctrl+Alt+J)', click: toggle },
    { type: 'separator' },
    { label: '항상 위에 띄우기', type: 'checkbox', checked: cfg.top, click: m => { cfg.top = m.checked; win.setAlwaysOnTop(cfg.top); save(); } },
    { label: '위치·크기 잠금', type: 'checkbox', checked: cfg.lock, click: m => { cfg.lock = m.checked; win.setMovable(!cfg.lock); win.setResizable(!cfg.lock); save(); } },
    { label: '투명도', submenu: [1, 0.9, 0.8, 0.7, 0.6].map(o => ({ label: Math.round(o * 100) + '%', type: 'radio', checked: cfg.opacity === o, click: () => { cfg.opacity = o; win.setOpacity(o); save(); } })) },
    { label: '컴퓨터 켤 때 자동 실행', type: 'checkbox', checked: auto, click: m => app.setLoginItemSettings({ openAtLogin: m.checked }) },
    { type: 'separator' },
    { label: '전체 화면 (일정·취업 탭) 열기', click: () => openFull(SITE) },
    { label: '새로고침 (업데이트 반영)', click: () => win.webContents.reloadIgnoringCache() },
    { label: '위치 초기화', click: () => { win.setBounds({ x: 100, y: 100, width: 1000, height: 760 }); } },
    { type: 'separator' },
    { label: '종료', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
}
function toggle() { if (win.isVisible()) win.hide(); else { win.show(); win.focus(); } }

app.whenReady().then(() => {
  load();
  createWin();
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip('진플래너');
  tray.on('click', toggle);
  tray.on('right-click', () => tray.popUpContextMenu(menu()));
  globalShortcut.register('Control+Alt+J', toggle);
});
app.on('window-all-closed', e => e.preventDefault());
app.on('will-quit', () => globalShortcut.unregisterAll());
