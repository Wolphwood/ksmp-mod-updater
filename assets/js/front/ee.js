let keycode = [];
keycode_limit = 10;

document.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (document.activeElement instanceof HTMLInputElement) return;

    if (event.key !== 'Enter') {
        keycode.push(event.key);

        while (keycode.length > keycode_limit) {
            keycode.shift();   
        }
    } else {
        let code = keycode.join(' ');
        switch(code) {
            case "ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a":
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
                break;
        }
    }
})