"""Baut die Startseiten index.html (Deutsch) und en/index.html (Englisch) aus
index.src.html und en/index.src.html: setzt den Schriftzug und den Kopf von "Heute"
(Bogen mit Skala und Pillenplaner) an den markierten Stellen ein, damit sie nur
einmal gepflegt werden müssen. Texte im Kopf wie in der App (Deutsch / Englisch).

    python3 tools/build_neu.py
"""
import hashlib
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def wordmark(prefix: str) -> str:
    return (f'<span class="wordmark"><img class="wm-d" src="{prefix}assets/img/logo-96.png" alt="" '
            'width="23" height="24"><span class="wm-rest">osano</span></span>')


# Texte im Kopf von "Heute", wie in der App (Localizable.xcstrings)
TEXT = {
    'de': {'take': 'Fach 21:00 nehmen: Metformin 500 mg', 'kicker': 'Heute · Samstag', 'date': '21. November',
           'days': 'Tage in Folge', 'wd': 'SA', 'day': '21.<br>Nov.', 'morning': '7:00', 'evening': '21:00',
           'hint': 'Zum Nehmen ein Fach nach oben wischen'},
    'en': {'take': 'Take the 9:00 PM compartment: Metformin 500 mg', 'kicker': 'Today · Saturday', 'date': 'November 21',
           'days': 'days in a row', 'wd': 'SAT', 'day': 'Nov<br>21', 'morning': '7:00 AM', 'evening': '9:00 PM',
           'hint': 'Swipe a compartment up to take it'},
}


def ticks() -> str:
    # Skala wie in StreakArc: 45 Striche, jeder vierte länger.
    out = []
    for i in range(45):
        a = math.radians(200 - 220 * i / 44)
        long_ = i % 4 == 0
        r1 = 96 + 7 + 6
        r2 = r1 + (7 if long_ else 4)
        cls = ' class="l"' if long_ else ''
        out.append(f'<line x1="{120 + r1 * math.cos(a):.2f}" y1="{120 - r1 * math.sin(a):.2f}" '
                   f'x2="{120 + r2 * math.cos(a):.2f}" y2="{120 - r2 * math.sin(a):.2f}"{cls}/>')
    return ''.join(out)


def arc_path(r: float) -> str:
    a0, a1 = math.radians(200), math.radians(-20)
    return (f'M{120 + r * math.cos(a0):.2f} {120 - r * math.sin(a0):.2f} '
            f'A{r} {r} 0 1 1 {120 + r * math.cos(a1):.2f} {120 - r * math.sin(a1):.2f}')


