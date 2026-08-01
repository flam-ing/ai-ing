/**
 * 서비스 (#journey) — 영상 + 01/02/03 만
 * 개요(mf/agent)는 overview.js / #overview
 *
 * 스크롤 한 번 = 다음/이전 서비스 단계 (자동 넘김 없음)
 * 영상: 장면 중반 슬로우 1회 → 정지 대기 → 휠로만 이동 (역순 지원)
 */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile =
    window.matchMedia("(max-width: 768px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;

  var vid = document.getElementById("ax-journey-vid");
  var scrim = document.getElementById("ax-journey-scrim");
  var hint = document.getElementById("scroll-hint");
  var journey = document.getElementById("journey");
  var panels = Array.prototype.slice.call(
    document.querySelectorAll("#journey .panel")
  );
  var stepBtns = Array.prototype.slice.call(
    document.querySelectorAll("#journey .steps button")
  );

  if (!journey || !vid) return;

  /*
   * journey-scrub.mp4 (~8s) 실측 기준:
   * ~0.12–0.26 트레이딩룸(01) · ~0.30 확대 전환
   * ~0.40–0.54 듀얼 노트북(02) · ~0.60 터널 확대 전환
   * ~0.75–0.92 후반(03)
   * → 슬로우는 각 장면 **안정 구간 중반**만, 확대 직전에서 정지. 자동 넘김 없음.
   */
  var STEPS = [
    { panel: 0, v0: 0.12, v1: 0.22 },
    { panel: 1, v0: 0.43, v1: 0.51 },
    { panel: 2, v0: 0.78, v1: 0.88 },
  ];

  // index.html 시절 감도 복구 + 고정 쿨다운(리셋 없음, 너무 짧지도 길지도 않게)
  var WHEEL_THRESHOLD = mobile ? 40 : 58;
  var SWIPE_PX = mobile ? 34 : 44;
  var ACC_RESET_MS = 220;
  var SLOW_RATE = 0.78;
  var TRANS_MS = 520;
  /** 단계 전환 후 고정 쿨다운 — 휠로 타이머 연장 안 함 (1→3 스킵 방지 + 2번 붙잡힘 방지) */
  var STEP_COOLDOWN_MS = mobile ? 520 : 580;

  var step = -1;
  var locked = false;
  var busy = false;
  var wheelAcc = 0;
  var pinST = null;
  var prepared = false;
  var enterTween = null;
  var activePanel = -1;
  var hasDuration = false;
  var slowRaf = 0;
  var timeUpdateHandler = null;
  var holdTimer = null;
  /** true면 쿨다운 중 — 추가 step 금지 (타이머 리셋 없음) */
  var gestureGate = false;
  var gateTimer = null;
  var gateUntil = 0;
  var accTimer = null;
  var touchY0 = 0;
  var touchOn = false;
  var lastStepDir = 0;

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }
  function tOf(ratio) {
    if (!hasDuration) return 0;
    return clamp(ratio, 0, 1) * Math.max(0.05, vid.duration - 0.05);
  }
  function clearHold() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }
  /** 단계 1회 소비 후 고정 쿨다운 (스크롤 중에도 타이머 연장 안 함) */
  function consumeGesture() {
    gestureGate = true;
    wheelAcc = 0;
    gateUntil = Date.now() + STEP_COOLDOWN_MS;
    if (gateTimer) clearTimeout(gateTimer);
    gateTimer = setTimeout(function () {
      gestureGate = false;
      wheelAcc = 0;
      gateTimer = null;
    }, STEP_COOLDOWN_MS);
  }
  function unlockGate() {
    gestureGate = false;
    wheelAcc = 0;
    gateUntil = 0;
    if (gateTimer) {
      clearTimeout(gateTimer);
      gateTimer = null;
    }
  }
  function canAdvance(dir) {
    if (!locked) return false;
    dir = dir > 0 ? 1 : -1;
    if (gestureGate && Date.now() >= gateUntil) unlockGate();
    // 영상 전환 중: 전진만 막고, 위로는 전환 끊고 허용
    if (busy) {
      if (dir > 0) return false;
      stopSlow();
      if (enterTween && window.gsap) {
        try {
          enterTween.kill();
        } catch (e) {}
        enterTween = null;
      }
      busy = false;
    }
    // 같은 방향 쿨다운만 차단 — 반대 방향(위로) 즉시 허용
    if (gestureGate) {
      if (dir === lastStepDir) return false;
      unlockGate();
    }
    return true;
  }

  function setupVideo() {
    vid.muted = true;
    vid.defaultMuted = true;
    vid.playsInline = true;
    vid.loop = false;
    vid.setAttribute("playsinline", "");
    vid.setAttribute("webkit-playsinline", "");
    vid.setAttribute("muted", "");
    vid.preload = "auto";

    function arm() {
      hasDuration = !!(
        vid.duration &&
        isFinite(vid.duration) &&
        vid.duration > 0.2
      );
      try {
        vid.pause();
      } catch (e) {}
    }
    vid.addEventListener("loadedmetadata", arm);
    vid.addEventListener("durationchange", arm);
    if (vid.readyState >= 1) arm();

    var unlock = function () {
      var p = vid.play();
      if (p && p.then)
        p.then(function () {
          if (step < 0) vid.pause();
        }).catch(function () {});
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("wheel", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("wheel", unlock, { once: true, passive: true });
  }

  function stopSlow() {
    clearHold();
    if (slowRaf) {
      cancelAnimationFrame(slowRaf);
      slowRaf = 0;
    }
    if (timeUpdateHandler) {
      vid.removeEventListener("timeupdate", timeUpdateHandler);
      timeUpdateHandler = null;
    }
    try {
      vid.pause();
      vid.playbackRate = 1;
    } catch (e) {}
  }

  /** 구간 끝: 멈춤 + 홀드. 자동 다음 단계 없음 — 스크롤로만 이동 */
  function onSegmentEnd(i) {
    if (!locked || step !== i || busy) return;
    try {
      vid.pause();
      vid.playbackRate = 1;
      vid.currentTime = tOf(STEPS[i].v1) - 0.02;
    } catch (e) {}
    clearHold();
    if (hint) {
      hint.classList.remove("hide", "is-hide");
      hint.setAttribute("aria-hidden", "false");
    }
  }

  function startSlowInStep(i) {
    stopSlow();
    if (!hasDuration || reduce || i < 0 || i >= STEPS.length) return;

    var s = STEPS[i];
    var t0 = tOf(s.v0);
    var t1 = tOf(s.v1);
    var ended = false;

    try {
      vid.loop = false;
      // 항상 구간 시작에서 한 번만 슬로우 → 끝에서 정지 (반복 없음)
      vid.currentTime = t0;
    } catch (e) {}
    try {
      vid.playbackRate = SLOW_RATE;
    } catch (e) {}

    timeUpdateHandler = function () {
      if (!locked || step !== i || busy || ended) return;
      if ((vid.currentTime || 0) >= t1 - 0.05) {
        ended = true;
        if (timeUpdateHandler) {
          vid.removeEventListener("timeupdate", timeUpdateHandler);
          timeUpdateHandler = null;
        }
        onSegmentEnd(i);
      }
    };
    vid.addEventListener("timeupdate", timeUpdateHandler);

    var pr = vid.play();
    if (pr && pr.catch) {
      pr.catch(function () {
        function tick() {
          if (!locked || step !== i || busy || ended) {
            slowRaf = 0;
            return;
          }
          var c = (vid.currentTime || t0) + (1 / 60) * SLOW_RATE;
          if (c >= t1 - 0.05) {
            ended = true;
            slowRaf = 0;
            try {
              vid.pause();
              vid.currentTime = t1 - 0.02;
            } catch (e) {}
            onSegmentEnd(i);
            return;
          }
          try {
            vid.pause();
            vid.currentTime = c;
          } catch (e) {}
          slowRaf = requestAnimationFrame(tick);
        }
        slowRaf = requestAnimationFrame(tick);
      });
    }
  }

  /** 앞·뒤 모두 스크럽 애니 (역순 스크롤 지원) */
  function transitionVideo(fromStep, toStep, done) {
    if (!hasDuration) {
      if (done) done();
      return;
    }
    stopSlow();
    busy = true;
    var fromT = vid.currentTime || 0;
    var toT = tOf(STEPS[toStep].v0);
    if (Math.abs(toT - fromT) < 0.04) {
      try {
        vid.currentTime = toT;
      } catch (e) {}
      busy = false;
      startSlowInStep(toStep);
      if (done) done();
      return;
    }
    var tStart = performance.now();
    var dur = toT < fromT ? Math.min(TRANS_MS, 550) : TRANS_MS;
    function frame(now) {
      var u = clamp((now - tStart) / dur, 0, 1);
      var e = u * u * (3 - 2 * u);
      var t = fromT + (toT - fromT) * e;
      try {
        vid.pause();
        vid.playbackRate = 1;
        vid.currentTime = t;
      } catch (err) {}
      if (u < 1) requestAnimationFrame(frame);
      else {
        busy = false;
        startSlowInStep(toStep);
        if (done) done();
      }
    }
    requestAnimationFrame(frame);
  }

  /* panels */
  function wrapLines(el) {
    if (!el || el.dataset.kfSplit === "1") return;
    el.innerHTML = el.innerHTML
      .split(/<br\s*\/?>/i)
      .map(function (part) {
        return (
          '<span class="kf-line"><span class="kf-line-inner">' +
          part +
          "</span></span>"
        );
      })
      .join("");
    el.dataset.kfSplit = "1";
  }
  function wrapKicker(indexEl) {
    if (!indexEl || indexEl.dataset.kfSplit === "1") return;
    var num = indexEl.querySelector("b");
    Array.prototype.slice.call(indexEl.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && n.textContent.trim()) {
        var track = document.createElement("span");
        track.className = "kf-kicker-track";
        var kick = document.createElement("span");
        kick.className = "kf-kicker";
        kick.textContent = n.textContent;
        track.appendChild(kick);
        indexEl.replaceChild(track, n);
      }
    });
    if (num) num.classList.add("kf-num");
    indexEl.dataset.kfSplit = "1";
  }
  function preparePanel(panel) {
    wrapKicker(panel.querySelector(".act-index"));
    wrapLines(panel.querySelector("h2"));
    wrapLines(panel.querySelector(".act-target"));
    panel.querySelectorAll(".act-list h3, .act-list p").forEach(function (el) {
      if (el.dataset.kfSplit === "1") return;
      el.innerHTML =
        '<span class="kf-line"><span class="kf-line-inner">' +
        el.innerHTML +
        "</span></span>";
      el.dataset.kfSplit = "1";
    });
    panel.querySelectorAll(".act-list li").forEach(function (li) {
      if (!li.querySelector(".kf-bar")) {
        var bar = document.createElement("span");
        bar.className = "kf-bar";
        bar.setAttribute("aria-hidden", "true");
        li.insertBefore(bar, li.firstChild);
      }
    });
  }
  function prepareAll() {
    if (prepared) return;
    panels.forEach(preparePanel);
    prepared = true;
  }
  function centerY() {
    var slot = document.querySelector("#journey .panel-slot");
    return Math.round((slot ? slot.clientHeight : window.innerHeight) * 0.5);
  }
  function setHidden(el) {
    el.classList.remove("is-on");
    if (window.gsap) {
      gsap.killTweensOf(el);
      gsap.set(el, { autoAlpha: 0, x: 0 });
    } else {
      el.style.visibility = "hidden";
      el.style.opacity = "0";
    }
  }
  function hideAllPanels() {
    panels.forEach(setHidden);
    activePanel = -1;
    if (scrim) scrim.classList.remove("has-copy", "is-right");
    stepBtns.forEach(function (b) {
      b.classList.remove("is-on");
      b.setAttribute("aria-selected", "false");
    });
  }

  function showPanel(idx) {
    if (idx === activePanel) return;
    activePanel = idx;
    if (enterTween && window.gsap) {
      enterTween.kill();
      enterTween = null;
    }
    panels.forEach(function (el, i) {
      if (i !== idx) setHidden(el);
    });
    stepBtns.forEach(function (b, i) {
      var on = i === idx;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (scrim) {
      scrim.classList.toggle("has-copy", idx >= 0);
      scrim.classList.toggle("is-right", idx === 1 && !mobile);
    }
    if (idx < 0) return;
    prepareAll();
    var el = panels[idx];
    if (!el) return;
    el.classList.add("is-on");
    if (!window.gsap || reduce) {
      el.style.visibility = "visible";
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }
    var right = idx === 1 && !mobile;
    gsap.set(el, { autoAlpha: 1, x: 0, y: 0, visibility: "visible" });
    var h = el.offsetHeight || 240;
    var yPos = Math.max(20, centerY() - h * 0.5);
    var num = el.querySelector(".kf-num");
    var titles = el.querySelectorAll("h2 .kf-line-inner");
    var items = el.querySelectorAll(".act-list li");
    var bars = el.querySelectorAll(".act-list .kf-bar");
    var kicker = el.querySelectorAll(".kf-kicker");

    gsap.set(el, { autoAlpha: 1, x: right ? -30 : 30, y: yPos });
    if (num) gsap.set(num, { yPercent: 35, autoAlpha: 0 });
    if (kicker.length) gsap.set(kicker, { yPercent: 30, autoAlpha: 0 });
    if (titles.length) gsap.set(titles, { yPercent: 60, autoAlpha: 0 });
    if (items.length) gsap.set(items, { y: 10, autoAlpha: 0 });
    if (bars.length)
      gsap.set(bars, {
        scaleX: 0,
        transformOrigin: right ? "right center" : "left center",
      });

    enterTween = gsap.timeline({ defaults: { ease: "power2.out" } });
    enterTween.to(el, { x: 0, duration: 0.45 }, 0);
    if (num)
      enterTween.to(num, { yPercent: 0, autoAlpha: 1, duration: 0.4 }, 0.05);
    if (kicker.length)
      enterTween.to(kicker, { yPercent: 0, autoAlpha: 1, duration: 0.35 }, 0.08);
    if (titles.length)
      enterTween.to(
        titles,
        { yPercent: 0, autoAlpha: 1, duration: 0.45, stagger: 0.05 },
        0.08
      );
    if (items.length)
      enterTween.to(
        items,
        { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.06 },
        0.22
      );
    if (bars.length)
      enterTween.to(bars, { scaleX: 1, duration: 0.4, stagger: 0.06 }, 0.22);
  }

  function goToStep(i, opts) {
    opts = opts || {};
    i = clamp(i | 0, 0, STEPS.length - 1);
    if (i === step && !opts.force) return;
    var prev = step;
    step = i;
    showPanel(STEPS[i].panel);
    if (hint) {
      hint.classList.add("hide", "is-hide");
      hint.setAttribute("aria-hidden", "true");
    }
    // 1회 전환 소비 → 짧은 고정 쿨다운만
    consumeGesture();

    if (opts.instant || reduce) {
      stopSlow();
      if (hasDuration) {
        try {
          vid.currentTime = tOf(STEPS[i].v0);
        } catch (e) {}
      }
      busy = false;
      startSlowInStep(i);
    } else {
      transitionVideo(prev, i);
    }
  }

  function setLocked(on) {
    locked = !!on;
    journey.classList.toggle("is-locked", locked);
  }
  function enterLock() {
    if (locked) return;
    setLocked(true);
    wheelAcc = 0;
    if (pinST) window.scrollTo(0, pinST.start + 1);
    // 이미 진행 중이면 처음부터 다시 돌리지 않음
    if (step < 0) goToStep(0, { force: true, instant: false });
  }
  function forceRelease() {
    setLocked(false);
    stopSlow();
    wheelAcc = 0;
    unlockGate();
  }
  function releaseDown() {
    forceRelease();
    if (pinST) window.scrollTo(0, pinST.end + 8);
  }
  function releaseUp() {
    forceRelease();
    hideAllPanels();
    step = -1;
    if (hint) {
      hint.classList.remove("hide", "is-hide");
      hint.setAttribute("aria-hidden", "false");
    }
    if (pinST) window.scrollTo(0, Math.max(0, pinST.start - 8));
  }

  // 네비/단독 페이지 → 스테이지 pin 진입 (리셋 후 스크롤 꼬임 방지)
  window.__axJourneyEnter = function () {
    if (hint) hint.classList.remove("hide", "is-hide"); if (hint) hint.setAttribute("aria-hidden", "false");
    if (pinST) {
      window.scrollTo(0, pinST.start + 1);
      setTimeout(function () {
        if (!locked) enterLock();
        else if (step < 0) goToStep(0, { force: true, instant: false });
      }, 60);
    } else {
      enterLock();
    }
  };
  window.__axJourneyForceRelease = forceRelease;
  function stepBy(dir) {
    dir = dir > 0 ? 1 : -1;
    if (!canAdvance(dir)) {
      wheelAcc = 0;
      return false;
    }
    lastStepDir = dir;
    if (dir > 0) {
      if (step < STEPS.length - 1) {
        goToStep(step + 1);
        return true;
      }
      consumeGesture();
      releaseDown();
      return true;
    }
    if (step > 0) {
      goToStep(step - 1);
      return true;
    }
    consumeGesture();
    releaseUp();
    return true;
  }

  function onWheel(e) {
    if (!locked) return;
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    e.preventDefault();

    var dir = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
    if (!dir) return;

    if (gestureGate && Date.now() >= gateUntil) unlockGate();

    // 반대 방향이면 쿨다운 즉시 해제
    if (gestureGate && lastStepDir && dir !== lastStepDir) {
      unlockGate();
    }

    // 같은 방향 쿨다운/전환 중: 타이머 연장하지 않고 무시만
    if (busy && dir > 0) {
      wheelAcc = 0;
      return;
    }
    if (gestureGate && dir === lastStepDir) {
      wheelAcc = 0;
      return;
    }

    wheelAcc += e.deltaY;
    // index 시절처럼 짧은 누적 창 — 오래 끌면 리셋
    if (accTimer) clearTimeout(accTimer);
    accTimer = setTimeout(function () {
      wheelAcc = 0;
      accTimer = null;
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
    var y1 =
      e.changedTouches && e.changedTouches[0]
        ? e.changedTouches[0].clientY
        : touchY0;
    var dy = touchY0 - y1;
    if (Math.abs(dy) < SWIPE_PX) return;
    if (!canAdvance(dy > 0 ? 1 : -1)) return;
    stepBy(dy > 0 ? 1 : -1);
  }

  stepBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var i = +(
        btn.getAttribute("data-service") ||
        btn.getAttribute("data-step") ||
        0
      );
      if (!locked && pinST) {
        window.scrollTo(0, pinST.start + 1);
        setLocked(true);
      }
      goToStep(i, { force: true });
    });
  });
  // 서비스 링크는 nav-scroll.js 가 __axJourneyEnter 로 처리
  // data-step 버튼(사이드 01/02/03)만 여기서 처리 — 위 stepBtns 리스너

  setupVideo();
  prepareAll();

  if (reduce) {
    panels.forEach(function (el) {
      el.classList.add("is-on");
      el.style.position = "relative";
      el.style.visibility = "visible";
      el.style.opacity = "1";
      el.style.marginBottom = "36px";
    });
    if (scrim) scrim.classList.add("has-copy");
    return;
  }

  hideAllPanels();
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  // pin 길이를 넉넉히 — 짧으면 휠 한 번에 pin 탈출 → 재진입 → 영상 재시작처럼 보임
  var pinTarget = document.getElementById("journey-stage") || journey;
  pinST = ScrollTrigger.create({
    trigger: pinTarget,
    start: "top top",
    end: function () {
      // index 시절처럼 pin 구간을 넉넉히 (빠른 탈출 방지)
      return "+=" + Math.round(window.innerHeight * 3.2);
    },
    pin: true,
    pinSpacing: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onEnter: enterLock,
    onEnterBack: function () {
      // 아래에서 돌아올 때: 잠금만, 마지막 단계로 강제 점프·재시작 금지
      if (!locked) {
        setLocked(true);
        if (step < 0) {
          goToStep(STEPS.length - 1, { force: true, instant: true });
        } else {
          // 멈춘 프레임 유지
          try {
            vid.pause();
          } catch (e) {}
        }
      }
      if (pinST) window.scrollTo(0, pinST.start + 1);
    },
    onLeave: function () {
      // 잠금 중 탈출 시도면 붙잡기. 단 마지막 단계에서 의도적 다운은 releaseDown 이 forceRelease 함
      if (locked) {
        if (pinST) window.scrollTo(0, pinST.start + 1);
        return;
      }
      stopSlow();
    },
    onLeaveBack: function () {
      if (locked) {
        // 첫 단계에서 위로 → 섹션 위(페이지 상단)로
        if (step <= 0) {
          releaseUp();
          return;
        }
        if (pinST) window.scrollTo(0, pinST.start + 1);
        return;
      }
      stopSlow();
      hideAllPanels();
      step = -1;
      if (hint) {
        hint.classList.remove("hide", "is-hide");
        hint.setAttribute("aria-hidden", "false");
      }
    },
  });



  window.addEventListener("wheel", onWheel, { passive: false });
  journey.addEventListener("touchstart", onTouchStart, { passive: true });
  journey.addEventListener("touchmove", onTouchMove, { passive: false });
  journey.addEventListener("touchend", onTouchEnd, { passive: true });
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
