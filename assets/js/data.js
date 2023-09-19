const fs = require('fs');
const path = require('path');

const {mkdir, writeFile} = require("fs/promises");

const { app, BrowserWindow, ipcMain } = require('electron');
const log = require('electron-log');

const API = 'https://vps.wolphwood.ovh/ksmp-api';

const regBasename = /(-for-)*((mc)*([\.+]*[0-9])+)[\-\+]*(beta|fabric|forge|kotlin)*(([ab]\.)*build)*(\.[a-z0-9]*)*/gmi;
const regRemLoader = /[_\-\.\s]+(beta|fabric|forge)*[_\-\.\s]*$/gmi

function LoadConfig() {
    const configPath = path.join(app.getPath("userData"), 'config.json');

    let config = {};

    let default_config = {
        "startMinimized": false,
        "runBackground": true,
        "startWithWindows": false,
        "minecraft": "%appdata%\\.minecraft",
        "modpack": undefined,
        "ressourcepack": undefined,
        "wthit": false,
    };

    try {
        if (fs.existsSync(configPath)) {
            const configFile = fs.readFileSync(configPath, 'utf-8');
            config = JSON.parse(configFile);
        }
        log.info(`Loaded config !`);
    } catch (error) {
        log.error(error);
        console.error(error);
    }

    return Object.assign(default_config, config);
}

module.exports.LoadConfig = LoadConfig;

