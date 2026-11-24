#!/usr/bin/env python3
"""Build the Buck's static site.

    python3 build.py

Reads  src/pages/*.html   (page bodies, with a JSON front-matter comment)
       src/partials/*.html (head, header, footer)
       src/data/*.json     (menus and bar list, taken from buckslou.com)
Writes site/*.html. Assets live in site/assets and are not touched.

Template syntax (intentionally tiny):
    {{key}}                         page variable
    [[img:name|alt|sizes|eager]]    responsive <img> from site/assets/img/name-<w>.webp
    [[menus]] [[bourbon]] [[wines]] generated from src/data
"""
import glob, html, json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = os.path.join(ROOT, "src"), os.path.join(ROOT, "site")
IMG = os.path.join(OUT, "assets", "img")
e = html.escape


def partial(name):
    with open(os.path.join(SRC, "partials", name + ".html"), encoding="utf-8") as f:
        return f.read()


def data(name):
    with open(os.path.join(SRC, "data", name + ".json"), encoding="utf-8") as f:
        return json.load(f)


def widths(name):
    ws = []
    for p in glob.glob(os.path.join(IMG, f"{name}-*.webp")):
        m = re.search(rf"{re.escape(name)}-(\d+)\.webp$", p)
        if m:
            ws.append(int(m.group(1)))
    if not ws:
        raise SystemExit(f"missing image: {name}")
    return sorted(ws)


def img(name, alt="", sizes="100vw", eager=""):
    ws = widths(name)
    srcset = ", ".join(f"assets/img/{name}-{w}.webp {w}w" for w in ws)
    small = ws[0]
    load = 'fetchpriority="high"' if eager == "eager" else 'loading="lazy" decoding="async"'
    return f'<img src="assets/img/{name}-{small}.webp" srcset="{srcset}" sizes="{sizes}" alt="{e(alt)}" {load}>'


# ---------- Menus ----------
def price(p):
    return f"${p}" if p else ""


def render_menus():
    d = data("menus")
    slug = {"Lunch Menu": "lunch", "Dinner Menu": "dinner", "Dessert Menu": "dessert"}
    meta = {
        "lunch": "Served Monday – Friday · 11am – 2pm",
        "dinner": "Served Monday – Saturday from 5pm",
        "dessert": "Served at lunch and dinner",
    }
    intro = {
        "lunch": ("Lunch, <em>unhurried.</em>", "A midday table in the Moon Garden — Kentucky classics like the Hot Brown beside lighter salads and Buck’s own burger."),
        "dinner": ("Dinner, <em>by candlelight.</em>", "Chef Matthew Klein’s continental menu, built on Kentucky Proud ingredients and served on Buck’s mismatched antique china."),
        "dessert": ("The last <em>course.</em>", "Buck’s signature Mocha Dacquoise, and a handful of old friends to finish the evening."),
    }
    plates = {"lunch": ("crab-cakes", "Crab Cakes"), "dinner": ("scallops", "Seared Scallops"), "dessert": ("dacquoise", "Mocha Dacquoise")}
    tabs, panels = [], []
    for i, m in enumerate(d["menus"]):
        s = slug[m["name"]]
        tabs.append(
            f'<button class="tab" role="tab" id="tab-{s}" aria-controls="panel-{s}" data-hash="{s}" data-meta="{meta[s]}" aria-selected="{str(i == 0).lower()}">{e(m["name"].replace(" Menu", ""))}</button>'
        )
        secs = []
        for j, sec in enumerate(m["sections"]):
            items = []
            for it in sec["items"]:
                v = '<span class="mi__v" title="Vegetarian" aria-label="Vegetarian">V</span>' if it.get("vegetarian") else ""
                var = ""
                if it.get("variants"):
                    var = '<div class="mi__variants">' + "".join(f'<span>{e(x["name"])} <i class="it">${e(x["price"])}</i></span>' for x in it["variants"]) + "</div>"
                desc = f'<p class="mi__desc">{e(it["description"])}</p>' if it.get("description") else ""
                items.append(
                    f'<article class="mi" data-reveal><div class="mi__top"><h4 class="mi__name">{e(it["name"])}</h4>{v}<span class="mi__dots"></span><span class="mi__price">{price(it.get("price"))}</span></div>{desc}{var}</article>'
                )
            note = f'<p class="menu-section__note">{e(sec["note"])}</p>' if sec.get("note") else ""
            plate = ""
            if j == 0:
                pn, pc = plates[s]
                plate = f'<figure class="menu-plate img-reveal">{img(pn, pc, "(max-width: 900px) 0px, 22vw")}</figure>'
            secs.append(
                f'<section class="menu-section"><div class="menu-section__head"><h3>{e(sec["name"])}</h3>{note}{plate}</div><div class="menu-items">{"".join(items)}</div></section>'
            )
        h, p = intro[s]
        panels.append(
            f'<div class="menu-panel" role="tabpanel" id="panel-{s}" aria-labelledby="tab-{s}"{"" if i == 0 else " hidden"}>'
            f'<div class="menu-intro"><h2 class="h2">{h}</h2><p class="lead muted">{p}</p></div>{"".join(secs)}</div>'
        )
    return tabs, panels, d["updated"]


