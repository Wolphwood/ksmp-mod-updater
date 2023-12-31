const fs = require('fs');
const path = require('path');

const { app, BrowserWindow, ipcMain } = require('electron');
const log = require('electron-log');



function WebLog(logtype = '', ...arguments) {
    if (!['normal','error','warning','edit','progress-bar'].includes(logtype)) return;

    return new Promise(rs => {
        BrowserWindow.getAllWindows().forEach(window => {
            ipcMain.once('web-logging-response', (event, uuid) => rs(uuid));
            window.send((logtype == 'normal' ? 'web-logging' : 'web-logging-' + logtype), ...arguments);
        });
    });
}

module.exports.WebLog = WebLog;


async function downloadFileWithProgress(url, folder = './', filename= null, fetched= null) {
    async function downloadStart(options) {
        let { folder, filename } = options ?? {};

        let log = await WebLog('normal', `Downloading file '${filename} ...'`);
        let progress = await WebLog('progress-bar');
        
        return {log, progress};
    }
    function downloadProgess(uuids, value, options) {
        let { folder, filename } = options ?? {};

        return WebLog('progress-bar', { uuid: uuids.progress, value: value * 100 });
    }
    async function downloadFinish(uuids, options = {}) {
        let { folder, filename } = options ?? {};

        let log = await WebLog('edit', uuids.log, `The file '${filename}' is downloaded!`);
        let progress = await WebLog('progress-bar', { uuid: uuids.progress, value: 100 });

        return {log, progress};
    }
    async function downloadError(uuids, error, options) {
        let { folder, filename } = options ?? {};

        await WebLog('edit', uuids.log, `Ouch, an error has occured while downloading the file '${filename}',\nsee error : ${error.message}`, true);
        await WebLog('progress-bar', { uuid: uuids.progress, error: true, message: `:(` });
    }

    const dl = async (url, folder, filename, fetched) => {
        let uuids = null;
        let error;

        const onStart = async (options) => {
            uuids = await downloadStart(options);
            return uuids;
        }
        const onProgress = (value, options) => {
            return downloadProgess(uuids, value, options);
        }
        const onResolve = (options) => {
            return downloadFinish(uuids, options);
        }
        const onError = (err, options) => {
            error = err;
            return downloadError(uuids, err, options);
        }
        
        try {
            await downloadFile(url, folder, filename, onStart, onProgress, onResolve, onError, fetched);
        } catch(err) {
            error = err;
            log.error(err);
        }

        return { uuids, error };
    }

    return dl(url, folder, filename, fetched);
}
module.exports.downloadFileWithProgress = downloadFileWithProgress;


function Wait(ms) {
    return new Promise((rs,re) => {
        setTimeout(rs, ms);
    });
}

module.exports.Wait = Wait;


function ReadEnvVariables(str) {
    return str.replace(/%[^%]+%/gmi, (match) => {
        let key = Object.keys(process.env).find(key => key.toLowerCase() == match.slice(1,-1).toLowerCase());

        return process.env[key];
    });
}

module.exports.ReadEnvVariables = ReadEnvVariables;



const downloadFile = async (url, folder=".", filename= undefined, onStart= null, onProgess= null, onResolve= null, onError= null, fetched=null ) => {
    if (!onStart) (
        onStart = (options) => {}
    )
    if (!onProgess) (
        onProgess = (value, options) => {}
    )
    if (!onResolve) (
        onResolve = (options) => true
    )
    if (!onError) (
        onError = (err) => {
            log.error("FILE DOWLOAD ERROR", url, err);
            return false;
        }
    )

    let promise = new Promise(async (rs, re) => {
        await onStart({folder, filename});
        
        try {
            const res = await (fetched ?? fetch(url));

            if (res.headers.get("content-type") == 'application/json') {
                let data = await res.json();
                
                let error = new Error(data.message);
                error.code = data.error
                
                throw onError(error);
            }

            if (!filename) {
                const header = res.headers.get('content-disposition');
                const parts = header.split(';');
                filename = parts[1].split('=')[1];
                if (/\s/.test(filename)) filename = filename.slice(1,-1);
            }

            const destination = path.resolve(path.join(folder, filename));
            if (fs.existsSync(destination)) {
                throw new Error(`EEXIST: file already exists '${destination}'`);
            }

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
                    await onProgess( fileStream.bytesWritten / res.headers.get('content-length'), {folder, filename} );
                }
            }

            // Close the file stream when finished
            fileStream.end();
            rs({ folder, filename });
        } catch (error) {
            re(error);
        }
    });
    
    return await promise.then(() => onResolve({folder, filename})).catch((error) => onError(error, {folder, filename}));
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