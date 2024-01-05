let keycode_limit = 10;
let keycode = ArrayOfNull(keycode_limit);

function ArrayOfNull(length) {
    return Array.from(Array(length || 1), () => null);
}

// chipi chapa
// pew pew
// game of life

let conway = null;
let clippy = null;

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
        if (JSON.stringify(keycode) === JSON.stringify('gameoflife'.split(''))) {
            if (!conway) {
                conway = Conway();
                conway.setup();
            } else {
                conway.remove();
                conway = null;
            }
        } else
        if (JSON.stringify(keycode.slice(5,10)) === JSON.stringify('salut'.split(''))) {
            ShowNotification('information', `Salut 👋`);
            keycode.push(...ArrayOfNull(keycode_limit - 'salut'.length));
        } else
        if (JSON.stringify(keycode.slice(6,10)) === JSON.stringify('0000'.split(''))) {
            ShowNotification('success', `Vault unloked.`);
            keycode.push(...ArrayOfNull(keycode_limit - '0000'.length));
        } else
        if (JSON.stringify(keycode) === JSON.stringify('0123456789'.split(''))) {
            ShowNotification('question', `Tu manque d'imagination à ce point ?`);
        } else
        if (JSON.stringify(keycode.slice(4,10)) === JSON.stringify('clippy'.split(''))) {
            if (!clippy) {
                ShowNotification('success', `Oui ?`);
            
                clippy = new Clippy();
                clippy.init();
            } else {
                ShowNotification('success', `Aurevoir 👋`);
            
                clippy.setAnimation('exit');
                clippy = null;
            }
            keycode.push(...ArrayOfNull(keycode_limit - 'clippy'.length));
        } else
        if (JSON.stringify(keycode.slice(4,10)) === JSON.stringify('lookup'.split(''))) {
            ipcRenderer.invoke("notification", "look-up", {text: "Regarde en haut !"});
            keycode.push(...ArrayOfNull(keycode_limit - 'lookup'.length));
        } else
        if (JSON.stringify(keycode.slice(4,10)) === JSON.stringify('lookdown'.split(''))) {
            ipcRenderer.invoke("notification", "look-down", {text: "Regarde en bas !"});
            keycode.push(...ArrayOfNull(keycode_limit - 'lookdown'.length));
        } else
        if (JSON.stringify(keycode.slice(4,10)) === JSON.stringify('lookright'.split(''))) {
            ipcRenderer.invoke("notification", "look-right", {text: "Regarde à droite !"});
            keycode.push(...ArrayOfNull(keycode_limit - 'lookright'.length));
        } else
        if (JSON.stringify(keycode.slice(4,10)) === JSON.stringify('lookleft'.split(''))) {
            ipcRenderer.invoke("notification", "look-up", {text: "Regarde à gauche !"});
            keycode.push(...ArrayOfNull(keycode_limit - 'lookleft'.length));
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
});


