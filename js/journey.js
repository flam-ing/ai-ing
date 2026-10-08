/**
 * Services: one visible panel, driven by the video's actual timeline.
 * Gestures seek between scenes; normal playback also advances the copy.
 * No media event changes scroll position, so seeking cannot feed back into scrolling.
 */
(function () {
  "use strict";

  var journey = document.getElementById("journey");
  var vid = document.getElementById("ax-journey-vid");
  if (!journey || !vid) return;

  var stage = document.getElementById("journey-stage") || journey;
  var scrim = document.getElementById("ax-journey-scrim");
  var panels = Array.prototype.slice.call(journey.querySelectorAll(".panel"));
  var buttons = Array.prototype.slice.call(journey.querySelectorAll(".steps button"));
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var compactScreen = window.matchMedia("(max-width: 768px), (pointer: coarse)");
  var scenes = [
    { start: 0.12, hold: 0.22 },
    { start: 0.43, hold: 0.51 },
    { start: 0.78, hold: 0.88 },
  ];
  var activeStep = 0;
  var requestedStep = 0;
  var pin = null;
  var locked = false;
  var staticLayout = true;
  var animation = 0;
  var motionId = 0;
  var transitioning = false;
  var wheelSum = 0;
  var lastWheel = 0;
  var lastDirection = 0;
  var cooldownUntil = 0;
  var playbackFrame = 0;
  var pendingHold = true;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function duration() {
    return Number.isFinite(vid.duration) && vid.duration > 0.2
      ? vid.duration - 0.05
      : 0;
  }

  function timeFor(ratio) {
    return ratio * duration();
  }

  function renderStep(index) {
    index = clamp(index, 0, panels.length - 1);
    var changed = activeStep !== index;
    activeStep = index;
    journey.dataset.activeService = String(index);
    panels.forEach(function (panel, i) {
      var visible = staticLayout || i === index;
      panel.classList.toggle("is-on", visible);
      panel.setAttribute("aria-hidden", visible ? "false" : "true");
      if (changed && i === index) panel.scrollTop = 0;
    });
    buttons.forEach(function (button, i) {
      button.classList.toggle("is-on", i === index);
      button.setAttribute("aria-pressed", i === index ? "true" : "false");
    });
    if (scrim) {
      scrim.classList.add("has-copy");
      scrim.classList.toggle("is-right", index === 1 && !staticLayout);
    }
  }

  function syncFromVideo() {
    var total = duration();
    if (!total || pendingHold || staticLayout) return;
    var progress = clamp(vid.currentTime / total, 0, 1);
    var index = 0;
    for (var i = 1; i < scenes.length; i++) {
      // Switch in the transition between two stable scenes, in either direction.
      if (progress >= (scenes[i - 1].hold + scenes[i].start) / 2) index = i;
    }
    renderStep(index);
    if (!transitioning) requestedStep = index;
  }

  function watchPlayback() {
    if (playbackFrame) cancelAnimationFrame(playbackFrame);
    function frame() {
      playbackFrame = 0;
      syncFromVideo();
      if (!vid.paused && !vid.ended) playbackFrame = requestAnimationFrame(frame);
    }
    frame();
  }

  function cancelMotion() {
    motionId++;
    if (animation) cancelAnimationFrame(animation);
    animation = 0;
    transitioning = false;
    vid.pause();
    vid.playbackRate = 1;
  }

  function seek(time) {
    try {
      vid.currentTime = clamp(time, 0, duration());
    } catch (error) {
      // Metadata or a seekable range may still be loading. Copy remains usable.
    }
    syncFromVideo();
  }

  function hold(index) {
    cancelMotion();
    requestedStep = index;
    pendingHold = !duration();
    if (!pendingHold) seek(timeFor(scenes[index].hold));
    renderStep(index);
  }

  function goToStep(index, instant) {
    index = clamp(index, 0, scenes.length - 1);
    cancelMotion();
    requestedStep = index;
    if (instant || reducedMotion.matches || !duration()) {
      hold(index);
      return;
    }
    pendingHold = false;
    transitioning = true;
    var token = motionId;
    var from = vid.currentTime;
    var target = timeFor(scenes[index].hold);
    var started = performance.now();
    // Seek the transition without a play/pause promise race or source replacement.
    function frame(now) {
      if (token !== motionId) return;
      var progress = clamp((now - started) / 700, 0, 1);
      var eased = progress * progress * (3 - 2 * progress);
      if (!vid.seeking || progress === 1) seek(from + (target - from) * eased);
      if (progress < 1) {
        animation = requestAnimationFrame(frame);
      } else {
        animation = 0;
        transitioning = false;
        renderStep(index);
      }
    }
    animation = requestAnimationFrame(frame);
  }

  function setLocked(value) {
    locked = value && !staticLayout;
    journey.classList.toggle("is-locked", locked);
  }

  function release() {
    setLocked(false);
    cancelMotion();
    wheelSum = 0;
    cooldownUntil = 0;
  }

  function enter() {
    if (staticLayout) return;
    setLocked(true);
    renderStep(activeStep);
    if (pin) window.scrollTo({ top: Math.max(0, pin.start + 1), behavior: "instant" });
  }

  function advance(direction) {
    var now = performance.now();
    if (now < cooldownUntil && direction === lastDirection) return;
    lastDirection = direction;
    cooldownUntil = now + 760;
    wheelSum = 0;
    var next = (transitioning ? requestedStep : activeStep) + direction;
    if (next >= scenes.length) {
      release();
      if (pin) window.scrollTo({ top: pin.end + 8, behavior: "instant" });
    } else if (next < 0) {
      // The first panel is a persistent state, including overscroll at page top.
      hold(0);
      if (pin && pin.start > 16) {
        release();
        window.scrollTo({ top: Math.max(0, pin.start - 8), behavior: "instant" });
      }
    } else {
      goToStep(next);
    }
  }

  function isEditable(target) {
    return target && target.closest("input, textarea, select, [contenteditable='true']");
  }

  function panelCanScroll(direction) {
    var panel = panels[activeStep];
    return panel && (direction > 0
      ? panel.scrollTop + panel.clientHeight < panel.scrollHeight - 2
      : panel.scrollTop > 2);
  }

  function onWheel(event) {
    if (staticLayout || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (!locked) {
      if (!pin || window.scrollY > pin.end || window.scrollY < pin.start - 2) return;
      enter();
    }
    if (!event.deltaY || isEditable(event.target)) return;
    var direction = event.deltaY > 0 ? 1 : -1;
    // Short desktop windows can scroll long service copy before changing scene.
    if (panelCanScroll(direction)) {
      event.preventDefault();
      panels[activeStep].scrollTop += event.deltaY;
      return;
    }
    event.preventDefault();
    var now = performance.now();
    if (now < cooldownUntil && direction === lastDirection) return;
    if (now - lastWheel > 220 || direction !== Math.sign(wheelSum)) wheelSum = 0;
    lastWheel = now;
    wheelSum += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
    if (Math.abs(wheelSum) >= 58) advance(direction);
  }

  function configureLayout() {
    var nextStatic = reducedMotion.matches || compactScreen.matches || !window.gsap || !window.ScrollTrigger;
    if (pin) {
      pin.kill();
      pin = null;
    }
    release();
    staticLayout = nextStatic;
    journey.classList.toggle("journey-static", staticLayout);
    journey.classList.toggle("journey-interactive", !staticLayout);
    renderStep(activeStep);
    if (staticLayout) return;
    window.gsap.registerPlugin(window.ScrollTrigger);
    pin = window.ScrollTrigger.create({
      trigger: stage,
      start: "top top",
      end: function () { return "+=" + Math.round(window.innerHeight * 3.2); },
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onEnter: enter,
      onEnterBack: enter,
      onLeave: release,
      onLeaveBack: function () {
        release();
        hold(0);
      },
    });
    hold(activeStep);
    if (window.scrollY >= pin.start - 2 && window.scrollY <= pin.end) enter();
  }

  vid.muted = true;
  vid.defaultMuted = true;
  vid.playsInline = true;
  vid.loop = false;
  vid.preload = "auto";
  vid.removeAttribute("autoplay");
  vid.pause();
  vid.addEventListener("loadedmetadata", function () {
    if (pendingHold) hold(requestedStep);
    else syncFromVideo();
  });
  vid.addEventListener("timeupdate", syncFromVideo);
  vid.addEventListener("seeked", syncFromVideo);
  vid.addEventListener("play", function () {
    if (staticLayout || document.hidden) {
      vid.pause();
      return;
    }
    // Playback is allowed: the same timeline drives both video and visible text.
    if (animation) cancelAnimationFrame(animation);
    animation = 0;
    motionId++;
    transitioning = false;
    pendingHold = false;
    watchPlayback();
  });
  vid.addEventListener("pause", syncFromVideo);
  vid.addEventListener("ended", syncFromVideo);
  vid.addEventListener("error", function () {
    cancelMotion();
    renderStep(requestedStep);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) cancelMotion();
  });

  buttons.forEach(function (button, index) {
    button.addEventListener("click", function () {
      if (staticLayout) {
        panels[index].scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
        return;
      }
      enter();
      cooldownUntil = performance.now() + 760;
      goToStep(index);
    });
  });
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", function (event) {
    if (!locked || event.altKey || event.ctrlKey || event.metaKey || isEditable(event.target)) return;
    if (event.target && event.target.closest("button, a") && event.key === " ") return;
    var direction = event.key === "ArrowDown" || event.key === "PageDown" || (event.key === " " && !event.shiftKey)
      ? 1 : event.key === "ArrowUp" || event.key === "PageUp" || (event.key === " " && event.shiftKey) ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    if (panelCanScroll(direction)) panels[activeStep].scrollTop += direction * 140;
    else advance(direction);
  });
  [reducedMotion, compactScreen].forEach(function (query) {
    if (query.addEventListener) query.addEventListener("change", configureLayout);
    else if (query.addListener) query.addListener(configureLayout);
  });

  window.__axJourneyEnter = function () {
    if (staticLayout) journey.scrollIntoView({ block: "start" });
    else enter();
  };
  window.__axJourneyForceRelease = release;
  configureLayout();
})();
