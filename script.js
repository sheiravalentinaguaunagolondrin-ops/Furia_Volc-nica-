// --- SINTETIZADOR DE SONIDOS (Web Audio API) ---
class SoundController {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playHit() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    }

    playExplosion() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(70, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(15, this.ctx.currentTime + 0.28);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.28);
    }

    playPowerUp() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(850, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }
}

// --- CONFIGURACIÓN PRINCIPAL ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const sound = new SoundController();

// Elementos DOM
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const skillsBar = document.getElementById('skills-bar');
const scoreText = document.getElementById('scoreText');
const feverBar = document.getElementById('feverBar');
const healthBar = document.getElementById('healthBar');
const finalScore = document.getElementById('finalScore');
const finalBlocks = document.getElementById('finalBlocks');
const heroIcon = document.getElementById('hero-icon');

// Modales
const modalCreadora = document.getElementById('modal-creadora');
const modalDocente = document.getElementById('modal-docente');

// Variables de Juego
let isPlaying = false;
let score = 0;
let totalBlocks = 0;
let health = 100;
let fever = 0;
let isFeverActive = false;
let feverTimer = 0;
let screenShakeTimer = 0;

// Configuración de Héroe
let heroGender = 'girl';
let hero = {
    x: 0,
    y: 0,
    shieldWidth: 90,
    shieldHeight: 18,
    isSuper: false,
    superTimer: 0
};

let projectiles = [];
let particles = [];
let freezeTimer = 0;

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    // POSICIÓN DEL HÉROE ELEVADA PARA NO TAPAR BOTONES
    hero.y = canvas.height - 145;
    if (hero.x === 0) hero.x = canvas.width / 2;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// MOVIMIENTO POR RATÓN Y TOQUE MÓVIL
function updateHeroPosition(clientX) {
    const rect = canvas.getBoundingClientRect();
    hero.x = clientX - rect.left;
}

canvas.addEventListener('mousemove', (e) => updateHeroPosition(e.clientX));

canvas.addEventListener('touchstart', (e) => {
    sound.init();
    if (e.touches.length > 0) {
        updateHeroPosition(e.touches[0].clientX);
        handleDirectTap(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
        updateHeroPosition(e.touches[0].clientX);
    }
}, { passive: false });

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    handleDirectTap(e.clientX - rect.left, e.clientY - rect.top);
});

// CLIC O TOQUE DIRECTO PARA DESTRUIR LAVA
function handleDirectTap(clickX, clickY) {
    if (!isPlaying) return;

    projectiles.forEach((p, index) => {
        const dist = Math.hypot(p.x - clickX, p.y - clickY);
        if (dist < p.radius + 20) {
            p.hp--;
            createParticles(p.x, p.y, p.color, 8);
            if (p.hp <= 0) {
                sound.playExplosion();
                projectiles.splice(index, 1);
                addScore(15);
                increaseFever(10);
            } else {
                sound.playHit();
            }
        }
    });
}

// Teclas
window.addEventListener('keydown', (e) => {
    if (!isPlaying) return;
    if (e.key === '1') useFreezeSkill();
    if (e.key === '2') useBlastSkill();
    if (e.key === '3') useShieldSkill();
    if (e.key === 'n' || e.key === 'N' || e.key === 'm' || e.key === 'M') switchHero();
});

document.getElementById('skill-freeze').onclick = useFreezeSkill;
document.getElementById('skill-blast').onclick = useBlastSkill;
document.getElementById('skill-shield').onclick = useShieldSkill;
document.getElementById('btn-switch-hero').onclick = switchHero;

// Modales
document.getElementById('btn-creadora').onclick = () => modalCreadora.classList.remove('hidden');
document.getElementById('close-creadora').onclick = () => modalCreadora.classList.add('hidden');
document.getElementById('btn-docente').onclick = () => modalDocente.classList.remove('hidden');
document.getElementById('close-docente').onclick = () => modalDocente.classList.add('hidden');

function switchHero() {
    heroGender = heroGender === 'girl' ? 'boy' : 'girl';
    heroIcon.innerText = heroGender === 'girl' ? '👧' : '👦';
}

function useFreezeSkill() {
    if (freezeTimer <= 0) {
        freezeTimer = 280;
        sound.playPowerUp();
    }
}

