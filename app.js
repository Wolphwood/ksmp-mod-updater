const { app, BrowserWindow, Tray, Menu, dialog, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

module.exports = {
    AppDirectory: __dirname
};

const { LoadConfig, SaveConfig, ReadEnvVariables, downloadFile, ArrayContains } = require('./assets/js/data');

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
        icon:'./assets/img/pack.png',
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools();
}

function createTray() {
    const tray = new Tray( __dirname + '/assets/img/pack.png');
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
    app.setLoginItemSettings({
        openAtLogin: value,
        path: app.getPath("exe")
    });
}

app.setLoginItemSettings({
    openAtLogin: CONFIG.startWithWindows
});

app.whenReady().then(() => {
    createTray();
    if (!CONFIG.startMinimized) createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    if (CONFIG.runBackground) {
        _search_update();
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
            icon: "./assets/img/pack.png",
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
    console.log(key, value);

    if (key == "startWithWindows") {
        setStarupAtLogin(value);
    }
    
    CONFIG[key] = value;
    return CONFIG;
});

ipcMain.handle("save-config", ( event, config ) => {
    return SaveConfig(config ?? CONFIG);
});


const API = 'http://vps.wolphwood.ovh:8080/ksmp-api';

const regBasename = /(-for-)*((mc)*([\.+]*[0-9])+)[\-\+]*(beta|fabric|forge)*(b\.build)*(\.[a-z0-9]*)*/gmi;
const regRemLoader = /[_\-\.\s]+(beta|fabric|forge)*[_\-\.\s]*$/gmi

async function SearchUpdate(inBackground = false) {
    let needUpdate = false;

    // Mods
    if (CONFIG.modpack) {
        let clientMods = fs.readdirSync(ReadEnvVariables(path.join(CONFIG.minecraft, 'mods'))).filter(mod => mod.endsWith('.jar'));
        let apiMods = await fetch(API + '/mods/' + CONFIG.modpack).then(r => r.json());

        Object.keys(apiMods).forEach(key => {
            let mod = apiMods[key];
            if (!mod) return;

            let file = mod.files.find(file => file.primary);
            if (!file) file = mod.files[0];

            let basename = file.filename.slice(0,-4).replace(regBasename, '').replace(regRemLoader, '');

            let foundMod = clientMods.find(filename => filename.includes(basename));
            if (foundMod) {
                if (foundMod !== file.filename) {
                    needUpdate = true;
                    if (!inBackground) mainWindow.webContents.send('web-logging', `Update found for the mod '${basename}'.`);
                } else {
                    if (!inBackground) mainWindow.webContents.send('web-logging', `Mod '${basename}' is up to date.`);
                }
            } else {
                needUpdate = true;
                if (!inBackground) mainWindow.webContents.send('web-logging', `Mod '${basename}' not found, need to be downloaded.`);
            }
        });
    }

    // Ressourcepack
    if (CONFIG.ressourcepack) {
        let clientPacks = fs.readdirSync(ReadEnvVariables(path.join(CONFIG.minecraft, 'resourcepacks'))).filter(mod => mod.endsWith('.zip'));

        let clientKermitPack = clientPacks.find(pack => RegExp('^Kermit SMP v(\\.*[0-9])+', 'gi').test(pack) && !['patch','special'].some(k => pack.toLowerCase().includes(k)));
        if (clientKermitPack) {
            let clientKermitPackVersion = clientKermitPack.match(/v(\.*[0-9]+)+/gi)[0].slice(1);
            let apiPacks = await fetch(API + '/ressourcepack/list').then(r => r.json());
            
            if (apiPacks[CONFIG.ressourcepack][0].version !== clientKermitPackVersion) {
                needUpdate = true;
                if (!inBackground) mainWindow.webContents.send('web-logging', `.\nNew ressourcepack is available!`);
            }
        } else {
            needUpdate = true;
        }
    }

    // Others - Configs
    let emojitypeConfigFile = ReadEnvVariables(path.join(CONFIG.minecraft, '/config/emojitype.json'));
    let apiEmojitype = await fetch(API + '/others/config/emojitype').then(r => r.json());
    
    if (fs.existsSync(emojitypeConfigFile)) {
        let clientEmojitype = JSON.parse(fs.readFileSync(emojitypeConfigFile, 'utf8'));

        let updatedEmojis = clientEmojitype.map(emoji => {
            let [name, value] = emoji.split(';');

            let foundEmoji = apiEmojitype.find(nEmoji => {
                let [nName, nValue] = nEmoji.split(';');
                return nName == name;
            });

            if (foundEmoji) {
                return foundEmoji;
            } else {
                return emoji;
            }
        });
        
        emojisNeedUpdate = ArrayContains(clientEmojitype, updatedEmojis);

        if (emojisNeedUpdate) {
            if (!inBackground) mainWindow.webContents.send('web-logging', `.\nNew emojis are available!`);
            needUpdate = true;
        }
    } else {
        if (!inBackground) mainWindow.webContents.send('web-logging', `.\nNo emojitype config detected.`);
        needUpdate = true;
    }

    return needUpdate;
}

async function ApplyUpdate(inBackground = false) {
    // Mods
    if (CONFIG.modpack) {
        let modsLocation = ReadEnvVariables(path.join(CONFIG.minecraft, 'mods'));

        let clientMods = fs.readdirSync(modsLocation).filter(mod => mod.endsWith('.jar'));
        let apiMods = await fetch(API + '/mods/' + CONFIG.modpack).then(r => r.json());

        Object.keys(apiMods).forEach(key => {
            let mod = apiMods[key];
            if (!mod) return;

            let file = mod.files.find(file => file.primary);
            if (!file) file = mod.files[0];

            let basename = file.filename.slice(0,-4).replace(regBasename, '').replace(regRemLoader, '');

            let foundMod = clientMods.find(filename => filename.includes(basename));
            if (foundMod) {
                if (foundMod !== file.filename) {
                    fs.unlinkSync(path.join(modsLocation, foundMod));
                    
                    downloadFile(file.url, path.join(modsLocation, file.filename));
                    
                    if (!inBackground) mainWindow.webContents.send('web-logging', `Updating '${basename}' ...`);
                }
            } else {
                downloadFile(file.url, path.join(modsLocation, file.filename));
                if (!inBackground) mainWindow.webContents.send('web-logging', `Downloading '${basename}' ...`);
            }
        });
    }

    // Ressourcepack
    if (CONFIG.ressourcepack) {
        let ressourcepackLocation = ReadEnvVariables(path.join(CONFIG.minecraft, 'resourcepacks'));

        let clientPacks = fs.readdirSync(ressourcepackLocation).filter(mod => mod.endsWith('.zip'));
        let clientKermitPack = clientPacks.find(pack => RegExp('^Kermit SMP v(\\.*[0-9])+', 'gi').test(pack) && !['patch','special'].some(k => pack.toLowerCase().includes(k)));
        if (clientKermitPack) {
            let clientKermitPackVersion = clientKermitPack.match(/v(\.*[0-9]+)+/gi)[0].slice(1);
            let apiPacks = await fetch(API + '/ressourcepack/list').then(r => r.json());
            

            if (apiPacks[CONFIG.ressourcepack][0].version !== clientKermitPackVersion) {
                fs.unlinkSync(path.join(ressourcepackLocation, clientKermitPack));
                downloadFile(API + `/ressourcepack/get/${CONFIG.ressourcepack}/last`, path.join(ressourcepackLocation, apiPacks[CONFIG.ressourcepack][0].filename));
                if (!inBackground) mainWindow.webContents.send('web-logging', `.\nUpdating '${apiPacks[CONFIG.ressourcepack][0].filename}' ...`);
            }
        } else {
            let apiPacks = await fetch(API + '/ressourcepack/list').then(r => r.json());
            downloadFile(API + `/ressourcepack/get/${CONFIG.ressourcepack}/last`, path.join(ressourcepackLocation, apiPacks[CONFIG.ressourcepack][0].filename));
            if (!inBackground) mainWindow.webContents.send('web-logging', `.\nDownloading '${apiPacks[CONFIG.ressourcepack][0].filename}' ...`);
        }
    }
    
    // Others - Configs
    let emojitypeConfigFile = ReadEnvVariables(path.join(CONFIG.minecraft, '/config/emojitype.json'));
    let apiEmojitype = await fetch(API + '/others/config/emojitype').then(r => r.json());

    if (fs.existsSync(emojitypeConfigFile)) {
        let clientEmojitype = JSON.parse(fs.readFileSync(emojitypeConfigFile, 'utf8'));

        let updatedEmojis = clientEmojitype.map(emoji => {
            let [name, value] = emoji.split(';');

            let foundEmoji = apiEmojitype.find(nEmoji => {
                let [nName, nValue] = nEmoji.split(';');
                return nName == name;
            });

            if (foundEmoji) {
                return foundEmoji;
            } else {
                return emoji;
            }
        });
        
        if (ArrayContains(clientEmojitype, updatedEmojis)) {
            fs.writeFileSync(emojitypeConfigFile, JSON.stringify(updatedEmojis, null, 2));
            if (!inBackground) mainWindow.webContents.send('web-logging', `.\nUpdating emojitype config...`);
        }
    } else {
        fs.writeFileSync(emojitypeConfigFile, JSON.stringify(apiEmojitype, null, 2));
        if (!inBackground) mainWindow.webContents.send('web-logging', `.\nCreating emojitype config...`);
    }

}

async function _search_update(fromTray = false) {
    let needUpdate = await SearchUpdate(true);

    if (needUpdate) {
        let notification = new Notification({
            icon: "./assets/img/pack.png",
            title: "Update available",
            body: "Update for mods, ressource pack or other config is available!"
        });
    
        notification.on('click', createWindow);
    
        notification.show();
    } else if (fromTray) {
        let notification = new Notification({
            icon: "./assets/img/pack.png",
            title: "No Update available",
            body: "You are already up to date :)"
        });
        
        notification.on('click', createWindow);
    
        notification.show();
    }
}

ipcMain.handle("update", async ( event ) => {
    mainWindow.webContents.send('web-logging', 'Chekcing for update...\n.');
    
    let needUpdate = await SearchUpdate();
    
    
    if (needUpdate) {
        mainWindow.webContents.send('web-logging', '.\nWell, you need an update :)');
    } else {
        mainWindow.webContents.send('web-logging', '.\nWell, you don\'t need an update :)');
    }

    if (!needUpdate) return;

    
    mainWindow.webContents.send('web-logging', '.\n.');
    mainWindow.webContents.send('web-logging', 'Updating your datas...\n.');
    ApplyUpdate();
});

ipcMain.handle("select-dir", async ( event ) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.filePaths.pop();
});