const {app, BrowserWindow, ipcMain} = require('electron')
require('@electron/remote/main').initialize()
const updater = require('electron-simple-updater');
let mainWindow;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 900,
        webPreferences: {
            webSecurity: false,
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
            devTools: true
        }
    })

    console.log(`current path is ${__dirname}`)
    mainWindow.loadURL(`file://${__dirname}/../webdist/index.html`)
    require("@electron/remote/main").enable(mainWindow.webContents)
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

updater.init({
    checkUpdateOnStart: true,
    autoDownload: false,
    logger: {
        info(...args) {
            ipcSend('update-log', 'info', ...args);
        },
        warn(...args) {
            ipcSend('update-log', 'warn', ...args);
        },
    },
});

updater
    .on('update-available', m => ipcSend('update-available', m))
    .on('update-downloading', () => ipcSend('update-downloading'))
    .on('update-downloaded', () => ipcSend('update-downloaded'));

ipcMain.handle('getBuild', () => updater.buildId);
ipcMain.handle('getVersion', () => updater.version);
ipcMain.handle('checkForUpdates', () => {
    updater.checkForUpdates();
});
ipcMain.handle('downloadUpdate', () => {
    updater.downloadUpdate();
});
ipcMain.handle('quitAndInstall', () => {
    updater.quitAndInstall();
});
ipcMain.handle('setOption', (_, opt, val) => {
    updater.setOptions(opt, val);
});

function ipcSend(event, ...args) {
    mainWindow?.webContents.send('updater-event', event, ...args);
}