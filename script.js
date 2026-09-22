/* =========================================================
   DENSE INTERACTIVE NEURAL NETWORK BACKGROUND
   (hero only — unchanged; page 2 uses no JavaScript)
   ========================================================= */

const heroEl = document.querySelector('.hero');
const canvas = document.getElementById('network-bg');
const ctx = canvas.getContext('2d', { alpha: false });
let W, H, DPR;

function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const rect = heroEl.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
resize();

window.addEventListener('resize', () => { resize(); seedNodes(); seedBokeh(); }, { passive: true });

/* --- Mouse & Touch Tracking --- */
const mouse = { x: -9999, y: -9999, active: false, down: false };

function updateMousePos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = clientX - rect.left;
    mouse.y = clientY - rect.top;
}

heroEl.addEventListener('mousemove', (e) => {
    updateMousePos(e.clientX, e.clientY);
    mouse.active = true;
}, { passive: true });

heroEl.addEventListener('mousedown', () => { mouse.down = true; }, { passive: true });
heroEl.addEventListener('mouseup', () => { mouse.down = false; }, { passive: true });

heroEl.addEventListener('mouseleave', () => {
    mouse.active = false;
    mouse.down = false;
}, { passive: true });

heroEl.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t) return;
    updateMousePos(t.clientX, t.clientY);
    mouse.active = true;
}, { passive: true });

let heroVisible = true;
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        heroVisible = entry.isIntersecting;
    });
}, { threshold: 0.1 });
observer.observe(heroEl);

/* --- Palette & Higher Density Parameters --- */
const EDGE_BASE = { r: 70,  g: 130, b: 180 };
const NODE_BASE = { r: 140, g: 220, b: 255 };
const HOT       = { r: 70,  g: 255, b: 140 };
const BOKEH_COLOR = { r: 100, g: 170, b: 230 };

const ACTIVATE_RADIUS = 180;
const K_NEAREST = 5; // Increased connections per node for dense network

let nodes = [];
function seedNodes() {
    // Increased node density (~2.5x more nodes)
    const count = Math.max(90, Math.floor((W * H) / 4500));
    nodes = new Array(count).fill(0).map(() => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        depth: Math.random(),
        activation: 0,
        neighbors: []
    }));
}
seedNodes();

let bokeh = [];
function seedBokeh() {
    // Increased bokeh particle count
    const count = Math.max(18, Math.floor((W * H) / 16000));
    bokeh = new Array(count).fill(0).map(() => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 12 + Math.random() * 42,
        alpha: 0.05 + Math.random() * 0.1,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        white: Math.random() < 0.35
    }));
}
seedBokeh();

let pulses = [];
const MAX_PULSES = 160;
function spawnPulse(fromIdx, toIdx, life) {
    if (pulses.length >= MAX_PULSES) return;
    pulses.push({ from: fromIdx, to: toIdx, t: 0, speed: 0.02 + Math.random() * 0.025, life });
}

function updateNeighbors() {
    for (let i = 0; i < nodes.length; i++) nodes[i].neighbors = [];
    const edgeSet = new Set();

    for (let i = 0; i < nodes.length; i++) {
        const dists = [];
        for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            dists.push([j, dx * dx + dy * dy]);
        }
        dists.sort((a, b) => a[1] - b[1]);
        for (let k = 0; k < Math.min(K_NEAREST, dists.length); k++) {
            const j = dists[k][0];
            const key = i < j ? i + '_' + j : j + '_' + i;
            if (!edgeSet.has(key)) {
                edgeSet.add(key);
                nodes[i].neighbors.push(j);
                nodes[j].neighbors.push(i);
            }
        }
    }
}

let ambientTimer = 0;

