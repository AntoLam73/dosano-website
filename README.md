# Website von Dosano

Statische Website für die iPhone-App Dosano: Startseite, Datenschutzerklärung, Impressum
und Support. Kein Build-Schritt, kein Backend, keine externen Requests (Schriften liegen
im Repo, keine Cookies, kein Tracking).

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Startseite: Hero mit Vorführung, Funktionen, Ansichten, Datenschutz-Versprechen, FAQ, Download |
| `datenschutz.html` | Datenschutzerklärung (App und Website) |
| `impressum.html` | Impressum nach § 5 DDG |
| `support.html` | Support-Seite (Support-URL für App Store Connect) |
| `en/index.html` | Englische Startseite (vorbereitet, gekürzt) |
| `404.html` | Fehlerseite für GitHub Pages |
| `assets/css/site.css` | Alle Styles, Farben und Schriften wie in der App ("Seriös") |
| `assets/js/site.js` | Vorführung im Hero und sanftes Erscheinen der Bildschirme |
| `assets/img/icons.svg` | Eigene Symbole |
| `assets/fonts/` | IBM Plex Serif und Sans (SIL Open Font License) |

## Vor der Veröffentlichung ausfüllen

- Platzhalter in `impressum.html` und `datenschutz.html` (gelb markiert, `class="placeholder"`).
- App-Store-Link: überall steht `id0000000000`. Ersetzen mit:

  ```bash
  grep -rl "id0000000000" --include=*.html . | xargs sed -i '' 's/id0000000000/id1234567890/g'
  ```

  (Auf Linux ohne `''` nach `-i`.) Danach in `index.html` das Meta-Tag `apple-itunes-app`
  einkommentieren.

## Lokal ansehen

```bash
python3 -m http.server 8000
```

Dann http://localhost:8000 öffnen.

## Veröffentlichen mit GitHub Pages

1. Auf GitHub im Repo: Settings, Pages.
2. Source: "Deploy from a branch", Branch `main`, Ordner `/ (root)`.
3. Nach ein bis zwei Minuten ist die Seite unter `https://antolam73.github.io/dosano-website/` erreichbar.

### Eigene Domain dosano.app

1. Domain kaufen. `.app`-Domains funktionieren nur mit HTTPS, das stellt GitHub Pages
   automatisch bereit.
2. Beim Domain-Anbieter DNS-Einträge setzen (laut GitHub-Dokumentation "Managing a custom
   domain for your GitHub Pages site"): vier `A`-Einträge für `dosano.app` auf
   185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 und einen
   `CNAME`-Eintrag `www` auf `antolam73.github.io`.
3. In Settings, Pages unter "Custom domain" `dosano.app` eintragen und "Enforce HTTPS" anhaken.
   GitHub legt dabei die Datei `CNAME` im Repo an.
4. Danach `og:image` auf die volle Adresse `https://dosano.app/assets/img/og.png` umstellen
   und eine `sitemap.xml` ergänzen.

## Zweite Fassung mit mehr Bewegung: `neu.html`

`neu.html` ist eine neue Startseite zum Vergleichen, die bisherige `index.html` bleibt
unverändert. Sie wird aus `neu.src.html` erzeugt (Schriftzug und Kopf von "Heute" stehen
nur einmal in `tools/build_neu.py`):

```bash
python3 tools/build_neu.py
```

Styles in `assets/css/neu.css`, Bewegung in `assets/js/neu.js`. Die Seite ist mit
`noindex` markiert, solange sie nur zum Anschauen da ist.
