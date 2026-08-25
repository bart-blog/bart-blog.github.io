/* ==========================================================================
   KwekType – diplomapagina
   ========================================================================== */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var K = window.Kwek, D = window.KwekData, $ = K.$;
    var data = K.Opslag.lees();
    var examen = data.levels["17"];
    var afgerond = !!(examen && examen.klaar);

    var naamVeld = $("#naam-veld");
    naamVeld.value = data.naam || "";

    function tekenNaam() {
      $("#diploma-naam").textContent = naamVeld.value.trim() || "……………………";
    }
    tekenNaam();

    naamVeld.addEventListener("input", function () {
      K.Opslag.naam(naamVeld.value.slice(0, 30));
      tekenNaam();
    });

    var sterren = K.Opslag.totaalSterren();
    $("#stat-sterren").textContent = sterren + " / " + (D.LEVELS.length * 3);
    $("#stat-apm").textContent = examen ? (examen.wpm * 5) : "–";
    $("#stat-goed").textContent = examen ? examen.nauwkeurig + "%" : "–";

    var datum = data.diplomaDatum;
    if (afgerond && !datum) {
      datum = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
      data.diplomaDatum = datum;
      K.Opslag.schrijf(data);
    }
    $("#diploma-datum").textContent = datum || new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

    var melding = $("#melding");
    if (!afgerond) {
      var klaar = Object.keys(data.levels).filter(function (k) { return data.levels[k].klaar; }).length;
      melding.hidden = false;
      melding.innerHTML = "<strong>Nog even doorzetten!</strong> Je hebt " + klaar + " van de " + D.LEVELS.length +
        " levels gehaald. Het diploma wordt pas echt geldig als je het grote examen haalt: " +
        "minstens 100 aanslagen per minuut met 90% goed. " +
        '<a href="cursus.html">Verder oefenen →</a>';
      $("#diploma").style.opacity = ".65";
      $("#diploma-tekst").textContent = "…dit diploma nog aan het verdienen is. Nog even oefenen!";
    } else {
      melding.hidden = false;
      melding.innerHTML = "<strong>Gefeliciteerd! 🎉</strong> Je bent geslaagd. Print je diploma en hang hem op een mooie plek.";
      K.confetti(80);
    }

    $("#print-knop").addEventListener("click", function () { window.print(); });
  });
})();
