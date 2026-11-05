// Mock für den Browser-Test: Spotify-API, Web-Playback-SDK und Sprachausgabe
// werden ersetzt, damit die App ohne Token, ohne Premium und ohne Widevine
// bis in den echten Wiedergabe-Zustand läuft.
(() => {
  if (!location.search.includes("notoken")) {
    localStorage.setItem("mod.tokens", JSON.stringify({
      access: "mock-access", refresh: "mock-refresh", exp: Date.now() + 3600e3
    }));
  } else {
    localStorage.removeItem("mod.tokens");
  }
  localStorage.setItem("mod.announce", "1");
  localStorage.removeItem("mod.years");

  const IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  const pl = (id, name, owner) => ({
    id, name, owner: { display_name: owner || "Christian" },
    images: [{ url: IMG }, { url: IMG }], tracks: { total: 3 }
  });

  const PLAYLISTS = [
    pl("p1", "[MOD] Favoriten"),
    pl("p2", "[MOD] Abendessen mit Jazz"),
    pl("p3", "[MOD] Hörspiel-Sammlung"),
    pl("p6", "[MOD] Gesperrt (403)"),
    pl("p7", "[MOD] Nur ohne Feldfilter"),
    pl("p4", "[KPM] KinderPlayer – darf nicht erscheinen"),
    pl("p5", "Ohne Präfix – darf nicht erscheinen")
  ];

  const SEARCH = [
    pl("s1", "Jazz fürs Kochen", "Spotify"),
    pl("s2", "French Cafe Jazz", "Somebody")
  ];

  const TRACKS = [
    { id: "t1", name: "Take Five", duration_ms: 324000,
      artists: [{ name: "The Dave Brubeck Quartet" }],
      album: { id: "a1", name: "Time Out", release_date: "1959-12-14", album_type: "album", images: [{ url: IMG }], artists: [{ name: "x" }] } },
    { id: "t2", name: "So What", duration_ms: 545000,
      artists: [{ name: "Miles Davis" }],
      album: { id: "a2", name: "Kind of Blue", release_date: "1959-08-17", album_type: "album", images: [{ url: IMG }], artists: [{ name: "x" }] } },
    { id: "t3", name: "Bohemian Rhapsody", duration_ms: 354000,
      artists: [{ name: "Queen" }],
      album: { id: "a3", name: "Greatest Hits", release_date: "2011-01-01", album_type: "compilation", images: [{ url: IMG }], artists: [{ name: "x" }] } }
  ];

  window.__fetches = [];
  window.__spoken = [];
  window.__calls = [];

  const json = (data) => new Response(JSON.stringify(data), {
    status: 200, headers: { "Content-Type": "application/json" }
  });

  window.fetch = async (url, opts) => {
    const u = String(url);
    window.__fetches.push(u.split("?")[0] + (u.includes("?") ? "?" + u.split("?")[1].slice(0, 40) : ""));
    if (u.includes("accounts.spotify.com/api/token")) {
      return json({ access_token: "mock-access-2", refresh_token: "mock-refresh-2", expires_in: 3600 });
    }
    if (u.includes("api.spotify.com/v1/me/playlists")) return json({ items: PLAYLISTS });
    if (u.includes("api.spotify.com/v1/search")) return json({ playlists: { items: SEARCH } });
    if (u.includes("api.spotify.com/v1/tracks/")) {
      const id = u.split("/tracks/")[1].split("?")[0];
      const t = TRACKS.find(x => x.id === id);
      return t ? json(t) : new Response("not found", { status: 404 });
    }
    if (u.includes("/tracks?")) {
      if (u.includes("playlists/p6")) {
        return new Response(JSON.stringify({ error: { status: 403, message: "Forbidden" } }),
          { status: 403, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes("playlists/p7")) {
        if (u.includes("fields=")) {
          return new Response(JSON.stringify({ error: { status: 400, message: "Invalid request" } }),
            { status: 400, headers: { "Content-Type": "application/json" } });
        }
        return json({ items: TRACKS.slice(0, 2).map(t => ({ track: t })) });
      }
      if (u.includes("playlists/p3")) {
        return json({ items: [
          { episode: { id: "e1", name: "Folge 12: Der Zoo", duration_ms: 1800000, release_date: "2024-03-02",
            images: [{ url: IMG }], show: { name: "Benjamin Blümchen", publisher: "Kiddinx" } } }
        ] });
      }
      return json({ items: TRACKS.map(t => ({ track: t })) });
    }
    if (u.includes("/me/player/play")) return new Response(null, { status: 204 });
    if (u.includes("musicbrainz.org")) {
      return json({ recordings: [{ "first-release-date": "1975-10-31" }] });
    }
    return json({});
  };

  // Sprachausgabe (Attribute auf window sind read-only -> defineProperty)
  window.__voices = [{ lang: "de-DE", name: "Mock German" }];
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      cancel() {},
      getVoices() { return window.__voices; },
      speak(u) {
        window.__spoken.push(u.text);
        setTimeout(() => { if (u.onend) u.onend(); }, 40);
      }
    }
  });
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    configurable: true,
    value: function (text) { this.text = text; this.lang = ""; this.rate = 1; this.pitch = 1; this.voice = null; this.onend = null; this.onerror = null; }
  });

  // Web-Playback-SDK
  class MockPlayer {
    constructor(opts) { this.opts = opts; this._l = {}; window.__player = this; }
    addListener(ev, fn) { (this._l[ev] = this._l[ev] || []).push(fn); return true; }
    emit(ev, payload) { (this._l[ev] || []).forEach(fn => fn(payload)); }
    connect() { setTimeout(() => this.emit("ready", { device_id: "dev-mock" }), 20); return true; }
    disconnect() {}
    pause() { window.__calls.push("pause"); return Promise.resolve(); }
    resume() { window.__calls.push("resume"); return Promise.resolve(); }
    seek(ms) { window.__calls.push("seek:" + ms); return Promise.resolve(); }
    togglePlay() { window.__calls.push("togglePlay"); return Promise.resolve(); }
    nextTrack() { window.__calls.push("next"); return Promise.resolve(); }
    previousTrack() { window.__calls.push("prev"); return Promise.resolve(); }
  }
  window.Spotify = { Player: MockPlayer };

  // Trackwechsel simulieren
  window.__track = (id, name, artists) => window.__player.emit("player_state_changed", {
    paused: false,
    track_window: { current_track: { id, name, artists: artists.map(a => ({ name: a })) } }
  });
})();
