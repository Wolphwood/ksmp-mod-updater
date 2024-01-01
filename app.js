const { app, BrowserWindow, Tray, Menu, dialog, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');


const { autoUpdater } = require("electron-updater");
const log = require('electron-log');

module.exports = {
    GetConfigFromApp: () => CONFIG,
    CallAPI,
};

const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
    return app.quit();
}

const { WebLog, Wait, downloadFileWithProgress, downloadFile, Toastify } = require('./assets/js/back/functions.js');
const { LoadConfig, SaveConfig } = require('./assets/js/back/data.js');
const { SearchModUpdate, ApplyModUpdate, SearchRessourcepackUpdate, SearchShaderpackUpdate, SearchConfigUpdate } = require('./assets/js/back/update.js');

let mainWindow = null;
let CONFIG = LoadConfig();
let IntervalSearchUpdate = null;

const createWindow = () => {
    if (mainWindow) return;

    mainWindow = new BrowserWindow({
        width: 1920/1.5,
        height: 1080/1.5,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            preload: path.join(__dirname, 'preload.js')
        },
        resizable: false,
        autoHideMenuBar: true,
        icon: path.join(app.getAppPath(), 'assets/img/pack.png'),
    });

    mainWindow.loadFile('./index.html');

    Menu.setApplicationMenu(null);

    // mainWindow.loadFile('./pages/home.html');
    if (CONFIG.debug) mainWindow.webContents.openDevTools();
}

function createTray() {
    const tray = new Tray( path.join(app.getAppPath(), 'assets/img/pack.png') );
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Ouvrir', click: () => createWindow() },
        { label: 'Chercher une mise à jour', click: () => `_search_update(true)` },
        { type: 'separator' },
        { label: 'Quitter', click: () => app.quit() }
    ])
    tray.setToolTip('KSMP Client Updater');
    tray.setContextMenu(contextMenu);
}

function setStarupAtLogin(value) {
    if (process.env.PORTABLE_EXECUTABLE_DIR) return;
    app.setLoginItemSettings({
        openAtLogin: value,
        path: app.getPath('exe'),
    });
}

if (process.platform === 'win32') {
    app.setAppUserModelId("KSMP Client Updater");
}

app.whenReady().then(async () => {
    log.info(app.getPath("userData"))

    autoUpdater.checkForUpdates();

    createTray();

    if (!CONFIG.startMinimized) createWindow();

    // let updateFound = await _search_update();
    // if (CONFIG.startMinimized && !CONFIG.runBackground) {
    //     await Wait(updateFound ? 5 * 60_000 : 60_000);
    //     app.quit();
    // }


    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
    
    if (CONFIG.runBackground) {
        // IntervalSearchUpdate = setInterval(_search_update, 60 * 60 * 1000);
    }

    setStarupAtLogin(CONFIG.startWithWindows);

    app.on('window-all-closed', e => {
        mainWindow = null;
        e.preventDefault();

        if (!CONFIG.runBackground) {
            if (process.platform !== 'darwin') return app.quit();
        }

        let notification = new Notification({
            icon: path.join(app.getAppPath(), 'assets/img/pack.png'),
            title: "Running in background",
            body: "the program continues to run in the background."
        });
    
        notification.on('click', createWindow);
    
        notification.show();
    });
});


ipcMain.handle("get-config", ( event ) => {
    return CONFIG;
});

ipcMain.handle("set-config", ( event, config ) => {
    if (!config) return CONFIG;
    
    CONFIG = config;
    setStarupAtLogin(config.startWithWindows);
    
    return CONFIG;
});

ipcMain.handle("save-config", ( event, config ) => {
    return SaveConfig(config ?? CONFIG);
});

ipcMain.handle("api", async ( event, request, options ) => {
    return CallAPI(request, options);
});

async function CallAPI(request, options) {
    const API = `${CONFIG?.api?.url ?? 'https://vps.wolphwood.ovh'}/${CONFIG?.api?.home ?? 'ksmp-api'}/v2/`;
    
    let data = null;

    let fetchURL = (API + request).replace(/\/+/gmi, '/');

    try {
        let response = await fetch(fetchURL);

        let contentType = response.headers.get('content-type');
        let contentDisposition = response.headers.get('content-disposition');

        if (response.status == 200) {
            if (contentType.includes('text/html')) {
                data = await response.clone().text();
            } else
            
            if (contentType.includes('application/json')) {
                data = await response.clone().json();
            } else
            
            if (contentDisposition !== null) {
                let { progress, folder, filename } = options ?? {};

                if (folder) {
                    if (progress) {
                        try {
                            data = await downloadFileWithProgress(fetchURL, folder, filename, response);
                        } catch (error) {
                            console.error(error)
                        }
                    } else {
                        data = await downloadFile(fetchURL, folder, filename, null, null, null, null, response);
                    };
                } else {
                    data = {
                        "error": "no-destination",
                        "message": "A destination folder is required to download a file."
                    }
                }
            } else {
                data = {
                    "error": "unsuported-content-type",
                    "message": `Unsuported content type ${contentType}`,
                    "request": `${response.status}: ${response.statusText}`
                }
            }
        } else {
            data = {
                "error": response.status,
                "message": response.statusText
            }
        }
    } catch (err) {
        data = {
            "error": err.name,
            "message": err.message,
            "details": err,
            "cause": err.cause
        }
    }

    if (data?.error) {
        if (data.details) {
            if (data.details.cause.code == "ECONNREFUSED") {
                await mainWindow.webContents.send('web-logging-error', `FETCH ERROR: KSMP-API cannot be reached at '[${API}](${API})'`);
                await mainWindow.webContents.send('notification', 'error', `FETCH ERROR: KSMP-API cannot be reached at '[${API}](${API})'`);
            } else {
                await mainWindow.webContents.send('web-logging-error', `${data.error}: ${data.message}\n${data.details}\n${data.cause}`);
                await mainWindow.webContents.send('notification', 'error', `${data.error}: ${data.message}\n${data.details}\n${data.cause}`);
            }
        } else {
            await mainWindow.webContents.send('web-logging-error', `${data.error}: ${data.message}`);
            await mainWindow.webContents.send('notification', 'error', `${data.error}: ${data.message}`);
        }
        log.error('FETCH ERROR:', data.details ?? data);
    }

    return data;
}


