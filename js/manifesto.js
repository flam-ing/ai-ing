/**
 * AX Manifesto — hero 다음 검은 배경 글귀
 * 스크롤(휠/스와이프) 한 번 = 다음 문장 fade in/out
 * 마지막 문장 후 brighten → agent world 로 해제
 */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile =
    window.matchMedia("(max-width: 768px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;

  var section = document.getElementById("ax-manifesto");
  if (!section) return;

  var lines = Array.prototype.slice.call(
    section.querySelectorAll(".mf-line")
  );
  var hint = section.querySelector(".mf-hint");
  if (!lines.length) return;

  var WHEEL_THRESHOLD = mobile ? 50 : 80;
  var SWIPE_PX = mobile ? 40 : 56;
  var ACC_RESET_MS = 280;
  var FADE_MS = 720;

  var step = -1; // -1 = 아직 미진입, 0..n-1 = 현재 문장
  var locked = false;
  var busy = false;
  var wheelAcc = 0;
  var accTimer = null;
  var pinST = null;
  var touchY0 = 0;
  var touchOn = false;
  var activeLine = -1;

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function showLine(i) {
    if (i === activeLine) return;
    var prev = activeLine;
    activeLine = i;

    if (window.gsap) {
      lines.forEach(function (el, idx) {
        if (idx === i) {
          el.classList.add("is-on");
          gsap.killTweensOf(el);
          gsap.fromTo(
            el,
            { opacity: 0, y: 18, filter: "blur(6px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: FADE_MS / 1000,
              ease: "power2.out",
            }
          );
        } else if (idx === prev) {
          gsap.killTweensOf(el);
          gsap.to(el, {
            opacity: 0,
            y: -12,
            filter: "blur(4px)",
            duration: FADE_MS / 1000 * 0.75,
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
      lines.forEach(function (el, idx) {
        el.classList.toggle("is-on", idx === i);
        el.style.opacity = idx === i ? "1" : "0";
        el.style.visibility = idx === i ? "visible" : "hidden";
      });
    }

    if (i === lines.length - 1) {
      section.classList.add("is-bright");
      if (hint) hint.classList.add("is-hide");
    } else {
      section.classList.remove("is-bright");
      if (hint) hint.classList.remove("is-hide");
    }
  }

  function hideAll() {
    activeLine = -1;
    section.classList.remove("is-bright");
    if (hint) hint.classList.remove("is-hide");
    lines.forEach(function (el) {
      if (window.gsap) gsap.killTweensOf(el);
      el.classList.remove("is-on");
      el.style.opacity = "0";
      el.style.filter = "";
    });
  }

  function goTo(next) {
    if (busy) return;
    var max = lines.length - 1;
    next = clamp(next, -1, max);

    if (next < 0) {
      // 위로 빠져나감 (hero 로)
      busy = true;
      hideAll();
      step = -1;
      locked = false;
      if (pinST && typeof pinST.disable === "function") {
        /* pin keeps section; scroll release handled by ST */
      }
      setTimeout(function () {
        busy = false;
      }, FADE_MS * 0.5);
      return;
    }

    if (next > max) return;

    busy = true;
    step = next;
    showLine(next);
    setTimeout(function () {
      busy = false;
    }, FADE_MS * 0.85);
  }

  function onWheelIntent(dir) {
    // dir: 1 = down, -1 = up
    if (busy) return;

    if (step < 0 && dir > 0) {
      locked = true;
      goTo(0);
      return;
    }
    if (step < 0) return;

    if (dir > 0) {
      if (step < lines.length - 1) {
        goTo(step + 1);
      } else {
        // 마지막 문장 후 아래로 해제 → agent world / journey
        locked = false;
        // pin 해제 유도: 한 틱 더 스크롤 허용
        if (pinST && pinST.scroll) {
          var y = pinST.end + 2;
          window.scrollTo(0, y);
        }
      }
    } else {
      if (step > 0) {
        goTo(step - 1);
      } else {
        // 첫 문장에서 위로 → hero
        goTo(-1);
        if (pinST && pinST.start != null) {
          window.scrollTo(0, Math.max(0, pinST.start - 4));
        }
      }
    }
  }

  function onWheel(e) {
    if (reduce) return;
    if (!locked && step < 0) {
      // pin 진입 직전/직후: ST 가 잡기 전에 첫 진입
      var rect = section.getBoundingClientRect();
      if (rect.top > 40 || rect.bottom < window.innerHeight * 0.55) return;
    }
    if (!locked && step >= 0 && step < lines.length - 1) {
      locked = true;
    }
    // pin 중일 때만 가로채기 (마지막 문장 이후는 통과)
    if (!locked && step === lines.length - 1 && e.deltaY > 0) return;
    if (step < 0 && e.deltaY < 0) return;

    var inView =
      section.getBoundingClientRect().top <= 8 &&
      section.getBoundingClientRect().bottom >= window.innerHeight * 0.85;
    if (!inView && step < 0) return;

    if (step >= 0 && step < lines.length - 1) {
      e.preventDefault();
    } else if (step === lines.length - 1 && e.deltaY < 0) {
      e.preventDefault();
    } else if (step < 0 && e.deltaY > 0 && inView) {
      e.preventDefault();
    } else {
      return;
    }

    wheelAcc += e.deltaY;
    clearTimeout(accTimer);
    accTimer = setTimeout(function () {
      wheelAcc = 0;
    }, ACC_RESET_MS);

    if (Math.abs(wheelAcc) < WHEEL_THRESHOLD) return;
    var dir = wheelAcc > 0 ? 1 : -1;
    wheelAcc = 0;
    onWheelIntent(dir);
  }

  function onTouchStart(e) {
    if (!e.touches || !e.touches[0]) return;
    touchOn = true;
    touchY0 = e.touches[0].clientY;
  }
  function onTouchEnd(e) {
    if (!touchOn) return;
    touchOn = false;
    var y =
      e.changedTouches && e.changedTouches[0]
        ? e.changedTouches[0].clientY
        : touchY0;
    var dy = touchY0 - y;
    if (Math.abs(dy) < SWIPE_PX) return;
    var rect = section.getBoundingClientRect();
    var inView = rect.top <= 40 && rect.bottom >= window.innerHeight * 0.5;
    if (!inView && step < 0) return;
    onWheelIntent(dy > 0 ? 1 : -1);
  }

  function setupPin() {
    if (reduce || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    pinST = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: function () {
        // 문장 수만큼 스크롤 길이 + 여유
        return "+=" + (lines.length * window.innerHeight * 0.55 + window.innerHeight * 0.35);
      },
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      onEnter: function () {
        if (step < 0) {
          locked = true;
          goTo(0);
        }
      },
      onEnterBack: function () {
        locked = true;
        if (step < 0) goTo(lines.length - 1);
      },
      onLeave: function () {
        locked = false;
      },
      onLeaveBack: function () {
        locked = false;
        goTo(-1);
      },
    });
  }

  /* ---------- Agent world: scroll-scrub video (slow mid) ---------- */
  function setupAgentWorld() {
    var pins = Array.prototype.slice.call(
      document.querySelectorAll(".ax-agent-pin")
    );
    if (!pins.length || !window.gsap || !window.ScrollTrigger || reduce) return;

    pins.forEach(function (pin) {
      var vid = pin.querySelector(".ax-agent-vid");
      var stage = pin.querySelector(".ax-agent-stage");
      if (!vid) return;

      function mapTime(p) {
        // 0–0.2 → 0–1.5/8, 0.2–0.8 → 1.5–5.5/8 (slow), 0.8–1 → 5.5–8/8
        var d = vid.duration || 8;
        var t0 = 0;
        var t1 = (1.5 / 8) * d;
        var t2 = (5.5 / 8) * d;
        var t3 = d - 0.04;
        if (p < 0.2) return t0 + (p / 0.2) * (t1 - t0);
        if (p < 0.8) return t1 + ((p - 0.2) / 0.6) * (t2 - t1);
        return t2 + ((p - 0.8) / 0.2) * (t3 - t2);
      }

      function ready() {
        if (!vid.duration || !isFinite(vid.duration)) return;
        stage && stage.classList.add("has-video");
        vid.pause();
        ScrollTrigger.create({
          trigger: pin,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.65,
          pin: stage,
          pinSpacing: false,
          onUpdate: function (self) {
            var t = mapTime(self.progress);
            if (Math.abs(vid.currentTime - t) > 0.04) {
              try {
                vid.currentTime = t;
              } catch (e) {}
            }
          },
        });
      }

      vid.muted = true;
      vid.playsInline = true;
      vid.preload = "auto";
      if (vid.readyState >= 1) ready();
      else vid.addEventListener("loadedmetadata", ready, { once: true });
    });
  }

  function init() {
    if (reduce) {
      lines.forEach(function (el) {
        el.classList.add("is-on");
        el.style.opacity = "1";
        el.style.visibility = "visible";
        el.style.position = "relative";
      });
      return;
    }

    setupPin();
    window.addEventListener("wheel", onWheel, { passive: false });
    section.addEventListener("touchstart", onTouchStart, { passive: true });
    section.addEventListener("touchend", onTouchEnd, { passive: true });
    setupAgentWorld();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
