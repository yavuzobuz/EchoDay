const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// Electron Store for persistent settings
let Store;
try {
  Store = require('electron-store');
} catch (error) {
  console.warn('[Main] electron-store not available:', error.message);
}

// Initialize store
let store;
if (Store) {
  store = new Store({
    name: 'echoday-settings',
    defaults: {
      isFirstRun: true,
      windowBounds: { width: 1200, height: 800 },
      theme: 'dark'
    }
  });
  console.log('[Main] Electron store initialized');
} else {
  console.warn('[Main] Electron store not available, settings will not persist');
}

// Basit JSON depolama sistemi
const dataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'SesliGunlukPlanlayici');
const profilesFile = path.join(dataPath, 'profiles.json');
const statsFile = path.join(dataPath, 'stats.json');
const settingsFile = path.join(dataPath, 'settings.json');

// Dizini oluştur
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

// Log dizini ve basit log fonksiyonu
const logsDir = path.join(dataPath, 'logs');
if (!fs.existsSync(logsDir)) {
  try { fs.mkdirSync(logsDir, { recursive: true }); } catch {}
}
const logFile = path.join(logsDir, 'electron.log');
function log(...args) {
  try {
    const line = args.map(a => {
      if (a instanceof Error) return a.stack || a.message;
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
    }).join(' ');
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${line}\n`);
  } catch {}
  try { console.log(...args); } catch {}
}

// JSON okuma fonksiyonu
function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return {};
}

// JSON yazma fonksiyonu
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

let mainWindow;

function createWindow() {
  console.log('Creating window...');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      allowRunningInsecureContent: isDev,
      enableRemoteModule: false,
      spellcheck: false,
      backgroundThrottling: false,
      sandbox: false,
      devTools: true, // Geçici: prod’da da DevTools açık (teşhis için)
    },
    title: 'EchoDay - Sesli Günlük Planlayıcı',
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true,
    // Resolve icon with graceful fallbacks (checks resources/public and resources/build)
    icon: (function() {
      const cand = [];
      if (app.isPackaged) {
        // Packaged paths
        cand.push(
          // Preferred formats per OS
          process.platform === 'win32' ? path.join(process.resourcesPath, 'build', 'icon.ico') :
          process.platform === 'darwin' ? path.join(process.resourcesPath, 'build', 'icon.icns') :
          path.join(process.resourcesPath, 'build', 'icon.png')
        );
        // Fallback to public assets included in asar
        cand.push(path.join(process.resourcesPath, 'public', 'icon-512.png'));
        cand.push(path.join(process.resourcesPath, 'public', 'favicon.png'));
      } else {
        // Dev paths
        cand.push(
          process.platform === 'win32' ? path.join(__dirname, '../build', 'icon.ico') :
          process.platform === 'darwin' ? path.join(__dirname, '../build', 'icon.icns') :
          path.join(__dirname, '../build', 'icon.png')
        );
        cand.push(path.join(__dirname, '../public', 'icon-512.png'));
        cand.push(path.join(__dirname, '../public', 'favicon.png'));
      }
      const found = cand.find(p => {
        try { return fs.existsSync(p); } catch { return false; }
      });
      return found || undefined;
    })(),
  });

  // Load the app
  log('Loading app, isDev:', isDev);
  if (isDev) {
    log('Loading from localhost:5174');
    mainWindow.loadURL('http://localhost:5174').then(() => {
      log('Loaded successfully');
      // DevTools'u development modunda bile açma
      // mainWindow.webContents.openDevTools();
    }).catch(err => {
      log('Failed to load:', err);
    });
  } else {
    // Production: Load from packaged dist folder (handle asar)
    log('Production mode');
    log('__dirname:', __dirname);
    log('app.getAppPath():', app.getAppPath());
    log('process.resourcesPath:', process.resourcesPath);

    // Prefer loading from app.asar using app.getAppPath()
    const primary = path.join(app.getAppPath(), 'dist', 'index.html');
    const fallbacks = [
      path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html'),
      path.join(__dirname, '../dist/index.html'),
      path.join(process.resourcesPath, 'app', 'dist', 'index.html'),
    ];

    const tryLoad = async (p) => {
      try {
        log(`[Loader] Trying: ${p}`);
        await mainWindow.loadFile(p);
        log(`[Loader] Loaded successfully from: ${p}`);
        return true;
      } catch (err) {
        log(`[Loader] Failed from: ${p}`, err);
        return false;
      }
    };

    (async () => {
      if (await tryLoad(primary)) return;
      for (const p of fallbacks) {
        if (p.includes('app.asar')) {
          if (await tryLoad(p)) return;
        } else if (fs.existsSync(p)) {
          if (await tryLoad(p)) return;
        } else {
          log(`[Loader] Not found (skip exists): ${p}`);
        }
      }
      log('[Loader] Could not find index.html in any expected location');
      mainWindow.loadURL('data:text/html,<h1>Uygulama dosyaları bulunamadı</h1><p>Lütfen kurulumun tam olduğundan emin olun.</p>');
    })();
  }
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    log('Window ready-to-show');
    mainWindow.show();
  });

  // Handle window close
  mainWindow.on('closed', () => {
    log('Window closed');
    mainWindow = null;
  });

  // Renderer/webContents diagnostic events
  mainWindow.webContents.on('did-finish-load', () => log('[WebContents] did-finish-load'));
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    log('[WebContents] did-fail-load', { errorCode, errorDescription, validatedURL, isMainFrame });
  });
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log('[WebContents] render-process-gone', details);
  });
  mainWindow.webContents.on('unresponsive', () => {
    log('[WebContents] unresponsive');
  });
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    log('[Renderer]', { level, message, line, sourceId });
  });

  // Handle permission requests for media devices
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'camera', 'display-capture', 'fullscreen'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });
  
  // Set default permissions for media devices
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    const allowedPermissions = ['media', 'microphone', 'camera'];
    return allowedPermissions.includes(permission);
  });
}

// Configure app paths to avoid permission issues
const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'SesliGunlukPlanlayici');
app.setPath('userData', userDataPath);
app.setPath('cache', path.join(userDataPath, 'cache'));
app.setPath('logs', path.join(userDataPath, 'logs'));
app.setPath('crashDumps', path.join(userDataPath, 'crashDumps'));

// Configure app before ready (minimal, safer defaults)
if (isDev) {
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch('lang', 'tr-TR');
  app.commandLine.appendSwitch('enable-logging');
} else {
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch('lang', 'tr-TR');
  app.commandLine.appendSwitch('enable-logging');
}

// App ready
app.whenReady().then(() => {
  log('App is ready');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(err => {
  log('Error when app ready:', err);
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for future use
ipcMain.handle('app-version', () => {
  log('[IPC] app-version request');
  return app.getVersion();
});

ipcMain.handle('platform', () => {
  return process.platform;
});

// IPC handler to read file as base64
ipcMain.handle('fs:readFileAsBase64', (event, filePath) => {
  try {
    const cleanPath = filePath.startsWith('file:///') ? filePath.substring(8) : filePath;
    if (fs.existsSync(cleanPath)) {
      const fileData = fs.readFileSync(cleanPath);
      return fileData.toString('base64');
    }
    return null;
  } catch (error) {
    console.error('[IPC] Failed to read file:', error);
    return null;
  }
});

// ============ Profile IPC Handlers ============

// Profil al
ipcMain.handle('profile:get', (event, userId) => {
  try {
    const profiles = readJSON(profilesFile);
    const profile = profiles[userId];
    
    if (!profile) {
      // Varsayılan profil oluştur
      const defaultProfile = {
        id: userId,
        name: 'Kullanıcı',
        avatar: '😊',
        bio: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      profiles[userId] = defaultProfile;
      writeJSON(profilesFile, profiles);
      return defaultProfile;
    }
    return profile;
  } catch (error) {
    console.error('Error getting profile:', error);
    return null;
  }
});

// Profil güncelle
ipcMain.handle('profile:update', (event, userId, updates) => {
  try {
    const profiles = readJSON(profilesFile);
    const existing = profiles[userId] || {
      id: userId,
      name: 'Kullanıcı',
      avatar: '😊',
      bio: '',
      createdAt: new Date().toISOString(),
    };
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    profiles[userId] = updated;
    writeJSON(profilesFile, profiles);
    return updated;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
});

// İstatistikleri al
ipcMain.handle('stats:get', (event, userId) => {
  try {
    const stats = readJSON(statsFile);
    const userStats = stats[userId];
    
    if (!userStats) {
      // Varsayılan istatistikler oluştur
      const defaultStats = {
        totalTodos: 0,
        completedTodos: 0,
        totalNotes: 0,
        daysActive: 0,
        lastActiveDate: new Date().toISOString(),
      };
      stats[userId] = defaultStats;
      writeJSON(statsFile, stats);
      return defaultStats;
    }
    return userStats;
  } catch (error) {
    console.error('Error getting stats:', error);
    return null;
  }
});

// İstatistikleri güncelle
ipcMain.handle('stats:update', (event, userId, updates) => {
  try {
    const stats = readJSON(statsFile);
    const existing = stats[userId] || {
      totalTodos: 0,
      completedTodos: 0,
      totalNotes: 0,
      daysActive: 0,
      lastActiveDate: new Date().toISOString(),
    };
    const updated = {
      ...existing,
      ...updates,
    };
    stats[userId] = updated;
    writeJSON(statsFile, stats);
    return updated;
  } catch (error) {
    console.error('Error updating stats:', error);
    throw error;
  }
});

// ============ Settings Handlers ============

// Ayar kaydet
ipcMain.handle('settings:set', (event, key, value) => {
  try {
    const settings = readJSON(settingsFile);
    settings[key] = value;
    writeJSON(settingsFile, settings);
    console.log(`[Settings] Saved ${key}:`, value ? '***' : 'null');
    return true;
  } catch (error) {
    console.error('Error saving setting:', error);
    return false;
  }
});

// Ayar oku
ipcMain.handle('settings:get', (event, key) => {
  try {
    const settings = readJSON(settingsFile);
    const value = settings[key];
    console.log(`[Settings] Retrieved ${key}:`, value ? '***' : 'null');
    return value || null;
  } catch (error) {
    console.error('Error reading setting:', error);
    return null;
  }
});

// Tüm ayarları oku
ipcMain.handle('settings:getAll', () => {
  try {
    return readJSON(settingsFile);
  } catch (error) {
    console.error('Error reading all settings:', error);
    return {};
  }
});

// Ayar sil
ipcMain.handle('settings:delete', (event, key) => {
  try {
    const settings = readJSON(settingsFile);
    delete settings[key];
    writeJSON(settingsFile, settings);
    console.log(`[Settings] Deleted ${key}`);
    return true;
  } catch (error) {
    console.error('Error deleting setting:', error);
    return false;
  }
});

// ============ STORE Handlers ============

// Store get handler
ipcMain.handle('store:get', (event, key, defaultValue) => {
  try {
    if (!store) {
      console.warn('[IPC] Store not available for get operation');
      return defaultValue;
    }
    const value = store.get(key, defaultValue);
    console.log(`[Store] Retrieved ${key}:`, value);
    return value;
  } catch (error) {
    console.error('[Store] Error getting value:', error);
    return defaultValue;
  }
});

// Store set handler
ipcMain.handle('store:set', (event, key, value) => {
  try {
    if (!store) {
      console.warn('[IPC] Store not available for set operation');
      return false;
    }
    store.set(key, value);
    console.log(`[Store] Saved ${key}:`, value);
    return true;
  } catch (error) {
    console.error('[Store] Error setting value:', error);
    return false;
  }
});

// Store delete handler
ipcMain.handle('store:delete', (event, key) => {
  try {
    if (!store) {
      console.warn('[IPC] Store not available for delete operation');
      return false;
    }
    store.delete(key);
    console.log(`[Store] Deleted ${key}`);
    return true;
  } catch (error) {
    console.error('[Store] Error deleting value:', error);
    return false;
  }
});

// Store clear handler
ipcMain.handle('store:clear', () => {
  try {
    if (!store) {
      console.warn('[IPC] Store not available for clear operation');
      return false;
    }
    store.clear();
    console.log('[Store] Cleared all data');
    return true;
  } catch (error) {
    console.error('[Store] Error clearing store:', error);
    return false;
  }
});

// ============ Notification Handlers ============

// Show native notification
ipcMain.handle('notification:show', async (event, options) => {
  try {
    if (!Notification.isSupported()) {
      console.warn('[Notification] Native notifications not supported');
      return false;
    }

    const notification = new Notification({
      title: options.title || 'EchoDay',
      body: options.body || '',
      icon: options.icon || undefined,
      silent: options.silent || false,
      urgency: options.urgency || 'normal', // low, normal, critical
      timeoutType: options.timeoutType || 'default', // default, never
    });

    // Handle click event
    notification.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        mainWindow.show();
      }
    });

    notification.show();
    console.log('[Notification] Shown:', options.title);
    return true;
  } catch (error) {
    console.error('[Notification] Error showing notification:', error);
    return false;
  }
});

// Check if notifications are supported
ipcMain.handle('notification:isSupported', () => {
  return Notification.isSupported();
});

// ============ PDF Handlers ============

// PDF Dosyası Seç (Native Dialog)
ipcMain.handle('pdf:selectFile', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'PDF Dosyası Seçin',
      filters: [
        { name: 'PDF Dosyaları', extensions: ['pdf'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;

    // Base64'e çevir
    const base64 = fileBuffer.toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64}`;

    return {
      name: fileName,
      size: fileSize,
      type: 'application/pdf',
      dataUrl: dataUrl,
      buffer: base64
    };
  } catch (error) {
    console.error('Error selecting PDF file:', error);
    throw error;
  }
});