async function SearchUpdate(inBackground = false) {
    let modNeedUpate = await SearchModUpdate();

    return { modNeedUpate, };
}

ipcMain.handle("DOMContentLoaded", async ( event ) => {
    await WebLog('normal', `KSMP Client Updater v${app.getVersion()}`);
    await WebLog('normal', `Fait par [Wolphwood](https://wolphwood.ovh) et [Booluigi](https://twitter.com/booluigi10) avec beaucoup BEAUCOUP DE SUEUR !`);
    await WebLog('normal', '');

    console.log("==========================================");
    console.log("SEARCHING AN UPDATE");
    SearchUpdate();
    console.log("==========================================");

    if (Math.random() > 0.9) {
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('notification', 'default', {
                duration: 10_000,
                text: `Toi je t'aime bien :)`,
                gravity: 'bottom',
                offset: {x: 0, y: 0},
                style: {
                    background: "linear-gradient(to left, #ffc300, #ffd60a)",
                },
            });
        });
    }

    // let testFilename = path.join(app.getPath("temp"), "test.zip");
    // if (fs.existsSync(testFilename)) fs.unlinkSync(testFilename);
    // downloadFileWithProgress("http://vps.wolphwood.ovh:8080/ksmp-api/ressourcepack/get/normal/2.0", app.getPath("temp"), 'test.zip');
    
    
    // let testFilename = path.join(app.getPath("temp"), "test.zip");
    // if (fs.existsSync(testFilename)) fs.unlinkSync(testFilename);
    // downloadFile("http://vps.wolphwood.ovh:8080/ksmp-api/ressourcepack/get/normal/2.0", testFilename);
});

ipcMain.handle("update", async ( event ) => {
    mainWindow.webContents.send('web-logging', 'Recherche de mise à jour ...');
    
    let result = await SearchUpdate();
    
    if (result.modNeedUpate) {
        await mainWindow.webContents.send('web-logging', `Ta configuration requiert une petite mise à jour !`);

        if (result.modNeedUpate) {
            await mainWindow.webContents.send('web-logging', 'Mise à jour des mods...');
            let {updated, installed} = await ApplyModUpdate();

            if (updated && installed) {
                await mainWindow.webContents.send('web-logging', `\n${updated} mod.s mit à jour et ${installed} nouveau.x mod.s installé.s`);
            }
            
            if (!updated && installed) {
                await mainWindow.webContents.send('web-logging', `\n${installed} nouveau.x mod.s installé.s`);
            }
            
            if (updated && !installed) {
                await mainWindow.webContents.send('web-logging', `\n${updated} mod.s mit à jour.`);
            }
        }
    } else {
        mainWindow.webContents.send('web-logging', `Ta configuration est déjà à jour !`);
    }
});

ipcMain.handle("select-dir", async ( event ) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.filePaths.pop();
});

ipcMain.handle("wthit", async ( event ) => {
    CONFIG.wthit = !CONFIG.wthit;
    await SaveConfig(CONFIG);
    
    app.relaunch();
    app.exit();
});

ipcMain.handle("restart", async ( event ) => {
    app.relaunch();
    app.exit();
});


autoUpdater.on('update-available', () => {
    BrowserWindow.getAllWindows().forEach(win => {
        let text = `Une mise à jour de l'application est disponible`;
        win.webContents.send('web-logging', text);
        win.webContents.send('notification', 'new-app-update', text);
    });
});

autoUpdater.on('update-downloaded', () => {
    BrowserWindow.getAllWindows().forEach(win => {
        let text = `La mise à jour est prête à être installée!\nAppuie sur la notification ou redémarre l'application :)`;
        win.webContents.send('web-logging', text);
        win.webContents.send('notification', 'app-update-success', text);
    });
});

ipcMain.handle("update-quit-and-install", async ( event ) => {
    autoUpdater.quitAndInstall()
});

process.on('uncaughtException', function (error) {
    log.error(error);
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('web-logging-error', `uncaughtException: ${error.message}\n${error.cause}`);
        win.webContents.send('notification', 'error', `uncaughtException: ${error.message}`);
    });
});
