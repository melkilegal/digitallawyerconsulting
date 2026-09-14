/* =========================================================
   ANIMATED NETWORK BACKGROUND — hero section only
   Two layers:
   1. Soft blurred "bokeh" circles drifting in the background
      for depth, like the out-of-focus lights in the reference.
   2. A triangulated mesh in front — each node connects to its
      few nearest neighbors (not everything nearby), which is
      what gives it that geometric, faceted look instead of a
      flat web. Mouse activation, ambient firing, and traveling
      pulses all work exactly as before.

   Plus a cluster of always-on "hub" nodes anchored to the
   glowing temple area of the robot-head image (see getAnchor()
   below) so the mesh visibly grows into and lights up the
   portrait rather than sitting as a separate layer on top of it.
   ========================================================= */

const heroEl = document.querySelector('.hero');
const canvas = document.getElementById('network-bg');
const ctx = canvas.getContext('2d');
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
window.addEventListener('resize', () => { resize(); seedNodes(); seedBokeh(); });

/* --- mouse tracking, relative to the canvas (hero only) --- */
const mouse = { x: -9999, y: -9999, active: false };
heroEl.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
});
heroEl.addEventListener('mouseleave', () => { mouse.active = false; });
heroEl.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = t.clientX - rect.left;
    mouse.y = t.clientY - rect.top;
    mouse.active = true;
}, { passive: true });

/* --- palette: Digital Age — light blue / white / gray / electric green --- */
const EDGE_BASE = { r: 60,  g: 110, b: 150 }; // dim resting connection
const NODE_BASE = { r: 130, g: 210, b: 255 }; // light blue resting node
const HOT       = { r: 70,  g: 255, b: 120 }; // electric green when activated
const BOKEH_COLOR = { r: 110, g: 180, b: 230 };

const ACTIVATE_RADIUS = 120;
const K_NEAREST = 3; // each node links to its 3 closest neighbors — gives the
                      // triangulated, faceted look instead of a dense flat web

/* --- anchor for the robot-head image ---
   Mirrors the CSS placement of .hero-robot-img (right: 3vw, vertically
   centered, width: min(46vw, 560px)) and targets roughly the glowing
   temple/cheek cluster in the source photo, so hub nodes land on top of
   the image's own lights instead of drifting over blank space. Only
   used above the mobile breakpoint, where the portrait is prominent. */
function getAnchor() {
    const imgW = Math.min(W * 0.46, 560);
    const rightGap = W * 0.03;
    return {
        x: W - rightGap - imgW * 0.38,
        y: H * 0.46
    };
}

/* --- foreground mesh nodes --- */
let nodes = [];
function seedNodes() {
    const count = Math.max(28, Math.floor((W * H) / 13000));
    nodes = new Array(count).fill(0).map(() => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        depth: Math.random(),           // 0 = near/bright, 1 = far/dim
        activation: 0,
        neighbors: [],
        hub: false
    }));

    /* hub cluster — small, slow-drifting, permanently lit nodes seeded
       around the image's glowing area so the mesh reads as connected
       into the portrait rather than layered over it */
    if (W > 700) {
        const anchor = getAnchor();
        const hubCount = 7;
        for (let i = 0; i < hubCount; i++) {
            const angle = (i / hubCount) * Math.PI * 2 + Math.random() * 0.6;
            const rad = 18 + Math.random() * 85;
            nodes.push({
                x: anchor.x + Math.cos(angle) * rad,
                y: anchor.y + Math.sin(angle) * rad,
                vx: (Math.random() - 0.5) * 0.04,
                vy: (Math.random() - 0.5) * 0.04,
                depth: 0.02 + Math.random() * 0.08, // near/bright
                activation: 0.5,
                neighbors: [],
                hub: true
            });
        }
    }
}
seedNodes();

/* --- background bokeh circles, for depth --- */
let bokeh = [];
function seedBokeh() {
    const count = Math.max(10, Math.floor((W * H) / 30000));
    bokeh = new Array(count).fill(0).map(() => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 14 + Math.random() * 34,
        alpha: 0.06 + Math.random() * 0.10,
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
        white: Math.random() < 0.35 // some bokeh circles lean white instead of blue
    }));
}
seedBokeh();

let pulses = [];
const MAX_PULSES = 160;
function spawnPulse(fromIdx, toIdx, life) {
    if (pulses.length >= MAX_PULSES) return;
    pulses.push({ from: fromIdx, to: toIdx, t: 0, speed: 0.012 + Math.random() * 0.014, life });
}

