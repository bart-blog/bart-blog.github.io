/* ==========================================================================
   KwekType – cursusoverzicht en lesspeler
   ========================================================================== */
(function () {
  "use strict";

  var K = window.Kwek, D = window.KwekData;
  var $ = K.$;

  function kies(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var overzicht, lesScherm, typer, toetsenbord, handen;
  var huidigLevel = null, oefeningen = [], stap = 0;
  var levelStats = { goed: 0, fouten: 0, seconden: 0 };

  /* ---------------- Overzicht ---------------- */
  function tekenOverzicht() {
    var houder = $("#levels");
    houder.innerHTML = "";
    var voortgang = 0;

    D.LEVELS.forEach(function (level) {
      var opgeslagen = K.Opslag.level(level.nr);
      var vrij = K.Opslag.vrijgespeeld(level.nr);
      if (opgeslagen && opgeslagen.klaar) voortgang++;

      var knop = document.createElement("button");
      knop.type = "button";
      knop.className = "level" + (vrij ? "" : " level--op-slot") + (opgeslagen && opgeslagen.klaar ? " level--klaar" : "");
      if (!vrij) knop.disabled = true;

      var toetsen = (level.nieuw.length ? level.nieuw : ["alles"]).map(function (t) {
        var label = t === " " ? "spatie" : t === "shift" ? "⇧" : t;
        return '<span class="level__toets">' + label + "</span>";
      }).join("");

      knop.innerHTML =
        '<span class="level__nr">' + (level.examen ? "🏆" : "Level " + level.nr) + "</span>" +
        "<h3>" + level.titel + "</h3>" +
        '<div class="level__toetsen">' + toetsen + "</div>" +
        '<div class="level__meta">' +
          '<span class="sterren">' + K.sterrenHtml(opgeslagen ? opgeslagen.sterren : 0) + "</span>" +
          "<span>" + (opgeslagen && opgeslagen.wpm ? opgeslagen.wpm * 5 + " a/min" : "") + "</span>" +
          "<span>" + (vrij ? (opgeslagen && opgeslagen.klaar ? "Nog een keer" : "Starten →") : "🔒 op slot") + "</span>" +
        "</div>";

      knop.addEventListener("click", function () { if (vrij) startLevel(level.nr); });
      houder.appendChild(knop);
    });

    var procent = Math.round((voortgang / D.LEVELS.length) * 100);
    $("#voortgangsbalk").style.width = procent + "%";
    $("#voortgang-tekst").textContent = voortgang + " van de " + D.LEVELS.length + " levels klaar (" + procent + "%)";
    $("#sterren-totaal").innerHTML = "⭐ " + K.Opslag.totaalSterren() + " / " + (D.LEVELS.length * 3) + " sterren";

    var naam = K.Opslag.naam();
    $("#naam-invoer").value = naam;
    $("#welkom").textContent = naam ? "Hoi " + naam + "!" : "Hoi verslaggever!";

    var diplomaKnop = $("#diploma-knop");
    if (K.Opslag.afgerond()) {
      diplomaKnop.hidden = false;
    } else {
      diplomaKnop.hidden = true;
    }
  }

  /* ---------------- Les starten ---------------- */
  function startLevel(nr) {
    huidigLevel = D.LEVELS[nr - 1];
    oefeningen = D.maakOefeningen(nr);
    stap = 0;
    levelStats = { goed: 0, fouten: 0, seconden: 0 };

    overzicht.hidden = true;
    lesScherm.hidden = false;
    window.scrollTo(0, 0);

    $("#les-titel").textContent = (huidigLevel.examen ? "Examen: " : "Level " + nr + ": ") + huidigLevel.titel;
    $("#les-verhaal").textContent = huidigLevel.verhaal;

    if (!toetsenbord) {
      toetsenbord = new window.KwekToetsenbord($("#toetsenbord"));
      handen = new window.KwekHanden($("#handen"));
      typer = new window.KwekTyper({
        tekstEl: $("#tekst"),
        toetsenbord: toetsenbord,
        handen: handen,
        tipEl: $("#tip"),
        onUpdate: toonMeters,
        onKlaar: stapKlaar
      });
    }
    tekenStippen();
    laadStap();
  }

  function tekenStippen() {
    var houder = $("#stappen");
    houder.innerHTML = "";
    oefeningen.forEach(function (_, i) {
      var stip = document.createElement("span");
      stip.className = "stip" + (i < stap ? " klaar" : i === stap ? " bezig" : "");
      houder.appendChild(stip);
    });
  }

  function laadStap() {
    var oefening = oefeningen[stap];
    $("#oefen-uitleg").textContent = "Stap " + (stap + 1) + " van " + oefeningen.length + " · " + oefening.uitleg;
    tekenStippen();
    typer.start(oefening.tekst);
    toonMeters(typer.stats());
  }

  function toonMeters(stats) {
    $("#meter-apm").textContent = stats.apm;
    $("#meter-goed").textContent = stats.nauwkeurig + "%";
    $("#meter-fouten").textContent = stats.fouten;
  }

  /* ---------------- Stap afgerond ---------------- */
  function stapKlaar(stats) {
    levelStats.goed += stats.goed;
    levelStats.fouten += stats.fouten;
    levelStats.seconden += stats.seconden;
    K.Opslag.telOefening(stats.goed, stats.seconden);

    var laatste = stap === oefeningen.length - 1;
    if (!laatste) {
      toonPaneel({
        titel: kies(["Goed gedaan!", "Toppie!", "Lekker bezig!", "Wat een tempo!", "Kwek! Netjes!"]),
        tekst: "Stap " + (stap + 1) + " is klaar.",
        stats: stats,
        sterren: window.KwekSterren(stats, huidigLevel.nr),
        knoppen: [
          { tekst: "Volgende stap →", klas: "knop--groen", actie: function () { stap++; sluitPaneel(); laadStap(); } },
          { tekst: "Nog een keer", klas: "knop--wit", actie: function () { sluitPaneel(); laadStap(); } }
        ]
      });
      return;
    }

    // Level afgerond: gemiddelde over alle stappen
    var minuten = levelStats.seconden / 60;
    var apm = levelStats.seconden > 0.4 ? Math.round(levelStats.goed / minuten) : 0;
    var totaal = levelStats.goed + levelStats.fouten;
    var nauwkeurig = totaal ? Math.round((levelStats.goed / totaal) * 100) : 100;
    var eind = { apm: apm, wpm: Math.round(apm / 5), nauwkeurig: nauwkeurig, fouten: levelStats.fouten, goed: levelStats.goed };
    var sterren = window.KwekSterren(eind, huidigLevel.nr);

    var geslaagd = true;
    if (huidigLevel.examen) {
      geslaagd = nauwkeurig >= 90 && apm >= 100;
    }

    if (geslaagd) {
      K.Opslag.bewaarLevel(huidigLevel.nr, { sterren: sterren, wpm: eind.wpm, nauwkeurig: nauwkeurig });
      K.confetti(sterren === 3 ? 90 : 50);
    }

    var knoppen = [];
    if (huidigLevel.examen && geslaagd) {
      knoppen.push({ tekst: "🏅 Naar mijn diploma", klas: "knop--groen", actie: function () { window.location.href = "diploma.html"; } });
    } else if (huidigLevel.nr < D.LEVELS.length && geslaagd) {
      knoppen.push({
        tekst: "Volgend level →", klas: "knop--groen",
        actie: function () { sluitPaneel(); startLevel(huidigLevel.nr + 1); }
      });
    }
    knoppen.push({ tekst: "Nog een keer", klas: "knop--wit", actie: function () { sluitPaneel(); startLevel(huidigLevel.nr); } });
    knoppen.push({ tekst: "Naar het overzicht", klas: "knop--wit", actie: function () { sluitPaneel(); naarOverzicht(); } });

    toonPaneel({
      titel: geslaagd
        ? (huidigLevel.examen ? "🏆 Geslaagd!" : "Level " + huidigLevel.nr + " gehaald!")
        : "Bijna! Probeer het nog een keer",
      tekst: geslaagd
        ? (sterren === 3 ? "Perfect gedaan, je bent een echte typeheld." : "Haal 95% goed én meer snelheid voor drie sterren.")
        : "Voor je diploma heb je minstens 100 aanslagen per minuut en 90% goed nodig.",
      stats: eind,
      sterren: geslaagd ? sterren : 0,
      knoppen: knoppen
    });
  }

  /* ---------------- Paneel ---------------- */
  function toonPaneel(opties) {
    var overlay = $("#overlay");
    var paneel = $("#paneel");
    paneel.innerHTML =
      "<h2>" + opties.titel + "</h2>" +
      '<div class="sterren-groot">' + K.sterrenHtml(opties.sterren) + "</div>" +
      "<p>" + opties.tekst + "</p>" +
      '<div class="stat-rij">' +
        "<div><b>" + opties.stats.apm + "</b><small>aanslagen/min</small></div>" +
        "<div><b>" + opties.stats.nauwkeurig + "%</b><small>goed getypt</small></div>" +
        "<div><b>" + opties.stats.fouten + "</b><small>foutjes</small></div>" +
      "</div>" +
      '<div class="paneel__knoppen"></div>';

    var knopHouder = paneel.querySelector(".paneel__knoppen");
    opties.knoppen.forEach(function (k) {
      var b = document.createElement("button");
      b.className = "knop " + (k.klas || "");
      b.textContent = k.tekst;
      b.addEventListener("click", k.actie);
      knopHouder.appendChild(b);
    });
    overlay.hidden = false;
    var eerste = knopHouder.querySelector("button");
    if (eerste) eerste.focus();
  }

  function sluitPaneel() { $("#overlay").hidden = true; }

  function naarOverzicht() {
    if (typer) typer.stop();
    lesScherm.hidden = true;
    overzicht.hidden = false;
    tekenOverzicht();
    window.scrollTo(0, 0);
  }

  /* ---------------- Start ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    overzicht = $("#overzicht");
    lesScherm = $("#les");

    tekenOverzicht();

    $("#naam-invoer").addEventListener("input", function () {
      K.Opslag.naam(this.value.slice(0, 24));
      $("#welkom").textContent = this.value ? "Hoi " + this.value + "!" : "Hoi verslaggever!";
    });

    $("#terug-knop").addEventListener("click", naarOverzicht);
    $("#opnieuw-knop").addEventListener("click", function () { laadStap(); });

    $("#wis-knop").addEventListener("click", function () {
      if (window.confirm("Weet je het zeker? Al je sterren en levels verdwijnen dan.")) {
        K.Opslag.wissen();
        tekenOverzicht();
      }
    });

    $("#doorgaan-knop").addEventListener("click", function () {
      startLevel(K.Opslag.hoogsteVrij());
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !lesScherm.hidden) naarOverzicht();
    });

    var parameters = new URLSearchParams(window.location.search);
    var gevraagd = parseInt(parameters.get("level"), 10);
    if (gevraagd && K.Opslag.vrijgespeeld(gevraagd)) startLevel(gevraagd);
  });
})();