function Conway() {
    let canvas = document.createElement('canvas');
    canvas.classList.add('game-of-life');

    let pagesContainer = document.querySelector('.pages');
    let {width, height} = pagesContainer.getBoundingClientRect(); 

    canvas.width = width;
    canvas.height = height;

    let ctx = canvas.getContext('2d');
    ctx.width = width;
    ctx.height = height;

    let generation = 0;
    let w;
    let columns;
    let rows;
    let board = [];
    let next;
    let interval;

    function setup_gol() {
        w = 10;
        // Calculate columns and rows
        columns = Math.floor(width / w);
        rows = Math.floor(height / w);
        
        // Wacky way to make a 2D array is JS
        board = new Array(columns);
        for (let i = 0; i < columns; i++) {
            board[i] = new Array(rows);
        }
        // Going to use multiple 2D arrays and swap them
        next = new Array(columns);
        for (let i = 0; i < columns; i++) {
            next[i] = new Array(rows);
        }
        
        init();

        // Set simulation framerate to 10 to avoid flickering
        interval = setInterval(() => {
            draw();
            generate();
        }, 100);
    }

    function draw() {
        let canvas = document.querySelector('canvas');
        let ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < columns; i++) {
            for (let j = 0; j < rows; j++) {
                if (board[i][j] == 1) {
                    ctx.fillStyle = 'black';
                } else {
                    ctx.fillStyle = 'transparent';
                }
                
                ctx.fillRect(i * w, j * w, w, w);
            }
        }
    }

    // Fill board randomly
    function init() {
        for (let i = 0; i < columns; i++) {
            for (let j = 0; j < rows; j++) {
                if (i == 0 || j == 0 || i == columns - 1 || j == rows - 1) {
                    board[i][j] = 0;
                } else {
                    board[i][j] = Math.floor(Math.random() * 2);
                }
            }
        }
    }

    // The process of creating the new generation
    function generate() {
        // Loop through every spot in our 2D array and check spots neighbors
        for (let x = 1; x < columns - 1; x++) {
            for (let y = 1; y < rows - 1; y++) {
                // Add up all the states in a 3x3 surrounding grid
                let neighbors = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        neighbors += board[x + i][y + j];
                    }
                }

                // A little trick to subtract the current cell's state since
                // we added it in the above loop
                neighbors -= board[x][y];
                // Rules of Life
                if ((board[x][y] == 1) && (neighbors < 2)) {
                    next[x][y] = 0; // Loneliness
                } else
                if ((board[x][y] == 1) && (neighbors > 3)) {
                    next[x][y] = 0; // Overpopulation
                } else
                if ((board[x][y] == 0) && (neighbors == 3)) {
                    next[x][y] = 1; // Reproduction
                }
                else next[x][y] = board[x][y]; // Stasis
            }
        }

        // Swap!
        [next, board] = [board, next];

        generation++;
    }
    
    function toggle() {
        if (canvas.classList.contains('show')) {
            canvas.classList.remove('show');
        } else canvas.classList.add('show');
    }

    // =============================
    
    let showupElement = document.createElement('div');
    showupElement.classList.add("game-of-life", "showup");
    
    let img = document.createElement('img');
    img.src = './assets/img/icons/eye.png';

    showupElement.appendChild(img);

    // =============================

    function setup() {
        setup_gol();

        pagesContainer.appendChild(canvas);
        pagesContainer.appendChild(showupElement);

        showupElement.addEventListener('click', toggle);
    }

    function remove() {
        canvas.remove();
        showupElement.remove();
        
        clearInterval(interval);
    }
    
    return { setup, remove, draw, generate, init, canvas, ctx, w, columns, rows, board, next }
}


// width: 115px, height: 91px
class Clippy {
    constructor(options = {}) {
        this.image = {
            width: 116,
            height: 92,
        }

        this.container = options.container ?? document.body;
        
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');

        this.canvas.width = this.image.width;
        this.canvas.height = this.image.height;

        let containerRect = this.container.getBoundingClientRect();

        this.position = {
            x: options?.position?.x ?? (containerRect.width - this.canvas.width),
            y: options?.position?.y ?? (containerRect.height - this.canvas.height),
        }

        this.canvas.classList.add('clippy');
        this.canvas.style.setProperty('position', 'fixed');
        this.canvas.style.setProperty('top', this.position.y + 'px');
        this.canvas.style.setProperty('left', this.position.x + 'px');
        this.canvas.style.setProperty('z-index', '99');

        this.animations = new Map();
    }

    setAnimation(name) {
        this.currentAnimation = {
            ...this.animations.get(name),
            subframe: 0,
            frame: 0
        }
    }

    drawFrame() {
        let {image, frame, subframe, frames, length, frametime} = this.currentAnimation;
        
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (frames) {
            let index = frames[frame].index ?? frames[frame] ?? 0;
            this.context.drawImage(image, 0, -this.image.height * index);
        } else {
            this.context.drawImage(image, 0, -this.image.height * frame);
        }
    }

