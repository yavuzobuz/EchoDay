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
  
  // File System API for Electron
  readFileAsBase64: (filePath) => ipcRenderer.invoke('fs:readFileAsBase64', filePath),
  
  // Store API for persistent settings
  store: {
    get: (key, defaultValue) => ipcRenderer.invoke('store:get', key, defaultValue),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
    clear: () => ipcRenderer.invoke('store:clear')
  },
  
  // Notification API
  notification: {
    show: (options) => ipcRenderer.invoke('notification:show', options),
    isSupported: () => ipcRenderer.invoke('notification:isSupported')
  },
});