def today_top(key: str, shown: float, interactive: bool, lang: str = 'de', prefix: str = '') -> str:
    T = TEXT[lang]
    main = arc_path(96)
    sheen = arc_path(98.8)
    off = f'{1 - shown:.3f}'
    sheen_off = f'{1 - max(0, shown - 0.015):.3f}'
    comp_evening = (
        '<button class="comp-box" type="button" id="demoComp">'
        f'<span class="visually-hidden">{T["take"]}</span>'
        if interactive else '<span class="comp-box">'
    )
    close = '</button>' if interactive else '</span>'
    return f'''<div class="t2-head" aria-hidden="true">
            <div><div class="t2-kicker">{T["kicker"]}</div><div class="t2-date">{T["date"]}</div></div>
            <span class="t2-gear"><svg><use href="assets/img/icons.svg#i-gear-fill"/></svg></span>
          </div>
          <div class="arc2" aria-hidden="true" data-arc="{key}" data-shown="{shown}">
            <svg viewBox="0 0 240 172">
              <defs>
                <linearGradient id="arcGrad-{key}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5FB878"/><stop offset="1" stop-color="#74D68E"/></linearGradient>
                <radialGradient id="tipGrad-{key}"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#74D68E" stop-opacity="0"/></radialGradient>
              </defs>
              <g class="ticks">{ticks()}</g>
              <path class="gutter" d="{main}" fill="none" stroke-linecap="round"/>
              <path class="track" d="{main}" fill="none" stroke-linecap="round"/>
              <path class="fill" d="{main}" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="{off}" style="stroke:url(#arcGrad-{key})"/>
              <path class="sheen" d="{sheen}" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="{sheen_off}"/>
              <path class="glow-all" d="{main}" fill="none" stroke-linecap="round"/>
              <path class="sweep" d="{main}" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="0 2"/>
              <circle class="tip" r="18" cx="120" cy="24" style="fill:url(#tipGrad-{key})"/>
            </svg>
            <div class="arc2-num">7</div>
            <div class="arc2-label">{T["days"]}</div>
          </div>
          <div class="planner">
            <div class="daytab" aria-hidden="true"><b>{T["wd"]}</b><small>{T["day"]}</small></div>
            <div class="comp is-done" aria-hidden="true" style="--lid:#8DAA74">
              <span class="comp-box"><span class="well"></span><span class="lid2" style="--open:1"></span></span>
              <span class="comp-time">{T["morning"]}</span>
            </div>
            <div class="comp is-current" style="--lid:#8DAA74">
              {comp_evening}<span class="well" aria-hidden="true"></span><i class="p drop" style="left:44%;bottom:12px;--r:20deg;--d:500ms" aria-hidden="true"></i><span class="check" aria-hidden="true"><svg><use href="assets/img/icons.svg#i-tick"/></svg></span><span class="lid2" aria-hidden="true"></span>{close}
              <span class="comp-time" aria-hidden="true">{T["evening"]}</span>
            </div>
          </div>
          <div class="t2-hint" aria-hidden="true"><svg><use href="assets/img/icons.svg#i-hand-draw"/></svg>{T["hint"]}</div>'''.replace('href="assets/', f'href="{prefix}assets/')


def build(src_name: str, out_name: str, lang: str, prefix: str) -> None:
    src = (ROOT / src_name).read_text(encoding='utf-8')
    src = src.replace('<!--WORDMARK-->', wordmark(prefix))
    src = src.replace('<!--TODAYTOP:demo-->', today_top('demo', 0.5, True, lang, prefix))
    src = src.replace('<!--TODAYTOP:custom-->', today_top('custom', 0.5, False, lang, prefix))
    header = f'<!-- Erzeugt von tools/build_neu.py aus {src_name}. Bitte dort ändern. -->\n'
    (ROOT / out_name).write_text(src.replace('<!doctype html>\n', '<!doctype html>\n' + header, 1), encoding='utf-8')


def main() -> None:
    build('index.src.html', 'index.html', 'de', '')
    build('en/index.src.html', 'en/index.html', 'en', '../')


# Ist Dosano im App Store? False: App-Store-Knöpfe ausgeblendet, "Erinnere mich zum Start"
# an ihrer Stelle. Zum Start auf True setzen, App-ID eintragen und neu bauen.
LAUNCHED = False

ASSETS = ['assets/css/site.css', 'assets/css/neu.css', 'assets/js/neu.js', 'assets/js/site.js', 'assets/img/icons.svg']
PAGES = ['index.html', 'alt.html', 'datenschutz.html', 'impressum.html', 'support.html', '404.html',
         'en/index.html', 'en/privacy.html', 'en/legal-notice.html', 'en/support.html']


def stamp() -> None:
    """Hängt an jede Einbindung von CSS, JS und Symbolen eine Versionsnummer aus dem Inhalt
    der Datei (?v=...). So lädt der Browser nach einer Änderung sicher die neue Datei statt
    einer alten aus seinem Zwischenspeicher."""
    versions = {a: hashlib.sha1((ROOT / a).read_bytes()).hexdigest()[:8] for a in ASSETS}
    for page in PAGES:
        path = ROOT / page
        html = path.read_text(encoding='utf-8')
        for asset, v in versions.items():
            html = re.sub(re.escape(asset) + r'(\?v=[0-9a-f]+)?(?=["#])', f'{asset}?v={v}', html)
        html = re.sub(r'<html lang="(\w+)"( class="vor-start")?>',
                      lambda m: f'<html lang="{m.group(1)}"' + ('' if LAUNCHED else ' class="vor-start"') + '>', html, count=1)
        path.write_text(html, encoding='utf-8')


if __name__ == '__main__':
    main()
    stamp()