function useBlastSkill() {
    sound.playExplosion();
    screenShakeTimer = 15;
    projectiles.forEach((p) => createParticles(p.x, p.y, '#ff0055', 10));
    projectiles = [];
}

function useShieldSkill() {
    hero.isSuper = true;
    hero.superTimer = 240;
    sound.playPowerUp();
}

// ENTIDADES
class Projectile {
    constructor() {
        this.x = canvas.width / 2 + (Math.random() - 0.5) * (canvas.width * 0.5);
        this.y = 60;
        this.type = Math.random();

        if (this.type < 0.6) {
            this.radius = 12 + Math.random() * 6;
            this.color = '#ff4500';
            this.vx = (Math.random() - 0.5) * 3;
            this.vy = 3 + Math.random() * 2.5;
            this.hp = 1;
        } else if (this.type < 0.85) {
            this.radius = 10;
            this.color = '#aa00ff';
            this.vx = (Math.random() - 0.5) * 5;
            this.vy = 5.5 + Math.random() * 2.5;
            this.hp = 1;
        } else {
            this.radius = 22;
            this.color = '#ff0055';
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = 2 + Math.random() * 1.5;
            this.hp = 3;
        }
    }

    update() {
        const speed = freezeTimer > 0 ? 0.3 : 1;
        this.x += this.vx * speed;
        this.y += this.vy * speed;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (this.hp > 1) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.hp, this.x, this.y + 4);
        }
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 7;
        this.vy = (Math.random() - 0.5) * 7;
        this.life = 1;
        this.decay = 0.02 + Math.random() * 0.03;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// PERSONAJE
