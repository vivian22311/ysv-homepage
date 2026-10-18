/* =========================================================================
   연세브이영어학원 — 공통 스크립트
   헤더 상태 · 스크롤 프로그레스 · 스크롤스파이 · 모바일 내비
   리빌 스태거 · 숫자 카운트업 · 히어로 패럴랙스 · 갤러리 라이트박스
   ========================================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ── 헤더 : 다크 히어로 위에서는 투명, 스크롤하면 페이퍼 ───────────── */
  var hdr = $(".hdr");
  var hero = $(".hero");
  var prog = $(".sprog span");
  var topBtn = $(".f-top");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;

    if (hdr) {
      hdr.classList.toggle("is-scrolled", y > 8);
      if (hero) {
        // 히어로 하단을 지나기 전까지만 투명 헤더 유지
        var limit = hero.offsetHeight - hdr.offsetHeight - 10;
        hdr.classList.toggle("over", y < limit);
      }
    }
    if (topBtn) topBtn.classList.toggle("is-on", y > 520);
    if (prog) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + "%";
    }
    if (hero && !reduce) {
      var orbs = $$(".hero-bg .orb", hero);
      var off = Math.min(y, 400) * 0.13;
      for (var i = 0; i < orbs.length; i++) {
        orbs[i].style.transform = "translate3d(0," + (off * (i === 1 ? -0.6 : 1)).toFixed(1) + "px,0)";
      }
    }
  }

  var ticking = false;
  document.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { onScroll(); ticking = false; });
    },
    { passive: true }
  );
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* ── 모바일 내비 ─────────────────────────────────────────────────── */
  var tog = $(".navtog");
  var mnav = $(".mnav");
  if (tog && mnav) {
    if ("inert" in mnav) mnav.inert = true;
    var setNav = function (open) {
      tog.setAttribute("aria-expanded", String(open));
      tog.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
      mnav.classList.toggle("is-open", open);
      if ("inert" in mnav) mnav.inert = !open;
      document.body.style.overflow = open ? "hidden" : "";
    };
    tog.addEventListener("click", function () {
      setNav(tog.getAttribute("aria-expanded") !== "true");
    });
    $$("a", mnav).forEach(function (a) {
      a.addEventListener("click", function () { setNav(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && tog.getAttribute("aria-expanded") === "true") { setNav(false); tog.focus(); }
    });
  }

  if (topBtn) {
    topBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  /* ── 숫자 카운트업 ───────────────────────────────────────────────── */
  function countUp(el) {
    var to = parseFloat(el.getAttribute("data-to"));
    var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
    if (isNaN(to)) return;
    if (reduce) { el.textContent = to.toFixed(dec); return; }
    var dur = 1200;
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      // cubic-bezier(.22,1,.36,1) 근사 — ease-out quint
      var e = 1 - Math.pow(1 - p, 5);
      el.textContent = (to * e).toFixed(dec);
      if (p < 1) window.requestAnimationFrame(step);
      else el.textContent = to.toFixed(dec);
    }
    window.requestAnimationFrame(step);
  }

  /* ── 스크롤 리빌 ─────────────────────────────────────────────────── */
  var revealEls = $$(".rv");
  function activate(el) {
    el.classList.add("is-in");
    $$(".cnum", el).forEach(function (n) {
      if (!n.dataset.done) { n.dataset.done = "1"; countUp(n); }
    });
    if (el.classList.contains("cnum") && !el.dataset.done) { el.dataset.done = "1"; countUp(el); }
  }
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          activate(en.target);
          io.unobserve(en.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(activate);
  }
  // 히어로는 첫 화면이므로 즉시 노출
  window.setTimeout(function () { $$(".hero .rv").forEach(activate); }, 60);

  // 안전망 : IntersectionObserver가 어떤 이유로든 동작하지 않아도
  //          2.5초 뒤에는 화면에 들어와 있는 요소를 반드시 노출한다(백지 방지)
  window.setTimeout(function () {
    revealEls.forEach(function (el) {
      if (el.classList.contains("is-in")) return;
      var b = el.getBoundingClientRect();
      if (b.top < window.innerHeight * 1.35 && b.bottom > -200) activate(el);
    });
  }, 2500);

  /* ── 스크롤스파이 (GNB 현재 위치 표시) ───────────────────────────── */
  var links = $$(".gnb a[href^='#']");
  if (links.length && "IntersectionObserver" in window) {
    var map = {};
    var targets = [];
    links.forEach(function (a) {
      var el = document.getElementById(a.getAttribute("href").slice(1));
      if (el) { map[el.id] = a; targets.push(el); }
    });
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) { a.classList.remove("is-active"); });
          if (map[en.target.id]) map[en.target.id].classList.add("is-active");
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    targets.forEach(function (t) { spy.observe(t); });
  }

  /* ── 갤러리 라이트박스 ───────────────────────────────────────────── */
  var gal = $("#gal");
  var lb = $("#lbox");
  if (gal && lb) {
    var btns = $$(".gbtn", gal);
    var shots = btns.map(function (b) {
      var img = $("img", b);
      var cap = $(".cap", b);
      // 준비된 webp 중 가장 큰 후보를 확대용으로 쓴다(srcset 문자열 파싱)
      var src = img.getAttribute("src");
      var srcEl = b.querySelector("source[srcset]");
      if (srcEl) {
        var cands = srcEl.getAttribute("srcset").split(",").map(function (t) {
          var parts = t.trim().split(/\s+/);
          return { url: parts[0], w: parseInt(parts[1], 10) || 0 };
        });
        cands.sort(function (x, y) { return y.w - x.w; });
        if (cands[0] && cands[0].url) src = cands[0].url;
      }
      var label = (b.getAttribute("aria-label") || "").replace(/\s*크게 보기$/, "");
      return { src: src, alt: label || img.getAttribute("alt") || (cap ? cap.textContent : ""), cap: cap ? cap.textContent : "" };
    });
    var lbImg = $("#lbImg");
    var lbCap = $("#lbCap");
    var idx = 0;
    var opener = null;

    function show(i) {
      idx = (i + shots.length) % shots.length;
      lbImg.setAttribute("src", shots[idx].src);
      lbImg.setAttribute("alt", shots[idx].alt);
      lbCap.textContent = shots[idx].cap + "  (" + (idx + 1) + " / " + shots.length + ")";
    }
    function open(i, from) {
      opener = from || null;
      show(i);
      lb.hidden = false;
      document.body.style.overflow = "hidden";
      $(".lb-close", lb).focus();
    }
    function close() {
      lb.hidden = true;
      document.body.style.overflow = "";
      if (opener) opener.focus();
    }

    btns.forEach(function (b, i) {
      b.addEventListener("click", function () { open(i, b); });
    });
    $(".lb-close", lb).addEventListener("click", close);
    $(".lb-prev", lb).addEventListener("click", function () { show(idx - 1); });
    $(".lb-next", lb).addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
      else if (e.key === "Tab") {
        // 포커스 트랩
        var f = $$("button", lb);
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ── 블로그 페이지에서 GNB 활성화 ────────────────────────────────── */
  if (location.pathname.indexOf("/blog") > -1) {
    $$(".gnb a").forEach(function (a) {
      if ((a.getAttribute("href") || "").indexOf("blog") > -1) a.classList.add("is-active");
    });
  }
})();
