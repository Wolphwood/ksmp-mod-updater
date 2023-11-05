let { ipcRenderer } = require("electron");

window.addEventListener('DOMContentLoaded', async () => {
    await ipcRenderer.invoke("DOMContentLoaded");
});

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
document.querySelector('a[href="#old-gui"]').addEventListener('click', () => {
    ipcRenderer.invoke('toggle-new-gui');
});

// Unfocus custom select
document.querySelectorAll("select").forEach(element => {
    element.addEventListener('click', () => {
        element.blur();
    });
});


// Load SVGs
document.querySelectorAll('svg[file-to-load]').forEach(async (element) => {
    let targetedFile = element.getAttribute('file-to-load');

    let result = await fetch(targetedFile);
    let content = await result.text();

    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(content, 'text/html');

    let svg = htmlDoc.documentElement.children[1].children[0];
    
    element.replaceWith(svg);
});


// Handle Logs
const LogDiv = document.querySelector('div.log-area');

ipcRenderer.on('web-logging', function (event, message="", tags = [], postprocess = null) {
    console.log(message, tags)

    let autoScroll = (LogDiv.scrollHeight - LogDiv.clientHeight) == LogDiv.scrollTop; 

    let uuid = self.crypto.randomUUID();
    
    let div = document.createElement('div');
    div.setAttribute("uuid", uuid);

    let fragment = document.createDocumentFragment();
    message.split('\n').forEach(line => {
        if (line.length == 0) {
            let br = document.createElement('br');
            fragment.appendChild(br);
        } else {
            let p = document.createElement('p');
            p.textContent = line;
            p.innerHTML = p.innerHTML.replaceAll(/\[([^\[\]]+)\]\(([^\(\)]+)\)/gmi, (string, name, link) => {
                let a = document.createElement('a');
                a.target = "_blank";
                a.innerText = name;
                a.href = link;

                return a.outerHTML;
            });
            fragment.appendChild(p);
        }
    });
    div.appendChild(fragment);

    if (typeof postprocess == 'function') div = postprocess(div);

    LogDiv.appendChild(div);

    if (autoScroll) LogDiv.scrollTop = LogDiv.scrollHeight - LogDiv.clientHeight;

    ipcRenderer.send('web-logging-response', uuid, isError=false);
});

ipcRenderer.on('web-logging-error', function (event, message="") {  
    let autoScroll = (LogDiv.scrollHeight - LogDiv.clientHeight) == LogDiv.scrollTop; 

    let uuid = self.crypto.randomUUID();

    let div = document.createElement('div');
    div.setAttribute("uuid", uuid);

    div.classList.add("error");

    let fragment = document.createDocumentFragment();
    message.split('\n').forEach(line => {
        if (line.length == 0) {
            let br = document.createElement('br');
            fragment.appendChild(br);
        } else {
            let p = document.createElement('p');
            p.textContent = line;
            fragment.appendChild(p);
        }
    });
    div.appendChild(fragment);

    LogDiv.appendChild(div);

    if (autoScroll) LogDiv.scrollTop = LogDiv.scrollHeight - LogDiv.clientHeight;

    ipcRenderer.send('web-logging-response', uuid, isError=true);
});

ipcRenderer.on('web-logging-edit', function (event, uuid, message="", error=null) {
    let autoScroll = (LogDiv.scrollHeight - LogDiv.clientHeight) == LogDiv.scrollTop; 

    let div = document.querySelector(`div[uuid="${uuid}"]`);

    if (error == true) div.classList.add("error");
    if (error == false) div.classList.remove("error");

    for (let child of div.children) {
        div.removeChild(child);
    }

    let fragment = document.createDocumentFragment();
    message.split('\n').forEach(line => {
        if (line.length == 0) {
            let br = document.createElement('br');
            fragment.appendChild(br);
        } else {
            let p = document.createElement('p');
            p.textContent = line;
            fragment.appendChild(p);
        }
    });
    div.appendChild(fragment);
    
    if (autoScroll) LogDiv.scrollTop = LogDiv.scrollHeight - LogDiv.clientHeight;
});