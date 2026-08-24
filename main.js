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

      // Toggle visibility of standard scroll cues
      const scrollY = window.scrollY;
      // overview/journey 내부 스크롤 유도는 섹션 스크립트가 관리 — 전역 hide 금지
      document.querySelectorAll('.scroll-cue').forEach(cue => {
        if (
          cue.id === 'services-scroll-cue' ||
          cue.id === 'overview-scroll-hint' ||
          cue.closest('#overview') ||
          cue.closest('#journey')
        ) {
          return;
        }
        cue.classList.toggle('hide', scrollY > 30);
      });
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // 메일 주고받기 시뮬레이션 (1회만 · 스크롤 가능 · 습니다체)
  function setupAIChatSim() {
    const body = document.getElementById('mail-thread-body');
    const root = document.getElementById('mail-thread');
    if (!body || !root) return;

    const mails = [
      {
        who: 'in',
        from: '문의자',
        to: 'contact@ai-ing.org',
        subject: '반복 업무 자동화가 궁금합니다',
        body: '안녕하세요.\n반복 업무를 자동화하고 싶은데, 어떻게 시작하면 될지 궁금합니다.\n감사합니다.'
      },
      {
        who: 'out',
        from: 'AI-ing',
        to: '문의자',
        subject: 'Re: 반복 업무 자동화가 궁금합니다',
        body: '안녕하세요. 에이아잉입니다.\n설계·구축 방법 등 QnA는 평생 무료로 안내드립니다.\n첨부해 드리는 안내를 보신 뒤, 원하시는 구독제와 에이전트를 골라 주시면 됩니다.\n초기 설치를 진행해 주시고, 필요하시면 해당 클라우드에서 API 연결까지 하시거나, 맥 미니와 같은 워크스페이스를 사서 설치해 주시면 됩니다.\n진행 중 막히는 부분이 있으면 메일로 이어서 물어 주시면 됩니다.'
      },
      {
        who: 'in',
        from: '문의자',
        to: 'contact@ai-ing.org',
        subject: 'Re: 반복 업무 자동화가 궁금합니다',
        body: '안내 감사합니다.\n설치와 연결 과정에서 막히면 다시 여쭙겠습니다.'
      },
      {
        who: 'out',
        from: 'AI-ing',
        to: '문의자',
        subject: 'Re: 반복 업무 자동화가 궁금합니다',
        body: '네, 편하게 남겨 주세요.\n방문·밋업·화상회의처럼 제 시간을 쓰는 서비스는 결제 페이지에서 별도 결제도 요청드리겠습니다.'
      }
    ];

    let i = 0;
    let played = false;
    let timers = [];
    const after = (ms, fn) => {
      const t = setTimeout(fn, ms);
      timers.push(t);
      return t;
    };
    const clear = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };

    function addMail(mail) {
      const el = document.createElement('article');
      el.className = 'mail-card mail-card--' + mail.who;
      el.innerHTML =
        '<header class="mail-card-head">' +
          '<div class="mail-card-meta">' +
            '<span class="mail-card-label">From</span> <span class="mail-card-val">' + mail.from + '</span>' +
          '</div>' +
          '<div class="mail-card-meta">' +
            '<span class="mail-card-label">To</span> <span class="mail-card-val">' + mail.to + '</span>' +
          '</div>' +
          '<div class="mail-card-meta mail-card-subject">' +
            '<span class="mail-card-label">Subject</span> <span class="mail-card-val">' + mail.subject + '</span>' +
          '</div>' +
        '</header>' +
        '<div class="mail-card-body"></div>';
      const bodyEl = el.querySelector('.mail-card-body');
      mail.body.split('\n').forEach((line) => {
        const p = document.createElement('p');
        p.textContent = line;
        bodyEl.appendChild(p);
      });
      body.appendChild(el);
      // 새 메일 보일 때 아래로 스크롤 (영역 자체는 수동 스크롤 가능)
      body.scrollTop = body.scrollHeight;
      requestAnimationFrame(() => el.classList.add('is-in'));
    }

    function run() {
      if (i >= mails.length) return; // 1회만, 반복 없음
      addMail(mails[i]);
      i += 1;
      if (i < mails.length) after(1700, run);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !played) {
            played = true;
            clear();
            body.innerHTML = '';
            i = 0;
            run();
            io.unobserve(root);
          }
        });
      },
      { threshold: 0.2 }
    );
    io.observe(root);
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
    const bgVideos = Array.from(story.querySelectorAll('.service-bg-video-el'));
    const urlBar = story.querySelector('#mockup-url');
    if (!desktopLayout || textItems.length === 0) return;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lastActiveVideoIdx = -1;
    let storyTicking = false;

    // Warm metadata for scroll scrub; keep muted autoplay off until step is active
    bgVideos.forEach((v) => {
      try {
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.preload = 'metadata';
      } catch (_) { /* ignore */ }
    });

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
          dotsCtx.strokeStyle = `rgba(${Math.round(c1[0])},${Math.round(c1[1])},${Math.round(c1[2])},${(0.18 * w0).toFixed(3)})`;
          dotsCtx.beginPath(); dotsCtx.moveTo(p.x, p.y); dotsCtx.lineTo(cx + px, cy + py); dotsCtx.stroke();
        }
        for (let i = 0; i < N; i += 3) {
          const p = pt[i], q2 = pt[(i + 9) % N];
          const dx = p.x - q2.x, dy = p.y - q2.y;
          if (dx * dx + dy * dy < R * R * 0.07) {
            dotsCtx.strokeStyle = `rgba(${Math.round(c2[0])},${Math.round(c2[1])},${Math.round(c2[2])},${(0.22 * w0).toFixed(3)})`;
            dotsCtx.beginPath(); dotsCtx.moveTo(p.x, p.y); dotsCtx.lineTo(q2.x, q2.y); dotsCtx.stroke();
          }
        }
        const g = dotsCtx.createRadialGradient(cx + px, cy + py, 0, cx + px, cy + py, R * 0.2);
        g.addColorStop(0, `rgba(${Math.round(c1[0])},${Math.round(c1[1])},${Math.round(c1[2])},${(0.9 * w0).toFixed(3)})`);
        g.addColorStop(1, `rgba(${Math.round(c1[0])},${Math.round(c1[1])},${Math.round(c1[2])},0)`);
        dotsCtx.fillStyle = g;
        dotsCtx.beginPath(); dotsCtx.arc(cx + px, cy + py, R * 0.2, 0, Math.PI * 2); dotsCtx.fill();
      }
      if (w1 > 0.04) {
        for (let i = 0; i < N - 1; i += 4) {
          const p = pt[i], q2 = pt[i + 1];
          dotsCtx.strokeStyle = `rgba(${Math.round(c2[0])},${Math.round(c2[1])},${Math.round(c2[2])},${(0.20 * w1).toFixed(3)})`;
          dotsCtx.beginPath(); dotsCtx.moveTo(p.x, p.y); dotsCtx.lineTo(q2.x, q2.y); dotsCtx.stroke();
        }
      }
      if (w2 > 0.04) {
        for (let i = 0; i < N; i += 8) {
          const p = pt[i];
          dotsCtx.strokeStyle = `rgba(${Math.round(c1[0])},${Math.round(c1[1])},${Math.round(c1[2])},${(0.18 * w2).toFixed(3)})`;
          dotsCtx.beginPath(); dotsCtx.moveTo(p.x, p.y); dotsCtx.lineTo(p.x, p.y + 44); dotsCtx.stroke();
        }
      }

      for (let i = 0; i < N; i++) {
        const p = pt[i];
        const c = i % 2 ? c1 : c2;
        const al = 0.4 + 0.5 * (((i * 37) % 100) / 100);
        const r = 1.3 + (((i * 13) % 10) / 10) * 1.7;
        dotsCtx.fillStyle = `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${(al * 0.45).toFixed(3)})`;
        dotsCtx.beginPath(); dotsCtx.arc(p.x, p.y, r * 3.4, 0, Math.PI * 2); dotsCtx.fill();
        dotsCtx.fillStyle = `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.min(1.0, al * 1.5).toFixed(3)})`;
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

      // Hide or show services scroll indicator cue based on scroll pos
      const cue = document.getElementById('services-scroll-cue');
      if (cue) {
        cue.classList.toggle('hide', scrolled > 30);
      }

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

      // Drive Mingo-mate 3D: zoom + 360° orbit + descend (0→1 across the sticky journey)
      if (window.__mingoScroll && typeof window.__mingoScroll.setProgress === 'function') {
        window.__mingoScroll.setProgress(progressVal);
      }

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
      // Background videos: stronger presence + scale punch on active step (product-page whoosh)
      bgImages.forEach((img, i) => {
        const w = weight(i);
        img.style.opacity = (w * 0.72).toFixed(3);
        const scale = 1.06 + w * 0.08;
        img.style.transform = `scale(${scale.toFixed(3)})`;
      });
      screens.forEach((scr, i) => {
        scr.style.opacity = weight(i).toFixed(3);
        scr.classList.toggle('active', i === activeIdx);
      });

      // Drive service background videos by scroll: pause + scrub currentTime (no free-run play)
      // local is roughly 0..2.5; step i centers around i+0.5, so map each step's local window to 0..1
      if (!reduceMotion && bgVideos.length) {
        bgVideos.forEach((v, i) => {
          const w = weight(i);
          if (w < 0.05) {
            if (!v.paused) {
              try { v.pause(); } catch (_) { /* ignore */ }
            }
            return;
          }
          if (!v.paused) {
            try { v.pause(); } catch (_) { /* ignore */ }
          }
          // Within-step progress 0..1 (before hold tail maps local up to 2.5)
          const stepLocal = Math.min(1, Math.max(0, local - i));
          if (v.readyState >= 1 && Number.isFinite(v.duration) && v.duration > 0) {
            const targetT = stepLocal * Math.max(0.05, v.duration - 0.05);
            if (Math.abs((v.currentTime || 0) - targetT) > 0.08) {
              try { v.currentTime = targetT; } catch (_) { /* ignore seek race */ }
            }
          } else if (v.readyState < 1) {
            // kick metadata load once when the step becomes visible
            try { v.load(); } catch (_) { /* ignore */ }
          }
        });
        if (activeIdx !== lastActiveVideoIdx) lastActiveVideoIdx = activeIdx;
      }

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
    // 허니팟(봇 차단용). 사람이 채우는 필드가 아니므로 값이 있으면 서버가 스팸으로 처리한다.
    const honeypotEl = form.querySelector('#company-website');
    const honeypot = honeypotEl ? honeypotEl.value.trim() : '';
    const privacyEl = form.querySelector('#privacy-agree');
    
    if (!contactInfo || !content) {
      alert("이메일 또는 연락처 정보와 문의 내용을 입력해 주세요.");
      return;
    }

    if (privacyEl && !privacyEl.checked) {
      alert("개인정보 수집·이용에 동의해 주세요.");
      privacyEl.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(01[016789]-?\d{3,4}-?\d{4}|\d{2,3}-?\d{3,4}-?\d{4})$/;
    if (!emailRegex.test(contactInfo) && !phoneRegex.test(contactInfo)) {
      alert("올바른 이메일 또는 전화번호를 입력해 주세요. (예: name@example.com 또는 010-1234-5678)");
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
          company_website: honeypot,
          privacy_agree: privacyEl ? !!privacyEl.checked : true,
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
  const PAGE_MAP = { hero: 'index.html', overview: 'overview.html', services: 'services.html', about: 'about.html', cases: 'cases.html', payment: 'payment.html', contact: 'contact.html' };
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
  window.copyAccount = copyAccount;


  // Native HTML5 Video configurations
  const videoConfigs = [
      { playerId: 'player1', overlayId: 'overlay1' },
      { playerId: 'player2', overlayId: 'overlay2' },
      { playerId: 'player3', overlayId: 'overlay3' },
      { playerId: 'player4', overlayId: 'overlay4' },
      { playerId: 'player5', overlayId: 'overlay5' },
      { playerId: 'player6', overlayId: 'overlay6' },
      { playerId: 'player7', overlayId: 'overlay7' },
      { playerId: 'player8', overlayId: 'overlay8', fullPlay: true },
      { playerId: 'player9', overlayId: 'overlay9', fullPlay: true }
  ];

  function startVideo(playerNum) {
      const startOverlay = document.getElementById('start' + playerNum);
      if (startOverlay) {
          startOverlay.classList.add('hidden');
      }

      const video = document.getElementById('player' + playerNum);
      if (video) {
          video.style.display = 'block';
          video.play();
          
          const config = videoConfigs.find(item => item.playerId === 'player' + playerNum);
          if (config && !config.fullPlay) {
              video.onended = () => {
                  document.getElementById(config.overlayId).classList.add('active');
              };
          }
      }
  }
  window.startVideo = startVideo;
  window.openVideo = openVideo;
  window.closeVideo = closeVideo;
  window.handleFormSubmit = handleFormSubmit;
  window.resetForm = resetForm;

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



  const PAYMENT_PRODUCTS = {
    pdf: { value: "10000", amount: 10000, name: "온라인 PDF 교재", labelId: "product-label-pdf" },
    consult: { value: "50000", amount: 50000, name: "AX 맞춤형 컨설팅 & 1:1 멘토링 1시간 서비스", labelId: "product-label-consult" },
    consult100k: { value: "100000", amount: 100000, name: "AX 맞춤형 컨설팅 & 실습 2시간 과정", labelId: "product-label-consult100k" },
    consult200k: { value: "200000", amount: 200000, name: "AX 맞춤형 컨설팅 & 프로젝트 1개월 집중 과정", labelId: "product-label-consult200k" },
    consult300k: { value: "300000", amount: 300000, name: "AX 맞춤형 컨설팅 & 실무 프로젝트 심화 과정", labelId: "product-label-consult300k" },
    consult500k: { value: "500000", amount: 500000, name: "AX 맞춤형 기업 컨설팅 & 1:1 멘토링 3개월 패키지", labelId: "product-label-consult500k" }
  };

  function productTypeFromRadioValue(value) {
    const map = {
      "10000": "pdf",
      "50000": "consult",
      "100000": "consult100k",
      "200000": "consult200k",
      "300000": "consult300k",
      "500000": "consult500k"
    };
    return map[String(value)] || "pdf";
  }

  /** 현재 선택된 상품 코드. 서버 카탈로그 조회 키로 사용된다. */
  function selectedProductCode() {
    const checked = document.querySelector('input[name="payment-product"]:checked');
    return checked ? productTypeFromRadioValue(String(checked.value)) : "pdf";
  }

  /** 선택 라디오를 금액/상품명의 단일 소스로 맞춤 */
  function syncAmountFromSelectedProduct() {
    const amountInput = document.getElementById("payment-amount");
    const nameInput = document.getElementById("payment-product-name");
    const checked = document.querySelector('input[name="payment-product"]:checked');
    if (!amountInput) return 0;

    let type = checked
      ? productTypeFromRadioValue(String(checked.value))
      : "pdf";
    const cfg = PAYMENT_PRODUCTS[type] || PAYMENT_PRODUCTS.pdf;
    amountInput.value = String(cfg.amount);
    if (nameInput) nameInput.value = cfg.name;
    return cfg.amount;
  }

  window.openPaymentModal = function () {
    document.getElementById("payment-modal").style.display = "flex";
    document.getElementById("payment-step-1").style.display = "block";
    document.getElementById("payment-pg-window").style.display = "none";
    document.getElementById("payment-step-2").style.display = "none";
    window.selectProduct("pdf");
  };
  window.closePaymentModal = function () {
    document.getElementById("payment-modal").style.display = "none";
  };
  window.selectProduct = function (type, evt) {
    if (evt) {
      // label 클릭 시 라디오 change와 이중 호출돼도 동일 결과
      evt.stopPropagation?.();
    }
    const cfg = PAYMENT_PRODUCTS[type];
    if (!cfg) return;

    const amountInput = document.getElementById("payment-amount");
    const nameInput = document.getElementById("payment-product-name");
    if (!amountInput || !nameInput) return;

    const radio = document.querySelector(
      `input[name="payment-product"][value="${cfg.value}"]`
    );
    if (radio) radio.checked = true;

    amountInput.value = String(cfg.amount);
    nameInput.value = cfg.name;

    Object.keys(PAYMENT_PRODUCTS).forEach((key) => {
      const el = document.getElementById(PAYMENT_PRODUCTS[key].labelId);
      if (!el) return;
      const active = key === type;
      if (active) {
        el.style.borderColor = "#e61862";
        el.style.backgroundColor = "rgba(230,24,98,0.02)";
        el.style.borderStyle = key === "test100" ? "dashed" : "solid";
      } else {
        el.style.borderColor = key === "test100" ? "#c5ccda" : "#e3e5ea";
        el.style.backgroundColor = key === "test100" ? "#fafbfc" : "#fff";
        el.style.borderStyle = key === "test100" ? "dashed" : "solid";
      }
    });

    console.info("[ai-ing payment] product selected", {
      type,
      amount: cfg.amount,
      name: cfg.name,
      radioValue: radio?.value
    });
  };
  // --- PortOne / ai-ing payment (Kakao live, card pending 보증보험) ---
  const AI_ING_PAYMENT = {
    apiBase: "https://payment.ai-ing.org",
    // 포트원 콘솔 「연동 정보」의 상점 ID. 실 카카오 채널과 같은 상점인지 확인할 것.
    storeId: "store-f97f9c9a-054d-49f0-8c13-b5c59676bbcf",
    // 실 카카오페이 채널 (월 한도 50만 — 백엔드 status API로 제어)
    kakaopayChannelKey: "channel-key-12b5e3ba-c048-4222-8eab-d8877dbf7c2a",
    // 가맹점 참고번호(메일/콘솔). PortOne V2 requestPayment 파라미터는 아님.
    kakaopayMerchantRef: "CA82817663",
    cardEnabled: true,
    cardChannelKey: "channel-key-e03c26ff-03b9-4b7f-b030-35b1c9c63235", // KG이니시스 V2 실운영 채널키
    kakaopayMonthlyLimit: 500000
  };

  async function fetchKakaopayStatus(amount) {
    const q = amount > 0 ? `?amount=${encodeURIComponent(amount)}` : "";
    const res = await fetch(
      `${AI_ING_PAYMENT.apiBase}/api/v1/payments/status/kakaopay${q}`,
      { cache: "no-store" }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.message || "카카오페이 한도 조회에 실패했습니다.");
    }
    return data;
  }

  async function fetchCardStatus(amount) {
    const q = amount > 0 ? `?amount=${encodeURIComponent(amount)}` : "";
    const res = await fetch(
      `${AI_ING_PAYMENT.apiBase}/api/v1/payments/status/card${q}`,
      { cache: "no-store" }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.message || "신용카드 한도 조회에 실패했습니다.");
    }
    return data;
  }

  function logCardStatus(status, amount) {
    if (!status) return;
    console.info("[ai-ing payment] card limit", {
      amount: amount ?? null,
      limit: status.limit,
      remainingLimit: status.remainingLimit,
      net: status.net,
      isAvailable: status.isAvailable,
      message: status.message
    });
  }

  /**
   * 구매자 입력 폼에서 구매자 성함, 이메일, 전화번호를 동적으로 추출.
   * 비어있을 경우 안전한 기본값으로 fallback.
   */
  function readCustomerInfo() {
    const nameEl = document.getElementById("buyer-name");
    const emailEl = document.getElementById("buyer-email");
    const phoneEl = document.getElementById("buyer-phone");

    const fullName = (nameEl && nameEl.value.trim()) ? nameEl.value.trim() : "구매자";
    const email = (emailEl && emailEl.value.trim()) ? emailEl.value.trim() : "contact@ai-ing.org";
    const phoneNumber = (phoneEl && phoneEl.value.trim()) ? phoneEl.value.trim() : "010-0000-0000";

    return {
      fullName: fullName,
      email: email,
      phoneNumber: phoneNumber
    };
  }

  window.openPGWindow = async function () {
    // 선택 라디오 값으로 금액 확정 (hidden input 어긋남 / 100원→5만원 버그 방지)
    const amount = syncAmountFromSelectedProduct();
    console.info("[ai-ing payment] openPGWindow amount", amount);
    if (!amount || amount < 100) {
      alert("최소 결제 금액은 100원입니다.");
      return;
    }

    document.getElementById("pg-amount-display").innerText =
      amount.toLocaleString() + "원";
    document.getElementById("payment-step-1").style.display = "none";
    document.getElementById("payment-pg-window").style.display = "block";

    const cardBtn = document.getElementById("btn-pay-card");
    try {
      const cardStatus = await fetchCardStatus(amount);
      logCardStatus(cardStatus, amount);
      if (cardBtn) {
        if (cardStatus.isAvailable === false) {
          cardBtn.disabled = true;
          cardBtn.style.opacity = "0.55";
          cardBtn.style.cursor = "not-allowed";
          cardBtn.title = "이번 달 신용카드 정산 한도(300만원)가 소진되었습니다.";
          cardBtn.innerHTML = "일반 신용카드 결제 (한도 소진)";
        } else {
          cardBtn.disabled = false;
          cardBtn.style.opacity = "1";
          cardBtn.style.cursor = "pointer";
          cardBtn.title = "일반 신용카드 결제";
          cardBtn.innerHTML = "일반 신용카드 결제";
        }
      }
    } catch (e) {
      console.warn("[ai-ing payment] card status fetch failed", e);
      if (cardBtn) {
        cardBtn.disabled = false;
        cardBtn.style.opacity = "1";
        cardBtn.style.cursor = "pointer";
        cardBtn.title = "일반 신용카드 결제";
        cardBtn.innerHTML = "일반 신용카드 결제";
      }
    }

    const kakaoBtn = document.getElementById("btn-pay-kakao");
    try {
      const status = await fetchKakaopayStatus(amount);
      logKakaopayStatus(status, amount);
      if (kakaoBtn) {
        if (status.isAvailable === false) {
          kakaoBtn.disabled = true;
          kakaoBtn.style.opacity = "0.55";
          kakaoBtn.style.cursor = "not-allowed";
          kakaoBtn.title = "지금은 카카오페이를 이용할 수 없습니다.";
        } else {
          kakaoBtn.disabled = false;
          kakaoBtn.style.opacity = "1";
          kakaoBtn.style.cursor = "pointer";
          kakaoBtn.title = "";
        }
      }
    } catch (e) {
      console.warn("[ai-ing payment] kakaopay status fetch failed", e);
      // 조회 실패 시에는 결제 시도는 허용 (서버/네트워크 일시 오류 대비)
      if (kakaoBtn) {
        kakaoBtn.disabled = false;
        kakaoBtn.style.opacity = "1";
        kakaoBtn.style.cursor = "pointer";
        kakaoBtn.title = "";
      }
    }
  };

  window.cancelPGWindow = function () {
    document.getElementById("payment-pg-window").style.display = "none";
    document.getElementById("payment-step-1").style.display = "block";
  };

  window.triggerPortOnePayment = async function (method) {
    const amount = syncAmountFromSelectedProduct();
    console.info("[ai-ing payment] triggerPortOne amount", amount, method);

    // 허용 수단: 카카오페이·신용카드만. 가상계좌/계좌이체/현금 송금 비활성.
    const ALLOWED = { KAKAOPAY: true, CARD: true };
    if (!ALLOWED[method]) {
      alert("지원하지 않는 결제 수단입니다. 카카오페이 또는 신용카드만 이용 가능합니다.");
      return;
    }

    const customer = readCustomerInfo();

    let channelKey = "";
    let payMethod = "EASY_PAY";
    let easyPayProvider = null;
    let methodNameKr = "";
    let methodCode = "";

    if (method === "KAKAOPAY") {
      // 결제 직전 한도 재확인 (숫자는 UI에 안 보여 줌)
      try {
        const status = await fetchKakaopayStatus(amount);
        logKakaopayStatus(status, amount);
        if (status.isAvailable === false) {
          alert("지금은 카카오페이 결제를 이용할 수 없습니다.\n잠시 후 다시 시도해 주세요.");
          return;
        }
      } catch (e) {
        console.warn("[ai-ing payment] kakaopay status recheck failed", e);
        // 조회 실패 시 진행은 허용 (네트워크 일시 오류)
      }

      channelKey = AI_ING_PAYMENT.kakaopayChannelKey;
      easyPayProvider = "KAKAOPAY";
      methodNameKr = "카카오페이";
      methodCode = "kakaopay"; // 백엔드 월 한도 집계용 (kakaopay% 매칭)
      if (!channelKey) {
        alert("카카오페이 결제 채널이 설정되지 않았습니다.");
        return;
      }
    } else if (method === "CARD") {
      channelKey = AI_ING_PAYMENT.cardChannelKey || "";
      payMethod = "CARD";
      methodNameKr = "신용카드 결제";
      methodCode = "card";
    } else {
      // VBANK / TRANSFER / VIRTUAL_ACCOUNT 등 현금성 수단 차단
      alert("가상계좌·계좌이체(현금 송금) 결제는 제공하지 않습니다.");
      return;
    }

    const payBtnMap = {
      KAKAOPAY: document.getElementById("btn-pay-kakao"),
      CARD: document.getElementById("btn-pay-card")
    };

    const activeBtn = payBtnMap[method];
    if (!activeBtn) return;
    const originalText = activeBtn.innerHTML;

    const allButtons = document.querySelectorAll("#payment-pg-window button");
    allButtons.forEach((btn) => (btn.disabled = true));
    activeBtn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid ${
      method === "KAKAOPAY" ? "#000" : "#fff"
    };border-top-color:transparent;border-radius:50%;animation:pg-spin .6s linear infinite;vertical-align:middle;margin-right:6px;"></span>처리 중...`;

    try {
      const orderResponse = await fetch(
        `${AI_ING_PAYMENT.apiBase}/api/v1/orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // 금액의 최종 기준은 서버 카탈로그다. amount는 표시/검증 대조용으로만 보낸다.
            productCode: selectedProductCode(),
            amount: amount,
            currency: "KRW",
            itemName: document.getElementById("payment-product-name").value,
            locale: "ko",
            region: "domestic",
            customer: {
              fullName: customer.fullName,
              email: customer.email,
              phoneNumber: customer.phoneNumber
            }
          })
        }
      );

      const orderData = await orderResponse.json();
      if (!orderData.ok) {
        throw new Error(orderData.message || "주문 생성에 실패했습니다.");
      }

      const orderId = orderData.order.id;
      // 서버 카탈로그가 확정한 금액/상품명을 그대로 사용한다.
      // (KRW는 최소단위가 원이므로 order.amount를 그대로 쓸 수 있다.)
      const confirmedAmount = Number(orderData.order.amount) || amount;
      const confirmedItemName =
        orderData.order.itemName ||
        document.getElementById("payment-product-name").value;

      // payMethod 는 CARD | EASY_PAY(카카오) 만. VIRTUAL_ACCOUNT/TRANSFER 미사용.
      const paymentParams = {
        storeId: AI_ING_PAYMENT.storeId,
        paymentId: orderId,
        orderName: confirmedItemName,
        totalAmount: confirmedAmount,
        currency: "CURRENCY_KRW",
        payMethod: payMethod,
        customer: {
          fullName: customer.fullName,
          email: customer.email,
          phoneNumber: customer.phoneNumber
        }
      };

      if (channelKey) {
        paymentParams.channelKey = channelKey;
      }

      if (easyPayProvider) {
        paymentParams.easyPay = {
          provider: easyPayProvider
        };
      }

      // 이니시스 등 PG 창에서 가상계좌·계좌이체가 노출되지 않도록 payMethod 고정
      if (payMethod !== "CARD" && payMethod !== "EASY_PAY") {
        throw new Error("허용되지 않은 결제 방식입니다.");
      }

      const response = await PortOne.requestPayment(paymentParams);

      allButtons.forEach((btn) => (btn.disabled = false));
      activeBtn.innerHTML = originalText;

      if (response.code !== undefined) {
        if (
          response.code === "PORTONE_ERROR" ||
          response.code === "PAY_PROCESS_CANCELED"
        ) {
          return;
        }
        alert("결제 실패: " + (response.message || "알 수 없는 오류"));
        return;
      }

      const logResponse = await fetch(
        `${AI_ING_PAYMENT.apiBase}/api/v1/orders/${orderId}/payment-attempts/portone`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: orderId,
            txId:
              response.transactionId ||
              response.txId ||
              response.paymentId ||
              "",
            // 한도 집계: method 는 kakaopay 로 저장 (표시명은 receipt에)
            method: methodCode
          })
        }
      );

      const logData = await logResponse.json().catch(() => ({ ok: false }));

      // 서버 검증 실패(402) 시 "결제완료"로 단정하지 않는다.
      if (logResponse.status === 402) {
        alert(
          "결제 승인 내역을 서버에서 확인하지 못했습니다.\n" +
            "중복 결제를 막기 위해 다시 시도하지 마시고, contact@ai-ing.org 로 문의해 주세요.\n" +
            "결제 ID: " +
            orderId
        );
        return;
      }
      if (!logData.ok) {
        console.error(
          "Warning: Failed to log transaction state to Turso DB:",
          logData
        );
      }

      const formatted = confirmedAmount.toLocaleString() + "원";
      document.getElementById("receipt-amount").innerText = formatted;
      document.getElementById("receipt-method").innerText = methodNameKr;
      if (document.getElementById("receipt-txid")) {
        document.getElementById("receipt-txid").innerText =
          response.transactionId ||
          response.txId ||
          response.paymentId ||
          "-";
      }
      document.getElementById("payment-pg-window").style.display = "none";
      document.getElementById("payment-step-2").style.display = "block";
    } catch (error) {
      allButtons.forEach((btn) => (btn.disabled = false));
      activeBtn.innerHTML = originalText;
      console.error("Payment error:", error);
      alert("결제 중 오류가 발생했습니다: " + (error.message || error));
    }
  };
