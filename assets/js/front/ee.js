let keycode_limit = 10;
let keycode = ArrayOfNull(keycode_limit);

function ArrayOfNull(length) {
    return Array.from(Array(length || 1), () => null);
}

// chipi chapa
// pew pew
// game of life


document.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (document.activeElement instanceof HTMLInputElement) return;

    if (event.key == 'Enter') {
        if (JSON.stringify(keycode) === JSON.stringify(['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'])) {
            let color = ["#ff0000","#ff8700","#ffd300","#deff0a","#a1ff0a","#0aff99","#0aefff","#147df5","#580aff","#be0aff"];
            ShowNotification('default', {
                text: "You got rick rolled !",
                duration: 999999999,
                avatar: "./assets/img/notifications/never-gonna-give-you-up.gif",
                sound: "./assets/snd/notifications/kermit-never-gonna-give-you-up.wav",
                className: "nggyu",
                style: {
                    animation: 'nggyu 5s linear infinite',
                    background: `linear-gradient(to left, ${ [...Array.from(Array(5), () => [...color]), color[0]].join(', ') })`,
                    backgroundPosition: "center center",
                    backgroundSize: '400% 400%',
                }
            });
        } else
        if (JSON.stringify(keycode) === JSON.stringify(['g','a','m','e','o','f','l','i','f','e'])) {
            console.log(":)")
        } else
        if (JSON.stringify(keycode) === JSON.stringify(['0','1','2','3','4','5','6','7','8','9'])) {
            ShowNotification('question', `Tu manque d'imagination à ce point ?`);
        } else
        if (JSON.stringify(keycode.slice(4,10)) === JSON.stringify(['c','l','i','p','p','y'])) {
            ShowNotification('success', `Oui.`);
        } else
        if (JSON.stringify(keycode.slice(5,10)) === JSON.stringify(['c','l','i','p','p','y'])) {
            ShowNotification('success', `Oui.`);
        }
    }
    
    if (event.key?.length > 1) {
        keycode.push(event.key);
    } else {
        keycode.push(event.key.toLowerCase());
    }
    
    while (keycode.length > keycode_limit) {
        keycode.shift();
    }

    console.log(JSON.stringify(keycode))
})