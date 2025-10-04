const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: !isDev, // Disable webSecurity in development
      allowRunningInsecureContent: true, // Allow for speech recognition
      experimentalFeatures: true,
      enableRemoteModule: false,
      enableWebSQL: false,
      spellcheck: false,
      backgroundThrottling: false,
      offscreen: false,
      // Better media support
      enableBlinkFeatures: 'SpeechSynthesis,SpeechRecognition',
      // Additional security but allow needed features
      sandbox: false,
      partition: null,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'Sesli Günlük Planlayıcı',
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

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

// Configure app before ready
app.commandLine.appendSwitch('enable-web-bluetooth');
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Additional cache and GPU related switches to avoid permission issues
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Speech recognition and media related switches for packaged app
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('ignore-ssl-errors');
app.commandLine.appendSwitch('allow-running-insecure-content');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('allow-file-access-from-files');

// Additional switches for speech recognition
app.commandLine.appendSwitch('enable-speech-input');
app.commandLine.appendSwitch('enable-web-speech-api');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-gpu-rasterization');

// App ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
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