/* k-nearest-neighbor linking instead of "everything within radius" —
   this is what produces distinct triangles rather than a dense mesh */
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
    ctx.fillStyle = 'rgba(8,12,17,0.34)';
    ctx.fillRect(0, 0, W, H);

    /* --- background bokeh layer, blurred for depth --- */
    ctx.save();
    ctx.filter = 'blur(9px)';
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
    ctx.restore(); // clears the blur filter for the crisp foreground mesh

    /* --- update foreground nodes --- */
    for (const n of nodes) {
        if (!n.hub) {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < 0 || n.x > W) n.vx *= -1;
            if (n.y < 0 || n.y > H) n.vy *= -1;
            n.x = Math.max(0, Math.min(W, n.x));
            n.y = Math.max(0, Math.min(H, n.y));
            n.activation *= 0.94;
        } else {
            // hubs drift gently in place and never fully dim, so they
            // read as the "always lit" points on the portrait
            n.x += n.vx;
            n.y += n.vy;
            n.activation = Math.max(n.activation * 0.985, 0.4);
        }
    }

    updateNeighbors();

    if (mouse.active) {
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            const dx = n.x - mouse.x;
            const dy = n.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < ACTIVATE_RADIUS) {
                const force = 1 - dist / ACTIVATE_RADIUS;
                if (n.activation < force) {
                    n.activation = Math.max(n.activation, force);
                    for (const nb of n.neighbors) {
                        if (Math.random() < 0.5) spawnPulse(i, nb, 2);
                    }
                }
            }
        }
    }

    ambientTimer--;
    if (ambientTimer <= 0 && nodes.length) {
        ambientTimer = 6 + Math.random() * 10;
        const i = Math.floor(Math.random() * nodes.length);
        const n = nodes[i];
        if (n.neighbors.length) {
            const nb = n.neighbors[Math.floor(Math.random() * n.neighbors.length)];
            spawnPulse(i, nb, 1);
            n.activation = Math.max(n.activation, 0.35);
        }
    }

    /* --- edges: the triangulated mesh --- */
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (const j of a.neighbors) {
            if (j < i) continue;
            const b = nodes[j];
            const glow = Math.max(a.activation, b.activation);
            const nearness = 1 - (a.depth + b.depth) / 2; // closer pairs read brighter
            const alpha = 0.16 + nearness * 0.22 + glow * 0.55;
            const width = 0.6 + nearness * 1.1 + glow * 1.2;
            const r = EDGE_BASE.r + (HOT.r - EDGE_BASE.r) * glow;
            const g = EDGE_BASE.g + (HOT.g - EDGE_BASE.g) * glow;
            const bl = EDGE_BASE.b + (HOT.b - EDGE_BASE.b) * glow;
            ctx.strokeStyle = `rgba(${r | 0},${g | 0},${bl | 0},${alpha.toFixed(3)})`;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
    }

    /* --- traveling pulses --- */
    pulses = pulses.filter(p => {
        p.t += p.speed;
        if (p.t >= 1) {
            const toNode = nodes[p.to];
            if (toNode) {
                toNode.activation = Math.max(toNode.activation, 0.8);
                if (p.life > 0) {
                    for (const nb of toNode.neighbors) {
                        if (nb !== p.from && Math.random() < 0.35) spawnPulse(p.to, nb, p.life - 1);
                    }
                }
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
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /* --- nodes, drawn as small glowing lights (radial gradient, not flat dots) --- */
    for (const n of nodes) {
        const glow = n.activation;
        const nearness = 1 - n.depth;
        const r = NODE_BASE.r + (HOT.r - NODE_BASE.r) * glow;
        const g = NODE_BASE.g + (HOT.g - NODE_BASE.g) * glow;
        const b = NODE_BASE.b + (HOT.b - NODE_BASE.b) * glow;
        const coreSize = 1.1 + nearness * 1.6 + glow * 2.2;
        const glowSize = coreSize * (3 + glow * 3);
        const glowAlpha = 0.35 + nearness * 0.25 + glow * 0.4;

        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowSize);
        grad.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},${glowAlpha.toFixed(3)})`);
        grad.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},0)`);
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(n.x, n.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${(0.6 + glow * 0.4).toFixed(3)})`;
        ctx.arc(n.x, n.y, coreSize, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
}
frame();