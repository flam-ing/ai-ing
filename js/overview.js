/**
 * 개요 (#overview)
 * 글귀 3 + 카드 3 — 스크롤/스와이프/클릭/키보드로 진행
 * 마지막 카드 후 "서비스 보기" CTA
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
  var cta = document.getElementById("overview-cta");

  var mfLines = Array.prototype.slice.call(root.querySelectorAll(".mf-line"));
  var cards = Array.prototype.slice.call(root.querySelectorAll(".ax-card"));

  var STEPS = [
    { kind: "mf", line: 0 },
    { kind: "mf", line: 1 },
    { kind: "mf", line: 2, bright: true },
    { kind: "card", card: 0 },
    { kind: "card", card: 1 },
    { kind: "card", card: 2 },
    { kind: "cta" },
  ];

  var WHEEL_THRESHOLD = mobile ? 40 : 55;
  var SWIPE_PX = mobile ? 36 : 44;
  var ACC_RESET_MS = 220;
  var FADE_MS = 360;
  var MF_HOLD_MS = 280;
  var CARD_HOLD_MS = 700;

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
  var clickCool = 0;

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
    root.classList.toggle("is-cta", kind === "cta");
    if (kind !== "mf") root.classList.remove("is-mf-bright");
    if (black) black.setAttribute("aria-hidden", kind ? "false" : "true");
    if (mfLayer)
      mfLayer.setAttribute("aria-hidden", kind === "mf" ? "false" : "true");
    if (cardsLayer)
      cardsLayer.setAttribute(
        "aria-hidden",
        kind === "cards" ? "false" : "true"
      );
    if (cta) {
      var show = kind === "cta";
      if (show) {
        cta.hidden = false;
        cta.removeAttribute("hidden");
        cta.classList.add("is-on");
        cta.style.display = "flex";
        cta.style.opacity = "1";
        cta.style.visibility = "visible";
        cta.style.pointerEvents = "auto";
      } else {
        cta.hidden = true;
        cta.setAttribute("hidden", "");
        cta.classList.remove("is-on");
        cta.style.display = "";
        cta.style.opacity = "";
        cta.style.visibility = "";
        cta.style.pointerEvents = "";
      }
      cta.setAttribute("aria-hidden", show ? "false" : "true");
    }
  }

  function showHint(show) {
    if (!hint) return;
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
    // CTA 단계에서는 힌트 숨김
    if (step >= 0 && STEPS[step] && STEPS[step].kind === "cta") show = false;
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
      if (STEPS[step] && STEPS[step].kind === "cta") return;
      showHint(true);
    }, Math.min(420, Math.max(200, ms * 0.5)));
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

  function hideCards() {
    activeCard = -1;
    cards.forEach(function (c) {
      c.classList.remove("is-on", "is-stack");
    });
  }

  /** 카드 누적: 0 → 0+1 → 0+1+2 (이전 카드 is-stack 유지, 좌/우/좌 등장) */
  function showCard(maxIdx) {
    if (maxIdx === activeCard) return;
    activeCard = maxIdx;
    busy = true;

    cards.forEach(function (card, idx) {
      if (idx < maxIdx) {
        card.classList.add("is-stack");
        card.classList.remove("is-on");
      } else if (idx === maxIdx) {
        card.classList.remove("is-stack");
        if (!card.classList.contains("is-on")) {
          // display 켠 뒤 한 프레임 오프스크린 pose → is-on 슬라이드 인
          card.classList.add("is-prein");
          void card.offsetWidth;
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              card.classList.remove("is-prein");
              card.classList.add("is-on");
            });
          });
        }
      } else {
        card.classList.remove("is-on", "is-stack");
      }
    });

    setTimeout(function () {
      busy = false;
    }, 680);
  }

  /** 카드 비우고 서비스 보기만 */
  function showCta() {
    hideMf();
    hideCards();
    setMode("cta");
    if (cta) {
      cta.hidden = false;
      cta.removeAttribute("hidden");
      cta.classList.add("is-on");
      cta.setAttribute("aria-hidden", "false");
      cta.style.display = "flex";
      cta.style.opacity = "1";
      cta.style.visibility = "visible";
      cta.style.pointerEvents = "auto";
    }
    busy = false;
    showHint(false);
  }

  function goToStep(i, opts) {
    opts = opts || {};
    i = Math.max(0, Math.min(STEPS.length - 1, i | 0));
    if (i === step && !opts.force) return;
    step = i;
    var s = STEPS[i];

    if (s.kind === "mf") {
      if (cta) {
        cta.hidden = true;
        cta.classList.remove("is-on");
      }
      hideCards();
      setMode("mf");
      showMf(s.line, !!s.bright);
      armHold(MF_HOLD_MS + FADE_MS);
    } else if (s.kind === "card") {
      if (cta) {
        cta.hidden = true;
        cta.classList.remove("is-on");
      }
      hideMf();
      setMode("cards");
      showCard(s.card);
      armHold(CARD_HOLD_MS);
    } else {
      showCta();
      holdUntil = 0;
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
    // CTA 이후 → pin 끝으로 점프 후 바로 푸터 (빈 스크롤 공간 최소화)
    releasing = true;
    setLocked(false);
    holdUntil = 0;
    wheelAcc = 0;
    showHint(false);
    hideCards();
    hideMf();
    // CTA는 남겨도 되지만 pin 탈출 후 정리
    var endY = pinST ? pinST.end + 2 : window.pageYOffset + 2;
    window.scrollTo(0, endY);
    requestAnimationFrame(function () {
      setMode(null);
      step = -1;
      releasing = false;
      if (window.ScrollTrigger) {
        try {
          ScrollTrigger.refresh();
        } catch (e) {}
      }
      // 푸터가 바로 이어지도록 약간 더
      window.scrollTo({ top: endY + 4, behavior: "auto" });
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
      window.scrollTo({ top: pinST.start + 1, behavior: "auto" });
      setTimeout(function () {
        if (!locked) enterLock();
        else if (step < 0) goToStep(0, { force: true });
      }, 80);
    } else {
      enterLock();
    }
  };
  window.__axOverviewForceRelease = forceRelease;

  function stepBy(dir) {
    if (!locked || busy) return;
    if (inHold() && dir > 0) {
      // 짧은 hold 중 클릭/스크롤은 살짝 막되 너무 길지 않게
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
    // CTA 단계: 아래로 스크롤하면 페이지 이탈
    if (STEPS[step] && STEPS[step].kind === "cta") {
      if (e.deltaY > 8) {
        releaseDown();
      } else if (e.deltaY < -8) {
        stepBy(-1);
      }
      return;
    }
    if (busy) {
      wheelAcc = 0;
      return;
    }
    if (inHold()) {
      // hold 중에도 큰 스크롤은 허용
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD * 1.4) {
        wheelAcc = 0;
        return;
      }
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
    if (busy) return;
    var y1 =
      e.changedTouches && e.changedTouches[0]
        ? e.changedTouches[0].clientY
        : touchY0;
    var dy = touchY0 - y1;
    if (Math.abs(dy) < SWIPE_PX) return;
    stepBy(dy > 0 ? 1 : -1);
  }

  /** 화면 클릭/탭으로도 다음 단계 */
  function onClick(e) {
    if (!locked) return;
    if (e.target.closest("a, button, input, textarea, select, label")) return;
    if (now() < clickCool) return;
    if (busy) return;
    clickCool = now() + 280;
    // CTA 단계에서는 빈 영역 클릭 무시 (버튼만)
    if (STEPS[step] && STEPS[step].kind === "cta") return;
    stepBy(1);
  }

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
    if (cta) {
      cta.hidden = false;
      cta.classList.add("is-on");
    }
    return;
  }

  hideMf();
  hideCards();
  setMode(null);

  if (!window.gsap || !window.ScrollTrigger) {
    // GSAP 없으면 클릭만으로 진행
    setLocked(true);
    goToStep(0, { force: true });
    root.addEventListener("click", onClick);
    window.addEventListener("wheel", onWheel, { passive: false });
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  pinST = ScrollTrigger.create({
    trigger: "#overview",
    start: "top top",
    // CTA 단계까지 여유 확보 후 푸터로
    end: function () {
      return "+=" + Math.round(window.innerHeight * (STEPS.length * 0.28 + 0.35));
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
  root.addEventListener("click", onClick);

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
