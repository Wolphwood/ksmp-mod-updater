let { ipcRenderer } = require("electron");


const InputGameFolder = document.querySelector("#gamefolder");

const InputModpack = document.querySelector("#modpack");
const InputModpackOptions = Array.from(InputModpack.querySelectorAll("option"));

const InputRessourcePack = document.querySelector("#ressourcepack");
const InputRessourcePackOptions = Array.from(InputRessourcePack.querySelectorAll("option"));

const InputStartWithWindows = document.querySelector("#start-win");
const InputStartMinimized = document.querySelector("#start-minimized");
const InputRunBackground = document.querySelector("#allow-run-background");

const [ButtonFolder, ButtonMAJ, ButtonSave] = document.querySelectorAll("button");

// console.log(remote)
// const config = remote.getGlobal( "CONFIG" );




window.addEventListener('DOMContentLoaded', async () => {
    await ipcRenderer.invoke("DOMContentLoaded");
    
    let config = await ipcRenderer.invoke("get-config");

    if (!config.wthit) {
        document.querySelectorAll('#wthit, .wthit, [value=wthit]').forEach(element => element.remove());
    }

    ButtonFolder.addEventListener('click', async (event) => {
        event.preventDefault();

        let result = await ipcRenderer.invoke('select-dir');

        InputGameFolder.value = result;
    });

    // RESTORE CONFIG
    InputGameFolder.value = config.minecraft;

    let modpackOption = InputModpackOptions.findIndex(option => option.value == config.modpack);
    if (modpackOption != -1) InputModpack.selectedIndex = modpackOption;
    
    let ressourcepackOption = InputRessourcePackOptions.findIndex(option => option.value == config.ressourcepack);
    if (ressourcepackOption != -1) InputRessourcePack.selectedIndex = ressourcepackOption;

    if (InputStartWithWindows) InputStartWithWindows.checked = config.startWithWindows;

    if (InputStartMinimized) InputStartMinimized.checked = config.startMinimized;

    if (InputRunBackground) InputRunBackground.checked = config.runBackground;

    // HANDLE CHANGE
    [InputGameFolder, InputModpack, InputRessourcePack, InputStartMinimized, InputRunBackground, InputStartWithWindows].forEach(element => {
        if (!element) return;

        element.addEventListener('change', () => {
            let key = element.getAttribute('c');
            
            if (element.tagName == 'INPUT' && element.type == "checkbox") {
                ipcRenderer.invoke('set-config', key, element.checked);
            } else if (!element.value || element.value == 'null' || element.value == 'none' || element.value == 'undefined' ) {
                ipcRenderer.invoke('set-config', key, null);
            } else {
                ipcRenderer.invoke('set-config', key, element.value);
            }
        });
    });
    
    // HANDLE SAVE CONFIG
    ButtonSave?.addEventListener("click", async (e) => {
        e.preventDefault();
        ipcRenderer.invoke('save-config');
    });

    // HANDLE SAVE CONFIG
    ButtonMAJ?.addEventListener("click", async (e) => {
        e.preventDefault();
        ipcRenderer.invoke('update');
    });
});


function wthit() {
    ipcRenderer.invoke('wthit');
}



const LogDiv = document.querySelector('div.logging');

ipcRenderer.on('web-logging', function (event, message) {    
    let div = document.createElement('div');

    message.split('\n').forEach(line => {
        let p = document.createElement('p');
        p.textContent = line;

        div.appendChild(p);
    });

    LogDiv.appendChild(div);
});

ipcRenderer.on('web-logging-error', function (event, message) {    
    let div = document.createElement('div');
    div.classList.add("error");

    message.split('\n').forEach(line => {
        let p = document.createElement('p');
        p.textContent = line;

        div.appendChild(p);
    });

    LogDiv.appendChild(div);
});