    nextFrame() {
        let {onEnd, frame, subframe, frames, length, frametime} = this.currentAnimation;
        
        if (frame + 1 == length && onEnd) onEnd(this);
        if (frames && frames[frame + 1] == undefined) onEnd(this);

        if (frames) {
            if (typeof frames[frame] == 'number') {
                frame = (frame + 1) % length;
            } else if (typeof frames[frame] == 'object') {
                if (subframe == frames[frame].time ?? frametime) {
                    subframe = 0;
                    frame = (frame + 1) % length;
                } else {
                    subframe++;
                }
            }
        } else {
            frame = (frame + 1) % length;
        }

        this.currentAnimation = Object.assign(this.currentAnimation, {frame, subframe});
    }

    animate() {
        this.drawFrame();
        this.nextFrame();
    }

    async init() {
        const loadImage = async (src) => {
            return new Promise((rs,re) => {
                let img = document.createElement('img');
                img.addEventListener('load', () => rs(img));
                img.addEventListener('error', (err) => re(err));
                img.src = src;
            });
        }

        // #region ANIMATION
        // All Animations
        let animations = ['atoms', 'down', 'enter', 'exclamation', 'exit', 'knock', 'left', 'locked', 'look_around', 'music', 'read', 'rest1', 'right', 'sleep', 'sleepy', 'tanking', 'thinking', 'up', 'validate'];
        
        // overwritting animations
        let animationOverwrite = {
            'enter': { onEnd: (self) => self.setAnimation('rest1') },
            'exit': { onEnd: (self) => self.canvas.remove() },
            'atoms': { onEnd: (self) => self.setAnimation('rest1') },
            'look_around': { onEnd: (self) => self.setAnimation('rest1') },
            'knock': { onEnd: (self) => self.setAnimation('rest1') },
            'locked': { onEnd: (self) => self.setAnimation('rest1') },
            'tanking': { onEnd: (self) => self.setAnimation('rest1') },
            'validate': { onEnd: (self) => self.setAnimation('rest1') },
            'exclamation': { onEnd: (self) => self.setAnimation('rest1') },
            'thinking': { onEnd: (self) => self.setAnimation('rest1') },
            'sleepy': {
                frames: [...Array.from(Array(5), () => [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,{index: 15, time: 10}]).flat(), 16,17,18,19,20,21,22,23,24,25,26,27,28,29],
                onEnd: (self) => self.setAnimation('sleep'),
            },
            'thinking': { onEnd: (self) => self.setAnimation('rest1') },
            'music': { onEnd: (self) => self.setAnimation('rest1') },
            'read': { onEnd: (self) => self.setAnimation('rest1') },
            'up': { onEnd: (self) => self.setAnimation('rest1') },
            'down': { onEnd: (self) => self.setAnimation('rest1') },
            'right': { onEnd: (self) => self.setAnimation('rest1') },
            'left': { onEnd: (self) => self.setAnimation('rest1') },
            'rest1': {
                frames: [{index: 0, time: 20}, 1, 2, 3, 4, 5, 6],
                onEnd: (self) => {
                    if (Math.random() > 0.9) {
                        self.setAnimation(['atoms', 'look_around', 'knock', 'locked', 'sleepy', 'music', 'read'].getRandomElement());
                    }
                }
            },
        };
        
        // Load animations
        for (let animation of animations) {
            let image = await loadImage(`./assets/img/clippy/${animation}.png`);
            this.animations.set(animation, {
                image, length: (image.height / this.image.height),
                ...animationOverwrite[animation],
            });
        }

        // Set default animation
        this.setAnimation('enter');
        this.drawFrame();
        // #endregion

        // Add Canvas to container
        this.container.appendChild(this.canvas);

        // Animation Loop
        let self = this;
        this.interval = setInterval(function() {
            self.animate();
        }, 100);


        // #region HANDLE DRAG & DROP
        this.canvas.addEventListener('mousedown', (event) => {
            if (event.button == 0) {
                this.dragPosX = event.clientX - Number(this.canvas.style.getPropertyValue('left').match(/^[-+0-9\.]+/gi)?.pop() ?? 0);
                this.dragPosY = event.clientY - Number(this.canvas.style.getPropertyValue('top').match(/^[-+0-9\.]+/gi)?.pop() ?? 0);
            }
        });
        
        document.addEventListener('mousemove', (event) => {
            if (this.dragPosX != null && this.dragPosX != null) {
                let containerRect = this.container.getBoundingClientRect();
                
                let nx = event.clientX - this.dragPosX;
                let ny = event.clientY - this.dragPosY;
                
                if (nx < 0) nx = 0;
                if (nx + this.canvas.width > containerRect.width) nx = containerRect.width - this.canvas.width;
                
                if (ny < 0) ny = 0;
                if (ny + this.canvas.height > containerRect.height) ny = containerRect.height - this.canvas.height;

                this.canvas.style.setProperty('left', nx + 'px');
                this.canvas.style.setProperty('top', ny + 'px');
            }
        });
    
        document.addEventListener('mouseup', (event) => {
            if (event.button == 0) {
                this.dragPosX = null;
                this.dragPosY = null;
            }
        });
        // #endregion
        

        // React to notification
        ipcRenderer.on('notification', (event, id) => {
            switch(id) {
                case "default":
                    this.setAnimation('knock');
                break;

                case "success":
                    this.setAnimation('validate');
                break;
                
                case "information":
                case "new-update":
                case "new-app-update":
                    this.setAnimation('exclamation');
                break;
                
                case "question":
                    this.setAnimation('thinking');
                break;

                case "error":
                    this.setAnimation('tanking');
                break;
                
                case "look-up":
                    this.setAnimation('up');
                break;
                
                case "look-down":
                    this.setAnimation('down');
                break;
                
                case "look-right":
                    this.setAnimation('right');
                break;
                
                    
                case "look-left":
                    this.setAnimation('left');
                    break;
            }
        });
    }
}


