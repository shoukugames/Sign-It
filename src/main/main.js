// Sign It - Electron main process
// Copyright (C) 2026 Shawn Rapaz & Claude Code — GPL-3.0-or-later
'use strict';
const { app, BrowserWindow, ipcMain, shell, session, Menu, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// Serve the game from a private, secure app:// origin (needed for fetch(),
// WebAssembly and the camera; file:// URLs do not support fetch()).
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
]);
const ROOT = app.getAppPath();

const ALLOWED_EXTERNAL = [/^https:\/\/shoukugames\.org\/?/, /^mailto:info@shoukugames\.org/, /^https:\/\/www\.gnu\.org\/licenses\//];

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: '#0b1026',
    title: 'Sign It',
    icon: path.join(__dirname, '..', '..', 'build-resources', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });
  Menu.setApplicationMenu(null);
  win.loadURL('app://sign-it/src/renderer/index.html');

  // Never let the renderer navigate away or open arbitrary windows.
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://sign-it/')) e.preventDefault(); });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (ALLOWED_EXTERNAL.some((r) => r.test(url))) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Ask the renderer to release the camera before the window goes away.
  win.on('close', () => {
    try { win.webContents.send('app:closing'); } catch (_) { /* window already gone */ }
  });
  win.on('minimize', () => win.webContents.send('app:hidden'));

  // Developer hook: SIGNIT_SCREENSHOT=out.png [SIGNIT_JS="..."] captures the window and exits.
  if (process.env.SIGNIT_SCREENSHOT) {
    if (process.env.SIGNIT_SIZE) { // e.g. 1280x720 for store / website screenshots
      const [w, h] = process.env.SIGNIT_SIZE.split('x').map(Number);
      win.setMinimumSize(320, 240);
      win.setContentSize(w, h);
    }
    win.webContents.once('did-finish-load', async () => {
      await new Promise((r) => setTimeout(r, 2500));
      if (process.env.SIGNIT_JS) {
        for (const step of process.env.SIGNIT_JS.split(';;')) {
          await win.webContents.executeJavaScript(step).catch((e) => console.error(e));
          await new Promise((r) => setTimeout(r, Number(process.env.SIGNIT_STEP_MS || 1500)));
        }
      }
      const img = await win.webContents.capturePage();
      require('fs').writeFileSync(process.env.SIGNIT_SCREENSHOT, img.toPNG());
      app.quit();
    });
    win.webContents.on('console-message', (_e, level, msg) => { if (level >= 2) console.log('[renderer]', msg); });
  }
  return win;
}

app.whenReady().then(() => {
  protocol.handle('app', async (req) => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
    if (!file.startsWith(ROOT)) return new Response('Forbidden', { status: 403 });
    try {
      return await net.fetch(pathToFileURL(file).toString());
    } catch (_) {
      return new Response('Not found', { status: 404 });
    }
  });

  // OFFLINE GUARANTEE: the game never talks to the internet. Every request that is
  // not for the game's own bundled files is blocked, so camera data cannot leave
  // this computer. (Website/email links in Credits open in the system browser.)
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    const ok = /^(app|file|devtools|chrome-extension|data|blob):/i.test(details.url);
    if (!ok) console.warn('[offline] blocked request:', details.url);
    cb({ cancel: !ok });
  });

  // Camera is only granted to our own page, and only for video (no microphone).
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb, details) => {
    if (permission === 'media') {
      const types = (details && details.mediaTypes) || [];
      cb(types.length > 0 && types.every((t) => t === 'video'));
      return;
    }
    cb(false);
  });
  session.defaultSession.setPermissionCheckHandler((wc, permission) => permission === 'media');

  ipcMain.handle('app:open-external', (_e, url) => {
    if (typeof url === 'string' && ALLOWED_EXTERNAL.some((r) => r.test(url))) {
      shell.openExternal(url);
      return true;
    }
    return false;
  });
  ipcMain.handle('app:quit', () => app.quit());
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:toggle-fullscreen', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) w.setFullScreen(!w.isFullScreen());
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => app.quit());
