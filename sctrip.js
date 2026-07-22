const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameInterval;
let score = 0;
let isPlaying = false;
let gameSpeed = 4;
let spawnTimer = 0;
const colWidth = 100;
let tiles = [];
let selectedSong = null;

const songList = [
    { name: "Kısa Bir Ara Idol House", file: "kisabiraraih.m4a" },
    { name: "Kısa Bir Ara", file: "kisabirara.m4a" },
    { name: "Doktor", file: "doktor.m4a" },
    { name: "Gittim", file: "gittim.m4a" },
    { name: "Kıyamam", file: "kiyamam.m4a" },
    { name: "Farkımız Yok", file: "farkimizyok.m4a" },
    { name: "Sırılsıklam", file: "sirilsiklam.m4a" }
];

const audioPlayer = new Audio();

let introAudioCtx = null;
let introInterval = null;

function startIntroMelody() {
    try {
        if (!introAudioCtx) {
            introAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (introAudioCtx.state === 'suspended') {
            introAudioCtx.resume();
        }
        
        const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; 
        let noteIndex = 0;

        if (introInterval) clearInterval(introInterval);

        introInterval = setInterval(() => {
            if (!introAudioCtx || document.getElementById('gameScreen').classList.contains('active')) return;
            
            const osc = introAudioCtx.createOscillator();
            const gain = introAudioCtx.createGain();

            osc.type = "sine"; 
            osc.frequency.setValueAtTime(notes[noteIndex % notes.length], introAudioCtx.currentTime);
            noteIndex++;

            gain.gain.setValueAtTime(0.08, introAudioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, introAudioCtx.currentTime + 1.2);

            osc.connect(gain);
            gain.connect(introAudioCtx.destination);

            osc.start();
            osc.stop(introAudioCtx.currentTime + 1.2);
        }, 600);
    } catch (e) {
        console.log("Ses bağlamı başlatılamadı:", e);
    }
}

function stopIntroMelody() {
    if (introInterval) {
        clearInterval(introInterval);
        introInterval = null;
    }
}

window.showScreen = function(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    if (screenId === 'gameScreen') {
        stopIntroMelody();
    } else {
        if (!introInterval && screenId !== 'gameOverScreen') {
            startIntroMelody();
        }
        audioPlayer.pause();
        isPlaying = false;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    startIntroMelody();

    // Tam 2.3 saniye sonra hiçbir şeye basmaya gerek kalmadan direkt ana menüye geçer
    setTimeout(() => {
        showScreen('menuScreen');
    }, 2300);

    renderSongList();
});

function renderSongList() {
    const container = document.getElementById("songListContainer");
    if (!container) return;
    container.innerHTML = "";

    songList.forEach((song, index) => {
        const item = document.createElement("div");
        item.className = "song-item";
        item.innerHTML = `<span>${index + 1}. ${song.name}</span> <span>▶</span>`;
        item.onclick = () => selectAndStartSong(song);
        container.appendChild(item);
    });
}

function selectAndStartSong(song) {
    stopIntroMelody();
    selectedSong = song;
    showScreen('gameScreen');

    audioPlayer.src = song.file;
    audioPlayer.currentTime = 0;

    const countdownEl = document.getElementById("countdownOverlay");
    countdownEl.style.display = "block";
    let count = 3;
    countdownEl.innerText = count;

    const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownEl.innerText = count;
        } else if (count === 0) {
            countdownEl.innerText = "BAŞLA!";
        } else {
            clearInterval(countInterval);
            countdownEl.style.display = "none";
            
            audioPlayer.play().catch(e => console.log("Ses çalma hatası:", e));
            initGameValues();
        }
    }, 800);
}

function initGameValues() {
    score = 0;
    tiles = [];
    gameSpeed = 4;
    spawnTimer = 0;
    document.getElementById("scoreVal").innerText = score;
    document.getElementById("guselBanner").style.display = "none";
    isPlaying = true;
    gameInterval = requestAnimationFrame(updateGame);
}

window.restartGame = function() {
    if (selectedSong) {
        selectAndStartSong(selectedSong);
    } else {
        selectAndStartSong(songList[0]);
    }
}

canvas.addEventListener("click", e => {
    if (!isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    let clickY = e.clientY - rect.top;

    for (let i = tiles.length - 1; i >= 0; i--) {
        let t = tiles[i];
        if (
            clickX >= t.col * colWidth &&
            clickX < (t.col + 1) * colWidth &&
            clickY >= t.y &&
            clickY <= t.y + t.height
        ) {
            if (!t.clicked) {
                t.clicked = true;
                tiles.splice(i, 1);
                score += 1;
                document.getElementById("scoreVal").innerText = score;

                if (score >= 50) {
                    document.getElementById("guselBanner").style.display = "block";
                }

                if (score % 10 === 0) {
                    gameSpeed += 0.4;
                }
                break;
            }
        }
    }
});

function updateGame() {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(139, 92, 246, 0.15)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * colWidth, 0);
        ctx.lineTo(i * colWidth, canvas.height);
        ctx.stroke();
    }

    spawnTimer++;
    if (spawnTimer > 45) {
        let randomCol = Math.floor(Math.random() * 4);
        tiles.push({
            col: randomCol,
            y: -140,
            height: 130,
            clicked: false
        });
        spawnTimer = 0;
    }

    for (let i = tiles.length - 1; i >= 0; i--) {
        let t = tiles[i];
        t.y += gameSpeed;

        let grad = ctx.createLinearGradient(t.col * colWidth, t.y, t.col * colWidth, t.y + t.height);
        grad.addColorStop(0, "#3b82f6");
        grad.addColorStop(1, "#9333ea");

        ctx.fillStyle = grad;
        ctx.fillRect(t.col * colWidth + 4, t.y, colWidth - 8, t.height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px Fredoka";
        ctx.textAlign = "center";
        ctx.fillText("♫", t.col * colWidth + colWidth / 2, t.y + t.height / 2 + 6);

        if (t.y > canvas.height) {
            triggerGameOver();
            return;
        }
    }

    gameInterval = requestAnimationFrame(updateGame);
}

function triggerGameOver() {
    isPlaying = false;
    cancelAnimationFrame(gameInterval);
    audioPlayer.pause();

    document.getElementById("finalScore").innerText = score;
    document.getElementById("playedSongTitle").innerText = selectedSong ? selectedSong.name : "-";

    updateSongLeaderboard();
    showScreen('gameOverScreen');
}

function updateSongLeaderboard() {
    const listContainer = document.getElementById("songLeaderboardList");
    if (!listContainer) return;
    
    const mockRankings = [
        { name: "KRI", score: score },
        { name: "Beton Fan 1", score: Math.max(0, score - 5) },
        { name: "Rhythm Girl", score: Math.max(0, score - 12) }
    ].sort((a, b) => b.score - a.score);

    listContainer.innerHTML = mockRankings.map((player, idx) => `
        <div><strong>${idx + 1}. ${player.name}</strong> - ${player.score} Puan</div>
    `).join('');
                      }
        
