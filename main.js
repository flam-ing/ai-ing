// State variables
  let currentHero = 1;
  let activeCase = 1;
  let activeArea = 'b2b';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // DOMContentLoaded initialization
  document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    setupReveal();
    setupCountup();
    setupParallax();
    setupScrollStory();
    setupAIChatSim();
    setupKinetic();
    setupTyper();
    setupScrollProgress();
  });

  // Hype motion: kinetic word-by-word title reveals (Remotion-style)
  function splitKinetic(root) {
    let idx = 0;
    const process = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
            const s = document.createElement('span');
            s.className = 'kinetic-word';
            s.style.setProperty('--kd', (idx++ * 55) + 'ms');
            s.textContent = w;
            frag.appendChild(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          if (child.classList.contains('grad-flow')) {
            child.classList.add('kinetic-word');
            child.style.setProperty('--kd', (idx++ * 55) + 'ms');
          } else {
            process(child);
          }
        }
      });
    };
    process(root);
  }

  function setupKinetic() {
    if (prefersReducedMotion) return;
    const targets = Array.from(document.querySelectorAll('[data-kinetic], .section-title, .services-title, #contact h2'));
    targets.forEach((el) => {
      if (el.dataset.kineticDone) return;
      el.dataset.kineticDone = '1';
      splitKinetic(el);
      el.classList.add('kinetic-ready');
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('kinetic-on');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    targets.forEach((el) => io.observe(el));
  }

  // Brand typewriter chip: AI x CONSULT(ING)...
  function setupTyper() {
    const el = document.getElementById('typer-word');
    if (!el) return;
    if (prefersReducedMotion) { el.innerHTML = 'CONSULT<b>ING</b>'; return; }
    const words = ['CONSULTING', 'CODING', 'AUTOMATING', 'TEACHING', 'BUILDING'];
    let wi = 0, n = words[0].length, dir = -1;
    const render = () => {
      const word = words[wi];
      const cut = Math.max(0, Math.min(n, word.length - 3));
      const head = word.slice(0, cut);
      const tail = word.slice(cut, n);
      el.innerHTML = head + (tail ? '<b>' + tail + '</b>' : '');
    };
    const tick = () => {
      const word = words[wi];
      n += dir;
      if (n > word.length) { n = word.length; dir = -1; setTimeout(tick, 1700); return; }
      if (n < 0) { n = 0; dir = 1; wi = (wi + 1) % words.length; setTimeout(tick, 350); return; }
      render();
      setTimeout(tick, dir > 0 ? 70 : 36);
    };
    setTimeout(tick, 1600);
  }

  // Gradient scroll progress bar
  function setupScrollProgress() {
    if (document.getElementById('scroll-progress')) return;
    const bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0).toFixed(2) + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // Self-playing AI consultation chat (loops while the payment section is visible)
  function setupAIChatSim() {
    const body = document.getElementById('chat-sim-body');
    const typed = document.getElementById('chat-sim-typed');
    if (!body || !typed) return;

    const convo = [
      { who: 'user', text: '세무 영수증 정리를 자동화하고 싶어요. 가능할까요?' },
      { who: 'ai',   text: '네! 폴더의 PDF를 Claude로 파싱해 노션 DB에 자동 동기화하는 24시간 에이전트를 설계해 드립니다. 월 처리량만 알려주시면 인프라 비용도 추정해 드려요.' },
      { who: 'user', text: '한 달에 영수증 300건 정도예요.' },
      { who: 'ai',   text: '300건이면 로컬 맥미니 한 대로 충분합니다. 초기 세팅과 보안망 구성까지 1:1로 진행해요. 아래 양식에 연락처만 남겨주시면 24시간 내로 무료 상담을 잡아드려요 👇' }
    ];

    let i = 0, timers = [];
    const after = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
    const clear = () => { timers.forEach(clearTimeout); timers = []; };

    function addBubble(who, text) {
      const b = document.createElement('div');
      b.className = 'chat-bubble ' + who;
      b.textContent = text;
      body.appendChild(b);
      body.scrollTop = body.scrollHeight;
    }
    function typingDots() {
      const b = document.createElement('div');
      b.className = 'chat-bubble ai typing';
      b.innerHTML = '<span></span><span></span><span></span>';
      body.appendChild(b);
      body.scrollTop = body.scrollHeight;
      return b;
    }
    function typeInto(text, done) {
      let n = 0;
      typed.textContent = '';
      const tick = () => {
        typed.textContent = text.slice(0, n++);
        if (n <= text.length) after(28, tick); else after(450, done);
      };
      tick();
    }
    function run() {
      const step = convo[i];
      if (!step) { after(2800, () => { body.innerHTML = ''; i = 0; run(); }); return; }
      if (step.who === 'user') {
        typeInto(step.text, () => { typed.textContent = ''; addBubble('user', step.text); i++; after(550, run); });
      } else {
        const t = typingDots();
        after(1100, () => { t.remove(); addBubble('ai', step.text); i++; after(1200, run); });
      }
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { clear(); body.innerHTML = ''; typed.textContent = ''; i = 0; run(); }
        else { clear(); }
      });
    }, { threshold: 0.3 });
    io.observe(body);
  }

  // Particle background field
  function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    let w = 0, h = 0, particles = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(40, Math.min(130, Math.floor(w * h / 12000)));
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.6 + 0.5
        });
      }
    };
    
    resize();
    const host = canvas.parentElement;
    
    host.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    
    host.addEventListener('mouseleave', () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      
      // Update particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 150 && dist > 0.01) {
          const f = (150 - dist) / 150;
          p.x += dx / dist * f * 1.4;
          p.y += dy / dist * f * 1.4;
        }
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 112) {
            ctx.strokeStyle = 'rgba(59,51,165,' + (1 - d / 112) * 0.16 + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw particle dots
      for (const p of particles) {
        const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        const near = dm < 150;
        ctx.fillStyle = near ? 'rgba(230,24,98,0.95)' : 'rgba(226,219,236,0.45)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, near ? p.r + 0.6 : p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    draw();
  }

  // Scroll Reveal Animations
  function setupReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    els.forEach((el) => {
      const type = el.getAttribute('data-reveal');
      el.style.opacity = '0';
      if (type === 'zoom') {
        // Apple-style grand zoom-in + soft focus
        el.style.transform = 'scale(0.9)';
        el.style.filter = 'blur(8px)';
        el.style.transition = 'opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1), filter .9s cubic-bezier(.16,1,.3,1)';
      } else {
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity .75s cubic-bezier(.16,1,.3,1), transform .75s cubic-bezier(.16,1,.3,1)';
      }
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const el = e.target;
          el.style.transitionDelay = (el.getAttribute('data-delay') || 0) + 'ms';
          el.style.opacity = '1';
          el.style.transform = 'none';
          el.style.filter = 'none';
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  // Desktop Service Step Controller
  function goToServiceStep(stepIdx) {
    const story = document.getElementById('services');
    if (!story) return;

    // Ensure services tab is active
    if (!story.classList.contains('active')) {
      navigateTo('services');
    }

    const desktopLayout = story.querySelector('.desktop-services-layout');
    if (!desktopLayout) return;

    const rect = desktopLayout.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return;

    // Step centers under the hold-tail mapping: progress = (i + 0.5) / 2.5 * (1 - 0.25)
    const stepProgress = [0.16, 0.49, 0.82][stepIdx] || 0;
    const targetY = window.scrollY + rect.top + (total * stepProgress);

    window.scrollTo({
      top: targetY,
      behavior: 'smooth'
    });
  }

  // Scroll Story for Services (autoae.online / ReactBits style Sticky Scroll Reveal)
  function setupScrollStory() {
    const story = document.getElementById('services');
    if (!story) return;
    
    const desktopLayout = story.querySelector('.desktop-services-layout');
    const textItems = Array.from(story.querySelectorAll('.sticky-text-item'));
    const screens = Array.from(story.querySelectorAll('.mockup-screen'));
    const bgImages = Array.from(story.querySelectorAll('.service-bg-img'));
    const urlBar = story.querySelector('#mockup-url');
    if (!desktopLayout || textItems.length === 0) return;
    
    let storyTicking = false;

    // Per-step aurora palette (rgb) + blob positions (%) — interpolated continuously while scrolling
    const palette = [
      { c1:[230,24,98],   c2:[59,51,165],   c3:[6,182,212] },
      { c1:[139,130,255], c2:[59,130,246],  c3:[230,24,98] },
      { c1:[6,182,212],   c2:[16,185,129],  c3:[59,51,165] }
    ];
    const blobPos = [
      { ax:6,  ay:6,  bx:50, by:24, cx:24, cy:50 },
      { ax:38, ay:14, bx:12, by:40, cx:58, cy:48 },
      { ax:20, ay:40, bx:56, by:10, cx:30, cy:58 }
    ];
    const urls = [
      'https://ai-ing.org/automation',
      'https://ai-ing.org/mentoring',
      'https://ai-ing.org/education'
    ];
    const aurora = document.getElementById('services-aurora');
    const dispNode = document.getElementById('liquid-disp');
    const turbNode = document.getElementById('liquid-turb');
    const mockupWindow = story.querySelector('.sticky-mockup-pane .mockup-window');
    const lerp = (a, b, t) => a + (b - a) * t;
    const rgb = (a, b, t) => `rgb(${Math.round(lerp(a[0],b[0],t))},${Math.round(lerp(a[1],b[1],t))},${Math.round(lerp(a[2],b[2],t))})`;
    const rgba = (a, b, t, al) => `rgba(${Math.round(lerp(a[0],b[0],t))},${Math.round(lerp(a[1],b[1],t))},${Math.round(lerp(a[2],b[2],t))},${al})`;
    const MORPH_MAX = 12; // max liquid-displacement during a transition
    const STORY_HOLD = 0.25; // last 25% of the sticky scroll = hold tail (step 3 stays put; exiting needs a deliberate scroll)

    // ===== Particles Morph Canvas Background =====
    const dotsCanvas = document.getElementById('services-dots-canvas');
    let dotsCtx = null;
    if (dotsCanvas) {
      dotsCtx = dotsCanvas.getContext('2d');
    }
    let dotsTime = 0;
    let dotsMx = 0.5, dotsMy = 0.5, dotsSmx = 0.5, dotsSmy = 0.5;
    const N = 144;
    const pt = [];
    for (let i = 0; i < N; i++) {
      pt.push({ x: 0, y: 0 });
    }

    story.addEventListener('pointermove', (e) => {
      const rect = story.getBoundingClientRect();
      dotsMx = (e.clientX - rect.left) / Math.max(1, rect.width);
      dotsMy = (e.clientY - rect.top) / Math.max(1, rect.height);
    }, { passive: true });

    function target(i, stage, cx, cy, R, time) {
      if (stage === 0) {
        const ring = i % 3;
        const idx = Math.floor(i / 3);
        const per = 48;
        const ang = (idx / per) * Math.PI * 2 + time * 0.05 * (ring % 2 ? -1 : 1) + ring * 0.42;
        const rad = R * (0.42 + 0.30 * ring);
        return [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.92];
      }
      if (stage === 1) {
        const side = i % 2;
        const k = Math.floor(i / 2);
        const ccx = cx + (side ? R * 0.46 : -R * 0.46);
        const ang = (k / 72) * Math.PI * 2 + time * (side ? -0.09 : 0.09);
        const rad = R * 0.56 * (0.3 + 0.7 * (((k * 7919) % 72) / 72));
        return [ccx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad];
      }
      const cols = 16;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cx - R * 0.95 + col * (R * 1.9 / (cols - 1));
      const y = cy + R * 0.72 - row * R * 0.165 - col * R * 0.035 + Math.sin(time * 1.3 + col * 0.55) * 5;
      return [x, y];
    }

    function drawDots() {
      if (!dotsCanvas || !dotsCtx) return;
      const w = dotsCanvas.clientWidth;
      const h = dotsCanvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (dotsCanvas.width !== Math.round(w * dpr) || dotsCanvas.height !== Math.round(h * dpr)) {
        dotsCanvas.width = Math.round(w * dpr);
        dotsCanvas.height = Math.round(h * dpr);
        pt.forEach(p => {
          if (p.x === 0 || p.x > w) p.x = Math.random() * w;
          if (p.y === 0 || p.y > h) p.y = Math.random() * h;
        });
      }
      dotsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dotsCtx.clearRect(0, 0, w, h);

      const s = progressVal * 2;
      const seg = Math.min(1, Math.max(0, Math.floor(s)));
      const f = Math.min(1, Math.max(0, s - seg));
      const ef = f * f * (3 - 2 * f);

      const p0 = palette[seg];
      const p1 = palette[Math.min(2, seg + 1)];
      const c1 = [lerp(p0.c1[0], p1.c1[0], f), lerp(p0.c1[1], p1.c1[1], f), lerp(p0.c1[2], p1.c1[2], f)];
      const c2 = [lerp(p0.c2[0], p1.c2[0], f), lerp(p0.c2[1], p1.c2[1], f), lerp(p0.c2[2], p1.c2[2], f)];

      const narrow = w < 992;
      let cx = w * 0.5;
      let cy = h * 0.5;
      if (!narrow) {
        const textPane = story.querySelector('.sticky-text-pane');
        if (textPane) {
          const tpRect = textPane.getBoundingClientRect();
          const cRect = dotsCanvas.getBoundingClientRect();
          cx = (tpRect.left - cRect.left) + tpRect.width * 0.45;
          cy = (tpRect.top - cRect.top) + tpRect.height * 0.5;
        } else {
          cx = w * 0.38;
        }
      }
      const R = Math.min(w, h) * 0.32;

      const px = (dotsSmx - 0.5) * 26;
      const py = (dotsSmy - 0.5) * 18;

      for (let i = 0; i < N; i++) {
        const A = target(i, seg, cx, cy, R, dotsTime);
        const B = target(i, Math.min(2, seg + 1), cx, cy, R, dotsTime);
        let tx = A[0] + (B[0] - A[0]) * ef + px;
        let ty = A[1] + (B[1] - A[1]) * ef + py;
        const p = pt[i];
        p.x += (tx - p.x) * 0.075;
        p.y += (ty - p.y) * 0.075;
      }

      const weights = [];
      for (let i = 0; i < 3; i++) {
        weights.push(Math.min(1, Math.max(0, 1 - Math.abs(s - i) * 1.6)));
      }

      dotsCtx.lineWidth = 1;
      const w0 = weights[0];
      const w1 = weights[1];
      const w2 = weights[2];

      if (w0 > 0.04) {
        for (let i = 0; i < N; i += 6) {
          const p = pt[i];
          dotsCtx.strokeStyle = `rgba(${Math.round(c1[0])},${Math.round(c1[1])},${Math.round(c1[2])},${(0.055 * w0).toFixed(3)})`;
          dotsCtx.beginPath(); dotsCtx.moveTo(p.x, p.y); dotsCtx.lineTo(cx + px, cy + py); dotsCtx.stroke();
        }
        for (let i = 0; i < N; i += 3) {
          const p = pt[i], q2 = pt[(i + 9) % N];
          const dx = p.x - q2.x, dy = p.y - q2.y;
          if (dx * dx + dy * dy < R * R * 0.07) {
            dotsCtx.strokeStyle = `rgba(${Math.round(c2[0])},${Math.round(c2[1])},${Math.round(c2[2])},${(0.075 * w0).toFixed(3)})`;
            dotsCtx.beginPath(); dotsCtx.moveTo(p.x, p.y); dotsCtx.lineTo(q2.x, q2.y); dotsCtx.stroke();
          }
        }
        const g = dotsCtx.createRadialGradient(cx + px, cy + py, 0, cx + px, cy + py, R * 0.2);
        g.addColorStop(0, `rgba(${Math.round(c1[0])},${Math.round(c1[1])},${Math.round(c1[2])},${(0.5 * w0).toFixed(3)})`);
        g.addColorStop(1, `rgba(${Math.round(c1[0])},${Math.round(c1[1])},${Math.round(c1[2])},0)`);
        dotsCtx.fillStyle = g;
        dotsCtx.beginPath(); dotsCtx.arc(cx + px, cy + py, R * 0.2, 0, Math.PI * 2); dotsCtx.fill();
      }
      if (w1 > 0.04) {
        for (let i = 0; i < N - 1; i += 4) {
          const p = pt[i], q2 = pt[i + 1];
          dotsCtx.strokeStyle = `rgba(${Math.round(c2[0])},${Math.round(c2[1])},${Math.round(c2[2])},${(0.07 * w1).toFixed(3)})`;
          dotsCtx.beginPath(); dotsCtx.moveTo(p.x, p.y); dotsCtx.lineTo(q2.x, q2.y); dotsCtx.stroke();
        }
      }
      if (w2 > 0.04) {
        for (let i = 0; i < N; i += 8) {
          const p = pt[i];
          dotsCtx.strokeStyle = `rgba(${Math.round(c1[0])},${Math.round(c1[1])},${Math.round(c1[2])},${(0.06 * w2).toFixed(3)})`;
          dotsCtx.beginPath(); dotsCtx.moveTo(p.x, p.y); dotsCtx.lineTo(p.x, p.y + 44); dotsCtx.stroke();
        }
      }

      for (let i = 0; i < N; i++) {
        const p = pt[i];
        const c = i % 2 ? c1 : c2;
        const al = 0.4 + 0.5 * (((i * 37) % 100) / 100);
        const r = 1.3 + (((i * 13) % 10) / 10) * 1.7;
        dotsCtx.fillStyle = `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${(al * 0.14).toFixed(3)})`;
        dotsCtx.beginPath(); dotsCtx.arc(p.x, p.y, r * 3.4, 0, Math.PI * 2); dotsCtx.fill();
        dotsCtx.fillStyle = `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${al.toFixed(3)})`;
        dotsCtx.beginPath(); dotsCtx.arc(p.x, p.y, r, 0, Math.PI * 2); dotsCtx.fill();
      }
    }

    function tickDots() {
      const rect = story.getBoundingClientRect();
      if (rect.bottom >= 0 && rect.top <= window.innerHeight) {
        dotsTime += 1 / 60;
        dotsSmx += (dotsMx - dotsSmx) * 0.06;
        dotsSmy += (dotsMy - dotsSmy) * 0.06;
        drawDots();
      }
      requestAnimationFrame(tickDots);
    }
    requestAnimationFrame(tickDots);

    let progressVal = 0;

    const updateStory = () => {
      storyTicking = false;
      const isMobile = window.innerWidth <= 992; // mobile runs the story too, minus heavy shaders

      const rect = desktopLayout.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return;
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(0.9999, scrolled / total));

      const stickyInner = desktopLayout.querySelector('.sticky-inner-wrapper');
      const bgLayer = story.querySelector('.services-bg-layer');
      if (stickyInner) stickyInner.style.opacity = '1';
      if (bgLayer) bgLayer.style.opacity = '1';

      // Story completes at (1 - STORY_HOLD) of the scroll, then step 3 holds centered
      // for the remaining tail — no fade-out, the section just needs extra scroll to release.
      const local = Math.min(2.5, (progress / (1 - STORY_HOLD)) * 2.5); // 0..2.5, capped at step 3 center
      progressVal = local / 2.5;                // dots morph finishes with the story, then holds
      const idx = Math.min(2, Math.floor(local));
      const next = Math.min(2, idx + 1);
      const frac = local - Math.floor(local);   // 0..1 within current step
      const activeIdx = idx;                     // active = current step (centers at i+0.5)

      // Text + url bar + step nav buttons: discrete with CSS pop
      textItems.forEach((item, i) => item.classList.toggle('active', i === activeIdx));
      story.querySelectorAll('.step-nav-btn').forEach((btn, i) => btn.classList.toggle('active', i === activeIdx));
      if (urlBar) urlBar.textContent = urls[activeIdx];

      // Continuous crossfade with extended full-display window (0.35 width) per step
      const weight = (i) => {
        const dist = Math.abs(local - (i + 0.5));
        if (dist < 0.35) return 1.0;
        return Math.max(0, 1 - (dist - 0.35) / 0.35);
      };
      bgImages.forEach((img, i) => { img.style.opacity = (weight(i) * 0.45).toFixed(3); });
      screens.forEach((scr, i) => {
        scr.style.opacity = weight(i).toFixed(3);
        scr.classList.toggle('active', i === activeIdx);
      });

      // Morphing aurora — lerp colors + blob positions between this step and the next
      if (aurora) {
        const p0 = palette[idx], p1 = palette[next];
        const b0 = blobPos[idx], b1 = blobPos[next];
        aurora.style.setProperty('--c1', rgb(p0.c1, p1.c1, frac));
        aurora.style.setProperty('--c2', rgb(p0.c2, p1.c2, frac));
        aurora.style.setProperty('--c3', rgb(p0.c3, p1.c3, frac));
        aurora.style.setProperty('--a-x', lerp(b0.ax, b1.ax, frac).toFixed(2) + '%');
        aurora.style.setProperty('--a-y', lerp(b0.ay, b1.ay, frac).toFixed(2) + '%');
        aurora.style.setProperty('--b-x', lerp(b0.bx, b1.bx, frac).toFixed(2) + '%');
        aurora.style.setProperty('--b-y', lerp(b0.by, b1.by, frac).toFixed(2) + '%');
        aurora.style.setProperty('--c-x', lerp(b0.cx, b1.cx, frac).toFixed(2) + '%');
        aurora.style.setProperty('--c-y', lerp(b0.cy, b1.cy, frac).toFixed(2) + '%');
        if (mockupWindow) mockupWindow.style.setProperty('--glow', rgba(p0.c1, p1.c1, frac, 0.4));
      }

      // Fluid headline glow — color + vertical position flow with scroll progress
      const glowTops = [30, 50, 70];
      story.style.setProperty('--glow-grad', `radial-gradient(circle, ${rgb(palette[idx].c1, palette[next].c1, frac)} 0%, transparent 70%)`);
      story.style.setProperty('--glow-top', lerp(glowTops[idx], glowTops[next], frac).toFixed(1) + '%');

      // Liquid displacement — desktop only (SVG displacement shader is too heavy for mobile GPUs)
      if (!isMobile) {
        const morph = (1 + Math.cos(frac * Math.PI * 2)) / 2;
        if (dispNode) dispNode.setAttribute('scale', (morph * MORPH_MAX).toFixed(2));
        if (turbNode) turbNode.setAttribute('baseFrequency', (0.006 + progress * 0.004).toFixed(4) + ' ' + (0.011 + progress * 0.004).toFixed(4));
      }

      storyTicking = false;
    };

    window.addEventListener('scroll', () => {
      if (!storyTicking) {
        requestAnimationFrame(updateStory);
        storyTicking = true;
      }
    }, { passive: true });
    
    window.addEventListener('resize', updateStory);

    
    // Listen for tab changes so we update immediately when services becomes active
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setTimeout(updateStory, 50);
        }
      });
    });
    observer.observe(story, { attributes: true });
    
    updateStory();
    setupMockupTilt();
  }

  // Premium 3D Tilt Hover Effect for Browser Mockups
  function setupMockupTilt() {
    const mockups = document.querySelectorAll('.mockup-window');
    mockups.forEach(mockup => {
      mockup.addEventListener('mousemove', e => {
        if (window.innerWidth <= 992) return; // Disable tilt on mobile/tablet
        
        const rect = mockup.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        // Mild premium 3D tilt (max 8 degrees)
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
        
        mockup.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
      });
      
      mockup.addEventListener('mouseleave', () => {
        mockup.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)';
      });
    });
  }

  // Countup Animation
  function setupCountup() {
    const els = document.querySelectorAll('[data-count]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateCount(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    els.forEach((el) => io.observe(el));
  }

  function animateCount(el) {
    const target = parseFloat(el.getAttribute('data-count'));
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const dur = 1500;
    const start = performance.now();

    const step = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = prefix + Math.round(target * e) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Parallax Photo Scroll
  function setupParallax() {
    const el = document.getElementById('parallax-photo');
    if (!el) return;
    window.addEventListener('scroll', () => {
      const y = window.scrollY || 0;
      if (y < 1000) {
        el.style.transform = 'translateY(' + (y * 0.06) + 'px) scale(1.08)';
      }
    }, { passive: true });
  }

  // Scroll Story for Services tab
  // Hero switcher
  function setHero(n) {
    currentHero = n;
    
    // Toggle active classes on variants
    document.querySelectorAll('.hero-variant').forEach((v, index) => {
      if (index + 1 === n) {
        v.classList.add('active');
      } else {
        v.classList.remove('active');
      }
    });

    // Toggle active classes on buttons
    document.querySelectorAll('.switcher-btn').forEach((btn, index) => {
      if (index + 1 === n) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Toggle Case Accordions
  function toggleCase(n) {
    activeCase = activeCase === n ? 0 : n;

    for (let i = 1; i <= 3; i++) {
      const el = document.getElementById('case-item-' + i);
      if (!el) continue;
      
      if (i === activeCase) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  }



  // Video Lightbox Modal Control
  function openVideo(videoId) {
    const modal = document.getElementById('video-modal');
    const iframe = document.getElementById('video-iframe');
    if (!modal || !iframe) return;

    iframe.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0';
    modal.style.display = 'flex';
  }

  function closeVideo() {
    const modal = document.getElementById('video-modal');
    const iframe = document.getElementById('video-iframe');
    if (!modal || !iframe) return;

    iframe.src = '';
    modal.style.display = 'none';
  }

  // Inquiry Form Submission
  async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerText : '무료 상담 및 문의 제출하기';
    
    // Get values
    const contactInfo = form.querySelector('#contact-info').value.trim();
    const content = form.querySelector('textarea').value.trim();
    
    if (!contactInfo || !content) {
      alert("이메일 또는 연락처 정보와 문의 내용을 입력해 주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(01[016789]-?\d{3,4}-?\d{4}|\d{2,3}-?\d{3,4}-?\d{4})$/;
    if (!emailRegex.test(contactInfo) && !phoneRegex.test(contactInfo)) {
      alert("올바른 이메일 주소 또는 전화번호를 입력해 주세요. (예: name@example.com 또는 010-1234-5678)");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = '전송 중...';
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact: contactInfo,
          content: content,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '이메일 전송에 실패했습니다.');
      }

      form.style.display = 'none';
      const successContainer = document.getElementById('form-success-container');
      if (successContainer) {
        successContainer.style.display = 'block';
      }
    } catch (err) {
      alert(`문의 제출 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
      }
    }
  }

  function resetForm() {
    document.getElementById('contact-form').reset();
    document.getElementById('contact-form').style.display = 'block';
    document.getElementById('form-success-container').style.display = 'none';
  }


  

  
  // Routing & Tab Navigation functions
  // Multi-page navigation: each tab now lives on its own page
  const PAGE_MAP = { hero: 'index.html', services: 'services.html', about: 'about.html', payment: 'payment.html', contact: 'contact.html' };
  function navigateTo(tabId) {
    const target = document.getElementById(tabId);
    if (target) {
      const targetY = target.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      return;
    }
    window.location.href = PAGE_MAP[tabId] || 'index.html';
  }





  function copyAccount() {
    const accountNum = "1002-6334-1822";
    navigator.clipboard.writeText(accountNum).then(() => {
      alert("계좌번호가 클립보드에 복사되었습니다: " + accountNum);
    }).catch(err => {
      const el = document.createElement('textarea');
      el.value = accountNum;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      alert("계좌번호가 복사되었습니다: " + accountNum);
    });
  }


  // YouTube IFrame API and resume video players
  const videoConfigs = [
      { playerId: 'player1', videoKey: 'RnhXTmJ0STdaVW8=', overlayId: 'overlay1' },
      { playerId: 'player2', videoKey: 'VmpiLWlmOVZFeFE=', overlayId: 'overlay2' },
      { playerId: 'player3', videoKey: 'ZXd3M0ZYTWZscDQ=', overlayId: 'overlay3' },
      { playerId: 'player4', videoKey: 'ZTR6X0V2cHJvcTQ=', overlayId: 'overlay4' },
      { playerId: 'player5', videoKey: 'OVo1MFpwT3JGYms=', overlayId: 'overlay5' },
      { playerId: 'player6', videoKey: 'bHJ4ZjlzQ05aODg=', overlayId: 'overlay6' },
      { playerId: 'player7', videoKey: 'd2hhcWRQS3pPbmc=', overlayId: 'overlay7' },
      { playerId: 'player8', videoKey: 'RUlEaFlWUFhkTDA=', overlayId: 'overlay8', fullPlay: true },
      { playerId: 'player9', videoKey: 'U0VpSy1hNnVvdjA=', overlayId: 'overlay9', fullPlay: true }
  ];

  const players = {};
  const pendingPlay = new Set();
  let youtubeApiReady = false;
  const MAX_TIME = 600; // 10 minutes

  function decodeVideoId(videoKey) {
      return atob(videoKey);
  }
  window.decodeVideoId = decodeVideoId;

  function getPlayerVars() {
      const playerVars = {
          modestbranding: 1,
          rel: 0,
          controls: 1,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          playsinline: 1
      };
      if (window.location.origin && window.location.origin !== 'null') {
          playerVars.origin = window.location.origin;
      }
      return playerVars;
  }
  window.getPlayerVars = getPlayerVars;

  function createPlayer(config, shouldPlay = false) {
      if (players[config.playerId]) {
          return players[config.playerId];
      }
      players[config.playerId] = new YT.Player(config.playerId, {
          height: '100%',
          width: '100%',
          host: 'https://www.youtube-nocookie.com',
          videoId: window.decodeVideoId(config.videoKey),
          playerVars: window.getPlayerVars(),
          events: {
              onReady: (event) => {
                  if (shouldPlay) {
                      event.target.playVideo();
                  }
              },
              onStateChange: (event) => window.onPlayerStateChange(event, config)
          }
      });
      return players[config.playerId];
  }
  window.createPlayer = createPlayer;

  function onYouTubeIframeAPIReady() {
      youtubeApiReady = true;
      pendingPlay.forEach(playerId => {
          const config = videoConfigs.find(item => item.playerId === playerId);
          if (config) {
              window.createPlayer(config, true);
          }
      });
      pendingPlay.clear();
  }
  window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

  function onPlayerStateChange(event, config) {
      if (config.fullPlay) return;
      if (event.data === YT.PlayerState.PLAYING) {
          const checkInterval = setInterval(() => {
              const player = players[config.playerId];
              if (player && player.getCurrentTime) {
                  const currentTime = player.getCurrentTime();
                  if (currentTime >= MAX_TIME) {
                      player.pauseVideo();
                      document.getElementById(config.overlayId).classList.add('active');
                      clearInterval(checkInterval);
                  }
              }
          }, 1000);
      }
  }
  window.onPlayerStateChange = onPlayerStateChange;

  function startVideo(playerNum) {
      const startOverlay = document.getElementById('start' + playerNum);
      const config = videoConfigs.find(item => item.playerId === 'player' + playerNum);
      if (!config) return;
      startOverlay.classList.add('hidden');
      const player = players[config.playerId];
      if (player && player.playVideo) {
          player.playVideo();
          return;
      }
      if (youtubeApiReady && window.YT && window.YT.Player) {
          window.createPlayer(config, true);
          return;
      }
      pendingPlay.add(config.playerId);
  }
  window.startVideo = startVideo;

  // Seamless Background video playlist cycling (Cross-fading between statically loaded videos)
  const vids = [
    document.getElementById('bg-video-1'),
    document.getElementById('bg-video-2'),
    document.getElementById('bg-video-3'),
    document.getElementById('bg-video-4')
  ].filter(Boolean);
  
  if (vids.length > 0) {
    let currentIdx = 0;
    
    // Play the first video initially
    vids[0].play().catch(e => console.log(e));
    
    const handleTimeUpdate = (e) => {
      const activeVideo = e.target;
      
      // Start crossfade after 5 seconds of playback, or 1.2s before the end if the video is shorter
      const threshold = activeVideo.duration ? Math.min(5, activeVideo.duration - 1.2) : 5;
      if (activeVideo.currentTime >= threshold) {
        activeVideo.removeEventListener('timeupdate', handleTimeUpdate);
        
        const nextIdx = (currentIdx + 1) % vids.length;
        const nextVideo = vids[nextIdx];
        
        // Prepare and play the next video
        nextVideo.currentTime = 0;
        nextVideo.play().then(() => {
          // Fade active out, next in
          activeVideo.style.opacity = '0';
          nextVideo.style.opacity = '1';
          
          // Pause the old video after transition completes (1.2s)
          const oldVideo = activeVideo;
          setTimeout(() => {
            if (currentIdx !== nextIdx) {
              oldVideo.pause();
            }
          }, 1200);
          
          currentIdx = nextIdx;
          nextVideo.addEventListener('timeupdate', handleTimeUpdate);
        }).catch(err => {
          console.log('Video cycle error:', err);
          activeVideo.style.opacity = '0';
          nextVideo.style.opacity = '1';
          activeVideo.pause();
          currentIdx = nextIdx;
          nextVideo.addEventListener('timeupdate', handleTimeUpdate);
        });
      }
    };
    
    vids[0].addEventListener('timeupdate', handleTimeUpdate);
  }



  window.openPaymentModal = function() {
    document.getElementById('payment-modal').style.display = 'flex';
    document.getElementById('payment-step-1').style.display = 'block';
    document.getElementById('payment-pg-window').style.display = 'none';
    document.getElementById('payment-step-2').style.display = 'none';
    
    const radioPdf = document.querySelector('input[name="payment-product"][value="10000"]');
    if (radioPdf) radioPdf.checked = true;
    window.selectProduct('pdf');
  };
  window.closePaymentModal = function() {
    document.getElementById('payment-modal').style.display = 'none';
  };
  window.selectProduct = function(type) {
    const pdfLabel = document.getElementById('product-label-pdf');
    const consultLabel = document.getElementById('product-label-consult');
    const amountInput = document.getElementById('payment-amount');
    const nameInput = document.getElementById('payment-product-name');
    
    if (!pdfLabel || !consultLabel || !amountInput || !nameInput) return;
    
    if (type === 'pdf') {
      pdfLabel.style.borderColor = '#e61862';
      pdfLabel.style.backgroundColor = 'rgba(230,24,98,0.02)';
      consultLabel.style.borderColor = '#e3e5ea';
      consultLabel.style.backgroundColor = '#fff';
      amountInput.value = 11000; // 10,000 + 10% VAT
      nameInput.value = "온라인 PDF 교재";
    } else {
      consultLabel.style.borderColor = '#e61862';
      consultLabel.style.backgroundColor = 'rgba(230,24,98,0.02)';
      pdfLabel.style.borderColor = '#e3e5ea';
      pdfLabel.style.backgroundColor = '#fff';
      amountInput.value = 55000; // 50,000 + 10% VAT
      nameInput.value = "컨설팅 및 교육 1시간권";
    }
  };
  window.openPGWindow = function() {
    const amount = Number(document.getElementById('payment-amount').value);
    const productName = document.getElementById('payment-product-name').value;
    if (!amount || amount < 1000) {
      alert("최소 결제 금액은 1,000원입니다.");
      return;
    }
    document.getElementById('pg-amount-display').innerText = amount.toLocaleString() + '원 (부가세 10% 포함)';
    document.getElementById('payment-step-1').style.display = 'none';
    document.getElementById('payment-pg-window').style.display = 'block';
  };
  window.cancelPGWindow = function() {
    document.getElementById('payment-pg-window').style.display = 'none';
    document.getElementById('payment-step-1').style.display = 'block';
  };
  window.triggerPortOnePayment = async function(method) {
    const amount = Number(document.getElementById('payment-amount').value);
    
    let channelKey = "CHANNEL_KEY_PLACEHOLDER";
    let payMethod = "EASY_PAY";
    let easyPayProvider = null;
    let methodNameKr = "";

    if (method === 'KAKAOPAY') {
      channelKey = "channel-key-659caa1e-6f55-42f5-8b02-d06e3837a446"; // KakaoPay test channel key
      easyPayProvider = "KAKAOPAY";
      methodNameKr = "카카오페이";
    } else if (method === 'CARD') {
      channelKey = "channel-key-b95c36d1-7b94-49c4-bbde-c943bf57b12d"; // Korea Payment Networks card channel key
      payMethod = "CARD";
      methodNameKr = "신용카드 결제";
    }

    const payBtnMap = {
      'KAKAOPAY': document.getElementById('btn-pay-kakao'),
      'CARD': document.getElementById('btn-pay-card')
    };
    
    const activeBtn = payBtnMap[method];
    const originalText = activeBtn.innerHTML;
    
    const allButtons = document.querySelectorAll('#payment-pg-window button');
    allButtons.forEach(btn => btn.disabled = true);
    activeBtn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid ${method === 'KAKAOPAY' ? '#000' : '#fff'};border-top-color:transparent;border-radius:50%;animation:pg-spin .6s linear infinite;vertical-align:middle;margin-right:6px;"></span>처리 중...`;

    try {
      // 1. 백엔드 API에 임시 주문(Order)을 생성하여 Turso DB에 기입
      const orderResponse = await fetch("https://payment.ai-ing.org/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount,
          currency: "KRW",
          itemName: document.getElementById('payment-product-name').value,
          locale: "ko",
          region: "domestic"
        })
      });
      
      const orderData = await orderResponse.json();
      if (!orderData.ok) {
        throw new Error(orderData.message || "주문 생성에 실패했습니다.");
      }
      
      const orderId = orderData.order.id;

      // 2. 생성된 orderId를 사용하여 포트원 결제 파라미터 세팅
      const paymentParams = {
        storeId: "store-f97f9c9a-054d-49f0-8c13-b5c59676bbcf",
        paymentId: orderId, // 하드코딩 랜덤값 대신 실제 DB orderId 매핑

        orderName: document.getElementById('payment-product-name').value,
        totalAmount: amount,
        currency: "CURRENCY_KRW",
        channelKey: channelKey,
        payMethod: payMethod,
        customer: {
          fullName: "에이아잉 고객",
          email: "customer@ai-ing.org",
        }
      };

      if (easyPayProvider) {
        paymentParams.easyPay = {
          provider: easyPayProvider
        };
      }

      // 3. 포트원 결제창 띄우기
      const response = await PortOne.requestPayment(paymentParams);

      allButtons.forEach(btn => btn.disabled = false);
      activeBtn.innerHTML = originalText;

      // 결제창이 닫혔거나 취소/실패된 경우
      if (response.code !== undefined) {
        if (response.code === "PORTONE_ERROR" || response.code === "PAY_PROCESS_CANCELED") {
          return;
        }
        alert("결제 실패: " + (response.message || "알 수 없는 오류"));
        return;
      }

      // 4. 결제 완료 승인 시 백엔드 API 호출하여 Turso DB 상태를 PAID 및 CAPTURED로 최종 업데이트
      const logResponse = await fetch("https://payment.ai-ing.org/api/v1/orders/" + orderId + "/payment-attempts/portone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: orderId,
          txId: response.txId || response.paymentId || "",
          method: methodNameKr
        })
      });
      
      const logData = await logResponse.json();
      if (!logData.ok) {
        console.error("Warning: Failed to log transaction state to Turso DB:", logData);
      }

      const formatted = amount.toLocaleString() + '원';
      document.getElementById('receipt-amount').innerText = formatted;
      document.getElementById('receipt-method').innerText = methodNameKr;
      if (document.getElementById('receipt-txid')) {
        document.getElementById('receipt-txid').innerText = response.txId || response.paymentId || '-';
      }
      document.getElementById('payment-pg-window').style.display = 'none';
      document.getElementById('payment-step-2').style.display = 'block';

    } catch (error) {
      allButtons.forEach(btn => btn.disabled = false);
      activeBtn.innerHTML = originalText;
      console.error("Payment error:", error);
      alert("결제 중 오류가 발생했습니다: " + (error.message || error));
    }
  };
