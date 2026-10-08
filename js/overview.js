/**
 * 개요: 네이티브 스크롤에 맞춰 세 문장을 전환한 뒤, 사례 세 개를 함께 표시.
 * 위치에서 상태를 계산하므로 위로 돌아올 때도 문장이 사라지지 않습니다.
 */
(function () {
  "use strict";

  var root = document.getElementById("overview");
  if (!root) return;

  var stage = root.querySelector(".ax-overview-stage");
  var lines = Array.prototype.slice.call(root.querySelectorAll(".mf-line"));
  var cases = document.getElementById("overview-cases");
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var videos = Array.prototype.slice.call(document.querySelectorAll(".overview-case-video"));
  var activeLine = -1;
  var frame = 0;
  var observer = null;
  var videoStates = new Map();

  function paint() {
    frame = 0;
    if (motion.matches || !lines.length) return;

    var range = Math.max(1, root.offsetHeight - stage.offsetHeight);
    var progress = Math.max(0, Math.min(1, -root.getBoundingClientRect().top / range));
    var next = Math.min(lines.length - 1, Math.floor(progress * lines.length));
    if (next === activeLine) return;
    activeLine = next;
    lines.forEach(function (line, index) {
      line.classList.toggle("is-on", index === next);
      line.setAttribute("aria-hidden", index === next ? "false" : "true");
    });
    root.classList.toggle("is-mf-bright", next === lines.length - 1);
  }

  function requestPaint() {
    if (!frame) frame = window.requestAnimationFrame(paint);
  }

  function playVisibleVideo(video) {
    var state = videoStates.get(video);
    if (!state || !state.visible || state.userPaused || motion.matches || document.hidden) return;
    var result = video.play();
    if (result && typeof result.catch === "function") result.catch(function () {});
  }

  function pauseVideo(video) {
    var state = videoStates.get(video);
    if (video.paused) return;
    state.autoPause = true;
    video.pause();
  }

  videos.forEach(function (video) {
    videoStates.set(video, { visible: false, userPaused: false, autoPause: false });
    video.addEventListener("pause", function () {
      var state = videoStates.get(video);
      if (!state.autoPause && state.visible && !document.hidden) state.userPaused = true;
      state.autoPause = false;
    });
    video.addEventListener("play", function () {
      var state = videoStates.get(video);
      state.userPaused = false;
      state.autoPause = false;
    });
  });

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        var state = videoStates.get(video);
        state.visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
        if (state.visible) playVisibleVideo(video);
        else pauseVideo(video);
      });
    }, { threshold: [0, 0.2] });
    videos.forEach(function (video) { observer.observe(video); });
  }

  function applyMotionPreference() {
    root.classList.toggle("is-scroll-ready", !motion.matches);
    activeLine = -1;
    if (motion.matches) {
      root.classList.remove("is-mf-bright");
      lines.forEach(function (line) {
        line.classList.add("is-on");
        line.removeAttribute("aria-hidden");
      });
      videos.forEach(pauseVideo);
    } else {
      paint();
      videos.forEach(playVisibleVideo);
    }
  }

  // Intro click still advances, while wheel, swipe and keyboard scrolling stay native.
  root.addEventListener("click", function (event) {
    if (motion.matches || event.target.closest("a, button, input, textarea, select")) return;
    var top = root.getBoundingClientRect().top + window.scrollY;
    var range = Math.max(1, root.offsetHeight - stage.offsetHeight);
    var nextY = activeLine < lines.length - 1
      ? top + range * ((activeLine + 1) / lines.length) + 2
      : (cases ? cases.getBoundingClientRect().top + window.scrollY - 80 : top + root.offsetHeight);
    window.scrollTo({ top: nextY, behavior: "smooth" });
  });

  window.__axOverviewEnter = function () {
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY, behavior: "auto" });
    requestPaint();
  };
  // nav-scroll.js may call this before navigating to another section. No pin to release.
  window.__axOverviewForceRelease = requestPaint;

  window.addEventListener("scroll", requestPaint, { passive: true });
  window.addEventListener("resize", requestPaint);
  window.addEventListener("pageshow", requestPaint);
  document.addEventListener("visibilitychange", function () {
    videos.forEach(document.hidden ? pauseVideo : playVisibleVideo);
  });
  if (motion.addEventListener) motion.addEventListener("change", applyMotionPreference);
  else if (motion.addListener) motion.addListener(applyMotionPreference);

  applyMotionPreference();
})();
