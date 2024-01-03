let keycode_limit = 10;
let keycode = ArrayOfNull(keycode_limit);

function ArrayOfNull(length) {
    return Array.from(Array(length || 1), () => null);
}

// chipi chapa
// pew pew
// game of life

let conway = null;


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
            console.log(conway)
            if (!conway) {
                conway = Conway();
                conway.setup();
            } else {
                conway.remove();
                conway = null;
            }
        } else
        if (JSON.stringify(keycode.slice(5,10)) === JSON.stringify(['s','a','l','u','t'])) {
            ShowNotification('information', `Salut 👋`);
            keycode.push(...ArrayOfNull(5));
        } else
        if (JSON.stringify(keycode.slice(6,10)) === JSON.stringify(['0','0','0','0'])) {
            ShowNotification('success', `Vault unloked.`);
            keycode.push(...ArrayOfNull(6));
        } else
        if (JSON.stringify(keycode) === JSON.stringify(['0','1','2','3','4','5','6','7','8','9'])) {
            ShowNotification('question', `Tu manque d'imagination à ce point ?`);
        } else
        if (JSON.stringify(keycode.slice(4,10)) === JSON.stringify(['c','l','i','p','p','y'])) {
            ShowNotification('success', `Oui.`);
            keycode.push(...ArrayOfNull(4));
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