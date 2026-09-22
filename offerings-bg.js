/* =========================================================
   AMBIENT NETWORK BACKDROP — every service/about/contact page
   The same sparse, non-interactive mesh used behind the first
   service page, now instantiated once per ".service-page"
   section so each page gets its own independent, low-density
   animation (colored by that page's own --accent, same as its
   glow card). Fully separate from script.js — the hero
   animation is never touched by this file.
   ========================================================= */

(function () {
    const hosts = document.querySelectorAll('.service-page');

    hosts.forEach((hostEl) => {
        const canvas = hostEl.querySelector('canvas.service-bg');
        if (!canvas) return;
        initAmbientNetwork(hostEl, canvas);
    });

    function initAmbientNetwork(hostEl, canvas) {
        const ctx = canvas.getContext('2d');
        let W, H, DPR;

        function accentRGB() {
            const hex = getComputedStyle(hostEl).getPropertyValue('--accent').trim() || '#5fd0ff';
            const m = hex.replace('#', '');
            const bigint = parseInt(m.length === 3
                ? m.split('').map(c => c + c).join('')
                : m, 16);
            return {
                r: (bigint >> 16) & 255,
                g: (bigint >> 8) & 255,
                b: bigint & 255
            };
        }

        const ACCENT = accentRGB();
        const EDGE = { r: 60, g: 110, b: 150 };

        function resize() {
            DPR = Math.min(window.devicePixelRatio || 1, 2);
            const rect = hostEl.getBoundingClientRect();
            W = rect.width;
            H = rect.height;
            canvas.width = W * DPR;
            canvas.height = H * DPR;
            canvas.style.width = W + 'px';
            canvas.style.height = H + 'px';
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        }
        resize();
        window.addEventListener('resize', () => { resize(); seedNodes(); }, { passive: true });

        let sectionVisible = true;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => { sectionVisible = entry.isIntersecting; });
        }, { threshold: 0.05 });
        observer.observe(hostEl);

        const K_NEAREST = 2;
        let nodes = [];

        function seedNodes() {
            // sparse: roughly a tenth the density of the hero mesh
            const count = Math.max(10, Math.floor((W * H) / 55000));
            nodes = new Array(count).fill(0).map(() => ({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.05,
                vy: (Math.random() - 0.5) * 0.05,
                depth: Math.random(),
                activation: 0,
                neighbors: []
            }));
        }
        seedNodes();

        let pulses = [];
        function spawnPulse(fromIdx, toIdx) {
            if (pulses.length >= 9) return;
            pulses.push({ from: fromIdx, to: toIdx, t: 0, speed: 0.01 + Math.random() * 0.01 });
        }

        function updateNeighbors() {
            for (let i = 0; i < nodes.length; i++) nodes[i].neighbors = [];
            const seen = new Set();
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
                    if (!seen.has(key)) {
                        seen.add(key);
                        nodes[i].neighbors.push(j);
                        nodes[j].neighbors.push(i);
                    }
                }
            }
        }

        let ambientTimer = 40 + Math.random() * 60; // stagger pages so they don't pulse in lockstep

        function frame() {
            requestAnimationFrame(frame);
            if (!sectionVisible || !nodes.length) return;

            ctx.clearRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'lighter';

            for (const n of nodes) {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > W) n.vx *= -1;
                if (n.y < 0 || n.y > H) n.vy *= -1;
                n.activation *= 0.96;
            }

            updateNeighbors();

            ambientTimer--;
            if (ambientTimer <= 0) {
                ambientTimer = 70 + Math.random() * 110; // occasional, not continuous
                const i = Math.floor(Math.random() * nodes.length);
                const n = nodes[i];
                if (n && n.neighbors.length) {
                    const nb = n.neighbors[Math.floor(Math.random() * n.neighbors.length)];
                    spawnPulse(i, nb);
                    n.activation = Math.max(n.activation, 0.5);
                }
            }

            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (const j of a.neighbors) {
                    if (j < i) continue;
                    const b = nodes[j];
                    const glow = Math.max(a.activation, b.activation);
                    const nearness = 1 - (a.depth + b.depth) / 2;
                    const alpha = 0.05 + nearness * 0.06 + glow * 0.3;
                    ctx.strokeStyle = `rgba(${EDGE.r},${EDGE.g},${EDGE.b},${alpha.toFixed(3)})`;
                    ctx.lineWidth = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            pulses = pulses.filter(p => {
                p.t += p.speed;
                if (p.t >= 1) {
                    const toNode = nodes[p.to];
                    if (toNode) toNode.activation = Math.max(toNode.activation, 0.6);
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
                ctx.fillStyle = `rgba(${ACCENT.r},${ACCENT.g},${ACCENT.b},0.9)`;
                ctx.arc(x, y, 2.4, 0, Math.PI * 2);
                ctx.fill();
            }

            for (const n of nodes) {
                const glow = n.activation;
                const nearness = 1 - n.depth;
                const r = 130 + (ACCENT.r - 130) * glow;
                const g = 210 + (ACCENT.g - 210) * glow;
                const b = 255 + (ACCENT.b - 255) * glow;
                const core = 1.8 + nearness * 1.3 + glow * 1.8;
                const ga = 0.22 + nearness * 0.16 + glow * 0.4;

                const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, core * 4);
                grad.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},${ga.toFixed(3)})`);
                grad.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},0)`);
                ctx.beginPath();
                ctx.fillStyle = grad;
                ctx.arc(n.x, n.y, core * 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.fillStyle = `rgba(255,255,255,${(0.5 + glow * 0.4).toFixed(3)})`;
                ctx.arc(n.x, n.y, core, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalCompositeOperation = 'source-over';
        }
        frame();
    }
})();
