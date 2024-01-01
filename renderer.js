// let { ipcRenderer } = require("electron");

let MinecraftVersion = '1.20.1';

// Fully load signal
window.addEventListener('DOMContentLoaded', async () => {
    let hello = await ipcRenderer.invoke('api', 'hello');

    let config =  await ipcRenderer.invoke("get-config");

    if (!hello.error) {
        // #region --- SETUP & HANDLE FORMS ---
        // Init input game folder
        document.querySelectorAll('input[name="game-folder"]').forEach((element, index, elements) => {
            element.value = config.minecraft;

            element.parentElement.querySelector('svg').addEventListener('click', async (event) => {
                event.preventDefault();
                
                let SelectedPath = await ipcRenderer.invoke('select-dir');
                if (!SelectedPath) return;
                
                let config = await ipcRenderer.invoke("get-config");
                config.minecraft = SelectedPath;
                await ipcRenderer.invoke("set-config", config);

                elements.forEach((e,i) => {
                    e.value = SelectedPath;
                });
            });
            
            element.addEventListener('change', async (event) => {
                let config = await ipcRenderer.invoke("get-config");
                config.minecraft = element.value;
                await ipcRenderer.invoke("set-config", config);

                elements.forEach((e,i) => {
                    if (i !== index) e.value = element.value;
                });
            });
        });

        // Init select modpack
        let modpacks = await ipcRenderer.invoke("api", "/mods/");
        document.querySelectorAll('select[name="modpack"]').forEach((element, index, elements) => {
            element.addEventListener('change', (event) => {
                CreateModList(element.value);

                elements.forEach((e,i) => {
                    if (i !== index) e.value = element.value;
                });
            });

            let fragment = document.createDocumentFragment();
            modpacks.forEach(modpack => {
                let option = document.createElement('option');
                option.setAttribute('value', modpack);
                option.innerText = modpack.slice(0,1).toUpperCase() + modpack.slice(1).toLowerCase();
                
                fragment.appendChild(option);
            });

            element.appendChild(fragment);

            element.value = config.modpack ?? null;
        });
        
        // Init select ressourcepack
        let ressourcepacks = await ipcRenderer.invoke("api", "/ressourcepack/");
        document.querySelectorAll('select[name="ressourcepack"]').forEach((element, index, elements) => {
            element.addEventListener('change', (event) => {
                elements.forEach((e,i) => {
                    if (i !== index) e.value = element.value;
                }); 
            });

            let fragment = document.createDocumentFragment();
            ressourcepacks.filter(ressourcepack => {
                let whthit = ressourcepack == 'wthit' ? config.wthit : true;

                return whthit;
            }).forEach(ressourcepack => {
                let option = document.createElement('option');
                option.setAttribute('value', ressourcepack);
                option.innerText = ressourcepack.slice(0,1).toUpperCase() + ressourcepack.slice(1).toLowerCase();
                
                fragment.appendChild(option);
            });

            element.appendChild(fragment);

            element.value = config.ressourcepack ?? null;
        });

        // Init select shaderpack
        let shaderpacks = await ipcRenderer.invoke("api", "/shaderpack/");
        document.querySelectorAll('select[name="shaderpack"]').forEach((element, index, elements) => {
            element.addEventListener('change', (event) => {
                elements.forEach((e,i) => {
                    if (i !== index) e.value = element.value;
                });
            });

            let fragment = document.createDocumentFragment();
            shaderpacks.forEach(shaderpack => {
                let option = document.createElement('option');
                option.setAttribute('value', shaderpack);
                option.innerText = shaderpack;
                
                fragment.appendChild(option);
            });

            element.appendChild(fragment);
            
            element.value = config.shaderpack ?? null;
        });
        // #endregion

        // Init mod list
        await CreateModList(config.modpack);
    }

    let api_url = `${config?.api?.url ?? 'https://vps.wolphwood.ovh'}/${config?.api?.home ?? 'ksmp-api'}/v2/`;
    
    document.querySelectorAll('.page[page="ressourcepack"]').forEach(async (page) => {
        let fragment = document.createDocumentFragment();

        let packs = await ipcRenderer.invoke("api", `/ressourcepack/`);
        for (pack of packs.slice(0,-1)) {
            
            let title = document.createElement('h3');
            title.innerText = `Ressourcepack ${pack}`;
            fragment.appendChild(title);

            let versions = await ipcRenderer.invoke("api", `/ressourcepack/${pack}`);
            for (version of versions) {
                let p = document.createElement('p');
                p.innerText = `[${version.filename}](${api_url}/ressourcepack/${pack}/${version.version})`
                p.innerHTML = parseMarkdownLink(p);
                fragment.appendChild(p);
            }
            
            let br = document.createElement('br');
            fragment.appendChild(br);
        }

        page.appendChild(fragment);
    });

    document.querySelectorAll('.page[page="shaderpack"]').forEach(async (page) => {
        let fragment = document.createDocumentFragment();

        let shaders = await ipcRenderer.invoke("api", `/shaderpack/`);
        for (shader of shaders) {
            let title = document.createElement('h3');
            title.innerText = `Shaderpack ${shader}`;
            fragment.appendChild(title);

            let shaderVersions = await ipcRenderer.invoke("api", `/shaderpack/${shader}`);
            
            for (shaderVersion of shaderVersions) {
                let p = document.createElement('p');
                p.innerText = `[${shader} v${shaderVersion}](${api_url}/shaderpack/${shader}/${shaderVersion})`
                p.innerHTML = parseMarkdownLink(p);
                fragment.appendChild(p);
                
                let shaderConfigs = await ipcRenderer.invoke("api", `/config/shaderpack/${shader}/${shaderVersion}`);
                
                for (shaderConfig of shaderConfigs) {
                    let p = document.createElement('p');
                    p.innerText = ` → [${shaderConfig}](${api_url}/config/shaderpack/${shader}/${shaderVersion}/${shaderConfig})`;
                    p.innerHTML = parseMarkdownLink(p);
                    fragment.appendChild(p);
                }
            }
            

            
            let br = document.createElement('br');
            fragment.appendChild(br);
        }

        page.appendChild(fragment);
    });

    // #region --- HANDLERS ---
    // Handle Links
    document.querySelectorAll('a:not([handled])').forEach(a => HandleLink(a));

    // Unfocus custom select
    document.querySelectorAll("select").forEach(element => {
        element.addEventListener('click', () => {
            element.blur();
        });
    });

    // Save Button
    document.querySelectorAll('.input.button .wrapper[name="save"]').forEach(wrapper => {
        let element = wrapper.parentElement;

        element.addEventListener('click', () => {
            if (element.classList.contains('click')) return;

            SaveConfig();
            
            element.classList.add('click');
            Wait(150).then(() => element.classList.remove('click'));
        });
    });
    // #endregion

    await ipcRenderer.invoke("DOMContentLoaded");
});

