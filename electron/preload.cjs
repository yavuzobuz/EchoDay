const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getPlatform: () => ipcRenderer.invoke('platform'),
  isElectron: true,
});

// Add a flag to detect Electron environment
contextBridge.exposeInMainWorld('isElectron', true);

// Add electronAPI for feature detection
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getPlatform: () => ipcRenderer.invoke('platform'),
  
  // Profile API
  getProfile: (userId) => ipcRenderer.invoke('profile:get', userId),
  updateProfile: (userId, updates) => ipcRenderer.invoke('profile:update', userId, updates),
  
  // Stats API
  getStats: (userId) => ipcRenderer.invoke('stats:get', userId),
  updateStats: (userId, updates) => ipcRenderer.invoke('stats:update', userId, updates),
  
  // Settings API
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),
  deleteSetting: (key) => ipcRenderer.invoke('settings:delete', key),
  
  // PDF API
  selectPdfFile: () => ipcRenderer.invoke('pdf:selectFile'),
});
