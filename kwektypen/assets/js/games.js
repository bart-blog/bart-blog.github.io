/* ==========================================================================
   KwekType – de games: Woordenregen, Kwekrace en Letterjacht
   ========================================================================== */
(function () {
  "use strict";

  var K = window.Kwek, D = window.KwekData;
  var $ = K.$;
  var actiefSpel = null;

  function woordenpool() {
    return D.gameWoorden(K.Opslag.hoogsteVrij());
  }

  function toonSpel(titel, uitleg) {
    $("#keuze").hidden = true;
    $("#spel").hidden = false;
    $("#spel-titel").textContent = titel;
    $("#spel-uitleg").textContent = uitleg;
    $("#spel-vlak").innerHTML = "";
    $("#spel-hud").innerHTML = "";
    window.scrollTo({ top: $("#spel").offsetTop - 80, behavior: "smooth" });
  }

  function stopSpel() {
    if (actiefSpel && actiefSpel.stop) actiefSpel.stop();
    actiefSpel = null;
    $("#spel").hidden = true;
    $("#keuze").hidden = false;
    tekenScores();
  }

  function hud(velden) {
    $("#spel-hud").innerHTML = velden.map(function (v) {
      return '<div class="meter"><b id="' + v.id + '">' + v.waarde + "</b><small>" + v.label + "</small></div>";
    }).join("");
  }

  function eindscherm(spel, titel, tekst, score, opnieuw) {
    var beste = K.Opslag.gameScore(spel, score);
    var overlay = $("#overlay"), paneel = $("#paneel");
    paneel.innerHTML =
      "<h2>" + titel + "</h2><p>" + tekst + "</p>" +
      '<div class="stat-rij"><div><b>' + score + "</b><small>jouw score</small></div>" +
      "<div><b>" + beste + "</b><small>jouw record</small></div></div>" +
      '<div class="paneel__knoppen"></div>';
    var houder = paneel.querySelector(".paneel__knoppen");

    var b1 = document.createElement("button");
    b1.className = "knop knop--groen";
    b1.textContent = "Nog een keer!";
    b1.addEventListener("click", function () { overlay.hidden = true; opnieuw(); });

    var b2 = document.createElement("button");
    b2.className = "knop knop--wit";
    b2.textContent = "Ander spel";
    b2.addEventListener("click", function () { overlay.hidden = true; stopSpel(); });

    houder.appendChild(b1);
    houder.appendChild(b2);
    overlay.hidden = false;
    b1.focus();
  }

  /* ==================================================================
     1. Woordenregen
     ================================================================== */
  function woordenregen() {
    toonSpel("🌧️ Woordenregen", "Typ de woorden weg voordat ze de grond raken. Je hebt drie levens!");
    hud([
      { id: "wr-score", waarde: 0, label: "punten" },
      { id: "wr-woorden", waarde: 0, label: "woorden" },
      { id: "wr-levens", waarde: "❤️❤️❤️", label: "levens" }
    ]);

    var vlak = document.createElement("div");
    vlak.className = "speelveld";
    $("#spel-vlak").appendChild(vlak);

    var pool = woordenpool();
    var vallend = [];
    var score = 0, gehaald = 0, levens = 3;
    var laatsteSpawn = 0, spawnTijd = 2200, snelheid = 26;
    var vorigeTijd = 0, loopId = null, gestopt = false;

    function spawn() {
      var woord = pool[Math.floor(Math.random() * pool.length)];
      var el = document.createElement("div");
      el.className = "regenwoord";
      el.textContent = woord;
      vlak.appendChild(el);
      var breedte = el.offsetWidth || 90;
      var maxX = Math.max(vlak.clientWidth - breedte - 10, 10);
      var x = 10 + Math.random() * maxX;
      el.style.left = x + "px";
      el.style.top = "-40px";
      vallend.push({ el: el, woord: woord, getypt: 0, y: -40 });
    }

    function tekenWoord(item) {
      item.el.innerHTML = '<span class="hit">' + item.woord.slice(0, item.getypt) + "</span>" +
        item.woord.slice(item.getypt);
      item.el.classList.toggle("actief", item.getypt > 0);
    }

    function verwijder(item) {
      item.el.remove();
      vallend.splice(vallend.indexOf(item), 1);
    }

    function verliesLeven() {
      levens--;
      $("#wr-levens").textContent = "❤️".repeat(Math.max(levens, 0)) || "💀";
      if (levens <= 0) einde();
    }

    function loop(tijd) {
      if (gestopt) return;
      if (!vorigeTijd) vorigeTijd = tijd;
      var dt = Math.min((tijd - vorigeTijd) / 1000, 0.1);
      vorigeTijd = tijd;

      if (tijd - laatsteSpawn > spawnTijd) {
        spawn();
        laatsteSpawn = tijd;
        spawnTijd = Math.max(750, spawnTijd - 45);
        snelheid = Math.min(90, snelheid + 1.1);
      }

      for (var i = vallend.length - 1; i >= 0; i--) {
        var item = vallend[i];
        item.y += snelheid * dt;
        item.el.style.top = item.y + "px";
        if (item.y > vlak.clientHeight - 30) {
          verwijder(item);
          verliesLeven();
        }
      }
      loopId = window.requestAnimationFrame(loop);
    }

    function toets(e) {
      if (gestopt) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!e.key || e.key.length !== 1) return;
      e.preventDefault();
      var letter = e.key.toLowerCase();

      var doel = null;
      for (var i = 0; i < vallend.length; i++) {
        if (vallend[i].getypt > 0) { doel = vallend[i]; break; }
      }
      if (!doel) {
        var laagste = -Infinity;
        vallend.forEach(function (item) {
          if (item.woord[0] === letter && item.y > laagste) { laagste = item.y; doel = item; }
        });
      }
      if (!doel) return;

      if (doel.woord[doel.getypt] === letter) {
        doel.getypt++;
        tekenWoord(doel);
        score += 5;
        if (doel.getypt >= doel.woord.length) {
          score += 25;
          gehaald++;
          verwijder(doel);
          $("#wr-woorden").textContent = gehaald;
        }
      } else {
        doel.getypt = 0;
        tekenWoord(doel);
        score = Math.max(0, score - 5);
      }
      $("#wr-score").textContent = score;
    }

    function einde() {
      gestopt = true;
      window.cancelAnimationFrame(loopId);
      document.removeEventListener("keydown", toets);
      eindscherm("regen", "Spel voorbij!", "Je typte " + gehaald + " woorden weg.", score, woordenregen);
    }

    document.addEventListener("keydown", toets);
    loopId = window.requestAnimationFrame(loop);

    actiefSpel = {
      stop: function () {
        gestopt = true;
        window.cancelAnimationFrame(loopId);
        document.removeEventListener("keydown", toets);
      }
    };
  }

  /* ==================================================================
     2. Kwekrace
     ================================================================== */
  function kwekrace() {
    toonSpel("🏁 Kwekrace", "Typ de zin sneller dan Kwek de eend. Fouten kosten tijd!");
    hud([
      { id: "kr-apm", waarde: 0, label: "aanslagen/min" },
      { id: "kr-goed", waarde: "100%", label: "goed" }
    ]);

    var level = D.LEVELS[K.Opslag.hoogsteVrij() - 1];
    var zin = null;
    var letters = level.letters.concat([" "]);
    var kandidaten = D.ZINNEN.filter(function (z) {
      for (var i = 0; i < z.length; i++) if (letters.indexOf(z[i]) === -1) return false;
      return true;
    });
    zin = kandidaten.length ? D.kies(kandidaten) : D.gameWoorden(K.Opslag.hoogsteVrij()).slice(0, 8).join(" ");

    var vlak = $("#spel-vlak");
    vlak.innerHTML =
      '<div class="racebaan">' +
        '<div class="racebaan__label">Jij</div>' +
        '<div class="racebaan__spoor"><div class="racer racer--jij" id="racer-jij">🏃</div></div>' +
        '<div class="racebaan__label">Kwek</div>' +
        '<div class="racebaan__spoor"><div class="racer" id="racer-kwek">🦆</div></div>' +
      "</div>" +
      '<div class="tekst" id="race-tekst" style="margin-top:1rem"></div>' +
      '<p class="tiphulp" id="race-tip"></p>';

    var kwekApm = 150 + Math.min(K.Opslag.hoogsteVrij(), 12) * 5;
    var duur = (zin.length / kwekApm) * 60 * 1000;
    var start = Date.now();
    var timerId = null, klaar = false;

    var typer = new window.KwekTyper({
      tekstEl: $("#race-tekst"),
      tipEl: $("#race-tip"),
      onUpdate: function (s) {
        $("#kr-apm").textContent = s.apm;
        $("#kr-goed").textContent = s.nauwkeurig + "%";
        zetRacer($("#racer-jij"), s.voortgang);
      },
      onKlaar: function (s) {
        if (klaar) return;
        klaar = true;
        afsluiten();
        var score = Math.round(s.apm * (s.nauwkeurig / 100));
        eindscherm("race",
          "🏆 Jij wint!",
          "Je typte " + s.apm + " aanslagen per minuut met " + s.nauwkeurig + "% goed.",
          score, kwekrace);
      }
    });

    function zetRacer(el, deel) {
      var spoor = el.parentNode;
      var max = spoor.clientWidth - 40;
      el.style.left = Math.min(deel, 1) * max + "px";
    }

    timerId = window.setInterval(function () {
      var deel = (Date.now() - start) / duur;
      zetRacer($("#racer-kwek"), deel);
      if (deel >= 1 && !klaar) {
        klaar = true;
        var s = typer.stats();
        afsluiten();
        eindscherm("race", "🦆 Kwek was sneller!",
          "Kwek typte " + kwekApm + " aanslagen per minuut. Jij haalde er " + s.apm + ". Volgende keer pak je hem!",
          Math.round(s.apm * (s.nauwkeurig / 100)), kwekrace);
      }
    }, 100);

    function afsluiten() {
      window.clearInterval(timerId);
      typer.stop();
      typer.opruimen();
    }

    typer.start(zin);

    actiefSpel = { stop: function () { klaar = true; afsluiten(); } };
  }

  /* ==================================================================
     3. Letterjacht
     ================================================================== */
  function letterjacht() {
    toonSpel("🔦 Letterjacht", "Letters springen uit de holen. Tik ze weg met de juiste vinger. Je hebt 45 seconden!");
    hud([
      { id: "lj-score", waarde: 0, label: "punten" },
      { id: "lj-raak", waarde: 0, label: "raak" },
      { id: "lj-tijd", waarde: 45, label: "seconden" }
    ]);

    var level = D.LEVELS[K.Opslag.hoogsteVrij() - 1];
    var letters = level.letters.length ? level.letters : ["f", "j"];

    var vlak = $("#spel-vlak");
    vlak.innerHTML = '<div class="jacht-vak" id="jacht-vak"></div>';
    var vak = $("#jacht-vak");
    var gaten = [];
    for (var i = 0; i < 20; i++) {
      var gat = document.createElement("div");
      gat.className = "jacht-gat";
      vak.appendChild(gat);
      gaten.push({ el: gat, letter: null, timer: null });
    }

    var score = 0, raak = 0, tijd = 45, gestopt = false;
    var popTimer = null, klokTimer = null, popSnelheid = 1100;

    function pop() {
      if (gestopt) return;
      var leeg = gaten.filter(function (g) { return !g.letter; });
      if (leeg.length) {
        var gat = leeg[Math.floor(Math.random() * leeg.length)];
        var letter = letters[Math.floor(Math.random() * letters.length)];
        gat.letter = letter;
        gat.el.textContent = letter;
        gat.el.classList.add("vol");
        gat.timer = window.setTimeout(function () { leegmaken(gat); }, 2600);
      }
      popSnelheid = Math.max(420, popSnelheid - 25);
      popTimer = window.setTimeout(pop, popSnelheid);
    }

    function leegmaken(gat) {
      window.clearTimeout(gat.timer);
      gat.letter = null;
      gat.el.textContent = "";
      gat.el.classList.remove("vol", "raak");
    }

    function toets(e) {
      if (gestopt) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!e.key || e.key.length !== 1) return;
      e.preventDefault();
      var letter = e.key.toLowerCase();
      var gevonden = null;
      for (var i = 0; i < gaten.length; i++) {
        if (gaten[i].letter === letter) { gevonden = gaten[i]; break; }
      }
      if (gevonden) {
        score += 10;
        raak++;
        gevonden.el.classList.add("raak");
        var gat = gevonden;
        window.setTimeout(function () { leegmaken(gat); }, 120);
        $("#lj-raak").textContent = raak;
      } else {
        score = Math.max(0, score - 3);
      }
      $("#lj-score").textContent = score;
    }

    function einde() {
      gestopt = true;
      window.clearTimeout(popTimer);
      window.clearInterval(klokTimer);
      document.removeEventListener("keydown", toets);
      eindscherm("jacht", "⏰ Tijd om!", "Je ving " + raak + " letters.", score, letterjacht);
    }

    klokTimer = window.setInterval(function () {
      tijd--;
      $("#lj-tijd").textContent = tijd;
      if (tijd <= 0) einde();
    }, 1000);

    document.addEventListener("keydown", toets);
    pop();

    actiefSpel = {
      stop: function () {
        gestopt = true;
        window.clearTimeout(popTimer);
        window.clearInterval(klokTimer);
        document.removeEventListener("keydown", toets);
      }
    };
  }

  /* ==================================================================
     Scores tonen
     ================================================================== */
  function tekenScores() {
    var d = K.Opslag.lees();
    var el = $("#records");
    if (!el) return;
    el.innerHTML =
      "<li>🌧️ Woordenregen: <strong>" + (d.games.regen || 0) + "</strong></li>" +
      "<li>🏁 Kwekrace: <strong>" + (d.games.race || 0) + "</strong></li>" +
      "<li>🔦 Letterjacht: <strong>" + (d.games.jacht || 0) + "</strong></li>";
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!$("#keuze")) return;
    $("#start-regen").addEventListener("click", woordenregen);
    $("#start-race").addEventListener("click", kwekrace);
    $("#start-jacht").addEventListener("click", letterjacht);
    $("#stop-knop").addEventListener("click", stopSpel);
    $("#niveau-tekst").textContent = "Je speelt met de letters uit level " + K.Opslag.hoogsteVrij() + ".";
    tekenScores();
  });
})();
