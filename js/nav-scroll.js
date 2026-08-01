/**
 * 네비 해시 스크롤 보정
 * pin(개요/서비스) 때문에 기본 #anchor 가 어긋나는 문제 해결
 */
(function () {
  "use strict";

  var NAV_OFFSET = 72;

  function refreshST() {
    if (window.ScrollTrigger && typeof ScrollTrigger.refresh === "function") {
      try {
        ScrollTrigger.refresh();
      } catch (e) {}
    }
  }

  function yForElement(el) {
    if (!el) return 0;
    // ScrollTrigger pin 이 있으면 start 좌표 사용
    if (window.ScrollTrigger) {
      var triggers = ScrollTrigger.getAll();
      for (var i = 0; i < triggers.length; i++) {
        var t = triggers[i];
        if (t.trigger === el) {
          return Math.max(0, t.start);
        }
      }
    }
    return Math.max(
      0,
      el.getBoundingClientRect().top + window.pageYOffset - NAV_OFFSET
    );
  }

  function unlockPins() {
    if (typeof window.__axOverviewForceRelease === "function") {
      window.__axOverviewForceRelease();
    }
    if (typeof window.__axJourneyForceRelease === "function") {
      window.__axJourneyForceRelease();
    }
  }

  function goToId(id, opts) {
    opts = opts || {};
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;

    // pin 섹션은 전용 enter
    if (id === "overview") {
      unlockPins();
      refreshST();
      setTimeout(function () {
        if (typeof window.__axOverviewEnter === "function") {
          window.__axOverviewEnter();
        } else {
          window.scrollTo({ top: yForElement(el), behavior: "smooth" });
        }
      }, opts.delay || 40);
      return;
    }

    if (id === "journey") {
      unlockPins();
      refreshST();
      setTimeout(function () {
        if (typeof window.__axJourneyEnter === "function") {
          window.__axJourneyEnter();
        } else {
          window.scrollTo({ top: yForElement(el), behavior: "smooth" });
        }
      }, opts.delay || 60);
      return;
    }

    // about / cases / contact — pin 풀고 정확한 위치로
    unlockPins();
    refreshST();
    setTimeout(function () {
      refreshST();
      var y = yForElement(el);
      window.scrollTo({ top: y, behavior: "smooth" });
      try {
        history.replaceState(null, "", "#" + id);
      } catch (e) {}
    }, opts.delay || 80);
  }

  function onClick(e) {
    var a = e.target.closest("a[href^='#']");
    if (!a) return;
    var href = a.getAttribute("href");
    if (!href || href === "#" || href.length < 2) return;
    var id = href.slice(1);
    if (!document.getElementById(id)) return;

    // overview/journey 전용 리스너와 중복 방지: 여기서 통합 처리
    e.preventDefault();
    goToId(id);
  }

  document.addEventListener("click", onClick, true);

  // 초기 해시
  window.addEventListener("load", function () {
    var hash = (location.hash || "").replace(/^#/, "");
    if (hash && document.getElementById(hash)) {
      setTimeout(function () {
        goToId(hash, { delay: 120 });
      }, 200);
    }
  });

  window.__axGoToSection = goToId;
})();
