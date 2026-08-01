/**
 * 개요 (#overview)
 * 1) 글귀 3 (스크롤 1틱 = 다음)
 * 2) 카드 3: 좌상단 / 우중앙 / 하단 — GIF 자동 루프
 */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile =
    window.matchMedia("(max-width: 768px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;

  var root = document.getElementById("overview");
  if (!root) return;

  var black = document.getElementById("ax-overview-black");
  var mfLayer = document.getElementById("ax-mf-layer");
  var cardsLayer = document.getElementById("ax-cards");
  var hint = document.getElementById("overview-scroll-hint");

  var mfLines = Array.prototype.slice.call(root.querySelectorAll(".mf-line"));
  var cards = Array.prototype.slice.call(root.querySelectorAll(".ax-card"));

  var STEPS = [
    { kind: "mf", line: 0 },
    { kind: "mf", line: 1 },
    { kind: "mf", line: 2, bright: true },
    { kind: "card", card: 0 },
    { kind: "card", card: 1 },
    { kind: "card", card: 2 },
  ];

  var WHEEL_THRESHOLD = mobile ? 42 : 55;
  var SWIPE_PX = mobile ? 36 : 44;
  var ACC_RESET_MS = 220;
  var FADE_MS = 360;
  var MF_HOLD_MS = 280;
  var CARD_HOLD_MS = 900;

  var step = -1;
  var locked = false;
  var busy = false;
  var holdUntil = 0;
  var wheelAcc = 0;
  var accTimer = null;
  var pinST = null;
  var activeMf = -1;
  var activeCard = -1;
  var touchY0 = 0;
  var touchOn = false;
  var hintTimer = null;
  var releasing = false;

  function now() {
    return Date.now();
  }
  function setLocked(on) {
    locked = !!on;
    root.classList.toggle("is-locked", locked);
  }
  function inHold() {
    return now() < holdUntil;
  }

  function setMode(kind) {
    root.classList.toggle("is-mf", kind === "mf");
    root.classList.toggle("is-cards", kind === "cards");
    if (kind !== "mf") root.classList.remove("is-mf-bright");
    if (black) black.setAttribute("aria-hidden", kind ? "false" : "true");
    if (mfLayer)
      mfLayer.setAttribute("aria-hidden", kind === "mf" ? "false" : "true");
    if (cardsLayer)
      cardsLayer.setAttribute(
        "aria-hidden",
        kind === "cards" ? "false" : "true"
      );
  }

  function showHint(show) {
    if (!hint) return;
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
    if (show) {
      hint.classList.remove("hide");
      hint.setAttribute("aria-hidden", "false");
    } else {
      hint.classList.add("hide");
      hint.setAttribute("aria-hidden", "true");
    }
  }

  function armHold(ms) {
    holdUntil = now() + ms;
    showHint(false);
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      if (!locked || step < 0) return;
      showHint(true);
    }, Math.min(480, Math.max(260, ms * 0.4)));
  }

  function hideMf() {
    activeMf = -1;
    mfLines.forEach(function (el) {
      if (window.gsap) gsap.killTweensOf(el);
      el.classList.remove("is-on");
      el.style.opacity = "0";
      el.style.filter = "";
    });
    root.classList.remove("is-mf-bright");
  }

  function showMf(line, bright) {
    if (line === activeMf) {
      root.classList.toggle("is-mf-bright", !!bright);
      return;
    }
    var prev = activeMf;
    activeMf = line;
    busy = true;

    if (window.gsap && !reduce) {
      mfLines.forEach(function (el, idx) {
        if (idx === line) {
          el.classList.add("is-on");
          gsap.killTweensOf(el);
          gsap.fromTo(
            el,
            { opacity: 0, y: 14, filter: "blur(5px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: FADE_MS / 1000,
              ease: "power2.out",
              onComplete: function () {
                busy = false;
              },
            }
          );
        } else if (idx === prev) {
          gsap.killTweensOf(el);
          gsap.to(el, {
            opacity: 0,
            y: -8,
            filter: "blur(3px)",
            duration: (FADE_MS / 1000) * 0.65,
            ease: "power2.in",
            onComplete: function () {
              el.classList.remove("is-on");
              el.style.filter = "";
            },
          });
        } else {
          el.classList.remove("is-on");
          el.style.opacity = "0";
        }
      });
    } else {
      mfLines.forEach(function (el, idx) {
        el.classList.toggle("is-on", idx === line);
        el.style.opacity = idx === line ? "1" : "0";
        el.style.visibility = idx === line ? "visible" : "hidden";
      });
      busy = false;
    }
    root.classList.toggle("is-mf-bright", !!bright);
  }

  /* GIF 카드 — 보이면 브라우저가 자동 루프 */
  function hideCards() {
    activeCard = -1;
    cards.forEach(function (c) {
      c.classList.remove("is-on", "is-stack");
    });
  }

  function showCard(maxIdx) {
    if (maxIdx === activeCard) return;
    activeCard = maxIdx;
    busy = true;

    cards.forEach(function (card, idx) {
      if (idx === maxIdx) {
        card.classList.remove("is-stack");
        if (!card.classList.contains("is-on")) {
          void card.offsetWidth;
          card.classList.add("is-on");
        }
      } else if (!mobile && idx < maxIdx) {
        // 데스크톱: 이전 카드 잔상 유지 / 모바일: 한 장만 중앙
        card.classList.add("is-stack");
        card.classList.remove("is-on");
      } else {
        card.classList.remove("is-on", "is-stack");
      }
    });

    setTimeout(function () {
      busy = false;
    }, 520);
  }

  function goToStep(i, opts) {
    opts = opts || {};
    i = Math.max(0, Math.min(STEPS.length - 1, i | 0));
    if (i === step && !opts.force) return;
    step = i;
    var s = STEPS[i];

    if (s.kind === "mf") {
      hideCards();
      setMode("mf");
      showMf(s.line, !!s.bright);
      armHold(MF_HOLD_MS + FADE_MS);
    } else {
      hideMf();
      setMode("cards");
      showCard(s.card);
      armHold(CARD_HOLD_MS);
    }
  }

  function enterLock() {
    if (locked) return;
    setLocked(true);
    wheelAcc = 0;
    if (pinST) window.scrollTo(0, pinST.start + 1);
    if (step < 0) goToStep(0, { force: true });
    showHint(true);
  }

  function forceRelease() {
    releasing = true;
    setLocked(false);
    hideCards();
    hideMf();
    setMode(null);
    step = -1;
    holdUntil = 0;
    wheelAcc = 0;
    showHint(false);
    setTimeout(function () {
      releasing = false;
    }, 220);
  }

  function releaseDown() {
    // 검은 화면 깜빡임 방지: 비주얼 유지한 채 스크롤 먼저, 이후 정리
    releasing = true;
    setLocked(false);
    holdUntil = 0;
    wheelAcc = 0;
    showHint(false);
    var endY = pinST ? pinST.end + 4 : window.pageYOffset + 4;
    window.scrollTo(0, endY);
    // 다음 프레임에 서비스 쪽으로 자연 스크롤 (한 번에 확 튀지 않게)
    requestAnimationFrame(function () {
      window.scrollTo({ top: endY + 8, behavior: "auto" });
      setTimeout(function () {
        hideCards();
        hideMf();
        setMode(null);
        step = -1;
        releasing = false;
        if (window.ScrollTrigger) {
          try {
            ScrollTrigger.refresh();
          } catch (e) {}
        }
      }, 280);
    });
  }

  function releaseUp() {
    releasing = true;
    setLocked(false);
    holdUntil = 0;
    wheelAcc = 0;
    var startY = pinST ? Math.max(0, pinST.start - 24) : 0;
    window.scrollTo(0, startY);
    setTimeout(function () {
      hideCards();
      hideMf();
      setMode(null);
      step = -1;
      showHint(true);
      releasing = false;
    }, 200);
  }

  window.__axOverviewEnter = function () {
    if (pinST) {
      window.scrollTo({ top: pinST.start + 1, behavior: "smooth" });
      setTimeout(function () {
        if (!locked) enterLock();
        else if (step < 0) goToStep(0, { force: true });
      }, 320);
    } else {
      enterLock();
    }
  };
  window.__axOverviewForceRelease = forceRelease;

  function stepBy(dir) {
    if (!locked || busy) return;
    if (inHold()) {
      wheelAcc = 0;
      return;
    }
    if (dir > 0) {
      if (step < STEPS.length - 1) goToStep(step + 1);
      else releaseDown();
    } else {
      if (step > 0) goToStep(step - 1);
      else releaseUp();
    }
  }

  function onWheel(e) {
    if (!locked) return;
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    e.preventDefault();
    if (busy || inHold()) {
      wheelAcc = 0;
      return;
    }
    wheelAcc += e.deltaY;
    if (accTimer) clearTimeout(accTimer);
    accTimer = setTimeout(function () {
      wheelAcc = 0;
    }, ACC_RESET_MS);
    if (wheelAcc > WHEEL_THRESHOLD) {
      wheelAcc = 0;
      stepBy(1);
    } else if (wheelAcc < -WHEEL_THRESHOLD) {
      wheelAcc = 0;
      stepBy(-1);
    }
  }

  function onTouchStart(e) {
    if (!locked || !e.touches || !e.touches[0]) return;
    touchOn = true;
    touchY0 = e.touches[0].clientY;
  }
  function onTouchMove(e) {
    if (!locked || !touchOn) return;
    e.preventDefault();
  }
  function onTouchEnd(e) {
    if (!locked || !touchOn) return;
    touchOn = false;
    if (busy || inHold()) return;
    var y1 =
      e.changedTouches && e.changedTouches[0]
        ? e.changedTouches[0].clientY
        : touchY0;
    var dy = touchY0 - y1;
    if (Math.abs(dy) < SWIPE_PX) return;
    stepBy(dy > 0 ? 1 : -1);
  }

  // 개요 링크는 nav-scroll.js 가 __axOverviewEnter 로 처리

  if (reduce) {
    setMode("mf");
    mfLines.forEach(function (el) {
      el.classList.add("is-on");
      el.style.opacity = "1";
      el.style.position = "relative";
      el.style.transform = "none";
      el.style.left = "auto";
      el.style.top = "auto";
      el.style.margin = "1em auto";
      el.style.visibility = "visible";
    });
    cards.forEach(function (c) {
      c.classList.add("is-on");
      c.style.position = "relative";
      c.style.left = "auto";
      c.style.top = "auto";
      c.style.transform = "none";
      c.style.opacity = "1";
      c.style.margin = "16px auto";
    });
    if (cardsLayer) {
      cardsLayer.style.opacity = "1";
      cardsLayer.style.visibility = "visible";
      cardsLayer.style.position = "relative";
    }
    return;
  }

  hideMf();
  hideCards();
  setMode(null);

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  pinST = ScrollTrigger.create({
    trigger: "#overview",
    start: "top top",
    end: function () {
      return "+=" + Math.round(window.innerHeight * (STEPS.length * 0.38 + 0.3));
    },
    pin: true,
    pinSpacing: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onEnter: enterLock,
    onEnterBack: function () {
      if (releasing) return;
      if (!locked) {
        setLocked(true);
        if (step < 0) goToStep(STEPS.length - 1, { force: true });
      }
      if (pinST) window.scrollTo(0, pinST.start + 1);
    },
    onLeave: function () {
      // 의도적 탈출 중이 아니고 잠금 중이면 붙잡기
      if (releasing) return;
      if (locked) {
        if (pinST) window.scrollTo(0, pinST.start + 1);
        return;
      }
      showHint(false);
    },
    onLeaveBack: function () {
      if (releasing) return;
      if (locked) {
        if (step <= 0) {
          releaseUp();
          return;
        }
        if (pinST) window.scrollTo(0, pinST.start + 1);
        return;
      }
      // 이미 정리된 상태
      if (step < 0) return;
      hideCards();
      hideMf();
      setMode(null);
      step = -1;
      holdUntil = 0;
      showHint(true);
    },
  });

  window.addEventListener("wheel", onWheel, { passive: false });
  root.addEventListener("touchstart", onTouchStart, { passive: true });
  root.addEventListener("touchmove", onTouchMove, { passive: false });
  root.addEventListener("touchend", onTouchEnd, { passive: true });

  window.addEventListener("keydown", function (e) {
    if (!locked) return;
    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      stepBy(-1);
    }
  });

  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
  });
  window.addEventListener("resize", function () {
    ScrollTrigger.refresh();
  });
})();
