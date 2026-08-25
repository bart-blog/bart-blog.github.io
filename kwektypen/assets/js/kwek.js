/* ==========================================================================
   KwekType – gedeelde onderdelen: opslag, navigatie, footer, hulpjes
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------- Hulpjes ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, klas, tekst) {
    var n = document.createElement(tag);
    if (klas) n.className = klas;
    if (tekst !== undefined) n.textContent = tekst;
    return n;
  }

  /* ---------------- Opslag ---------------- */
  var SLEUTEL = "kwektype.voortgang.v1";

  var standaard = {
    naam: "",
    levels: {},
    games: {},
    aanslagen: 0,
    seconden: 0,
    diplomaDatum: ""
  };

  function laad() {
    try {
      var ruw = window.localStorage.getItem(SLEUTEL);
      if (!ruw) return JSON.parse(JSON.stringify(standaard));
      var data = JSON.parse(ruw);
      Object.keys(standaard).forEach(function (k) {
        if (data[k] === undefined) data[k] = JSON.parse(JSON.stringify(standaard[k]));
      });
      return data;
    } catch (e) {
      return JSON.parse(JSON.stringify(standaard));
    }
  }

  function bewaar(data) {
    try { window.localStorage.setItem(SLEUTEL, JSON.stringify(data)); } catch (e) { /* privémodus */ }
  }

  var Opslag = {
    lees: laad,
    schrijf: bewaar,
    naam: function (nieuw) {
      var d = laad();
      if (nieuw === undefined) return d.naam;
      d.naam = nieuw; bewaar(d); return nieuw;
    },
    level: function (nr) {
      return laad().levels[String(nr)] || null;
    },
    bewaarLevel: function (nr, resultaat) {
      var d = laad();
      var huidig = d.levels[String(nr)] || { sterren: 0, wpm: 0, nauwkeurig: 0, klaar: false };
      d.levels[String(nr)] = {
        sterren: Math.max(huidig.sterren, resultaat.sterren),
        wpm: Math.max(huidig.wpm, resultaat.wpm),
        nauwkeurig: Math.max(huidig.nauwkeurig, resultaat.nauwkeurig),
        klaar: true
      };
      bewaar(d);
      return d.levels[String(nr)];
    },
    telOefening: function (aanslagen, seconden) {
      var d = laad();
      d.aanslagen += aanslagen;
      d.seconden += seconden;
      bewaar(d);
    },
    gameScore: function (spel, score) {
      var d = laad();
      if (!d.games[spel] || score > d.games[spel]) { d.games[spel] = score; bewaar(d); }
      return d.games[spel];
    },
    vrijgespeeld: function (nr) {
      if (nr <= 1) return true;
      var vorig = laad().levels[String(nr - 1)];
      return !!(vorig && vorig.klaar);
    },
    hoogsteVrij: function () {
      var d = laad(), hoogste = 1;
      for (var i = 1; i <= 17; i++) {
        if (i === 1 || (d.levels[String(i - 1)] && d.levels[String(i - 1)].klaar)) hoogste = i;
      }
      return hoogste;
    },
    totaalSterren: function () {
      var d = laad(), som = 0;
      Object.keys(d.levels).forEach(function (k) { som += d.levels[k].sterren || 0; });
      return som;
    },
    afgerond: function () {
      var d = laad();
      return !!(d.levels["17"] && d.levels["17"].klaar);
    },
    wissen: function () {
      try { window.localStorage.removeItem(SLEUTEL); } catch (e) { /* niets */ }
    }
  };

  /* ---------------- Logo & navigatie ---------------- */
  var LOGO_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true">' +
    '<circle cx="32" cy="32" r="30" fill="#2fa8e8"/>' +
    '<ellipse cx="30" cy="38" rx="19" ry="16" fill="#fff"/>' +
    '<circle cx="30" cy="22" r="13" fill="#ffc93c"/>' +
    '<circle cx="26" cy="19" r="3.4" fill="#17263f"/>' +
    '<circle cx="27" cy="18" r="1.1" fill="#fff"/>' +
    '<path d="M40 22c6 0 9 2 9 4s-3 4-9 4z" fill="#ff8a3d"/>' +
    '<path d="M14 44h30l-3 8H17z" fill="#ffc93c"/>' +
    '</svg>';

  var PAGINAS = [
    { href: "index.html", tekst: "Home" },
    { href: "cursus.html", tekst: "De cursus" },
    { href: "games.html", tekst: "Games" },
    { href: "kinderen.html", tekst: "Voor kinderen" },
    { href: "ouders.html", tekst: "Voor ouders" },
    { href: "scholen.html", tekst: "Voor scholen" },
    { href: "vragen.html", tekst: "Vragen" }
  ];

  function huidigePagina() {
    var pad = window.location.pathname.split("/").pop();
    return pad === "" ? "index.html" : pad;
  }

  function bouwHeader() {
    var houder = $("[data-header]");
    if (!houder) return;
    var nu = huidigePagina();

    var balk = el("div", "gratisbalk");
    balk.innerHTML = "<span>🎉 100% gratis · geen account nodig · gemaakt voor kinderen van 7 t/m 12 jaar</span>";

    var top = el("nav", "topbar");
    var container = el("div", "container");

    var logo = el("a", "logo");
    logo.href = "index.html";
    logo.innerHTML = LOGO_SVG + "<span>Kwek<em>Type</em></span>";

    var knop = el("button", "knop knop--geel nav-knop", "☰ Menu");
    knop.setAttribute("aria-expanded", "false");

    var lijst = el("ul", "hoofdnav");
    lijst.id = "hoofdnav";
    PAGINAS.forEach(function (p) {
      var li = el("li");
      var a = el("a", p.href === nu ? "actief" : "", p.tekst);
      a.href = p.href;
      if (p.href === nu) a.setAttribute("aria-current", "page");
      li.appendChild(a);
      lijst.appendChild(li);
    });
    var startLi = el("li");
    startLi.innerHTML = '<a class="knop knop--groen" href="cursus.html" style="color:#fff">Gratis starten</a>';
    lijst.appendChild(startLi);

    knop.setAttribute("aria-controls", "hoofdnav");
    knop.addEventListener("click", function () {
      var open = lijst.classList.toggle("open");
      knop.setAttribute("aria-expanded", String(open));
    });

    container.appendChild(logo);
    container.appendChild(knop);
    container.appendChild(lijst);
    top.appendChild(container);

    houder.appendChild(balk);
    houder.appendChild(top);
  }

  function bouwFooter() {
    var houder = $("[data-footer]");
    if (!houder) return;
    var jaar = new Date().getFullYear();
    houder.innerHTML =
      '<footer class="footer">' +
        '<div class="container">' +
          '<div class="raster raster--4">' +
            '<div>' +
              '<h4>KwekType</h4>' +
              '<p>De vrolijkste gratis typecursus van Nederland. Leer blind typen als junior verslaggever van de Kwekstad Koerier.</p>' +
            '</div>' +
            '<div><h4>Leren</h4><ul>' +
              '<li><a href="cursus.html">De cursus</a></li>' +
              '<li><a href="games.html">Typegames</a></li>' +
              '<li><a href="diploma.html">Je diploma</a></li>' +
            '</ul></div>' +
            '<div><h4>Info</h4><ul>' +
              '<li><a href="kinderen.html">Voor kinderen</a></li>' +
              '<li><a href="ouders.html">Voor ouders</a></li>' +
              '<li><a href="scholen.html">Voor scholen</a></li>' +
              '<li><a href="vragen.html">Veelgestelde vragen</a></li>' +
            '</ul></div>' +
            '<div><h4>Goed om te weten</h4><ul>' +
              '<li>✅ Helemaal gratis</li>' +
              '<li>✅ Geen inloggen</li>' +
              '<li>✅ Geen reclame</li>' +
              '<li>✅ Werkt op laptop en pc</li>' +
            '</ul></div>' +
          '</div>' +
          '<div class="footer__onder">' +
            '<p>© ' + jaar + ' KwekType · Een vrolijk oefenproject. Je voortgang blijft op je eigen computer staan.</p>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }

  /* ---------------- Confetti ---------------- */
  function confetti(aantal) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var kleuren = ["#ffc93c", "#2fa8e8", "#4fc26b", "#ff7aa8", "#8b6ede", "#ff8a3d"];
    for (var i = 0; i < (aantal || 60); i++) {
      var stuk = el("div", "confetti");
      stuk.style.left = Math.random() * 100 + "vw";
      stuk.style.background = kleuren[Math.floor(Math.random() * kleuren.length)];
      stuk.style.animationDuration = (1.6 + Math.random() * 1.8) + "s";
      stuk.style.animationDelay = (Math.random() * 0.6) + "s";
      document.body.appendChild(stuk);
      (function (n) { setTimeout(function () { n.remove(); }, 4200); })(stuk);
    }
  }

  /* ---------------- Sterretjes ---------------- */
  function sterrenHtml(aantal, totaal) {
    var uit = "";
    for (var i = 1; i <= (totaal || 3); i++) {
      uit += '<span class="' + (i <= aantal ? "aan" : "") + '">★</span>';
    }
    return uit;
  }

  window.Kwek = {
    $: $, $$: $$, el: el,
    Opslag: Opslag,
    confetti: confetti,
    sterrenHtml: sterrenHtml,
    LOGO_SVG: LOGO_SVG
  };

  document.addEventListener("DOMContentLoaded", function () {
    bouwHeader();
    bouwFooter();
  });
})();
