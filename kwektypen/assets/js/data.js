/* ==========================================================================
   KwekType – cursusdata
   Alles staat in één globaal object: window.KwekData
   ========================================================================== */
(function () {
  "use strict";

  /* --------------------------------------------------------------------
     Toetsenbordindeling (QWERTY zoals in Nederland)
     vinger: pink | ring | midden | wijs | duim
     -------------------------------------------------------------------- */
  var RIJEN = [
    [
      { t: "1", v: "pink", h: "l" }, { t: "2", v: "ring", h: "l" }, { t: "3", v: "midden", h: "l" },
      { t: "4", v: "wijs", h: "l" }, { t: "5", v: "wijs", h: "l" }, { t: "6", v: "wijs", h: "r" },
      { t: "7", v: "wijs", h: "r" }, { t: "8", v: "midden", h: "r" }, { t: "9", v: "ring", h: "r" },
      { t: "0", v: "pink", h: "r" }, { t: "-", v: "pink", h: "r" }
    ],
    [
      { t: "q", v: "pink", h: "l" }, { t: "w", v: "ring", h: "l" }, { t: "e", v: "midden", h: "l" },
      { t: "r", v: "wijs", h: "l" }, { t: "t", v: "wijs", h: "l" }, { t: "y", v: "wijs", h: "r" },
      { t: "u", v: "wijs", h: "r" }, { t: "i", v: "midden", h: "r" }, { t: "o", v: "ring", h: "r" },
      { t: "p", v: "pink", h: "r" }
    ],
    [
      { t: "a", v: "pink", h: "l", thuis: true }, { t: "s", v: "ring", h: "l", thuis: true },
      { t: "d", v: "midden", h: "l", thuis: true }, { t: "f", v: "wijs", h: "l", thuis: true },
      { t: "g", v: "wijs", h: "l" }, { t: "h", v: "wijs", h: "r" },
      { t: "j", v: "wijs", h: "r", thuis: true }, { t: "k", v: "midden", h: "r", thuis: true },
      { t: "l", v: "ring", h: "r", thuis: true }, { t: ";", v: "pink", h: "r", thuis: true }
    ],
    [
      { t: "shift", label: "⇧ shift", v: "pink", h: "l", breed: 2 },
      { t: "z", v: "pink", h: "l" }, { t: "x", v: "ring", h: "l" }, { t: "c", v: "midden", h: "l" },
      { t: "v", v: "wijs", h: "l" }, { t: "b", v: "wijs", h: "l" }, { t: "n", v: "wijs", h: "r" },
      { t: "m", v: "wijs", h: "r" }, { t: ",", v: "midden", h: "r" }, { t: ".", v: "ring", h: "r" },
      { t: "?", v: "pink", h: "r" },
      { t: "shiftr", label: "shift ⇧", v: "pink", h: "r", breed: 2 }
    ],
    [
      { t: " ", label: "spatiebalk", v: "duim", h: "r", breed: 6 }
    ]
  ];

  /* Tekens die je met shift maakt (Nederlands/US-toetsenbord) */
  var SHIFT_TEKENS = { "!": "1", "?": "?", ":": ";", '"': "'", "'": "'" };

  /* Zoektabel: teken -> toetsinfo */
  var TOETSINFO = {};
  RIJEN.forEach(function (rij) {
    rij.forEach(function (toets) {
      if (toets.t.length === 1 || toets.t === " ") TOETSINFO[toets.t] = toets;
    });
  });

  function infoVoorTeken(teken) {
    if (teken === undefined || teken === null) return null;
    var klein = teken.toLowerCase();
    if (TOETSINFO[klein]) return TOETSINFO[klein];
    if (SHIFT_TEKENS[teken]) return TOETSINFO[SHIFT_TEKENS[teken]] || null;
    return null;
  }

  function heeftShiftNodig(teken) {
    if (!teken || teken.length !== 1) return false;
    if (teken >= "A" && teken <= "Z") return true;
    return "!?:\"".indexOf(teken) !== -1;
  }

  var VINGERNAAM = {
    "l-pink": "linkerpink", "l-ring": "linkerringvinger", "l-midden": "linkermiddelvinger",
    "l-wijs": "linkerwijsvinger", "r-wijs": "rechterwijsvinger", "r-midden": "rechtermiddelvinger",
    "r-ring": "rechterringvinger", "r-pink": "rechterpink", "r-duim": "je duimen", "l-duim": "je duimen"
  };

  /* --------------------------------------------------------------------
     Woorden – alleen kleine letters, geen leestekens
     -------------------------------------------------------------------- */
  var WOORDEN = ("aal aap aarde acht adem afval agenda al alle alleen als altijd ander anders appel arm as auto avond " +
    "baan bad bak bal bang bank beek been beer begin bek beker bel berg beest beter bezig bij bijna bik bil binnen blad " +
    "blauw blij bloem bod boek boer bol bom bon boom boot bord borst bos bot boter bram brand brief brood brug bruin bui " +
    "buik buiten bus dag dak dal dame dan dansen das dat deel deken deur dicht die dief dier dik ding dit doel doen dof dol " +
    "dom donker dood doos dorp dorst draad draak draaien drie drinken droog druif duif duim duin dun duur echt edel een eend " +
    "eerst eeuw ei eiland eind eend elk emmer en eng erg eten fabel fee feest fel fiets fijn film fles fluit fout fris gaan " +
    "gaas gal gang gans gat gaaf geel geen geit geld gek gele gelijk geluk gemak gerst geur gevaar geven gips gitaar glas " +
    "glad goed goud graag gram gras grap grens groen groep grond groot haai haan haar haas hak hal half hallo hals hand hard " +
    "haas hart hebben heel heet hek hel help hemd hemel hen hier hoed hoek hoen hoi hond honing hoofd hoog hoop horen hout " +
    "huis hulp hut idee iemand iets ijs ijzer in inkt is jaar jager jam jarig jas jij jong jouw jubel juf juist jullie kaal " +
    "kaars kaart kaas kabel kachel kade kalf kalk kam kamer kamp kan kanaal kant kar kas kast kat keel kegel keizer kelder " +
    "kerk kers ketel keuken kiel kies kind klaar klas klein kleur klim klok kloon knal knie knoop koe koek koel kogel kok " +
    "koning kool kop kort kous kraan krab kreek kring kroon kruid kruk kuil kunst kus kust laag laan laat lach ladder lam " +
    "lamp land lang las last leeg leer leeuw lente lepel les leuk licht lied lief lijm lijn lijst limoen lied loep lomp lood " +
    "loop los lucht lui luid maan maand maat magie mais mak makkelijk man mand mango mantel markt mast meel meer meest mei " +
    "meid melk mens mes met meter mier mijn min mis mist modder moe moeder molen mond mooi morgen mos motor mug muis muur " +
    "muziek na naam naar nacht nagel nat neus nieuw nog noot noord nu nul oefening oester of olie om oma ook oom oor oost " +
    "op opa open oranje oud paal paard pad pak pan panda pap papier park pas pauw peer pen pet piano pijl pijn pil pin pit " +
    "plaat plan plank plas plein plek poes pomp pond poort pop poot pot prei prijs pruim put raam raar raket ram rand rat " +
    "recht regen reis rem rest riem riet rij rijk rijst ring rits rok rond rood roos rots rug ruim rups rust schaap schaar " +
    "schat schip school schoen schrijven sla slag slak slang slee sleutel slot sneeuw snel snoep soep spel spiegel spin " +
    "sport spring staart stad stal stap steen ster stil stoel stof stok stom storm straat strand stroop stuk taal taart tafel " +
    "tak tand tas tegel tekst tent test thee tijd tijger tik tocht toen toets tomaat toon top tor touw trap tree trein trom " +
    "trots tuin tulp turf twee uil uit vaak vader val van vandaag varen vast veel veer veld ven ver verf verhaal vers vest " +
    "vier vijf vijver vinden vinger vis vlag vlak vleugel vlieg vloer vogel vol voor voet vork vos vraag vriend vrij vroeg " +
    "vuur waar wagen wal wang want warm was wat water weer weg wei wel wereld werk wesp west wie wijn wijs wild wind winkel " +
    "winter wit wolf wolk wonen woord worm wortel woud zaad zaag zaal zacht zak zand zebra zee zeep zeil zeker zes zeven ziek " +
    "zien zij zijn zilver zin zingen zitten zoen zoet zomer zon zoon zorg zout zuid zus zwaan zwaar zwart zwem").split(/\s+/);

  /* --------------------------------------------------------------------
     Zinnen – verhaaltjes uit Kwekstad
     -------------------------------------------------------------------- */
  var ZINNEN = [
    "de eend leest de krant in het park",
    "een dief steelt de gouden kraan uit het museum",
    "wij fietsen door de straten van kwekstad",
    "de jonge verslaggever tikt een groot verhaal",
    "kwek roept hard naar de brandweer op de hoek",
    "het regent broodjes boven de markt",
    "de kat van de burgemeester zit hoog in de boom",
    "vier vrienden zoeken de schat onder de brug",
    "morgen komt de trein met duizend tulpen aan",
    "de wind blaast de hoed van opa in de vijver",
    "een grote walvis zwemt langs de haven van kwekstad",
    "de bakker bakt taarten met room en aardbeien",
    "wie het snelste typt wint de gouden pen",
    "de klok van de toren slaat twaalf keer",
    "in de winkel liggen boeken over draken en ridders",
    "zij schrijft elke dag een nieuw verhaal voor de krant",
    "de zon schijnt boven het strand en de zee is blauw",
    "onze fotograaf maakt een foto van de vliegende fiets",
    "het spook in de kelder blijkt gewoon een oude jas",
    "de redactie viert feest met limonade en koek"
  ];

  var HOOFDLETTERZINNEN = [
    "Kwekstad is de leukste stad van het land.",
    "Vandaag schrijft Pip een verhaal over de Grote Brug.",
    "De Kwekstad Koerier verschijnt elke Woensdag.",
    "Ridder Ronald redt de kip van Boer Bram.",
    "Wie is de dief? Niemand weet het nog!",
    "Op Zondag speelt de fanfare op het Marktplein."
  ];

  var CIJFERZINNEN = [
    "de krant kost 2 euro en 50 cent",
    "in 1935 werd de brug van kwekstad gebouwd",
    "er zijn 7 dagen in een week en 12 maanden in een jaar",
    "bel 06 12 34 56 78 voor de redactie",
    "de eend at 9 broodjes, 4 appels en 1 taart",
    "typ 120 aanslagen per minuut en je bent een held!"
  ];

  /* --------------------------------------------------------------------
     Levels
     -------------------------------------------------------------------- */
  var LEVELS = [
    { nr: 1, titel: "De startrij: f en j", nieuw: ["f", "j"], verhaal: "Welkom bij de Kwekstad Koerier! Leg je wijsvingers op de f en de j. Voel je die kleine streepjes?" },
    { nr: 2, titel: "Middelvingers: d en k", nieuw: ["d", "k"], verhaal: "Hoofdredacteur Kwek wil je middelvingers zien werken. Blijf met je ogen van het toetsenbord af!" },
    { nr: 3, titel: "Ringvingers: s en l", nieuw: ["s", "l"], verhaal: "De ringvingers zijn wat lui. Wakker maken met s en l!" },
    { nr: 4, titel: "Pinken: a en ;", nieuw: ["a", ";"], verhaal: "Je pinken zijn klein maar dapper. Nu staat je hele startrij klaar." },
    { nr: 5, titel: "Strekken: g en h", nieuw: ["g", "h"], verhaal: "Je wijsvingers strekken even naar binnen. Daarna meteen terug naar huis!" },
    { nr: 6, titel: "Naar boven: e en i", nieuw: ["e", "i"], verhaal: "Omhoog! De bovenrij zit vol met klinkers voor je krantenkoppen." },
    { nr: 7, titel: "Bovenrij: r en u", nieuw: ["r", "u"], verhaal: "Met r en u kun je al bijna over de rivier schrijven." },
    { nr: 8, titel: "Bovenrij: t en y", nieuw: ["t", "y"], verhaal: "T van typen! Nu wordt het pas echt leuk." },
    { nr: 9, titel: "Bovenrij: w en o", nieuw: ["w", "o"], verhaal: "Woorden, woorden, woorden. De krant loopt vol." },
    { nr: 10, titel: "Bovenrij: q en p", nieuw: ["q", "p"], verhaal: "De laatste twee van de bovenrij. Q is verlegen, die zie je bijna nooit." },
    { nr: 11, titel: "Onderrij: v en n", nieuw: ["v", "n"], verhaal: "Naar beneden duiken en meteen weer terug naar de startrij." },
    { nr: 12, titel: "Onderrij: b en m", nieuw: ["b", "m"], verhaal: "B en m zijn de verste reisjes voor je wijsvingers." },
    { nr: 13, titel: "Onderrij: c en de komma", nieuw: ["c", ","], verhaal: "Met een komma laat je de lezer even ademhalen." },
    { nr: 14, titel: "Onderrij: x en de punt", nieuw: ["x", "."], verhaal: "Punt! Einde zin. X is bijna zo zeldzaam als q." },
    { nr: 15, titel: "De z en HOOFDLETTERS", nieuw: ["z", "shift"], verhaal: "Shift met je andere pink, dan hoef je nooit te draaien met je hand." },
    { nr: 16, titel: "Cijfers en leestekens", nieuw: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "?", "!"], verhaal: "De cijferrij ligt bovenaan. Strek je vingers en tel mee!" },
    { nr: 17, titel: "Het grote examen", nieuw: [], examen: true, verhaal: "Alles komt samen. Haal 100 aanslagen per minuut met 90% goed en je diploma is binnen!" }
  ];

  /* Bouw per level de complete set beschikbare toetsen op */
  (function bouwToetsenOp() {
    var verzameld = [];
    LEVELS.forEach(function (level) {
      level.nieuw.forEach(function (t) { if (verzameld.indexOf(t) === -1) verzameld.push(t); });
      level.beschikbaar = verzameld.slice();
      level.letters = level.beschikbaar.filter(function (t) { return /^[a-z]$/.test(t); });
    });
  })();

  /* --------------------------------------------------------------------
     Oefeningen genereren
     -------------------------------------------------------------------- */
  function kies(arr, rnd) { return arr[Math.floor((rnd || Math.random)() * arr.length)]; }

  function mengeling(arr) {
    var kopie = arr.slice();
    for (var i = kopie.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = kopie[i]; kopie[i] = kopie[j]; kopie[j] = tmp;
    }
    return kopie;
  }

  function magWoord(woord, letters) {
    for (var i = 0; i < woord.length; i++) {
      if (letters.indexOf(woord[i]) === -1) return false;
    }
    return true;
  }

  function woordenVoor(level, minLengte) {
    var letters = level.letters;
    return WOORDEN.filter(function (w) {
      return w.length >= (minLengte || 2) && magWoord(w, letters);
    });
  }

  /* Rijtje losse letters: "ff jj fj jf ffj" */
  function letterdrill(level, regels, perRegel) {
    var nieuw = level.nieuw.filter(function (t) { return t.length === 1 && t !== " "; });
    var oud = level.beschikbaar.filter(function (t) { return t.length === 1 && nieuw.indexOf(t) === -1; });
    var regelsUit = [];
    for (var r = 0; r < regels; r++) {
      var groepen = [];
      for (var g = 0; g < perRegel; g++) {
        var lengte = 2 + Math.floor(Math.random() * 2);
        var groep = "";
        for (var i = 0; i < lengte; i++) {
          var bron = (Math.random() < 0.7 || oud.length === 0) ? nieuw : oud;
          groep += kies(bron);
        }
        groepen.push(groep);
      }
      regelsUit.push(groepen.join(" "));
    }
    return regelsUit.join(" ");
  }

  /* Lettergrepen met klinkers als die beschikbaar zijn */
  function woordenregel(level, aantal, minLengte) {
    var pool = woordenVoor(level, minLengte);
    if (pool.length < 5) return letterdrill(level, 1, 6);
    var gekozen = [];
    var nieuweLetters = level.nieuw.filter(function (t) { return /^[a-z]$/.test(t); });
    var metNieuw = pool.filter(function (w) {
      return nieuweLetters.some(function (l) { return w.indexOf(l) !== -1; });
    });
    for (var i = 0; i < aantal; i++) {
      var bron = (metNieuw.length > 3 && Math.random() < 0.7) ? metNieuw : pool;
      gekozen.push(kies(bron));
    }
    return gekozen.join(" ");
  }

  function zinVoor(level) {
    var letters = level.letters.concat([" "]);
    var kandidaten = ZINNEN.filter(function (z) { return magWoord(z, letters); });
    if (level.nr >= 13) {
      kandidaten = kandidaten.concat(ZINNEN.filter(function (z) {
        return magWoord(z, level.letters.concat([" ", ",", "."]));
      }));
    }
    if (!kandidaten.length) return null;
    return kies(kandidaten);
  }

  /* Bouwt de 5 stappen van een les */
  function maakOefeningen(nr) {
    var level = LEVELS[nr - 1];
    if (!level) return [];

    if (level.examen) {
      return [
        { type: "zin", uitleg: "Examen deel 1 – schrijf de kop van de krant.", tekst: kies(HOOFDLETTERZINNEN) },
        { type: "zin", uitleg: "Examen deel 2 – het nieuwsbericht.", tekst: kies(ZINNEN) + ". " + kies(ZINNEN) + "." },
        { type: "zin", uitleg: "Examen deel 3 – cijfers in het nieuws.", tekst: kies(CIJFERZINNEN) },
        { type: "zin", uitleg: "Examen deel 4 – de laatste alinea.", tekst: kies(HOOFDLETTERZINNEN) + " " + kies(HOOFDLETTERZINNEN) },
        { type: "zin", uitleg: "Examen deel 5 – zet de krant op de pers!", tekst: "Kwekstad Koerier: " + kies(ZINNEN) + "!" }
      ];
    }

    if (nr === 15) {
      return [
        { type: "letters", uitleg: "Warm op met de z. Linkerpink naar beneden!", tekst: letterdrill(level, 2, 5) },
        { type: "woorden", uitleg: "Woorden met een z.", tekst: woordenregel(level, 7, 2) },
        { type: "hoofdletters", uitleg: "Shift met je ándere pink. Links typen? Rechter shift!", tekst: "Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm" },
        { type: "hoofdletters", uitleg: "Nog een keer, nu de tweede helft.", tekst: "Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz" },
        { type: "zin", uitleg: "Een echte krantenzin met hoofdletters.", tekst: kies(HOOFDLETTERZINNEN) }
      ];
    }

    if (nr === 16) {
      return [
        { type: "cijfers", uitleg: "De cijferrij van links naar rechts.", tekst: "1234 5678 90 1234 5678 90" },
        { type: "cijfers", uitleg: "Door elkaar. Blijf naar het scherm kijken!", tekst: mengeling("1234567890".split("")).join("") + " " + mengeling("1234567890".split("")).join("") },
        { type: "cijfers", uitleg: "Getallen tikken zoals in de krant.", tekst: "12 345 7 89 2024 100 55 3 999 18" },
        { type: "zin", uitleg: "Vraagteken en uitroepteken doe je met shift.", tekst: "Wie won er? Kwek won! Hoeveel punten? 120!" },
        { type: "zin", uitleg: "Een nieuwsbericht met cijfers.", tekst: kies(CIJFERZINNEN) }
      ];
    }

    var stappen = [
      { type: "letters", uitleg: "Warm op met de nieuwe toetsen.", tekst: letterdrill(level, 2, 5) },
      { type: "letters", uitleg: "Nu door elkaar met de toetsen die je al kent.", tekst: letterdrill(level, 2, 6) }
    ];

    var pool = woordenVoor(level, 2);
    if (pool.length >= 5) {
      stappen.push({ type: "woorden", uitleg: "Echte woorden! Rustig en netjes.", tekst: woordenregel(level, 6, 2) });
      stappen.push({ type: "woorden", uitleg: "Iets langere woorden.", tekst: woordenregel(level, 6, 3) });
    } else {
      stappen.push({ type: "letters", uitleg: "Lettergrepen tikken in een vloeiend ritme.", tekst: letterdrill(level, 2, 6) });
      stappen.push({ type: "letters", uitleg: "Sneller nu! Blijf van het toetsenbord wegkijken.", tekst: letterdrill(level, 2, 7) });
    }

    var zin = zinVoor(level);
    if (zin) {
      stappen.push({ type: "zin", uitleg: "Een zinnetje voor de Kwekstad Koerier.", tekst: zin });
    } else {
      stappen.push({ type: "woorden", uitleg: "De eindsprint!", tekst: pool.length >= 5 ? woordenregel(level, 8, 2) : letterdrill(level, 2, 8) });
    }
    return stappen;
  }

  /* Woorden voor de games, op basis van het hoogst vrijgespeelde level */
  function gameWoorden(levelNr) {
    var level = LEVELS[Math.min(Math.max(levelNr, 1), LEVELS.length) - 1];
    var pool = woordenVoor(level, 2);
    if (pool.length < 12) {
      pool = [];
      for (var i = 0; i < 30; i++) pool.push(letterdrill(level, 1, 1).split(" ")[0]);
    }
    return pool;
  }

  window.KwekData = {
    RIJEN: RIJEN,
    LEVELS: LEVELS,
    WOORDEN: WOORDEN,
    ZINNEN: ZINNEN,
    VINGERNAAM: VINGERNAAM,
    infoVoorTeken: infoVoorTeken,
    heeftShiftNodig: heeftShiftNodig,
    maakOefeningen: maakOefeningen,
    gameWoorden: gameWoorden,
    woordenVoor: woordenVoor,
    mengeling: mengeling,
    kies: kies
  };
})();
