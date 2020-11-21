const { app, BrowserWindow } = require('electron');
const path = require('path');
const processor = require('./processor');

const { ipcMain } = require('electron');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true
    }
  });

  // Load the app frontend from index.html file.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools: comment on production!
  // mainWindow.webContents.openDevTools();

  // Receive process signal from frontend
  ipcMain.on('asynchronous-process', (event, fileName, maxTotalLunchHours, weekHours) => {
    processFile(event, fileName, maxTotalLunchHours, weekHours);
  });
};

// Handle async reply from processor
const processFile = async (event, fileName, maxTotalLunchHours, weekHours) => {
  let result;
  try {
    result = await processor.processSageFile(fileName, maxTotalLunchHours, weekHours);
  } catch (e) {
    return Promise.reject(e)
  }
  event.reply('asynchronous-reply', result)
  return result;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});