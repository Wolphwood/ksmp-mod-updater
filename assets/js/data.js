const fs = require('fs');
const path = require('path');

const {mkdir, writeFile} = require("fs/promises");
const { Readable } = require('stream');
const { finished } = require('stream/promises');

const { app } = require('electron');

function LoadConfig() {
    const configPath = path.join(app.getPath("userData"), 'config.json');
    console.log(configPath);

    let config;

    let default_config = {
        "startMinimized": false,
        "runBackground": true,
        "startWithWindows": false,
        "minecraft": "%appdata%\\.minecraft",
        "modpack": undefined,
        "ressourcepack": undefined
    };

    try {
        if (fs.existsSync(configPath)) {
            const configFile = fs.readFileSync(configPath, 'utf-8');
            config = JSON.parse(configFile);
        }
    } catch (error) {
        console.error(error);
    }

    return config ?? default_config;
}

module.exports.LoadConfig = LoadConfig;

function SaveConfig(config) {
    const configPath = path.join(app.getPath("userData"), 'config.json');

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



const downloadFile = (async (url, folder=".") => {
    const res = await fetch(url);
    // if (!fs.existsSync("downloads")) await mkdir("downloads"); //Optional if you already have downloads directory
    const destination = path.resolve(folder);
    const fileStream = fs.createWriteStream(destination, { flags: 'wx' });
    await finished(Readable.fromWeb(res.body).pipe(fileStream));
});

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