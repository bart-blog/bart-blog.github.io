/* ==========================================================================
   KwekType – het toetsenbord op het scherm + de handen
   ========================================================================== */
(function () {
  "use strict";

  var D = window.KwekData;

  function Toetsenbord(houder) {
    this.houder = houder;
    this.toetsen = {};
    this.bouw();
  }

  Toetsenbord.prototype.bouw = function () {
    var self = this;
    var kb = document.createElement("div");
    kb.className = "kb";

    D.RIJEN.forEach(function (rij) {
      var rijEl = document.createElement("div");
      rijEl.className = "kb__rij";
      rij.forEach(function (toets) {
        var t = document.createElement("div");
        t.className = "toets" + (toets.thuis ? " thuisrij" : "");
        t.textContent = toets.label || toets.t;
        t.dataset.vinger = toets.v;
        t.dataset.hand = toets.h;
        if (toets.breed) t.dataset.breed = String(toets.breed);
        rijEl.appendChild(t);
        self.toetsen[toets.t] = t;
      });
      kb.appendChild(rijEl);
    });

    this.houder.appendChild(kb);

    var legenda = document.createElement("div");
    legenda.className = "vingerlegenda";
    legenda.innerHTML =
      '<span><i style="background:var(--v-pink)"></i>pink</span>' +
      '<span><i style="background:var(--v-ring)"></i>ringvinger</span>' +
      '<span><i style="background:var(--v-midden)"></i>middelvinger</span>' +
      '<span><i style="background:var(--v-wijs)"></i>wijsvinger</span>' +
      '<span><i style="background:var(--v-duim)"></i>duim</span>';
    this.houder.appendChild(legenda);
  };

  Toetsenbord.prototype.wisMarkering = function () {
    Object.keys(this.toetsen).forEach(function (k) {
      this.toetsen[k].classList.remove("doel", "actief-vinger");
    }, this);
  };

  /* Markeer welke toets (en eventueel shift) je nu moet indrukken */
  Toetsenbord.prototype.markeer = function (teken) {
    this.wisMarkering();
    var info = D.infoVoorTeken(teken);
    if (!info) return null;
    var toets = this.toetsen[info.t];
    if (toets) {
      toets.classList.add("doel", "actief-vinger");
    }
    if (D.heeftShiftNodig(teken)) {
      var shiftToets = info.h === "l" ? this.toetsen["shiftr"] : this.toetsen["shift"];
      if (shiftToets) shiftToets.classList.add("doel", "actief-vinger");
    }
    return info;
  };

  /* Korte flits als iemand een toets indrukt */
  Toetsenbord.prototype.flits = function (teken, goed) {
    var info = D.infoVoorTeken(teken);
    if (!info) return;
    var toets = this.toetsen[info.t];
    if (!toets) return;
    var klas = goed ? "aangeslagen" : "mis";
    toets.classList.add(klas);
    setTimeout(function () { toets.classList.remove(klas); }, 130);
  };

  /* ------------------------------------------------------------------
     Handen
     ------------------------------------------------------------------ */
  var VINGERS = ["pink", "ring", "midden", "wijs"];

  function handSvg(hand) {
    var spiegel = hand === "r" ? ' transform="scale(-1,1) translate(-130,0)"' : "";
    var vingers = "";
    var hoogtes = { pink: 42, ring: 62, midden: 70, wijs: 58 };
    VINGERS.forEach(function (naam, i) {
      var x = 14 + i * 24;
      var h = hoogtes[naam];
      var y = 78 - h;
      vingers += '<rect class="vinger" data-vinger="' + naam + '" x="' + x + '" y="' + y +
        '" width="18" height="' + (h + 12) + '" rx="9"/>';
    });
    vingers += '<rect class="vinger" data-vinger="duim" x="104" y="70" width="18" height="40" rx="9" transform="rotate(28 113 90)"/>';
    return '<svg class="hand" viewBox="0 0 130 130" role="img" aria-label="' +
      (hand === "l" ? "linkerhand" : "rechterhand") + '">' +
      '<g' + spiegel + '>' +
      '<rect x="10" y="70" width="100" height="52" rx="24" fill="#ffe2c2" stroke="#d9a86f" stroke-width="3"/>' +
      vingers +
      "</g></svg>";
  }

  function Handen(houder) {
    houder.classList.add("handen");
    houder.innerHTML = handSvg("l") + handSvg("r");
    this.links = houder.children[0];
    this.rechts = houder.children[1];
  }

  Handen.prototype.markeer = function (teken) {
    [this.links, this.rechts].forEach(function (svg) {
      Array.prototype.forEach.call(svg.querySelectorAll(".vinger"), function (v) {
        v.classList.remove("aan");
      });
    });
    var info = D.infoVoorTeken(teken);
    if (!info) return;
    var svg = info.h === "l" ? this.links : this.rechts;
    var doel = svg.querySelector('[data-vinger="' + info.v + '"]');
    if (doel) doel.classList.add("aan");
    if (D.heeftShiftNodig(teken)) {
      var ander = info.h === "l" ? this.rechts : this.links;
      var pink = ander.querySelector('[data-vinger="pink"]');
      if (pink) pink.classList.add("aan");
    }
  };

  window.KwekToetsenbord = Toetsenbord;
  window.KwekHanden = Handen;
})();
