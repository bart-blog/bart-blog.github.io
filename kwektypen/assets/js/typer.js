/* ==========================================================================
   KwekType – de typemotor
   Toont de tekst, luistert naar toetsen, telt snelheid en fouten.
   ========================================================================== */
(function () {
  "use strict";

  var D = window.KwekData;

  function Typer(opties) {
    this.tekstEl = opties.tekstEl;
    this.toetsenbord = opties.toetsenbord || null;
    this.handen = opties.handen || null;
    this.tipEl = opties.tipEl || null;
    this.onUpdate = opties.onUpdate || function () {};
    this.onKlaar = opties.onKlaar || function () {};
    this.onFout = opties.onFout || function () {};

    this.tekst = "";
    this.index = 0;
    this.fouten = 0;
    this.goed = 0;
    this.actief = false;
    this.startTijd = 0;
    this.laatsteTijd = 0;
    this.actieveTijd = 0;
    this.foutBijHuidig = false;
    this.spans = [];
    this.invoer = null;

    this._koppel();
  }

  Typer.prototype._koppel = function () {
    var self = this;

    // Onzichtbaar invoerveld zodat tablets ook een toetsenbord openen
    var invoer = document.createElement("input");
    invoer.type = "text";
    invoer.className = "verborgen-invoer";
    invoer.setAttribute("aria-label", "Typveld");
    invoer.autocapitalize = "none";
    invoer.autocomplete = "off";
    invoer.spellcheck = false;
    document.body.appendChild(invoer);
    this.invoer = invoer;

    invoer.addEventListener("input", function () {
      var waarde = invoer.value;
      invoer.value = "";
      for (var i = 0; i < waarde.length; i++) self.verwerk(waarde[i]);
    });

    this._keydown = function (e) {
      if (!self.actief) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Tab" || e.key === "Escape") return;
      if (e.key === "Backspace") {
        e.preventDefault();
        self.terug();
        return;
      }
      if (e.key && e.key.length === 1) {
        e.preventDefault();
        self.verwerk(e.key);
      } else if (e.key === "Enter") {
        e.preventDefault();
        self.verwerk(" ");
      }
    };
    document.addEventListener("keydown", this._keydown);
  };

  Typer.prototype.opruimen = function () {
    document.removeEventListener("keydown", this._keydown);
    if (this.invoer) this.invoer.remove();
  };

  Typer.prototype.start = function (tekst) {
    this.tekst = tekst;
    this.index = 0;
    this.fouten = 0;
    this.goed = 0;
    this.actieveTijd = 0;
    this.startTijd = 0;
    this.laatsteTijd = 0;
    this.foutBijHuidig = false;
    this.actief = true;
    this._render();
    this._markeer();
    this.onUpdate(this.stats());
    if (this.invoer) {
      try { this.invoer.focus({ preventScroll: true }); } catch (e) { this.invoer.focus(); }
    }
  };

  Typer.prototype.stop = function () {
    this.actief = false;
  };

  Typer.prototype._render = function () {
    var self = this;
    this.tekstEl.innerHTML = "";
    this.spans = [];
    this.tekst.split("").forEach(function (teken) {
      var span = document.createElement("span");
      span.className = "teken" + (teken === " " ? " spatie" : "");
      span.textContent = teken === " " ? "\u00a0" : teken;
      self.tekstEl.appendChild(span);
      self.spans.push(span);
    });
  };

  Typer.prototype._markeer = function () {
    this.spans.forEach(function (s, i) {
      s.classList.toggle("nu", i === this.index);
    }, this);
    var teken = this.tekst[this.index];
    if (this.toetsenbord) this.toetsenbord.markeer(teken);
    if (this.handen) this.handen.markeer(teken);
    if (this.tipEl) this.tipEl.textContent = this.tipVoor(teken);
  };

  Typer.prototype.tipVoor = function (teken) {
    if (teken === undefined) return "";
    var info = D.infoVoorTeken(teken);
    if (!info) return "";
    if (teken === " ") return "Spatie: tik met je duim.";
    var naam = D.VINGERNAAM[info.h + "-" + info.v] || "je vinger";
    var zichtbaar = teken === " " ? "spatie" : teken;
    var tip = "Typ de " + zichtbaar + " met je " + naam + ".";
    if (D.heeftShiftNodig(teken)) {
      tip += " Houd de shift " + (info.h === "l" ? "rechts" : "links") + " ingedrukt met je andere pink.";
    }
    return tip;
  };

  Typer.prototype._tik = function () {
    var nu = Date.now();
    if (!this.startTijd) {
      this.startTijd = nu;
    } else {
      var verschil = nu - this.laatsteTijd;
      // pauzes langer dan 4 seconden tellen niet mee
      this.actieveTijd += Math.min(verschil, 4000);
    }
    this.laatsteTijd = nu;
  };

  Typer.prototype.verwerk = function (teken) {
    if (!this.actief) return;
    var verwacht = this.tekst[this.index];
    if (verwacht === undefined) return;

    this._tik();

    if (teken === verwacht) {
      this.goed++;
      var span = this.spans[this.index];
      span.classList.remove("nu", "fout");
      span.classList.add("gedaan");
      if (this.toetsenbord) this.toetsenbord.flits(teken, true);
      this.index++;
      this.foutBijHuidig = false;
      if (this.index >= this.tekst.length) {
        this.actief = false;
        if (this.toetsenbord) this.toetsenbord.wisMarkering();
        this.onUpdate(this.stats());
        this.onKlaar(this.stats());
        return;
      }
      this._markeer();
    } else {
      if (!this.foutBijHuidig) {
        this.fouten++;
        this.foutBijHuidig = true;
      }
      this.spans[this.index].classList.add("fout");
      if (this.toetsenbord) this.toetsenbord.flits(teken, false);
      this.tekstEl.classList.remove("schud");
      void this.tekstEl.offsetWidth;
      this.tekstEl.classList.add("schud");
      this.onFout(verwacht, teken);
    }
    this.onUpdate(this.stats());
  };

  Typer.prototype.terug = function () {
    if (this.index === 0) return;
    this.spans[this.index].classList.remove("nu", "fout");
    this.index--;
    this.spans[this.index].classList.remove("gedaan", "fout");
    this.foutBijHuidig = false;
    this._markeer();
    this.onUpdate(this.stats());
  };

  Typer.prototype.stats = function () {
    var seconden = this.actieveTijd / 1000;
    var minuten = seconden / 60;
    var aanslagen = this.goed;
    var apm = minuten > 0.02 ? Math.round(aanslagen / minuten) : 0;
    var totaal = this.goed + this.fouten;
    var nauwkeurig = totaal > 0 ? Math.round((this.goed / totaal) * 100) : 100;
    return {
      apm: apm,
      wpm: Math.round(apm / 5),
      nauwkeurig: nauwkeurig,
      fouten: this.fouten,
      goed: this.goed,
      seconden: seconden,
      voortgang: this.tekst.length ? this.index / this.tekst.length : 0
    };
  };

  /* Sterren: 1 = uitgespeeld, 2 = netjes, 3 = netjes én vlot */
  function sterrenVoor(stats, levelNr) {
    var drempel = levelNr >= 15 ? 110 : levelNr >= 10 ? 90 : levelNr >= 5 ? 70 : 55;
    var sterren = 1;
    if (stats.nauwkeurig >= 90) sterren = 2;
    if (stats.nauwkeurig >= 95 && stats.apm >= drempel) sterren = 3;
    return sterren;
  }

  window.KwekTyper = Typer;
  window.KwekSterren = sterrenVoor;
})();
