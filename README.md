# Spotify Moderator

Spielt eine Spotify-Playlist im Browser und sagt **vor jedem Titel** an:
„Titel“ von Interpret, Jahr. Playlists kommen entweder aus der **Spotify-Suche**
oder aus der eigenen Bibliothek über das **Präfix-System** (wie KinderPlayer).

Single-File-App: `index.html`, kein Framework, kein Build.

## Einmalige Einrichtung

1. **Spotify-Dashboard** → App `KinderPlayer` (Client-ID `a6c7e7f802d043c29cce919b9e0c7f45`)
   → *Redirect URIs* ergänzen:
   ```
   https://chr-wa.github.io/SpotifyModerator
   ```
   **Ohne Schrägstrich am Ende** – Spotify vergleicht zeichengenau, und genau so ist
   sie im Dashboard eingetragen. GitHub Pages leitet danach auf die Slash-Variante um
   und behält `?code=…` bei.
   (Ohne diesen Eintrag antwortet Spotify mit `redirect_uri: Not matching configuration`.)
2. **Repo anlegen**: `chr-wa/SpotifyModerator` (public, ohne README) und den
   Hermes-SSH-Key wieder als Deploy-Key/Account-Key hinterlegen.
3. Push auf `main` → GitHub Pages ist nach ~60–90 s live.

## Playlists

Die App zeigt alle eigenen Playlists, deren Name mit **`[MOD]`** beginnt – das
Präfix ist nur zur Auswahl da und wird in der Anzeige abgeschnitten. Alles ohne
Präfix erscheint nicht; dafür gibt es die Suche oben.

Bewusst **nicht** die KinderPlayer-Präfixe (`[KPM]`/`[KPH]`/`[KPP]`): das hier ist
ein eigenes Projekt mit eigenem Namensraum.

## Wiedergabe und Ansage

- **Web-Playback-SDK** (braucht Spotify **Premium** und einen sicheren Kontext/HTTPS).
- Bei jedem Titelwechsel: Wiedergabe **pausieren** → Ansage → auf 0 zurückspulen → weiter.
  Kein Ducking, kein zweiter Lautsprecher — die Ansage kommt aus derselben Quelle.
- Jahre kommen aus `album.release_date`. Bei Compilations/Singles ist das
  unzuverlässig („Bohemian Rhapsody“ steht auf *Greatest Hits* mit 2011), deshalb
  fragt die App für alles, was kein `album_type == "album"` ist, **MusicBrainz**
  nach dem Erstveröffentlichungsjahr — gedrosselt auf 1 Request/s und in
  `localStorage` gecacht.
- Der Aus-Schalter (Lautsprecher-Symbol) schaltet die Ansage stumm, ohne die
  Wiedergabe zu unterbrechen.

## Bekannte Grenzen

- **Verzögerung:** Spotify hat keinen Webhook für Titelwechsel; das SDK meldet
  1–3 s nach Start. Deshalb pausieren wir erst dann — die ersten Sekunden eines
  Titels sind also schon gelaufen und werden nach der Ansage wiederholt.
- **iOS/Safari:** `speechSynthesis` verlangt dort eine Nutzergeste. Der Knopf
  „Stimme testen“ entsperrt die Ausgabe; ob automatische Ansagen danach
  durchlaufen, ist auf dem iPad nicht garantiert.
- **Maximal 100 Titel** pro Playlist (keine Pagination).
- Läuft nur, solange der Tab offen und im Vordergrund ist (Browser drosselt
  Hintergrund-Tabs).

## Test

`test/mock.js` ersetzt Spotify-API, Web-Playback-SDK und Sprachausgabe. Damit
läuft die App ohne Token, ohne Premium und ohne Widevine bis in den echten
Wiedergabe-Zustand (verwendet vom Browser-Test, siehe Skill `spotify-moderator`).

Lokal starten:

```bash
python3 -m http.server 8090 --bind 0.0.0.0
# http://127.0.0.1:8090/  (Loopback gilt als sicherer Kontext)
```
