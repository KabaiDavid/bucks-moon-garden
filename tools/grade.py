"""Grade + export Buck's photography into the Moon Garden look."""
import sys, os
from PIL import Image, ImageOps, ImageEnhance, ImageFilter, ImageChops
import numpy as np
RAW, OUT = sys.argv[1], sys.argv[2]
# name, source id, grade, widths, crop box (fractions l,t,r,b) or None
JOBS = [
 ("hero-garden",   "629e6c_de61c2e33f9d4940a26b00a47660328d~mv2.jpg", "night", [1280,2500], None),
 ("garden-wide",   "629e6c_4ea7c7c4b16b418b9672cdd9553308e7~mv2.jpg", "night", [800,1200], None),
 ("lilies",        "629e6c_a3664eec056a49e08ebe5e02edee0ed4~mv2.jpg", "night", [800,1200], None),
 ("bar-flowers-2", "629e6c_eb44c6fc84d146d1b4b7fc841ddbcbf5~mv2.jpg", "night", [800,1200], None),
 ("bar-flowers-3", "629e6c_5045cb5c77c242e59139df8a96df2af8~mv2.jpg", "night", [800,1200], None),
 ("bourbon-wall",  "629e6c_08548c6e13d34f2d88f7ecdf52a9a428~mv2.jpg", "night", [800,1200], None),
 ("china-rose",    "629e6c_9d76de0bd9804fabb44148acd01b3490~mv2.jpg", "warm",  [800,1200], None),
 ("china-black",   "3dae30_ecaabe11988847bebe8debb23b368408~mv2.jpg", "warm",  [800,1400], (0,0,1,1)),
 ("teapots",       "3dae30_b1bdd19f42644cde8109a8981b723bc6~mv2.jpg", "warm",  [700,1200], None),
 ("lamb",          "3dae30_23c400b11378496ea4943e7ce0d7097e~mv2.jpg", "food",  [800,1500], None),
 ("shrimp",        "3dae30_3bbf4dcc768542caa7e8f18ab46693d1~mv2.jpg", "food",  [800,1500], None),
 ("cobb",          "3dae30_4f6478e6599b45a484745dc62947e7f1~mv2.jpg", "food",  [800,1400], None),
 ("pork-chop",     "3dae30_595d6c1d63aa450f89b655cd316e2e8c~mv2.jpg", "food",  [700,1200], None),
 ("beet-salad",    "3dae30_646f0fe1c9af43d98b432c26c1e57739~mv2.jpg", "food",  [700,1200], None),
 ("lobster",       "3dae30_65336e4f3bed46ceaabd1e996ffc6338~mv2.jpeg","food",  [540], None),
 ("creme-brulee",  "3dae30_9de160cba22e438b91bcc0d1315707fd~mv2.jpg", "food",  [800,1400], None),
 ("curry-chicken", "3dae30_a7033950499a42989628c1a425bb1ee3~mv2.jpg", "food",  [700,1200], None),
 ("crab-cakes",    "3dae30_ad48eaf8625841ba8bfb15fb94a7568f~mv2.jpg", "food",  [800,1400], None),
 ("scallops",      "3dae30_af5ca82d09044af79d427286f36ec078~mv2.jpg", "food",  [800,1400], None),
 ("apple-orchard", "3dae30_c3b4f4a2a41d48698ea19a5c0c77563b~mv2.jpeg","food",  [700,1200], None),
 ("meatballs",     "3dae30_ecda6c055eaf409da0d99fa8ed1565bc~mv2.jpg", "food",  [700,1200], None),
 ("dacquoise",     "629e6c_211961566a02449c8dba2294d1834ce3~mv2.jpg", "food",  [800,1200], None),
 ("founder",       "3dae30_ee7cc3be9d1343129a97702d4baf81a6~mv2.jpg", "warm",  [600], None),
 ("exterior",      "629e6c_f1d6bcd4e486481e9cad6dac7bd74225~mv2.jpg", "dusk",  [800,1200], None),
 ("patio",         "629e6c_fde90ef857404205a9dbb651c244fd26~mv2.jpg", "dusk",  [800,1200], None),
]
GREEN = np.array([16,37,27],dtype=np.float32)/255.
CHAMP = np.array([255,226,180],dtype=np.float32)/255.
def grade(im, kind):
    a = np.asarray(im.convert('RGB')).astype(np.float32)/255.
    h,w,_ = a.shape
    lum = (0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2])[...,None]
    p = dict(night=(0.78,1.18,0.55,0.32,0.82), warm=(0.92,1.08,0.30,0.18,0.92),
             food=(0.97,1.06,0.18,0.10,0.97), dusk=(0.72,1.15,0.65,0.30,0.75))[kind]
    expo, contrast, shadow_tint, hi_warm, sat = p
    # saturation
    a = lum + (a-lum)*sat
    # contrast around mid
    a = np.clip((a-0.5)*contrast+0.5,0,1)*expo
    lum = (0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2])[...,None]
    # shadows toward moon-garden green, highlights toward champagne
    sh = np.clip(1-lum*2.2,0,1)**1.5
    a = a*(1-sh*shadow_tint) + GREEN*sh*shadow_tint*1.6
    hi = np.clip((lum-0.55)*2.2,0,1)
    a = a*(1-hi*hi_warm) + (a*CHAMP)*hi*hi_warm + 0.0
    # vignette
    yy,xx = np.mgrid[0:h,0:w].astype(np.float32)
    d = np.sqrt(((xx-w/2)/(w/2))**2+((yy-h/2)/(h/2))**2)
    vig_strength = dict(night=0.55,warm=0.28,food=0.14,dusk=0.5)[kind]
    v = 1 - vig_strength*np.clip(d-0.45,0,1)**1.6
    a = a*v[...,None]
    return Image.fromarray((np.clip(a,0,1)*255).astype(np.uint8))
os.makedirs(OUT, exist_ok=True)
for name, src, kind, widths, crop in JOBS:
    im = Image.open(os.path.join(RAW,src)); im = ImageOps.exif_transpose(im).convert('RGB')
    base = max(widths)
    if im.width > base*1.0: im = im.resize((base, round(im.height*base/im.width)), Image.LANCZOS)
    g = grade(im, kind)
    for wdt in widths:
        o = g if g.width<=wdt else g.resize((wdt, round(g.height*wdt/g.width)), Image.LANCZOS)
        fn = os.path.join(OUT, f"{name}-{wdt}.webp")
        o.save(fn, 'WEBP', quality=78, method=6)
    print(name, g.size, [f"{os.path.getsize(os.path.join(OUT,f'{name}-{w}.webp'))//1024}k" for w in widths])