async function CreateModList(modpack) {
    if (!modpack || modpack == "null") {
        let modsFragment = document.createDocumentFragment();

            let gridContainer = document.createElement('div');
            gridContainer.classList.add('grid-container', 'cols-1', 'w-90', 'mod');
            
            let gridItem = document.createElement('div');
            gridItem.classList.add('grid-item', 'full-width-item', 'center-content');

            let infosContainer = document.createElement('div');
            infosContainer.classList.add('infos', 'center-content');

            let infoP = document.createElement('p');
            infoP.innerText = `Please, select a modpack !`;
            infoP.innerHTML = parseMarkdownLink(infoP);

            modsFragment.appendChild(gridContainer);
                gridContainer.appendChild(gridItem);
                    gridItem.appendChild(infosContainer);
                        infosContainer.appendChild(infoP);
        
        return document.querySelectorAll('.mods').forEach(div => {
            while (div.firstChild) {
                div.removeChild(div.lastChild);
            }

            let fragment = modsFragment.cloneNode(true);
            fragment.querySelectorAll('a:not([handled])').forEach(a => HandleLink(a));
            div.appendChild(fragment);
        });
    }


    let config =  await ipcRenderer.invoke("get-config");
    if (!config.mods[modpack]) config.mods[modpack] = {};

    let loader = await ipcRenderer.invoke("api", `/loader/${modpack}`);
    let modlist = await ipcRenderer.invoke("api", `/mods/${modpack}/list`);
    let mods = await ipcRenderer.invoke("api", `/mods/${modpack}`);
    mods.sort((a,b) => a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);

    let missingMods = modlist.filter(slug => !mods.find(mod => mod.slug == slug));
    
    let modsFragment = document.createDocumentFragment();

    missingMods.forEach(slug => {
        let gridContainer = document.createElement('div');
        gridContainer.classList.add('grid-container', 'w-90', 'mod');
        
        let gridItem = document.createElement('div');
        gridItem.classList.add('grid-item', 'full-width-item');
        
        let modIcon = document.createElement('img');
        modIcon.src = './assets/img/mods/unknown_icon.png';

        let infosContainer = document.createElement('div');
        infosContainer.classList.add('infos');

        let infoP = document.createElement('p');
        infoP.innerText = `'${slug}' is missing. Try to find it on [Curseforge](https://www.curseforge.com/minecraft/search?page=1&pageSize=20&sortType=1&class=mc-mods&search=${slug.replace(/\s+/gmi, '+')}) or [Modrinth](https://modrinth.com/mods?q=${slug.replace(/\s+/gmi, '+')}).`;
        infoP.innerHTML = parseMarkdownLink(infoP);

        modsFragment.appendChild(gridContainer);
            gridContainer.appendChild(gridItem);
                gridItem.appendChild(modIcon);
                gridItem.appendChild(infosContainer);
                    infosContainer.appendChild(infoP);
    });


    let filteredMods = mods.filter(mod => mod.game_versions.includes(MinecraftVersion) && mod.loaders.includes(loader) );
    for (let mod of filteredMods) {
        let owner = mod.team.find(member => member.role == 'owner');
        let filteredVersions = mod.versions.filter(mod_version => mod_version.game_versions.includes(MinecraftVersion) && mod_version.loaders.includes(loader));
        
        let [gridContainer, gridItem1, gridItem2, infosContainer, inputSelect ] = Array.from(Array(5), () => document.createElement('div'));

        gridContainer.classList.add('grid-container', 'w-90', 'mod');
        gridContainer.setAttribute('mod', mod.slug);
            gridItem1.classList.add('grid-item');
            let modIcon = document.createElement('img');
            modIcon.src = mod.icon;
            infosContainer.classList.add('infos');
                let infoSVG = await LoadSVG("./assets/img/svg/about.svg");
                let selectSVG = await LoadSVG("./assets/img/svg/expand.svg");
                let infoP = document.createElement('p');
                if (mod.plateform == 'modrinth') {
                    infoP.innerText = `[${mod.name}](https://modrinth.com/mod/${mod.slug}) by [${owner.name ?? owner.username}](https://modrinth.com/user/${owner.username})`;
                } else {
                    infoP.innerText = `${mod.name} by ${owner.name ?? owner.username}`;
                }
            
            gridItem2.classList.add('grid-item');
                inputSelect.classList.add('input', 'select');
                let select = document.createElement('select');
                    let defaultOption = document.createElement('option');
                    defaultOption.value = 'latest';
                    defaultOption.innerText = 'Latest';
                    select.appendChild(defaultOption);

                    filteredVersions.forEach(mod_version => {
                        let option = document.createElement('option');
                        option.value = mod_version.version;
                        option.innerText = mod_version.name;
                        select.appendChild(option);
                    });
        
        infoP.innerHTML = parseMarkdownLink(infoP);

        modsFragment.append(gridContainer);
         gridContainer.appendChild(gridItem1);
          gridItem1.appendChild(modIcon);
          gridItem1.appendChild(infosContainer);
           infosContainer.appendChild(infoSVG);
           infosContainer.appendChild(infoP);

        gridContainer.appendChild(gridItem2);
         gridItem2.appendChild(inputSelect);
          inputSelect.appendChild(select);
          inputSelect.appendChild(selectSVG);
    };

    document.querySelectorAll('.mods').forEach(div => {
        while (div.firstChild) {
            div.removeChild(div.lastChild);
        }
        
        let fragment = modsFragment.cloneNode(true);
        fragment.querySelectorAll('a:not([handled])').forEach(a => HandleLink(a));
        
        div.appendChild(fragment);

        div.querySelectorAll('.mod').forEach(container => {
            let slug = container.getAttribute('mod');
            let select = container.querySelector('select');

            if (select) {
                let selectedVersion = config.mods[modpack][slug] ?? 'latest';
                select.value = select.options.array().find(option => option.value == selectedVersion)?.value ?? 'latest';
                
                select?.addEventListener('change', () => {
                    if (select.value == "latest") {
                        delete config.mods[modpack][slug];
                    } else {
                        config.mods[modpack][slug] = select.value;
                    }
                    
                    ipcRenderer.invoke("set-config", config);
                });
            }
        });
    });
}














