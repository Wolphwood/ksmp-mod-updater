const path = require('path');
const fs = require('fs');

const { ReadEnvVariables, downloadFileWithProgress, downloadFile } = require('./functions');
const { GetConfigFromApp, CallAPI } = require('../../../app');

let SearchRessourcepackUpdate, SearchShaderpackUpdate, SearchConfigUpdate;

const regBasename = /(-for-)*((mc)*([\.+]*[0-9])+)[\-\+]*(beta|fabric|forge|kotlin)*(([ab]\.)*build)*(\.[a-z0-9]*)*/gmi;
const regRemLoader = /[_\-\.\s]+(beta|fabric|forge)*[_\-\.\s]*$/gmi



async function SearchModUpdate() {
    let config = GetConfigFromApp();

    let MODS = await CallAPI(`/mods/${config.modpack}`);
    let loader = await CallAPI(`/loader/${config.modpack}`);

    let gameFolder = ReadEnvVariables(config.minecraft);

    let modsFolder = ReadEnvVariables(path.join(gameFolder, 'mods'));

    let clientMods = fs.readdirSync(modsFolder).filter(mod => mod.endsWith('.jar'));

    let needUpdate = false;

    for (MOD of MODS) {
        let installedVersion = MOD.versions.find(version => {
            return clientMods.includes(version.files[0].filename) && version.game_versions.includes(config.game_version) &&  version.loaders.includes(loader);
        });

        let AvailableVersions = MOD.versions.filter(version => version.game_versions.includes(config.game_version) &&  version.loaders.includes(loader));
        let requiredVersion = (config.mods[config.modpack][MOD.slug] ?? 'latest') == 'latest'
            ? AvailableVersions[0]
            : AvailableVersions.find(v => v.version == config.mods[config.modpack][MOD.slug])
        ;

        if (installedVersion) {
            if (requiredVersion.files[0].filename != installedVersion.files[0].filename) {
                needUpdate = true;
            }
        } else {
            needUpdate = true;
        }
    }

    return needUpdate;
}

async function ApplyModUpdate() {
    let config = GetConfigFromApp();

    let MODS = await CallAPI(`/mods/${config.modpack}`);
    let loader = await CallAPI(`/loader/${config.modpack}`);

    let gameFolder = ReadEnvVariables(config.minecraft);

    let modsFolder = ReadEnvVariables(path.join(gameFolder, 'mods'));

    let clientMods = fs.readdirSync(modsFolder).filter(mod => mod.endsWith('.jar'));

    let UpdatedMods = 0;
    let InstalledMods = 0;

    for (MOD of MODS) {
        let installedVersion = MOD.versions.find(version => {
            return clientMods.includes(version.files[0].filename) && version.game_versions.includes(config.game_version) &&  version.loaders.includes(loader);
        });

        let AvailableVersions = MOD.versions.filter(version => version.game_versions.includes(config.game_version) &&  version.loaders.includes(loader));
        let requiredVersion = (config.mods[config.modpack][MOD.slug] ?? 'latest') == 'latest'
            ? AvailableVersions[0]
            : AvailableVersions.find(v => v.version == config.mods[config.modpack][MOD.slug])
        ;

        if (installedVersion) {
            // console.log(installedVersion.version, requiredVersion.version, installedVersion.version != requiredVersion.version);
            if (requiredVersion.files[0].filename != installedVersion.files[0].filename) {
                fs.unlinkSync(path.join(modsFolder, installedVersion.files[0].filename));
                await downloadFileWithProgress(requiredVersion.files[0].url, modsFolder, requiredVersion.files[0].filename);
                UpdatedMods++;
            }
        } else {
            await downloadFileWithProgress(requiredVersion.files[0].url, modsFolder, requiredVersion.files[0].filename);
            InstalledMods++;
        }
    }

    return {
        updated: UpdatedMods,
        installed: InstalledMods
    };
}



// console.log(GetConfigFromApp())



module.exports = { SearchModUpdate, ApplyModUpdate, SearchRessourcepackUpdate, SearchShaderpackUpdate, SearchConfigUpdate };