# Website von Dosano

Statische Website für die iPhone-App Dosano: Startseite, Datenschutzerklärung, Impressum
und Support. Kein Build-Schritt, kein Backend, keine externen Requests (Schriften liegen
im Repo, keine Cookies, kein Tracking).

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Startseite (erzeugt aus `index.src.html` mit `tools/build_neu.py`) |
| `alt.html` | Erste Fassung der Startseite, zum Vergleichen (`noindex`) |
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

Gekauft bei Cloudflare. Die Datei `CNAME` (Inhalt `dosano.app`), `sitemap.xml`, `robots.txt`
und die vollen Adressen in `canonical`, `hreflang` und `og:image` sind schon im Repo.

1. Cloudflare, dosano.app, DNS, Records (laut GitHub-Dokumentation
   "Managing a custom domain for your GitHub Pages site"):
   - vier `A`-Einträge, Name `@`: 185.199.108.153, 185.199.109.153,
     185.199.110.153, 185.199.111.153
   - vier `AAAA`-Einträge, Name `@`: 2606:50c0:8000::153, 2606:50c0:8001::153,
     2606:50c0:8002::153, 2606:50c0:8003::153
   - ein `CNAME`-Eintrag, Name `www`, Ziel `antolam73.github.io`
   - bei allen "Proxy status" auf "DNS only" (graue Wolke), sonst kann GitHub kein
     Zertifikat ausstellen
2. GitHub, Repo, Settings, Pages, "Custom domain" `dosano.app` eintragen, Save.
3. Warten, bis der DNS-Check grün ist und das Zertifikat da ist (bis zu einer Stunde),
   dann "Enforce HTTPS" anhaken. `.app` funktioniert nur mit HTTPS.
4. Empfohlen: Domain im GitHub-Konto bestätigen (Konto-Settings, Pages, "Add a domain",
   TXT-Eintrag bei Cloudflare anlegen), damit niemand sonst sie nutzen kann.

## Startseite bearbeiten

Die Startseite `index.html` wird aus `index.src.html` erzeugt. Schriftzug und Kopf von
"Heute" stehen nur einmal in `tools/build_neu.py`. Nach jeder Änderung an
`index.src.html`:

```bash
python3 tools/build_neu.py
```

Das Skript hängt außerdem an alle Einbindungen von CSS, JS und Symbolen eine Versionsnummer
(`?v=...`), damit Browser nach einer Änderung nicht die alte Datei aus dem Zwischenspeicher
nehmen. Deshalb nach jeder Änderung an CSS oder JS einmal ausführen.

Styles in `assets/css/site.css` und `assets/css/neu.css`, Bewegung in `assets/js/neu.js`.
Die alte Adresse `neu.html` leitet zur Startseite weiter. Die erste Fassung liegt als
`alt.html` daneben.

## Vor dem Start und zum Start

Solange Dosano nicht im App Store ist, steht in `tools/build_neu.py` `LAUNCHED = False`.
Dann sind alle Knöpfe "Im App Store laden" ausgeblendet, an ihrer Stelle steht
"Erinnere mich zum Start" (öffnet eine fertige E-Mail an dosano.help@gmail.com).

Zum Start:
1. App-ID eintragen (siehe oben, `id0000000000` ersetzen).
2. In `tools/build_neu.py` `LAUNCHED = True` setzen.
3. `python3 tools/build_neu.py` ausführen, committen und pushen.