// Handle Navbar navigation
document.querySelectorAll(".navbar .item").forEach(element => {
    element.addEventListener('click', () => {
        let currentPage = document.querySelector('.page.show');
        let pages = document.querySelectorAll('.page');

        let currentTarget = currentPage.getAttribute("page");
        let target = element.getAttribute("target-page");

        let targetPage = document.querySelector(`.page[page="${target}"]`);

        if (target == currentTarget || !targetPage) return;

        
        currentPage.classList.remove('show');
        document.querySelector(".navbar .item.selected")?.classList.remove("selected");

        targetPage.classList.add('show');
        element.classList.add("selected");
    });
});

// Handle switching between old and new GUI
// document.querySelector('a[href="#old-gui"]').addEventListener('click', () => {
//     ipcRenderer.invoke('toggle-new-gui');
// });


async function LoadSVG(fileToLoad) {
    let result = await fetch(fileToLoad);
    let content = await result.text();

    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(content, 'text/html');

    let svg = htmlDoc.documentElement.children[1].children[0];

    return svg;
}

// Load SVGs
document.querySelectorAll('svg[file-to-load]').forEach(async (element) => {
    let targetedFile = element.getAttribute('file-to-load');

    let svg = await LoadSVG(targetedFile);
    
    // element.replaceWith(svg);
    
    element.removeAttribute('file-to-load');
    for (let i=0; i < svg.attributes.length; i++) {
        element.setAttribute(svg.attributes.item(i).nodeName, svg.attributes.item(i).value);
    }
    element.replaceChildren(...svg.children);
});


function SaveConfig() {
    ipcRenderer.invoke("save-config");
    ShowNotification("success", {text: `Configuration sauvegargée`});
}

// Handle keyboard commands.
document.addEventListener("keydown", async (event) => {
    let config =  await ipcRenderer.invoke("get-config");
    
    if (event.ctrlKey && event.key == 's') {
        if (document.activeElement instanceof HTMLInputElement) return;
        SaveConfig();
    }

    if (!config.debug && event.ctrlKey && event.key == 'r') {
        event.preventDefault();
        ipcRenderer.invoke("restart");
    }
});