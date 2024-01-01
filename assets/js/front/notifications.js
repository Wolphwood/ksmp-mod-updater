
let DefaultNotificationSettings = {
    offset: { x: 0, y: '4rem' },
    duration: 5_000,
    close: true,
    dynamicDuration: false,
    volume: 0.5,
}

let Notifications = new Map();
Notifications.set('default', DefaultNotificationSettings);

Notifications.set('new-update', {
    avatar: "./assets/img/notifications/info.png",
    sound: "./assets/snd/notifications/info.mp3",
    text: "Une nouvelle mise à jour est disponible !",
    style: {
        background: "linear-gradient(to left, #0077b6, #0096c7)",
    },
    onClick: (toast) => {
        toast.hideToast();
        ipcRenderer.invoke("update");
    }
});
Notifications.set('new-app-update', {
    avatar: "./assets/img/notifications/info.png",
    sound: "./assets/snd/notifications/info.mp3",
    text: "Une nouvelle mise à jour de l'application est disponible !",
    style: {
        background: "linear-gradient(to left, #0077b6, #0096c7)",
    },
});
Notifications.set('success', {
    avatar: "./assets/img/notifications/success.png",
    sound: "./assets/snd/notifications/success.mp3",
    text: "L'opération à été un succès !",
    style: {
        background: "linear-gradient(to left, #02c39a, #02c39a)",
    },
});
Notifications.set('error', {
    dynamicDuration: true,
    avatar: "./assets/img/notifications/warn.png",
    sound: "./assets/snd/notifications/warn.mp3",
    text: "Ouch une erreur est survenue :(",
    style: {
        background: "linear-gradient(to left, #a4161a, #ba181b)",
    },
});

async function ShowNotification(id, options = {}) {
    let notification = Notifications.get(id);

    let settings = Object.assign({...DefaultNotificationSettings}, notification ?? {}, typeof options == 'string' || options == 'number' ? {text: options} : options);
    if (settings.dynamicDuration) settings.duration += settings.text.length * 10;

    let sound;
    if (settings.sound) {
        sound = await SimplePlaySoundEffect({ url: settings.sound, volume: settings.volume });

        if (!settings.callback) {
            settings.callback = function() {
                sound.fadeOut(0.01, 10);
            }
        } else {
            let callback = settings.callback;
            settings.callback = function() {
                sound.fadeOut(0.01, 10);
                callback();
            }
        }
    }

    Toastify(settings).showToast();
}

ipcRenderer.on('notification', (event, id, options) => ShowNotification(id, options));