function drawHero() {
    const currentShieldWidth = hero.isSuper ? hero.shieldWidth * 1.6 : hero.shieldWidth;
    const shieldY = hero.y - 15;

    // Escudo Protector
    ctx.save();
    drawRoundedRect(ctx, hero.x - currentShieldWidth / 2, shieldY, currentShieldWidth, hero.shieldHeight, 8);
    
    const shieldGradient = ctx.createLinearGradient(0, shieldY, 0, shieldY + hero.shieldHeight);
    if (hero.isSuper) {
        shieldGradient.addColorStop(0, '#00ffff');
        shieldGradient.addColorStop(1, '#0088ff');
        ctx.shadowColor = '#00ffff';
    } else if (isFeverActive) {
        shieldGradient.addColorStop(0, '#ffe600');
        shieldGradient.addColorStop(1, '#ff6600');
        ctx.shadowColor = '#ffe600';
    } else {
        shieldGradient.addColorStop(0, '#00ff88');
        shieldGradient.addColorStop(1, '#009944');
        ctx.shadowColor = '#00ff88';
    }
    
    ctx.shadowBlur = 12;
    ctx.fillStyle = shieldGradient;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();

    // Cabeza
    ctx.beginPath();
    ctx.arc(hero.x, hero.y + 25, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#ffdbac';
    ctx.fill();

    // Ojos
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(hero.x - 4, hero.y + 23, 2, 0, Math.PI * 2);
    ctx.arc(hero.x + 4, hero.y + 23, 2, 0, Math.PI * 2);
    ctx.fill();

    // Sonrisa
    ctx.beginPath();
    ctx.arc(hero.x, hero.y + 27, 4, 0, Math.PI);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cabello
    ctx.fillStyle = heroGender === 'girl' ? '#8b4513' : '#4a2e12';
    if (heroGender === 'girl') {
        ctx.beginPath();
        ctx.arc(hero.x, hero.y + 20, 14, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hero.x - 15, hero.y + 24, 6, 0, Math.PI * 2);
        ctx.arc(hero.x + 15, hero.y + 24, 6, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.arc(hero.x, hero.y + 19, 14, Math.PI * 0.8, Math.PI * 2.2);
        ctx.fill();
    }

    // Camiseta
    ctx.fillStyle = heroGender === 'girl' ? '#ff4081' : '#29b6f6';
    drawRoundedRect(ctx, hero.x - 11, hero.y + 38, 22, 22, 4);
    ctx.fill();

    // Brazos sosteniendo el escudo
    ctx.strokeStyle = '#ffdbac';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hero.x - 9, hero.y + 40);
    ctx.lineTo(hero.x - currentShieldWidth / 4, shieldY + hero.shieldHeight);
    ctx.moveTo(hero.x + 9, hero.y + 40);
    ctx.lineTo(hero.x + currentShieldWidth / 4, shieldY + hero.shieldHeight);
    ctx.stroke();
}

// BUCLE PRINCIPAL
function spawnProjectiles() {
    if (!isPlaying) return;
    const rate = isFeverActive ? 0.20 : 0.07;
    if (Math.random() < rate) {
        projectiles.push(new Projectile());
    }
}

function addScore(pts) {
    const mult = isFeverActive ? 3 : 1;
    score += pts * mult;
    scoreText.innerText = score;
}

function increaseFever(amount) {
    if (isFeverActive) return;
    fever = Math.min(100, fever + amount);
    feverBar.style.width = fever + '%';

    if (fever >= 100) {
        isFeverActive = true;
        feverTimer = 300;
        feverBar.parentElement.style.borderColor = '#00ffff';
    }
}

function update() {
    if (!isPlaying) return;

    if (freezeTimer > 0) freezeTimer--;
    if (hero.superTimer > 0) {
        hero.superTimer--;
        if (hero.superTimer <= 0) hero.isSuper = false;
    }

    if (isFeverActive) {
        feverTimer--;
        fever = (feverTimer / 300) * 100;
        feverBar.style.width = fever + '%';
        if (feverTimer <= 0) {
            isFeverActive = false;
            fever = 0;
            feverBar.parentElement.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }
    }

    spawnProjectiles();

    const currentShieldWidth = hero.isSuper ? hero.shieldWidth * 1.6 : hero.shieldWidth;
    const shieldY = hero.y - 15;

    projectiles.forEach((p, index) => {
        p.update();

        // Colisión con Escudo
        const inXRange = p.x >= (hero.x - currentShieldWidth / 2) && p.x <= (hero.x + currentShieldWidth / 2);
        const inYRange = Math.abs(p.y - shieldY) <= (p.radius + hero.shieldHeight / 2);

        if (inXRange && inYRange) {
            sound.playHit();
            createParticles(p.x, p.y, p.color, 10);
            projectiles.splice(index, 1);
            totalBlocks++;
            addScore(10);
            increaseFever(8);
            return;
        }

        // Colisión con la Ciudad (Ajustado al suelo elevado)
        if (p.y > canvas.height - 70) {
            sound.playExplosion();
            screenShakeTimer = 8;
            createParticles(p.x, p.y, '#ff0000', 12);
            health -= p.radius > 20 ? 20 : 10;
            healthBar.style.width = Math.max(0, health) + '%';
            projectiles.splice(index, 1);

            if (health <= 0) {
                gameOver();
            }
        }
    });

    particles.forEach((pt, index) => {
        pt.update();
        if (pt.life <= 0) particles.splice(index, 1);
    });
}

function draw() {
    ctx.save();

    if (screenShakeTimer > 0) {
        screenShakeTimer--;
        ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Volcán
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 110, canvas.height);
    ctx.lineTo(canvas.width / 2, 50);
    ctx.lineTo(canvas.width / 2 + 110, canvas.height);
    ctx.fillStyle = '#1a0c21';
    ctx.fill();

    // Cráter
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, 50, 30, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3300';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff5500';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dibujar elementos
    drawHero();
    projectiles.forEach((p) => p.draw());
    particles.forEach((pt) => pt.draw());

    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    if (isPlaying) requestAnimationFrame(gameLoop);
}

// INICIO Y EVENTOS
document.getElementById('start-btn').onclick = () => {
    sound.init();
    startGame();
};
document.getElementById('restart-btn').onclick = () => {
    sound.init();
    startGame();
};

function startGame() {
    score = 0;
    totalBlocks = 0;
    health = 100;
    fever = 0;
    isFeverActive = false;
    projectiles = [];
    particles = [];

    scoreText.innerText = '0';
    healthBar.style.width = '100%';
    feverBar.style.width = '0%';

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    skillsBar.classList.remove('hidden');

    isPlaying = true;
    gameLoop();
}

function gameOver() {
    isPlaying = false;
    hud.classList.add('hidden');
    skillsBar.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');

    finalScore.innerText = score;
    finalBlocks.innerText = totalBlocks;
}