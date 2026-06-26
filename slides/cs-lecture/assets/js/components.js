/* =========================================================================
   공통 UI 자동 렌더 — 헤더 · 사이드바 · 이전/다음 · 코드 복사 · 하이라이트
   각 과목 페이지는 <body data-slug="..."> 만 지정하면 나머지는 이 파일이 처리한다.
   ========================================================================= */
(function () {
  var C = window.CURRICULUM;
  if (!C) { console.error("curriculum.js 가 먼저 로드되어야 합니다."); return; }

  var body = document.body;
  var slug = body.getAttribute("data-slug");           // 과목 페이지면 slug, 허브면 null
  var base = body.getAttribute("data-base") || "";      // 루트 기준 경로 접두사 ("" 또는 "../")
  var subjects = C.subjects;
  var idx = subjects.findIndex(function (s) { return s.slug === slug; });

  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function href(s) { return base + "subjects/" + s.slug + ".html"; }

  /* ---- 헤더 ---- */
  function renderHeader() {
    var showToggle = slug ? '<button class="menu-toggle" aria-label="메뉴">☰</button>' : "";
    var header = el(
      '<header class="site-header">' +
        showToggle +
        '<a class="brand" href="' + base + 'index.html">' +
          '<span class="logo">CS</span><span>' + C.site + '</span>' +
        '</a>' +
        '<span class="spacer"></span>' +
        '<a class="header-link" href="' + base + 'index.html">전체 커리큘럼</a>' +
      '</header>'
    );
    body.insertBefore(header, body.firstChild);
    var tg = header.querySelector(".menu-toggle");
    if (tg) tg.addEventListener("click", function () {
      var sb = document.querySelector(".sidebar");
      if (sb) sb.classList.toggle("open");
    });
  }

  /* ---- 사이드바 (과목 페이지 전용) : 학년별 과목목록 + 이 페이지 목차 ---- */
  function renderSidebar() {
    var sb = document.querySelector(".sidebar");
    if (!sb) return;

    var html = "";
    C.years.forEach(function (y) {
      var items = subjects.filter(function (s) { return s.year === y.id; });
      if (!items.length) return;
      html += '<h4>' + y.badge + '</h4><ul>';
      items.forEach(function (s) {
        var act = s.slug === slug ? ' class="active"' : "";
        html += '<li><a' + act + ' href="' + href(s) + '">' + s.icon + " " + s.title + "</a></li>";
      });
      html += "</ul>";
    });

    // 현재 페이지 내 섹션 목차.
    // id 는 <section class="anchor"> 또는 그 안의 <h2> 어디에 있어도 인식한다.
    var toc = [];
    document.querySelectorAll("article section.anchor").forEach(function (sec) {
      var h2 = sec.querySelector("h2");
      if (!h2) return;
      var id = sec.id || h2.id;
      if (!id) return;
      toc.push({ id: id, text: h2.textContent });
    });
    // 위 패턴에 안 맞는 페이지를 위한 보강: 독립적인 h2[id]
    if (!toc.length) {
      document.querySelectorAll("article h2[id]").forEach(function (h) {
        toc.push({ id: h.id, text: h.textContent });
      });
    }
    if (toc.length) {
      html += '<div class="toc"><h4>이 페이지</h4><ul>';
      toc.forEach(function (t) {
        html += '<li><a href="#' + t.id + '">' + t.text + "</a></li>";
      });
      html += "</ul></div>";
    }
    sb.innerHTML = html;

    // 모바일에서 링크 클릭 시 사이드바 닫기
    sb.addEventListener("click", function (e) {
      if (e.target.closest("a")) sb.classList.remove("open");
    });
  }

  /* ---- 이전/다음 과목 네비게이션 ---- */
  function renderPageNav() {
    var holder = document.querySelector("[data-page-nav]");
    if (!holder || idx < 0) return;
    var prev = subjects[idx - 1];
    var next = subjects[idx + 1];
    holder.className = "page-nav";
    holder.innerHTML =
      (prev
        ? '<a class="prev" href="' + href(prev) + '"><div class="dir">← 이전</div><div class="label">' + prev.title + "</div></a>"
        : '<a class="prev disabled"></a>') +
      (next
        ? '<a class="next" href="' + href(next) + '"><div class="dir">다음 →</div><div class="label">' + next.title + "</div></a>"
        : '<a class="next disabled"></a>');
  }

  /* ---- 코드 블록 복사 버튼 ---- */
  function wireCopyButtons() {
    document.querySelectorAll(".code-block").forEach(function (block) {
      var head = block.querySelector(".code-head");
      var code = block.querySelector("pre code");
      if (!head || !code || head.querySelector(".copy-btn")) return;
      var btn = el('<button class="copy-btn">복사</button>');
      head.appendChild(btn);
      btn.addEventListener("click", function () {
        navigator.clipboard.writeText(code.innerText).then(function () {
          btn.textContent = "복사됨 ✓"; btn.classList.add("done");
          setTimeout(function () { btn.textContent = "복사"; btn.classList.remove("done"); }, 1500);
        });
      });
    });
  }

  /* ---- 문서 제목 동기화 ---- */
  function syncTitle() {
    if (idx >= 0) document.title = subjects[idx].title + " · " + C.site;
  }

  /* ---- 파비콘 주입 (인라인 SVG, 페이지마다 파일 추가 불필요) ---- */
  function injectFavicon() {
    if (document.querySelector('link[rel="icon"]')) return;
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="14" fill="#0d1117"/>' +
      '<text x="32" y="43" font-family="monospace" font-size="30" font-weight="700" ' +
      'text-anchor="middle" fill="#58a6ff">CS</text></svg>';
    var link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = "data:image/svg+xml," + encodeURIComponent(svg);
    document.head.appendChild(link);
  }

  /* ---- 읽기 진행률 바 + 맨 위로 버튼 + 목차 스크롤 추적 ---- */
  function setupScrollUX() {
    var bar = el('<div class="read-progress"></div>');
    document.body.appendChild(bar);
    var top = el('<button class="to-top" aria-label="맨 위로">↑</button>');
    document.body.appendChild(top);
    top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

    // 목차 링크 ↔ 대상 섹션 매핑 (과목 페이지에서만 존재)
    var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".sidebar .toc a"));
    var targets = tocLinks.map(function (a) {
      var t = document.getElementById(a.getAttribute("href").slice(1));
      return { link: a, el: t };
    }).filter(function (x) { return x.el; });

    function onScroll() {
      var st = window.scrollY || document.documentElement.scrollTop;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
      top.classList.toggle("show", st > 400);

      if (targets.length) {
        var line = st + 120, current = targets[0];
        targets.forEach(function (x) {
          if (x.el.getBoundingClientRect().top + st <= line) current = x;
        });
        tocLinks.forEach(function (a) { a.classList.remove("active"); });
        if (current) current.link.classList.add("active");
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  document.addEventListener("DOMContentLoaded", function () {
    injectFavicon();
    renderHeader();
    renderSidebar();
    renderPageNav();
    wireCopyButtons();
    syncTitle();
    setupScrollUX();
    if (window.hljs) window.hljs.highlightAll();
  });
})();
