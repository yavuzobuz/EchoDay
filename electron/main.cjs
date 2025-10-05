const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const isDev = process.env.NODE_ENV === 'development';

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
    },
    title: 'Sesli Günlük Planlayıcı',
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true,
  });

  // Load the app
  console.log('Loading app, isDev:', isDev);
  if (isDev) {
    console.log('Loading from localhost:5173');
    mainWindow.loadURL('http://localhost:5173').then(() => {
      console.log('Loaded successfully');
    }).catch(err => {
      console.error('Failed to load:', err);
    });
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
