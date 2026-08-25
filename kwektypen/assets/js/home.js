/* ==========================================================================
   KwekType – proefles op de homepagina
   ========================================================================== */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var K = window.Kwek, $ = K.$;
    var tekstEl = $("#demo-tekst");
    if (!tekstEl) return;

    var toetsenbord = new window.KwekToetsenbord($("#demo-toetsenbord"));
    var handen = new window.KwekHanden($("#demo-handen"));

    var proeflessen = [
      "fff jjj fjf jfj fj jf ffj jjf",
      "jij fietst fijn",
      "kwek de eend leest de krant"
    ];
    var beurt = 0;

    var typer = new window.KwekTyper({
      tekstEl: tekstEl,
      toetsenbord: toetsenbord,
      handen: handen,
      tipEl: $("#demo-tip"),
      onUpdate: function (s) {
        $("#demo-apm").textContent = s.apm;
        $("#demo-goed").textContent = s.nauwkeurig + "%";
        $("#demo-fouten").textContent = s.fouten;
      },
      onKlaar: function (s) {
        K.confetti(40);
        beurt++;
        if (beurt < proeflessen.length) {
          $("#demo-uitleg").innerHTML = "Top! " + s.apm + " aanslagen per minuut. Hier komt het volgende zinnetje 👇";
          setTimeout(function () { typer.start(proeflessen[beurt]); }, 900);
        } else {
          $("#demo-uitleg").innerHTML =
            "🎉 Proefles gehaald met <strong>" + s.apm + " aanslagen per minuut</strong> en <strong>" +
            s.nauwkeurig + "% goed</strong>. Ga door naar de echte cursus!";
          beurt = 0;
          setTimeout(function () { typer.start(proeflessen[0]); }, 2500);
        }
      }
    });

    var hint = document.createElement("p");
    hint.className = "klik-hint";
    hint.textContent = "👆 Klik op de tekst hierboven om te beginnen";
    tekstEl.parentNode.insertBefore(hint, tekstEl.nextSibling);

    typer.start(proeflessen[0]);
    typer.actief = false;

    function aanzetten() {
      typer.actief = true;
      hint.hidden = true;
      $("#demo-uitleg").textContent = "Typ de tekst na. Kijk naar het scherm, niet naar je handen!";
      if (typer.invoer) {
        try { typer.invoer.focus({ preventScroll: true }); } catch (e) { typer.invoer.focus(); }
      }
    }

    tekstEl.addEventListener("click", aanzetten);
    tekstEl.addEventListener("focus", aanzetten);
    document.addEventListener("click", function (e) {
      if (!tekstEl.contains(e.target) && e.target !== tekstEl) {
        typer.actief = false;
        hint.hidden = false;
      }
    });
  });
})();