# ---------- Bar ----------
def render_bourbon():
    d = data("bar")
    groups = {}
    for b in d["bourbon"]:
        k = b["name"][0].upper()
        k = "#" if k.isdigit() else k
        groups.setdefault(k, []).append(b)
    out = []
    for k in sorted(groups, key=lambda x: (x != "#", x)):
        lis = "".join(
            f'<li{" class=\"is-house\"" if b["name"].startswith("Buck") else ""}><span>{e(b["name"])}</span><span>{(b["proof"] + "°") if b["proof"] else ""}</span></li>'
            for b in groups[k]
        )
        out.append(f'<div class="bourbon-letter"><h3>{e(k)}</h3><ul>{lis}</ul></div>')
    bib = "".join(f'<li><span>{e(b["name"])}</span><span>{(b["proof"] + "°") if b["proof"] else ""}</span></li>' for b in d["bottled_in_bond"])
    out.append(f'<div class="bourbon-letter"><h3>Bottled in Bond</h3><ul>{bib}</ul></div>')
    return "".join(out), len(d["bourbon"]) + len(d["bottled_in_bond"])


def render_wines():
    d = data("bar")
    blocks = []
    for w in d["wines"]:
        gs = []
        for g in w["groups"]:
            if not g["wines"]:
                continue
            lis = []
            for line in g["wines"]:
                producer, _, rest = line.partition(",")
                lis.append(f"<li><b>{e(producer.strip())}</b> <span>{e(rest.strip())}</span></li>")
            gs.append(f'<div class="wine-group" data-reveal><h4>{e(g["name"])}</h4><ul>{"".join(lis)}</ul></div>')
        blocks.append(f'<div class="wine-block"><h3 class="h3" style="margin-bottom:2rem"><em>{e(w["name"])}</em></h3>{"".join(gs)}</div>')
    return "".join(blocks)


def marquee():
    d = data("bar")
    picks = [b for b in d["bourbon"] if b["proof"]][::2]
    spans = "".join(f'<span>{e(b["name"])} <small>{b["proof"]}°</small></span>' for b in picks)
    return spans + spans.replace("<span>", '<span aria-hidden="true">')


# ---------- Pages ----------
def build():
    head, header, footer = partial("head"), partial("header"), partial("footer")
    tabs, panels, updated = render_menus()
    bourbon_html, bourbon_n = render_bourbon()
    gen = {
        "menu_tabs": "".join(tabs),
        "menu_panels": "".join(panels),
        "menu_updated": updated,
        "bourbon": bourbon_html,
        "bourbon_count": str(bourbon_n),
        "wines": render_wines(),
        "marquee": marquee(),
    }
    for path in sorted(glob.glob(os.path.join(SRC, "pages", "*.html"))):
        with open(path, encoding="utf-8") as f:
            raw = f.read()
        m = re.match(r"\s*<!--\s*(\{.*?\})\s*-->", raw, re.S)
        meta = json.loads(m.group(1)) if m else {}
        body = raw[m.end():] if m else raw
        name = os.path.basename(path)
        v = {
            "title": meta.get("title", "Buck's Restaurant and Bar"),
            "description": meta.get("description", ""),
            "canonical": meta.get("canonical", ""),
            "preload": "".join(f'<link rel="preload" as="image" href="assets/img/{p}">' for p in meta.get("preload", [])),
        }
        for key in ("menus", "bar", "private", "story", "visit"):
            v["nav_" + key] = ' aria-current="page"' if meta.get("nav") == key else ""
        doc = head + f'<body class="grain {meta.get("bodyClass", "")}">\n' + header + body + footer
        doc = re.sub(r"\[\[img:([^\]|]+)\|?([^\]|]*)\|?([^\]|]*)\|?([^\]|]*)\]\]", lambda mm: img(mm.group(1), mm.group(2), mm.group(3) or "100vw", mm.group(4)), doc)
        doc = re.sub(r"\[\[(\w+)\]\]", lambda mm: gen[mm.group(1)], doc)
        doc = re.sub(r"\{\{(\w+)\}\}", lambda mm: e(v.get(mm.group(1), ""), quote=True) if mm.group(1) in ("title", "description") else v.get(mm.group(1), mm.group(0)), doc)
        left = re.findall(r"\{\{\w+\}\}|\[\[[^\]]+\]\]", doc)
        if left:
            raise SystemExit(f"{name}: unresolved {left}")
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
            f.write(doc)
        print("built", name, f"{len(doc) // 1024}kB")


if __name__ == "__main__":
    build()
