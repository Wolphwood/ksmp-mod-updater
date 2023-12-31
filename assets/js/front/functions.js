let { shell, ipcRenderer } = require("electron");

HTMLCollection.prototype.array = function() {
    return Array.from(this)
}

HTMLElement.prototype.removeChilren = function() {
    while (this.firstChild) {
        this.removeChild(this.lastChild);
    }
}

// Animation & Transition Waiter
const AwaitTransition = (element) => new Promise(rs => element.addEventListener('transitionend', rs, { once: true })); 
const AwaitAnimation = (element) => new Promise(rs => element.addEventListener('animationend', rs, { once: true })); 
const Wait = (ms) => new Promise(rs => setTimeout(rs, ms));

// Open link into default user's browser
function HandleLink(element) {
    element.setAttribute('handled', true);
    return element.addEventListener('click', (event) => {
        event.preventDefault();
        shell.openExternal(element.href);
    });
}

function parseMarkdownLink(element) {
    const regex = /\[((?:[^\[\]]+|\[(?:[^\[\]]+|\[(?:[^\[\]]+|\[.*\])*\])*\])*)\]\(([^()]*)\)/gmi;

    return element.innerHTML.replace(regex, (match, name, link) => {
        let a = document.createElement('a');
        a.innerText = name;
        a.href = link.replace(/amp;/gmi, '').replace(/\/+/gmi,'/');

        return a.outerHTML;
    });
}

async function SimplePlaySoundEffect({url, volume=1, speed=1, loop=false, end=null}) {
	var audio = new Audio(url);
    audio.volume = volume;
    audio.loop = loop;
    audio.mozPreservesPitch = false;
    audio.playbackRate = speed;
	if (end !== null) audio.onended=end;
    
    audio.stop = function() {
        this.pause();
        this.currentTime = 0;
    }
    
    audio.fadeOut = function(value= 0.1, interval=100) {
        let l = setInterval(() => {
            let v = this.volume - value;
            if (v <= 0) {
                clearInterval(l);
                this.pause()
            } else {
                this.volume = v;
            }
        }, interval);
    }
    
    await audio.play();

    return audio;
}