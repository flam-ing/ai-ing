const deck = document.getElementById('deck');
const dots = document.getElementById('dots');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const manifest = window.PREZI_MORPH_DATA;
const slideFiles = manifest.slideFiles;
const slideCount = slideFiles.length;
const duration = 1000;
const assetVersion = '20260525-instructions-codex-qwen';
const autoAdvanceMap = new Map([
  [2, 3],
  [4, 5],
]);
const slideCache = new Map();
const slideLoads = new Map();
const assetPreloads = new Set();
let index = 0;
let locked = false;
let autoTimer = null;
let elements = new Map();

function frameToTransform(frame) {
  const x = frame.x * deck.clientWidth;
  const y = frame.y * deck.clientHeight;
  const w = frame.w * deck.clientWidth;
  const h = frame.h * deck.clientHeight;
  return `translate(${x}px, ${y}px) scale(${w / deck.clientWidth}, ${h / deck.clientHeight})`;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${src}${src.includes('?') ? '&' : '?'}v=${assetVersion}`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`슬라이드 로드 실패: ${src}`));
    document.head.appendChild(script);
  });
}

async function loadSlide(slideIndex) {
  if (slideCache.has(slideIndex)) return slideCache.get(slideIndex);
  if (slideLoads.has(slideIndex)) return slideLoads.get(slideIndex);
  const load = loadScript(slideFiles[slideIndex]).then(() => {
    const slide = window.PREZI_MORPH_SLIDES && window.PREZI_MORPH_SLIDES[slideIndex];
    if (!slide) throw new Error(`슬라이드 데이터 없음: ${slideIndex + 1}`);
    slideCache.set(slideIndex, slide);
    return slide;
  });
  slideLoads.set(slideIndex, load);
  return load;
}

function preloadSlide(slideIndex) {
  if (slideIndex < 0 || slideIndex >= slideCount) return;
  loadSlide(slideIndex)
    .then((slide) => preloadSlideAssets(slide))
    .catch((error) => console.warn(error));
}

function preloadAsset(src) {
  if (!src || assetPreloads.has(src)) return;
  assetPreloads.add(src);

  if (/\.(mov|mp4|webm)(\?|$)/i.test(src)) {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.src = src;
    video.load();
    return;
  }

  const image = new Image();
  image.decoding = 'async';
  image.src = src;
}

function preloadSlideAssets(slide) {
  slide.objects.forEach((obj) => {
    if (obj.src) preloadAsset(obj.src);
    if (!obj.kind || !window.PREZI_SCENES) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = window.PREZI_SCENES.markup(obj);
    wrapper.querySelectorAll('img[src], video[src]').forEach((node) => {
      preloadAsset(node.getAttribute('src'));
    });
  });
}

function preloadAround(slideIndex) {
  preloadSlide(slideIndex);
  preloadSlide(slideIndex + 1);
  preloadSlide(slideIndex + 2);
  preloadSlide(slideIndex + 3);
  preloadSlide(slideIndex - 1);
  const autoNext = autoAdvanceMap.get(slideIndex);
  if (autoNext !== undefined) preloadSlide(autoNext);
}

function makeElement(obj, frame, opacity = 1) {
  if (obj.kind) {
    const scene = document.createElement('section');
    const webKinds = new Set(['request', 'dns', 'sql']);
    const resultKinds = new Set(['html-result', 'json-result']);
    const extraClass = webKinds.has(obj.kind)
      ? ' web-scene'
      : resultKinds.has(obj.kind)
        ? ' result-scene'
        : '';
    scene.className = `scene ${obj.kind}-scene${extraClass} instant`;
    scene.setAttribute('aria-label', obj.name || obj.kind);
    scene.innerHTML = window.PREZI_SCENES.markup(obj);
    scene.style.zIndex = String(obj.z);
    scene.style.opacity = String(opacity);
    scene.style.transform = frameToTransform(frame);
    deck.appendChild(scene);
    requestAnimationFrame(() => scene.classList.remove('instant'));
    return scene;
  }

  const img = document.createElement('img');
  img.className = 'asset instant';
  img.src = obj.src;
  img.alt = obj.descr || obj.name || '';
  img.decoding = 'async';
  img.style.zIndex = String(obj.z);
  img.style.opacity = String(opacity);
  img.style.transform = frameToTransform(frame);
  deck.appendChild(img);
  requestAnimationFrame(() => img.classList.remove('instant'));
  return img;
}

function byKey(slide) {
  const map = new Map();
  slide.objects.forEach((obj, order) => map.set(obj.key, { ...obj, order }));
  return map;
}

async function renderInitial() {
  const slide = await loadSlide(index);
  deck.innerHTML = '';
  elements = new Map();
  byKey(slide).forEach((obj, key) => {
    elements.set(key, { obj, el: makeElement(obj, obj, 1) });
  });
  renderDots();
  preloadAround(index);
}

function renderDots() {
  dots.innerHTML = '';
  for (let i = 0; i < slideCount; i += 1) {
    const dot = document.createElement('span');
    dot.className = `dot${i === index ? ' active' : ''}`;
    dot.setAttribute('role', 'button');
    dot.setAttribute('tabindex', '0');
    dot.setAttribute('aria-label', `${i + 1}번 슬라이드로 이동`);
    dot.addEventListener('click', () => transitionTo(i));
    dot.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        transitionTo(i);
      }
    });
    dots.appendChild(dot);
  }
}

function clearAutoTimer() {
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
}

function queueAutoAdvance() {
  const nextIndex = autoAdvanceMap.get(index);
  if (nextIndex === undefined) return;
  autoTimer = setTimeout(() => {
    autoTimer = null;
    transitionTo(nextIndex, { source: 'auto' });
  }, 120);
}

function sameVisualObject(fromObj, toObj) {
  if (fromObj.src || toObj.src) return fromObj.src === toObj.src;
  return fromObj.kind && fromObj.kind === toObj.kind;
}

async function transitionTo(nextIndex, options = {}) {
  if (locked || nextIndex === index || nextIndex < 0 || nextIndex >= slideCount) return;
  const movingForward = nextIndex > index;
  if (options.source !== 'auto') clearAutoTimer();
  locked = true;

  try {
    const [currentSlide, nextSlide] = await Promise.all([loadSlide(index), loadSlide(nextIndex)]);
    const current = byKey(currentSlide);
    const next = byKey(nextSlide);
    const nextElements = new Map();
    const allKeys = new Set([...current.keys(), ...next.keys()]);

    allKeys.forEach((key) => {
      const fromObj = current.get(key);
      const toObj = next.get(key);
      const existing = elements.get(key);

      if (fromObj && toObj && existing) {
        if (sameVisualObject(fromObj, toObj)) {
          existing.el.style.zIndex = String(toObj.z);
          existing.el.style.opacity = '1';
          existing.el.style.transform = frameToTransform(toObj);
          nextElements.set(key, { obj: toObj, el: existing.el });
        } else {
          const oldEl = existing.el;
          const exitFrame = fromObj.exitTo || toObj;
          oldEl.style.zIndex = String(Math.max(fromObj.z, toObj.z));
          oldEl.style.transform = frameToTransform(exitFrame);
          oldEl.style.opacity = '0';

          const enterFrame = toObj.enterFrom || fromObj;
          const newEl = makeElement(toObj, enterFrame, 0);
          newEl.style.zIndex = String(toObj.z + 1);
          requestAnimationFrame(() => {
            newEl.style.transform = frameToTransform(toObj);
            newEl.style.opacity = '1';
          });
          setTimeout(() => oldEl.remove(), duration + 80);
          nextElements.set(key, { obj: toObj, el: newEl });
        }
        return;
      }

      if (fromObj && existing && !toObj) {
        const exitFrame = fromObj.exitTo || fromObj;
        existing.el.style.transform = frameToTransform(exitFrame);
        existing.el.style.opacity = '0';
        setTimeout(() => existing.el.remove(), duration + 80);
        return;
      }

      if (!fromObj && toObj) {
        const enterFrame = toObj.enterFrom || toObj;
        const newEl = makeElement(toObj, enterFrame, 0);
        requestAnimationFrame(() => {
          newEl.style.opacity = '1';
          newEl.style.transform = frameToTransform(toObj);
        });
        nextElements.set(key, { obj: toObj, el: newEl });
      }
    });

    index = nextIndex;
    renderDots();
    preloadAround(index);
    setTimeout(() => {
      elements = nextElements;
      locked = false;
      if (movingForward) queueAutoAdvance();
    }, duration + 80);
  } catch (error) {
    locked = false;
    console.error(error);
  }
}

function next() { transitionTo(Math.min(index + 1, slideCount - 1)); }
function prev() { transitionTo(Math.max(index - 1, 0)); }

nextButton.addEventListener('click', () => { nextButton.blur(); next(); });
prevButton.addEventListener('click', () => { prevButton.blur(); prev(); });
deck.addEventListener('click', (event) => {
  const multiLink = event.target.closest('.multi-hotlink');
  if (multiLink) {
    event.preventDefault();
    event.stopPropagation();
    const urls = (multiLink.dataset.urls || '').split('|').filter(Boolean);
    urls.forEach((url) => window.open(url, '_blank', 'noopener,noreferrer'));
    return;
  }
  if (event.target.closest('a, button')) return;
  next();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'PageDown') {
    event.preventDefault();
    next();
  }
  if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    event.preventDefault();
    prev();
  }
  if (event.key === 'Home') {
    event.preventDefault();
    transitionTo(0);
  }
  if (event.key === 'End') {
    event.preventDefault();
    transitionTo(slideCount - 1);
  }
});
window.addEventListener('resize', () => {
  elements.forEach(({ obj, el }) => {
    el.classList.add('instant');
    el.style.transform = frameToTransform(obj);
    requestAnimationFrame(() => el.classList.remove('instant'));
  });
});

renderInitial();
