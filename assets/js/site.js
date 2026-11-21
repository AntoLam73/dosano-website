// Dosano: kleine Helfer für die Website. Ohne JavaScript ist alles lesbar
// und bedienbar; hier kommen nur die Vorführung auf der Startseite und das
// sanfte Erscheinen der Bildschirme dazu.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Vorführung: Fach für 8:00 nach oben wischen oder antippen.
  var screen = document.getElementById('demo');
  var tray = document.getElementById('demoTray');
  var reset = document.getElementById('demoReset');
  var status = document.getElementById('demoStatus');
  var arc = document.getElementById('arcFill');
  var ARC = 460.8;

  if (screen && tray) {
    var taken = false;
    var startY = null;

    var take = function () {
      if (taken) return;
      taken = true;
      screen.classList.add('is-taken');
      if (arc) arc.style.strokeDashoffset = String(ARC / 2);
      tray.setAttribute('aria-disabled', 'true');
      if (status) status.textContent = 'L-Thyroxin und Vitamin D3 als genommen eingetragen. 2 von 4 Einnahmen für heute erledigt.';
      if (reset) reset.classList.add('is-visible');
    };

    var undo = function () {
      taken = false;
      screen.classList.remove('is-taken');
      if (arc) arc.style.strokeDashoffset = String(ARC);
      tray.removeAttribute('aria-disabled');
      if (status) status.textContent = 'Zurückgesetzt.';
      if (reset) reset.classList.remove('is-visible');
      tray.focus({ preventScroll: true });
    };

    tray.addEventListener('pointerdown', function (e) {
      startY = e.clientY;
      try { tray.setPointerCapture(e.pointerId); } catch (_) {}
    });
    tray.addEventListener('pointermove', function (e) {
      if (startY !== null && startY - e.clientY > 24) { startY = null; take(); }
    });
    var end = function () { startY = null; };
    tray.addEventListener('pointerup', end);
    tray.addEventListener('pointercancel', end);
    // Antippen und Tastatur (Eingabe, Leertaste) lösen "click" aus.
    tray.addEventListener('click', take);
    if (reset) reset.addEventListener('click', undo);
  }

  // Sanftes Erscheinen der Bildschirme in der Galerie, einmalig.
  var risers = document.querySelectorAll('.rise');
  if (!('IntersectionObserver' in window)) {
    risers.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    risers.forEach(function (el) { io.observe(el); });
  }

  // Bei "Bewegung reduzieren" nichts verstecken, was erst noch erscheinen müsste.
  if (reduceMotion.matches) {
    risers.forEach(function (el) { el.classList.add('is-in'); });
  }
})();
