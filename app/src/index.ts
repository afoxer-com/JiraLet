const {app, BrowserWindow} = require('electron')
require('@electron/remote/main').initialize()
const updater = require('electron-simple-updater');

const createWindow = () => {
    const win = new BrowserWindow({
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
    win.loadURL(`file://${__dirname}/../webdist/index.html`)
    require("@electron/remote/main").enable(win.webContents)
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

updater.init('https://raw.githubusercontent.com/afoxer-com/JiraLet/main/updates.json');