function frame() {
    requestAnimationFrame(frame);

    if (!heroVisible) return;

    ctx.fillStyle = '#0a0e13';
    ctx.fillRect(0, 0, W, H);

    /* --- Bokeh Layer --- */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of bokeh) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -40) b.x = W + 40; if (b.x > W + 40) b.x = -40;
        if (b.y < -40) b.y = H + 40; if (b.y > H + 40) b.y = -40;
        const c = b.white ? { r: 235, g: 240, b: 245 } : BOKEH_COLOR;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${b.alpha})`;
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    /* --- Node Physics Update --- */
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;

        if (mouse.active) {
            const dx = n.x - mouse.x;
            const dy = n.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < ACTIVATE_RADIUS) {
                const force = (1 - dist / ACTIVATE_RADIUS);
                const pushAngle = Math.atan2(dy, dx);

                n.x += Math.cos(pushAngle) * force * 1.8;
                n.y += Math.sin(pushAngle) * force * 1.8;

                n.activation = Math.max(n.activation, force);

                if (Math.random() < (mouse.down ? 0.7 : 0.3)) {
                    for (const nb of n.neighbors) {
                        spawnPulse(i, nb, 1);
                    }
                }
            }
        }

        n.activation *= 0.93;
    }

    updateNeighbors();

    ambientTimer--;
    if (ambientTimer <= 0 && nodes.length) {
        ambientTimer = 4 + Math.random() * 6;
        const i = Math.floor(Math.random() * nodes.length);
        const n = nodes[i];
        if (n && n.neighbors.length) {
            const nb = n.neighbors[Math.floor(Math.random() * n.neighbors.length)];
            spawnPulse(i, nb, 1);
            n.activation = Math.max(n.activation, 0.55);
        }
    }

    /* --- Draw Mesh Edges --- */
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (const j of a.neighbors) {
            if (j < i) continue;
            const b = nodes[j];
            const glow = Math.max(a.activation, b.activation);
            const nearness = 1 - (a.depth + b.depth) / 2;
            const alpha = 0.22 + nearness * 0.28 + glow * 0.5;
            const width = 0.8 + nearness * 1.1 + glow * 1.2;
            const r = EDGE_BASE.r + (HOT.r - EDGE_BASE.r) * glow;
            const g = EDGE_BASE.g + (HOT.g - EDGE_BASE.g) * glow;
            const bl = EDGE_BASE.b + (HOT.b - EDGE_BASE.b) * glow;

            ctx.strokeStyle = `rgba(${r | 0},${g | 0},${bl | 0},${alpha.toFixed(2)})`;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
    }

    /* --- Interactive Cursor Web --- */
    if (mouse.active) {
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            const dist = Math.hypot(n.x - mouse.x, n.y - mouse.y);
            if (dist < ACTIVATE_RADIUS) {
                const alpha = (1 - dist / ACTIVATE_RADIUS) * 0.75;
                ctx.strokeStyle = `rgba(${HOT.r}, ${HOT.g}, ${HOT.b}, ${alpha.toFixed(2)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(mouse.x, mouse.y);
                ctx.lineTo(n.x, n.y);
                ctx.stroke();
            }
        }
    }

    /* --- Draw Pulses --- */
    pulses = pulses.filter(p => {
        p.t += p.speed;
        if (p.t >= 1) {
            const toNode = nodes[p.to];
            if (toNode) {
                toNode.activation = Math.max(toNode.activation, 0.85);
            }
            return false;
        }
        return true;
    });

    for (const p of pulses) {
        const a = nodes[p.from], b = nodes[p.to];
        if (!a || !b) continue;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${HOT.r},${HOT.g},${HOT.b},0.95)`;
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }

    /* --- Draw Nodes --- */
    for (const n of nodes) {
        const glow = n.activation;
        const nearness = 1 - n.depth;
        const r = NODE_BASE.r + (HOT.r - NODE_BASE.r) * glow;
        const g = NODE_BASE.g + (HOT.g - NODE_BASE.g) * glow;
        const b = NODE_BASE.b + (HOT.b - NODE_BASE.b) * glow;
        const coreSize = 1.3 + nearness * 1.6 + glow * 2;
        const glowAlpha = 0.4 + nearness * 0.3 + glow * 0.45;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${glowAlpha.toFixed(2)})`;
        ctx.arc(n.x, n.y, coreSize * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `#ffffff`;
        ctx.arc(n.x, n.y, coreSize, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
}

frame();