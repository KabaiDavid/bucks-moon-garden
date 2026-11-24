/* Buck's Restaurant & Bar — interaction layer.
   Vanilla, no dependencies. Every effect degrades to a static, readable page. */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  /* ------------------------------------------------------------------
     1. Hours — single source of truth (from buckslou.com).
        Day index: 0 Sun … 6 Sat. Times are minutes after midnight, Louisville time.
     ------------------------------------------------------------------ */
  const HOURS = {
    0: [],
    1: [["Lunch", 660, 840], ["Dinner", 1020, 1260]],
    2: [["Lunch", 660, 840], ["Dinner", 1020, 1260]],
    3: [["Lunch", 660, 840], ["Dinner", 1020, 1260]],
    4: [["Lunch", 660, 840], ["Dinner", 1020, 1260]],
    5: [["Lunch", 660, 840], ["Dinner", 1020, 1320]],
    6: [["Dinner", 1020, 1320]],
  };
  const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const fmt = (m) => {
    const h = Math.floor(m / 60), mm = m % 60, h12 = ((h + 11) % 12) + 1;
    return `${h12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${h < 12 ? "am" : "pm"}`;
  };
  function louisvilleNow() {
    try {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hour12: false, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
      const g = (t) => p.find((x) => x.type === t).value;
      const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
      return { day: wd, mins: (parseInt(g("hour"), 10) % 24) * 60 + parseInt(g("minute"), 10), date: new Date(+g("year"), +g("month") - 1, +g("day")) };
    } catch (e) {
      const d = new Date();
      return { day: d.getDay(), mins: d.getHours() * 60 + d.getMinutes(), date: d };
    }
  }
  function statusText() {
    const { day, mins } = louisvilleNow();
    const today = HOURS[day];
    const cur = today.find(([, a, b]) => mins >= a && mins < b);
    if (cur) return { open: true, text: `Open now · ${cur[0]} until ${fmt(cur[2])}` };
    const next = today.find(([, a]) => mins < a);
    if (next) return { open: false, text: `${next[0]} today from ${fmt(next[1])}` };
    for (let i = 1; i <= 7; i++) {
      const d = (day + i) % 7;
      if (HOURS[d].length) return { open: false, text: `Opens ${i === 1 ? "tomorrow" : DAY[d]} · ${fmt(HOURS[d][0][1])}` };
    }
    return { open: false, text: "" };
  }
  function paintStatus() {
    const s = statusText();
    $$("[data-status]").forEach((el) => {
      el.classList.toggle("is-open", s.open);
      const t = $("[data-status-text]", el);
      if (t) t.textContent = s.text;
    });
    const { day } = louisvilleNow();
    $$("[data-hours-row]").forEach((tr) => tr.classList.toggle("is-today", tr.dataset.hoursRow.split(",").map(Number).includes(day)));
  }
  paintStatus();
  setInterval(paintStatus, 60000);

  /* Week strip inside the reservation panel */
  const week = $("[data-week]");
  if (week) {
    const { date } = louisvilleNow();
    for (let i = 0; i < 7; i++) {
      const d = new Date(date); d.setDate(d.getDate() + i);
      const h = HOURS[d.getDay()];
      const el = document.createElement("div");
      el.className = "week__day" + (i === 0 ? " is-today" : "") + (h.length ? "" : " is-closed");
      el.innerHTML = `${DAY[d.getDay()].slice(0, 3)}<b>${d.getDate()}</b><small>${h.length ? (h.length > 1 ? "Lunch · Dinner" : h[0][0]) : "Closed"}</small>`;
      el.setAttribute("aria-label", `${DAY[d.getDay()]} ${d.getDate()}: ${h.length ? h.map(([n, a, b]) => `${n} ${fmt(a)} to ${fmt(b)}`).join(", ") : "closed"}`);
      week.appendChild(el);
    }
  }

  /* ------------------------------------------------------------------
     2. Header: transparent over heroes, solid after; hides on scroll down
     ------------------------------------------------------------------ */
  const header = $(".site-header");
  const hero = $(".hero, .page-hero");
  const bookBar = $(".book-bar");
  let lastY = window.scrollY, ticking = false;
  function onScroll() {
    const y = window.scrollY;
    const heroEnd = hero ? hero.offsetHeight - 90 : 40;
    header.classList.toggle("is-solid", y > Math.min(heroEnd, 120) || !hero);
    const hide = y > lastY && y > heroEnd + 200 && !document.body.classList.contains("menu-open");
    header.classList.toggle("is-hidden", hide);
    document.body.classList.toggle("is-header-hidden", hide);
    if (bookBar) bookBar.classList.toggle("is-visible", y > heroEnd * 0.6);
    lastY = y;
    scrollFx(y);
    ticking = false;
  }
  window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });

  /* Mobile menu */
  const toggle = $(".menu-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open);
      header.classList.add("is-solid");
      $(".drawer-nav").toggleAttribute("inert", !open);
    });
    $$(".drawer-nav a").forEach((a) => a.addEventListener("click", () => { document.body.classList.remove("menu-open"); toggle.setAttribute("aria-expanded", "false"); }));
  }

  /* ------------------------------------------------------------------
     3. Reveal on view
     ------------------------------------------------------------------ */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
  $$("[data-reveal], .img-reveal, .reveal-lines, .stave").forEach((el) => io.observe(el));
  // Hero lines start on load, not on scroll
  requestAnimationFrame(() => $$(".hero .reveal-lines, .hero [data-reveal], .page-hero .reveal-lines, .page-hero [data-reveal]").forEach((el) => el.classList.add("is-in")));

  /* ------------------------------------------------------------------
     4. Scroll-linked scenes
     ------------------------------------------------------------------ */
  const moon = $(".moon");
  const finale = $(".finale__bg img");
  const notes = $$(".stave .note");
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const span = (p, a, b) => clamp((p - a) / (b - a));

  function scrollFx() {
    if (reduce) return;
    const vh = window.innerHeight;
    if (moon) {
      const r = moon.getBoundingClientRect();
      const total = r.height - vh;
      const p = clamp(-r.top / total);
      if (r.bottom > 0 && r.top < vh) {
        // The moon rises: a small disc of lilies opens until it fills the room.
        const open = ease(span(p, 0.02, 0.5));
        const s = moon.style;
        s.setProperty("--r", (13 + open * 75).toFixed(2) + "%");
        s.setProperty("--cy", (54 - open * 4).toFixed(2) + "%");
        s.setProperty("--s", (1.2 - open * 0.16).toFixed(3));
        s.setProperty("--halo", (1 - span(p, 0.12, 0.34)).toFixed(3));
        s.setProperty("--rot", (p * 70).toFixed(2) + "deg");
        s.setProperty("--t0", (1 - span(p, 0.05, 0.25)).toFixed(3));
        s.setProperty("--t1", ease(span(p, 0.36, 0.54)).toFixed(3));
        s.setProperty("--t2", ease(span(p, 0.48, 0.66)).toFixed(3));
        s.setProperty("--shade", (span(p, 0.34, 0.6) * 0.38).toFixed(3));
      }
    }
    if (finale) {
      const r = finale.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) finale.style.setProperty("--py", ((r.top / vh) * -60).toFixed(1) + "px");
    }
    if (notes.length) {
      const r = notes[0].closest(".stave").getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const q = (vh - r.top) / (vh + r.height);
        notes.forEach((n, i) => n.style.setProperty("--y", (Math.sin(q * 5 + i * 1.3) * 10).toFixed(1) + "px"));
      }
    }
  }
  onScroll();

  /* ------------------------------------------------------------------
     5. Signature dishes — hover/focus swaps the plate
     ------------------------------------------------------------------ */
  $$("[data-dishes]").forEach((wrap) => {
    const items = $$(".dish", wrap), imgs = $$(".dish-stage img", wrap), tag = $(".dish-stage__tag", wrap);
    const activate = (i) => {
      items.forEach((d, j) => { d.classList.toggle("is-active", i === j); $("button", d).setAttribute("aria-expanded", i === j); });
      imgs.forEach((im, j) => im.classList.toggle("is-active", i === j));
      if (tag) tag.textContent = items[i].dataset.menu;
    };
    items.forEach((d, i) => {
      const b = $("button", d);
      b.addEventListener("click", () => activate(i));
      b.addEventListener("focus", () => activate(i));
      if (window.matchMedia("(hover: hover)").matches) b.addEventListener("mouseenter", () => activate(i));
    });
    activate(0);
  });

  /* ------------------------------------------------------------------
     6. Gallery strip — drag to scroll + arrow buttons
     ------------------------------------------------------------------ */
  $$("[data-strip]").forEach((strip) => {
    let down = false, sx = 0, sl = 0, moved = false;
    strip.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = strip.scrollLeft; });
    window.addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; strip.classList.add("is-dragging"); } strip.scrollLeft = sl - dx; });
    window.addEventListener("pointerup", () => { down = false; strip.classList.remove("is-dragging"); });
    strip.addEventListener("click", (e) => { if (moved) e.preventDefault(); }, true);
    const ctrl = strip.parentElement.querySelector("[data-strip-ctrl]") || document.querySelector(`[data-strip-ctrl="${strip.id}"]`);
    if (ctrl) $$("button", ctrl).forEach((b) => b.addEventListener("click", () => strip.scrollBy({ left: (b.dataset.dir === "prev" ? -1 : 1) * strip.clientWidth * 0.7, behavior: reduce ? "auto" : "smooth" })));
  });

  /* ------------------------------------------------------------------
     7. Reservation panel
     ------------------------------------------------------------------ */
  const panel = $(".reserve");
  let lastFocus = null;
  function openReserve(e) {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    panel.classList.add("is-open");
    panel.removeAttribute("inert");
    panel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => $(".reserve__close", panel).focus(), 50);
  }
  function closeReserve() {
    panel.classList.remove("is-open");
    panel.setAttribute("inert", "");
    panel.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  if (panel) {
    $$("[data-reserve]").forEach((b) => b.addEventListener("click", openReserve));
    $$("[data-reserve-close]", panel).forEach((b) => b.addEventListener("click", closeReserve));
    document.addEventListener("keydown", (e) => {
      if (!panel.classList.contains("is-open")) return;
      if (e.key === "Escape") closeReserve();
      if (e.key === "Tab") {
        const f = $$("a[href], button:not([disabled])", panel).filter((x) => x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    if (location.hash === "#reserve") openReserve();
  }

  /* ------------------------------------------------------------------
     8. Tabs (menus, wine)
     ------------------------------------------------------------------ */
  $$("[role=tablist]").forEach((list) => {
    const tabs = $$("[role=tab]", list);
    const show = (t, push) => {
      tabs.forEach((x) => { const on = x === t; x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute("aria-controls")).hidden = !on; });
      if (push && t.dataset.hash) history.replaceState(null, "", "#" + t.dataset.hash);
      const meta = $("[data-tab-meta]", list.closest(".tabs") || list);
      if (meta) meta.textContent = t.dataset.meta || "";
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => { show(t, true); const top = list.closest(".tabs"); if (top && top.getBoundingClientRect().top <= parseInt(getComputedStyle(root).getPropertyValue("--header-h"))) top.nextElementSibling.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); });
      t.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); show(n, true); }
      });
    });
    const fromHash = tabs.find((t) => t.dataset.hash && "#" + t.dataset.hash === location.hash);
    if (fromHash) show(fromHash);
    else if (list.dataset.auto === "time") {
      // Default to whichever menu is being served (or next) in Louisville.
      const { day, mins } = louisvilleNow();
      const lunchSoon = HOURS[day].some(([n, , b]) => n === "Lunch" && mins < b);
      show(tabs.find((t) => t.dataset.hash === (lunchSoon ? "lunch" : "dinner")) || tabs[0]);
    } else show(tabs[0]);
  });

  /* ------------------------------------------------------------------
     9. Bourbon search
     ------------------------------------------------------------------ */
  const q = $("[data-bourbon-search]");
  if (q) {
    const rows = $$(".bourbon-letter li"), groups = $$(".bourbon-letter"), count = $("[data-bourbon-count]");
    q.addEventListener("input", () => {
      const v = q.value.trim().toLowerCase();
      let n = 0;
      rows.forEach((r) => { const hit = !v || r.textContent.toLowerCase().includes(v); r.hidden = !hit; if (hit) n++; });
      groups.forEach((g) => { g.hidden = !$$("li", g).some((r) => !r.hidden); });
      if (count) count.textContent = v ? `${n} of ${rows.length}` : `${rows.length} labels`;
    });
  }

  /* ------------------------------------------------------------------
     10. Forms — posts to the host's form handler (Netlify Forms-ready).
         Without a handler, the guest is told plainly to call instead.
     ------------------------------------------------------------------ */
  $$("form[data-form]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const note = $("[data-form-note]", form);
      const btn = $("button[type=submit]", form);
      btn.disabled = true;
      try {
        const res = await fetch(form.getAttribute("action") || "/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        note.textContent = form.dataset.success || "Thank you — we'll be in touch shortly.";
      } catch (err) {
        note.textContent = "We couldn't send that just now. Please call us on (502) 637-5284 or email bucks@buckslou.com.";
      } finally { btn.disabled = false; }
    });
  });

  /* Year */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
