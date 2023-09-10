const { app, BrowserWindow, Tray, Menu, dialog, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const { autoUpdater } = require("electron-updater");
const log = require('electron-log');

module.exports = {
    AppDirectory: __dirname,
};

const { LoadConfig, SaveConfig, ReadEnvVariables, downloadFile, ArrayContains, Wait, UpdateMods, UpdateRessourcePack, UpdateOthers } = require('./assets/js/data');

let mainWindow = null;
let CONFIG = LoadConfig();
let IntervalSearchUpdate = null;

const createWindow = () => {
    if (mainWindow) return;
    
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
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

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools();
}

function createTray() {
    const tray = new Tray( path.join(app.getAppPath(), 'assets/img/pack.png') );
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Ouvrir', click: () => createWindow() },
        { label: 'Chercher une mise à jour', click: () => _search_update(true) },
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
    autoUpdater.checkForUpdates();

    createTray();
    if (!CONFIG.startMinimized) createWindow();

    let updateFound = await _search_update();
    if (CONFIG.startMinimized && !CONFIG.runBackground) {
        await Wait(updateFound ? 5 * 60_000 : 60_000);
        app.quit();
    }


    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
    
    if (CONFIG.runBackground) {
        IntervalSearchUpdate = setInterval(_search_update, 60 * 60 * 1000);
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

ipcMain.handle("set-config", ( event, key, value ) => {
    if (key == "startWithWindows") {
        setStarupAtLogin(value);
    }
    
    CONFIG[key] = value;
    return CONFIG;
});

ipcMain.handle("save-config", ( event, config ) => {
    return SaveConfig(config ?? CONFIG);
});

async function SearchUpdate(inBackground = false) {
    let needUpdate = false;

    let modsNeedUpdate, ressourcepackNeedUpdate;

    // Mods
    if (CONFIG.modpack) {
        modsNeedUpdate = await UpdateMods(inBackground, true);
    }
    
    // Ressourcepack
    if (CONFIG.ressourcepack) {
        ressourcepackNeedUpdate = await UpdateRessourcePack(inBackground, true);
    }

    // Others - Configs
    // let emojitypeConfigFile = ReadEnvVariables(path.join(CONFIG.minecraft, '/config/emojitype.json'));
    // let apiEmojitype = await fetch(API + '/others/config/emojitype').then(r => r.json());
    
    // if (fs.existsSync(emojitypeConfigFile)) {
    //     let clientEmojitype = JSON.parse(fs.readFileSync(emojitypeConfigFile, 'utf8'));

    //     let updatedEmojis = clientEmojitype.map(emoji => {
    //         let [name, value] = emoji.split(';');

    //         let foundEmoji = apiEmojitype.find(nEmoji => {
    //             let [nName, nValue] = nEmoji.split(';');
    //             return nName == name;
    //         });

    //         if (foundEmoji) {
    //             return foundEmoji;
    //         } else {
    //             return emoji;
    //         }
    //     });
        
    //     emojisNeedUpdate = ArrayContains(clientEmojitype, updatedEmojis);

    //     if (emojisNeedUpdate) {
    //         if (!inBackground) mainWindow.webContents.send('web-logging', `.\nNew emojis are available!`);
    //         needUpdate = true;
    //     }
    // } else {
    //     if (!inBackground) mainWindow.webContents.send('web-logging', `.\nNo emojitype config detected.`);
    //     needUpdate = true;
    // }

    // Others
    othersNeedUpdate = await UpdateOthers(inBackground, true);
    
    log.info("modsNeedUpdate          :", modsNeedUpdate)
    log.info("ressourcepackNeedUpdate :", ressourcepackNeedUpdate)
    log.info("othersNeedUpdate        :", othersNeedUpdate)
    return modsNeedUpdate || ressourcepackNeedUpdate || othersNeedUpdate;
}

async function ApplyUpdate(inBackground = false) {
    // Mods
    if (CONFIG.modpack) {
        let updated = await UpdateMods(inBackground);
        log.info("Mods successfuly updated :", updated);
        if (!inBackground) mainWindow.webContents.send('web-logging', ``);
    }

    // Ressourcepack
    if (CONFIG.ressourcepack) {
        let updated = await UpdateRessourcePack(inBackground);
        log.info("Ressourcepack successfuly updated :", updated);
        if (!inBackground) mainWindow.webContents.send('web-logging', ``);
    }

    // Others
    if (await UpdateOthers(inBackground, true)) {
        await UpdateOthers(inBackground);
        if (!inBackground) mainWindow.webContents.send('web-logging', ``);
    }
    
}

async function _search_update(fromTray = false) {
    let needUpdate = await SearchUpdate(true);

    if (needUpdate) {
        let notification = new Notification({
            icon: path.join(app.getAppPath(), 'assets/img/pack.png'),
            title: "Update available",
            body: "Update for mods, ressource pack or other config is available!"
        });
    
        notification.on('click', createWindow);
    
        notification.show();
    } else if (fromTray) {
        let notification = new Notification({
            icon: path.join(app.getAppPath(), 'assets/img/pack.png'),
            title: "No Update available",
            body: "You are already up to date :)"
        });
        
        notification.on('click', createWindow);
    
        notification.show();
    }

    return needUpdate;
}

ipcMain.handle("DOMContentLoaded", async ( event ) => {
    mainWindow.webContents.send('web-logging', `KSMP Client Updater v${app.getVersion()}`);
    mainWindow.webContents.send('web-logging', `Made by Wolphwood and beaucoup beaucoup beaucoup de sueur.`);
    mainWindow.webContents.send('web-logging', '');

    
    // let testFilename = path.join(app.getPath("temp"), "test.zip");
    // if (fs.existsSync(testFilename))fs.unlinkSync(testFilename);
    // downloadFile("http://vps.wolphwood.ovh:8080/ksmp-api/ressourcepack/get/normal/2.0", testFilename);
});

ipcMain.handle("update", async ( event ) => {
    mainWindow.webContents.send('web-logging', 'Chekcing for update...\n');
    
    let needUpdate = await SearchUpdate();
    
    
    if (needUpdate) {
        mainWindow.webContents.send('web-logging', '.\nWell, you need an update :)');
    } else {
        mainWindow.webContents.send('web-logging', '.\nWell, you don\'t need an update :)');
    }

    if (!needUpdate) return;

    
    mainWindow.webContents.send('web-logging', '.\n');
    mainWindow.webContents.send('web-logging', 'Updating your datas...\n');
    ApplyUpdate();
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

autoUpdater.on('update-available', () => {
    let notification = new Notification({
        icon: path.join(app.getAppPath(), 'assets/img/pack.png'),
        title: "New Update Available!",
        body: "An update is available for the app."
    });

    notification.on('click', createWindow);

    notification.show();
});

autoUpdater.on('update-downloaded', () => {
    let notification = new Notification({
        icon: path.join(app.getAppPath(), 'assets/img/pack.png'),
        title: "New Update Installed!",
        body: "Restart the app or click on this notification to finish the installation."
    });

    notification.on('click', () => autoUpdater.quitAndInstall());

    notification.show();
});

process.on('uncaughtException', function (error) {
    console.error(error);
    log.error(error);
    BrowserWindow.getAllWindows().forEach(win => win.webContents.send('web-logging-error', error.message));
});