function SaveConfig(config) {
    const configPath = path.join(app.getPath("userData"), 'config.json');
    
    log.info(`Saved config !`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports.SaveConfig = SaveConfig;

function ReadEnvVariables(str) {
    return str.replace(/%[^%]+%/gmi, (match) => {
        let key = Object.keys(process.env).find(key => key.toLowerCase() == match.slice(1,-1).toLowerCase());

        return process.env[key];
    });
}

module.exports.ReadEnvVariables = ReadEnvVariables;



const downloadFile = async (url, folder=".", onProgess= null, onResolve= null, onError= null) => {
    if (!onProgess) (
        onProgess = (value) => {
            // console.log("DOWLOADING PROGRESS", url, value);
            log.info("DOWLOADING PROGRESS", url, value);
        }
    )
    if (!onResolve) (
        onResolve = () => {
            // console.log("DOWLOADING RESOLVE", url);
            log.info("DOWLOADING RESOLVE", url);
        }
    )
    if (!onError) (
        onError = (err) => {
            // console.error("DOWLOADING ERROR", url, err);
            log.error("DOWLOADING ERROR", url, err);
        }
    )

    // try {
    //     const res = await fetch(url);
    //     const destination = path.resolve(folder);
    //     const fileStream = fs.createWriteStream(destination, { flags: 'wx' });
    //     await finished(Readable.fromWeb(res.body).pipe(fileStream));
    // } catch (e) {
    //     log.error(e);
    //     BrowserWindow.getAllWindows().forEach(win => win.webContents.send('web-logging-error', e.message));
    // }

    let promise = new Promise(async (rs, re) => {
        try {
            const res = await fetch(url);

            if (res.headers.get("Content-Type") == 'application/json') {
                let data = await res.json();
                
                let error = new Error(data.message);
                error.code = data.error
                
                throw onError(error);
            }

            const destination = path.resolve(folder);
            const fileStream = fs.createWriteStream(destination, { flags: 'wx' });
            const reader = res.body.getReader();

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                // console.log(`Received ${value.length} bytes`);
                // log.info(`Received ${value.length} bytes`);

                // Write the chunk to the file
                fileStream.write(value);

                // Call the callback with the current progress
                if (typeof onProgess === 'function') {
                    onProgess( fileStream.bytesWritten / res.headers.get('content-length') );
                }
            }

            // Close the file stream when finished
            fileStream.end();
            rs();
        } catch (error) {
            re(error);
        }
    });

    promise
        .then(() => onResolve())
        .catch((error) => onError(error))
    ;
    return promise;
};

module.exports.downloadFile = downloadFile;


function ArrayAreIdenticals(a,b) {
    return a.length == b.length && a.every((e,i) => b[i] == e);
}

module.exports.ArrayAreIdenticals = ArrayAreIdenticals;

function ArrayAreEquals(a,b) {
    return a.length == b.length && a.every((e) => b.includes(e));
}

module.exports.ArrayAreEquals = ArrayAreEquals;

function ArrayContains(a,b) {
    return a.every((e) => b.includes(e));
}

module.exports.ArrayContains = ArrayContains;


function Wait(ms) {
    return new Promise((rs,re) => {
        setTimeout(rs, ms);
    });
}

module.exports.Wait = Wait;


function mkdirRecursive(dir) {
    let dirs = dir.split(/\//g).filter(d => d);
    for (let i = 0; i < dirs.length; i++) {
        let tdir = dirs.slice(0,i+1).join('/') + "/";
        if (tdir == "./") continue;
        if (fs.existsSync(tdir)) continue;
        fs.mkdirSync(tdir);
    }
}
module.exports.mkdirRecursive = mkdirRecursive;



async function downloadedFileWithProgress(url, folder, filename) {
    function downloadStart() {
        return new Promise((rs, re) => {
            BrowserWindow.getAllWindows().forEach(win => {
                ipcMain.once('web-logging-response', (event, uuid, isError) => rs(uuid));
                win.send('web-logging', `Downloading '${filename}' ...`);
            });
        });
    }
    function downloadProgess(uuid, value) {
        log.info(`Downloading '${filename}' ${Math.round(value*1000)/10}%`);
        BrowserWindow.getAllWindows().forEach(win => win.send('web-logging-edit', uuid, `Downloading '${filename}' ${Math.round(value*1000)/10}%`, false));
    }
    function downloadFinish(uuid) {
        log.info(`The '${filename}' is downloaded!`);
        BrowserWindow.getAllWindows().forEach(win => win.send('web-logging-edit', uuid, `The '${filename}' is downloaded!`, false));
    }
    function downloadError(uuid, error) {
        log.error(`Ouch, an error has occured while downloading the file '${filename}',\nsee error : ${error.message}`, error);
        BrowserWindow.getAllWindows().forEach(win => win.send('web-logging-edit', uuid, `Ouch, an error has occured while downloading the file '${filename}',\nsee error : ${error.message}`, true));
    }

    const dl = async (url, path) => {
        let logUUID = await downloadStart();

        const onProgress = (value) => {
            downloadProgess(logUUID, value);
        }
        const onResolve = () => {
            downloadFinish(logUUID);
        }
        const onError = (error) => {
            downloadError(logUUID, error);
        }
        
        try {
            await downloadFile(url, path, onProgress, onResolve, onError);
        } catch(error) {
            console.error(error);
            log.error(error);
        }
    }

    return dl(url, path.join(folder, filename));
}
module.exports.downloadedFileWithProgress = downloadedFileWithProgress;

async function UpdateMods(inBackground = false, searchOnly = false) {
    let config = LoadConfig();

    let modsLocation = ReadEnvVariables(path.join(config.minecraft, 'mods'));
    if (!fs.existsSync(modsLocation)) mkdirRecursive(modsLocation);
    let needUpdate = false;

    let clientMods = fs.readdirSync(modsLocation).filter(mod => mod.endsWith('.jar'));
    let apiMods = await fetch(API + '/mods/' + config.modpack).then(r => r.json());

    for (let key of Object.keys(apiMods)) {
        let mod = apiMods[key];
        if (!mod) {
            console.error(`Undefined mod '${key}'`);
            continue;
        };

        let file = mod.files.find(file => file.primary);
        if (!file) file = mod.files[0];
        
        let basename = file.filename.slice(0,-4).replace(regBasename, '').replace(regRemLoader, '');

        let foundMod = clientMods.find(filename => {
            let exceptionSodium = basename === "sodium" ? !filename.includes("reese") && !filename.includes("extra") : true; 
            return filename.includes(basename) && exceptionSodium;
        });
        
        if (foundMod) {
            if (foundMod !== file.filename) {
                if (!searchOnly) {
                    log.info(`Updating mod '${foundMod}' to '${file.filename}'`);

                    fs.unlinkSync(path.join(modsLocation, foundMod));
                    if (inBackground) {
                        await downloadFile(file.url, path.join(modsLocation, file.filename));
                    } else {
                        await downloadedFileWithProgress(file.url, modsLocation, file.filename);
                    }
                } else {
                    needUpdate = true;
                }
            }
        } else {
            if (!searchOnly) {
                if (inBackground) {
                    await downloadFile(file.url, path.join(modsLocation, file.filename));
                } else {
                    await downloadedFileWithProgress(file.url, modsLocation, file.filename);
                }
            } else {
                needUpdate = true;
            }
        }
    };

    return searchOnly ? needUpdate : true;
}
module.exports.UpdateMods = UpdateMods;

async function UpdateRessourcePack(inBackground = false, searchOnly = false) {
    let config = LoadConfig();

    let ressourcepackLocation = ReadEnvVariables(path.join(config.minecraft, 'resourcepacks'));
    if (!fs.existsSync(ressourcepackLocation)) mkdirRecursive(ressourcepackLocation);
    let needUpdate = false;
        
    let apiPacks = await fetch(API + '/ressourcepack/list').then(r => r.json());
    if (apiPacks[config.ressourcepack].length == 0) {
        if (!inBackground) return BrowserWindow.getAllWindows().forEach(win => win.webContents.send('web-logging-error', `No pack found for the category '${config.ressourcepack}'.`));
    }

    let Regs = {
        "normal": RegExp('^Kermit SMP v(\\.*[0-9])+', 'gi'),
        "low": RegExp('^Kermit SMP v(\\.*[0-9])+ - LOW', 'gi'),
        "ultra-low": RegExp('^Kermit SMP v(\\.*[0-9])+ - ULTRA LOW', 'gi'),
    }

    let clientPacks = fs.readdirSync(ressourcepackLocation).filter(mod => mod.endsWith('.zip'));
    let clientKermitPack = clientPacks.find(pack => Regs[config.ressourcepack].test(pack) && !['patch','special'].some(k => pack.toLowerCase().includes(k)));

    if (clientKermitPack) {
        let clientKermitPackVersion = clientKermitPack.match(/v(\.*[0-9]+)+/gi)[0].slice(1);

        if (apiPacks[config.ressourcepack][0].version !== clientKermitPackVersion) {
            if (!searchOnly) {
                log.info(`Updating ressource pack '${clientKermitPackVersion}' to '${apiPacks[config.ressourcepack][0].version}'`);
                
                fs.unlinkSync(path.join(ressourcepackLocation, clientKermitPack));
                if (inBackground) {
                    await downloadFile(API + `/ressourcepack/get/${config.ressourcepack}/latest`, ressourcepackLocation, apiPacks[config.ressourcepack][0].filename);
                } else {
                    await downloadedFileWithProgress(API + `/ressourcepack/get/${config.ressourcepack}/latest`, ressourcepackLocation, apiPacks[config.ressourcepack][0].filename);
                }
            } else {
                needUpdate = true;
            }
        }
    } else {
        if (!searchOnly) {
            if (inBackground) {
                await downloadFile(API + `/ressourcepack/get/${config.ressourcepack}/latest`, ressourcepackLocation, apiPacks[config.ressourcepack][0].filename);
            } else {
                await downloadedFileWithProgress(API + `/ressourcepack/get/${config.ressourcepack}/latest`, ressourcepackLocation, apiPacks[config.ressourcepack][0].filename);
            }
        } else {
            needUpdate = true;
        }
    }
    
    return searchOnly ? needUpdate : true;
}
module.exports.UpdateRessourcePack = UpdateRessourcePack;



async function UpdateOthers(inBackground = false, searchOnly = false) {
    let config = LoadConfig();

    let configLocation = path.join(config.minecraft, '/config');
    
    const __update_emojitype_config = async (inBackground = false, searchOnly = false) => {
        let emojitypeConfigFile = ReadEnvVariables(path.join(configLocation, 'emojitype.json'));
        let apiEmojitype = await fetch(API + '/others/config/emojitype').then(r => r.json());

        let clientEmojis = fs.existsSync(emojitypeConfigFile) ? JSON.parse(fs.readFileSync(emojitypeConfigFile, 'utf-8')) : [];
        let newEmojisList = [...clientEmojis];
        let newEmoji = [];
        let editedEmoji = [];

        if (searchOnly) {
            return !apiEmojitype.every(emoji => {

                let [name, value] = emoji.split(";")
                if (!clientEmojis.includes(emoji)) console.log(`MISSING '${name};\\u${value.charCodeAt(0).toString(16).toUpperCase()}'`)

                return clientEmojis.includes(emoji)
            });
        }

        for (let emoji of apiEmojitype) {
            if (!clientEmojis.includes(emoji)) {
                let [name, value] = emoji.split(';');
                let index = clientEmojis.findIndex(ce => ce.startsWith(name+";"));
                
                if (index >= 0) {
                    editedEmoji.push({old: newEmojisList[index], new: emoji, index });
                    newEmojisList[index] = emoji;
                } else {
                    newEmoji.push({emoji, index: newEmoji.length});
                    newEmojisList.push(emoji);
                }
            }
        }

        fs.writeFileSync(emojitypeConfigFile, JSON.stringify(newEmojisList, null, 2).replace(/[\uE001-\uFFFF]/g, (chr) => {
            return '\\u' + ('0000' + chr.charCodeAt(0).toString(16)).slice(-4);
        }));

        if (!inBackground) BrowserWindow.getAllWindows().forEach(win => win.send('web-logging', `New emojis : ${newEmoji.length}.\nEdited Emojis : ${editedEmoji.length}`));
        log.info(newEmoji);
        log.info(editedEmoji);


        return true;
    }













    if (searchOnly) {
        let emojiType = await __update_emojitype_config(inBackground, true);

        return emojiType;
    } else {
        await __update_emojitype_config(inBackground);
    }
}

module.exports.UpdateOthers = UpdateOthers;