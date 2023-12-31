// Handle Logs
const LogDiv = document.querySelector('div.log-area');

function __logCreateDiv(uuid) {
    if (!uuid) uuid = self.crypto.randomUUID();
    div = document.createElement('div');
    div.setAttribute("uuid", uuid);

    return div;
}

function __logProcessMessage(message, options = {}) {
    let div;
    
    // Create a new div or use an existing one
    if (!options.div) {
        div = __logCreateDiv();
    } else {
        div = options.div;

        // Remove children?
        if (options.replace ?? true) {
            for (let child of div.children) {
                div.removeChild(child);
            }
        }
    }
    
    // Set add/remove error Tag
    if (options.error == true) div.classList.add("error");
    if (options.error == false) div.classList.remove("error");

    // Process message
    let fragment = document.createDocumentFragment();
    message.split('\n').forEach(line => {
        if (line.length == 0) {
            let br = document.createElement('br');
            fragment.appendChild(br);
        } else {
            let p = document.createElement('p');
            p.textContent = line;
            p.innerHTML = parseMarkdownLink(p);
            fragment.appendChild(p);
        }
    });
    div.appendChild(fragment);

    // Handle link opening
    div.querySelectorAll('a').forEach(a => HandleLink(a));

    return div;
}



function WebLogging(message= "") {
    let autoScroll = (LogDiv.scrollHeight - LogDiv.clientHeight) == LogDiv.scrollTop;

    let div = __logProcessMessage(message);
    let uuid = div.getAttribute("uuid");
    LogDiv.appendChild(div);

    if (autoScroll) LogDiv.scrollTop = LogDiv.scrollHeight - LogDiv.clientHeight;

    ipcRenderer.send('web-logging-response', uuid, isError=false);
}
function WebLoggingError(message= "") {
    let autoScroll = (LogDiv.scrollHeight - LogDiv.clientHeight) == LogDiv.scrollTop; 

    let div = __logProcessMessage(message, { error: true });
    let uuid = div.getAttribute("uuid");
    LogDiv.appendChild(div);

    if (autoScroll) LogDiv.scrollTop = LogDiv.scrollHeight - LogDiv.clientHeight;

    ipcRenderer.send('web-logging-response', uuid, isError=true);
}
function WebLoggingEdit(uuid, message= "", error= null) {
    let autoScroll = (LogDiv.scrollHeight - LogDiv.clientHeight) == LogDiv.scrollTop; 

    let div = document.querySelector(`div[uuid="${uuid}"]`);
    if (!div) return;

    __logProcessMessage(message, { uuid, div, error });
    
    if (autoScroll) LogDiv.scrollTop = LogDiv.scrollHeight - LogDiv.clientHeight;
    
    ipcRenderer.send('web-logging-response', uuid);
}
function WebLoggingProgressBar(options) {
    let { uuid } = options ?? {};


    if (!uuid) {
        let autoScroll = (LogDiv.scrollHeight - LogDiv.clientHeight) == LogDiv.scrollTop; 

        let { value = 0, min = 0, max = 100 } = options ?? {};

        let div = __logCreateDiv();
        let uuid = div.getAttribute('uuid');

        let progressbar = document.createElement('div');
        progressbar.classList.add('progress-bar');
        progressbar.setAttribute('min', min);
        progressbar.setAttribute('max', max);
        progressbar.setAttribute('value', value);
        
        let text = document.createElement('p');
        text.innerText = "Starting download ...";
        progressbar.appendChild(text);

        let bar = document.createElement('div');
        bar.classList.add('bar');
        
        let percent = ((value - min) * 100) / (max - min);
        bar.style.setProperty('width', `${(percent >= 100 ? 100 : percent.toFixed(2))}%`);

        progressbar.appendChild(bar);
        

        div.appendChild(progressbar);

        LogDiv.appendChild(div);

        if (autoScroll) LogDiv.scrollTop = LogDiv.scrollHeight - LogDiv.clientHeight;

        ipcRenderer.send('web-logging-response', uuid);
    } else {
        let div = document.querySelector(`div[uuid="${uuid}"]`);
        if (!div) return;
        
        let progressbar = div.querySelector('.progress-bar');
        let bar = div.querySelector('.bar');
        let text = div.querySelector('p');
        if (!progressbar || !bar || !text) return;
        
        let {error, message} = options;

        if (error == true) {
            progressbar.classList.add('error');
        }
        
        if (error == false) {
            progressbar.classList.remove('error');
        }
        
        if (!progressbar.classList.contains('error')) {
            let min = options?.min ?? progressbar.getAttribute('min');
            let max = options?.max ?? progressbar.getAttribute('max');
            let value = options?.value ?? progressbar.getAttribute('value');
            let percent = ((value - min) * 100) / (max - min);

            percentText = `${(percent >= 100 ? 100 : percent.toFixed(2))}%`;

            text.innerText = percentText;

            progressbar.setAttribute('min', min);
            progressbar.setAttribute('max', max);
            progressbar.setAttribute('value', value);
            bar.style.setProperty('width', percentText);
        } else {
            text.innerText = message ?? `Ouch...`;
        }

        ipcRenderer.send('web-logging-response', uuid);
    }
}

ipcRenderer.on('web-logging', (event, message) => WebLogging(message));
ipcRenderer.on('web-logging-error', (event, message) => WebLoggingError(message));
ipcRenderer.on('web-logging-edit', (event, uuid, message, error) => WebLoggingEdit(uuid, message, error));
ipcRenderer.on('web-logging-progress-bar', (event, options) => WebLoggingProgressBar(options));