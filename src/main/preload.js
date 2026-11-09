// Sign It - preload bridge (exposes a tiny, safe API to the page)
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('signItHost', {
  isElectron: true,
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  quit: () => ipcRenderer.invoke('app:quit'),
  version: () => ipcRenderer.invoke('app:version'),
  toggleFullscreen: () => ipcRenderer.invoke('app:toggle-fullscreen'),
  onClosing: (fn) => ipcRenderer.on('app:closing', fn),
  onHidden: (fn) => ipcRenderer.on('app:hidden', fn)
});
