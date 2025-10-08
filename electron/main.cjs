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
      sandbox: true,
      devTools: false,
    },
    title: 'Sesli Günlük Planlayıcı',
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true,
  });

  // Load the app
  console.log('Loading app, isDev:', isDev);
  if (isDev) {
    console.log('Loading from localhost:5174');
    mainWindow.loadURL('http://localhost:5174').then(() => {
      console.log('Loaded successfully');
    }).catch(err => {
      console.error('Failed to load:', err);
    });
    // DevTools disabled intentionally
  } else {
    // Production: Load from packaged dist folder
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Production mode');
    console.log('Loading from:', indexPath);
    console.log('__dirname:', __dirname);
    console.log('app.getAppPath():', app.getAppPath());
    console.log('process.resourcesPath:', process.resourcesPath);
    
    // Check if file exists
    if (fs.existsSync(indexPath)) {
      console.log('File exists at primary path');
      mainWindow.loadFile(indexPath).then(() => {
        console.log('Successfully loaded index.html');
      }).catch(err => {
        console.error('Failed to load index.html:', err);
        mainWindow.loadURL(`file://${indexPath}`);
      });
    } else {
      console.log('File not found at primary path, trying alternative paths...');
      // Try alternative paths for portable build
      const paths = [
        path.join(process.resourcesPath, 'app', 'dist', 'index.html'),
        path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html'),
        path.join(__dirname, '..', '..', 'dist', 'index.html'),
        path.join(app.getAppPath(), 'dist', 'index.html')
      ];
      
      let loaded = false;
      for (const altPath of paths) {
        console.log('Trying path:', altPath);
        if (fs.existsSync(altPath)) {
          console.log('File found at:', altPath);
          mainWindow.loadFile(altPath).then(() => {
            console.log('Successfully loaded from:', altPath);
            loaded = true;
          }).catch(err => {
            console.error('Failed to load from:', altPath, err);
          });
          break;
        }
      }
      
      if (!loaded) {
        console.error('Could not find index.html in any expected location');
        // Show error in window
        mainWindow.loadURL('data:text/html,<h1>Error: Could not find application files</h1><p>Please check the console for details.</p>');
      }
    }
  }
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
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
}

// App ready
app.whenReady().then(() => {
  console.log('App is ready');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(err => {
  console.error('Error when app ready:', err);
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for future use
ipcMain.handle('app-version', () => {
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