class Vector2 {
    constructor(x, y) {
        this.x = x ?? 0;
        this.y = y ?? 0;
    }

    static fromObject(obj) {
        return new Vector2(obj?.x, obj?.y);
    }

    static fromArray(arr) {
        return new Vector2(arr[0], arr[1]);
    }

    clone() {
		return Vector2(this.x, this.y);
	}

    set(vec) {
        this.x = vec.x ?? 0;
        this.y = vec.y ?? 0;

        return this;
    }

    add(...vecs) {
        for (let vec in vecs) {
            if (vec instanceof Vector2) {
                this.x += vec.x ?? 0;
                this.y += vec.y ?? 0;
            }
        }

        return this;
    }

    substract(...vecs) {
        for (let vec in vecs) {
            if (vec instanceof Vector2) {
                this.x -= vec.x ?? 0;
                this.y -= vec.y ?? 0;
            }
        }
    }
    
    scale(scalar) {
        this.x *= scalar ?? 1;
        this.y *= scalar ?? 1;

        return this;
    }

    magnitude() {
		return Math.sqrt(this.magnitudeSqr());
	}

	magnitudeSqr() {
		return (this.x * this.x + this.y * this.y);
	}

    toNormalize() {
		let mag = this.magnitude();
		let vector = this.clone();
		
        if(Math.abs(mag) < 1e-9) {
			vector.x = 0;
			vector.y = 0;
		} else {
			vector.x /= mag;
			vector.y /= mag;
		}

		return vector;
	}

    normalize() {
		let mag = this.magnitude();
		
        if(Math.abs(mag) < 1e-9) {
			this.x = 0;
			this.y = 0;
		} else {
			this.x /= mag;
			this.y /= mag;
		}

		return this;
	}

    toPrecision(precision) {
		var vector = this.clone();
		vector.x = vector.x.toFixed(precision);
		vector.y = vector.y.toFixed(precision);
		return vector;
	}

    toObject() {
		var vector = this.toPrecision(1);
		return { x: vector.x, y: vector.y };
	}

    toArray() {
		var vector = this.toPrecision(1);
		return [vector.x , vector.y];
	}

	toString() {
		var vector = this.toPrecision(1);
		return ("[" + vector.x + "; " + vector.y + "]");
	}
}