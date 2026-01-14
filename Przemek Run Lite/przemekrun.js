window.onload = () => {
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");

    // ====== OBRAZY ======
    const playerImg = new Image();
    playerImg.src = "img/player.png";

    const heartImg = new Image();
    heartImg.src = "img/health.png";

    const badLaserImg = new Image();
    badLaserImg.src = "img/laser_bad.png";

    const goodLaserImg = new Image();
    goodLaserImg.src = "img/laser_good.png";

    // ====== AUDIO ======
    const music = new Audio("sound/loop.wav");
    music.loop = true;
    music.volume = 0.4;

    const healSound = new Audio("sound/heal.wav");
    const hitSound = new Audio("sound/hit.wav");
    const deathSound = new Audio("sound/death.wav");

    function playSound(sound) {
        sound.currentTime = 0;
        sound.play();
    }

    // ====== STANY ======
    let gameStarted = false;
    let gameOver = false;
    let paused = false;

    // ====== SCORE ======
    let score = 0;
    let difficultyMultiplier = 1;

    // ====== GRACZ ======
    const player = {
        x: 320,
        y: canvas.height / 2 - 32,
        width: 128,
        height: 128,
        speed: 5,
        lives: 3,
        maxLives: 5,
        invincible: false,
        invincibleTime: 0
    };

    // ====== PRZYCISKI ======
    const buttons = {
        up:    { x: 40,  y: 400, w: 120, h: 120, label: "▲" },
        down:  { x: 40,  y: 560, w: 120, h: 120, label: "▼" },
        play:  { x: 840, y: 705, w: 240, h: 70, label: "GRAJ" },
        pause: { x: 1820,y: 20,  w: 80,  h: 40, label: "II" }
    };

    const keys = { up: false, down: false };

    function drawButton(btn) {
        ctx.fillStyle = "#222";
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeStyle = "white";
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
    }

    function inside(x, y, b) {
        return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    }

    // ====== INPUT CANVAS ======
    canvas.addEventListener("pointerdown", e => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if ((!gameStarted || gameOver) && inside(x, y, buttons.play)) {
            restartGame();
            return;
        }

        if (gameStarted && !gameOver && inside(x, y, buttons.pause)) {
            paused = !paused;
            paused ? music.pause() : music.play();
            return;
        }

        if (gameStarted && !gameOver) {
            if (inside(x, y, buttons.up)) keys.up = true;
            if (inside(x, y, buttons.down)) keys.down = true;
        }
    });

    canvas.addEventListener("pointerup", () => {
        keys.up = false;
        keys.down = false;
    });

    // ====== LASERY ======
    const lasers = [];
    const baseBadSpeed = 4;
    const baseGoodSpeed = 3;

    function spawnLaser() {
        if (!gameStarted || gameOver || paused) return;

        lasers.push({
            x: canvas.width,
            y: Math.random() * (canvas.height - 20),
            width: 100,
            height: 100,
            good: Math.random() < 0.2
        });
    }

    setInterval(spawnLaser, 800);

    // ====== UPDATE ======
    function update(delta) {
        if (!gameStarted || gameOver || paused) return;

        score += delta * 0.01;
        difficultyMultiplier = 1 + score / 500;
        music.playbackRate = Math.min(1 + score / 1000, 1.5);

        if (keys.up) player.y -= player.speed;
        if (keys.down) player.y += player.speed;

        player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

        for (let i = lasers.length - 1; i >= 0; i--) {
            const l = lasers[i];
            l.x -= (l.good ? baseGoodSpeed : baseBadSpeed) * difficultyMultiplier;

            if (checkCollision(player, l)) {
                if (l.good && player.lives < player.maxLives) {
                    player.lives++;
                    playSound(healSound);
                } else if (!l.good && !player.invincible) {
                    player.lives--;
                    player.invincible = true;
                    player.invincibleTime = 500;
                    playSound(hitSound);
                }
                lasers.splice(i, 1);
                continue;
            }

            if (l.x + l.width < 0) lasers.splice(i, 1);
        }

        if (player.invincible) {
            player.invincibleTime -= delta;
            if (player.invincibleTime <= 0) player.invincible = false;
        }

        if (player.lives <= 0) {
            gameOver = true;
            music.pause();
            music.currentTime = 0;
            music.playbackRate = 1;
            playSound(deathSound);
            buttons.play.label = "SPRÓBUJ ZNOWU";
        }
    }

    // ====== DRAW ======
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!player.invincible || Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
        }

        lasers.forEach(l => {
            ctx.drawImage(l.good ? goodLaserImg : badLaserImg, l.x, l.y, l.width, l.height);
        });

        for (let i = 0; i < player.lives; i++) {
            ctx.drawImage(heartImg, 10 + i * 72, 10, 64, 64);
        }

        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.fillText(Math.floor(score), canvas.width - 960, 30);

        if (gameStarted && !gameOver) {
            drawButton(buttons.up);
            drawButton(buttons.down);
            drawButton(buttons.pause);
        }

        if (!gameStarted || gameOver) {
            drawButton(buttons.play);
        }

        if (paused) drawCenterText("PAUZA", 40);

        if (gameOver) {
            drawCenterText("PRZEJEBAŁEŚ...", 40, -30);
            drawCenterText("Wynik: " + Math.floor(score), 24, 10);
        }
    }

    function drawCenterText(text, size, offsetY = 0) {
        ctx.fillStyle = "white";
        ctx.font = size + "px Arial";
        ctx.textAlign = "center";
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 + offsetY);
        ctx.textAlign = "left";
    }

    function checkCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    function restartGame() {
        gameStarted = true;
        gameOver = false;
        paused = false;
        score = 0;
        lasers.length = 0;
        player.lives = 3;
        player.y = canvas.height / 2 - player.height / 2;
        player.invincible = false;
        buttons.play.label = "PLAY";
        music.playbackRate = 1;
        music.play();
    }

    // ====== LOOP ======
    let last = 0;
    function loop(time) {
        const delta = time - last;
        last = time;
        update(delta);
        draw();
        requestAnimationFrame(loop);
    }

    playerImg.onload = () => requestAnimationFrame(loop);
};
