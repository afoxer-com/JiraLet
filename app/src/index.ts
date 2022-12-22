const {app, BrowserWindow, ipcMain} = require('electron')
require('@electron/remote/main').initialize()
const updater = require('electron-simple-updater');
let mainWindow;
const forceDevTools = false;

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

    if (!app.isPackaged || forceDevTools) {
        mainWindow.webContents.openDevTools()
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.whenReady().then(() => {
    updater.init({
        url: 'https://raw.githubusercontent.com/afoxer-com/JiraLet/main/updates.json',
        checkUpdateOnStart: false,
        autoDownload: false,
        logger: {
            info(...args) {
                ipcSend('update-log', 'info', ...args);
            },
            warn(...args) {
                ipcSend('update-log', 'warn', ...args);
            },
        }
    });

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

    updater
        .on('checking-for-update', () => ipcSend('checking-for-update'))
        .on('update-available', m => ipcSend('update-available', m))
        .on('update-not-available', ()=> ipcSend('update-not-available'))
        .on('update-downloading', () => ipcSend('update-downloading'))
        .on('update-downloaded', () => ipcSend('update-downloaded'))
        .on('error', m => ipcSend('error', m));

    createWindow()
    updater.checkForUpdates();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})