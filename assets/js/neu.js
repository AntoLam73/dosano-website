// Dosano: Bewegung und Vorführungen für neu.html. Ohne JavaScript ist alles
// lesbar; hier kommt nur Bewegung dazu. Bei "Bewegung reduzieren" springen
// alle Zustände direkt, ohne Flug, Feder oder Schwung.
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var ICONS = 'assets/img/icons.svg';
  var EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
  var POP = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function anim(el, frames, opts) {
    if (!el.animate) return Promise.resolve();
    var a = el.animate(frames, opts);
    return a.finished.catch(function () {});
  }
  function onVisible(el, cb, margin) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(); } });
    }, { rootMargin: margin || '0px 0px -12% 0px', threshold: 0.12 });
    io.observe(el);
  }

  // Datumsangaben wie in der App: "Fr. 15. Jan."
  var TODAY = new Date(2026, 10, 21);
  function addDays(n) { var d = new Date(TODAY); d.setDate(d.getDate() + n); return d; }
  function shortDate(d) {
    var wd = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'][d.getDay()];
    var mo = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'][d.getMonth()];
    return wd + ' ' + d.getDate() + '. ' + mo;
  }
  function countUp(el, to, suffix, ms) {
    if (reduce) { el.textContent = to + suffix; return; }
    var t0 = performance.now();
    function step(t) {
      var p = Math.min(1, (t - t0) / ms);
      var e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(to * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Auftritt der Seite ------------------------------------------------------
  function ready() { document.body.classList.add('is-ready'); }
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, wait(600)]).then(ready);
  } else { ready(); }

  // Schriftzug im Hero: Das Logo erscheint am Ende des Namens und fährt an
  // seinen Platz als "D". Dabei deckt es "osano" hinter sich auf, wie der
  // Ladebildschirm der App.
  var mark = $('#heroMark');
  if (mark && !reduce && mark.animate) {
    var d = $('.wm-d', mark), rest = $('.wm-rest', mark);
    rest.style.clipPath = 'inset(0 0 0 100%)';
    d.style.opacity = '0';
    wait(650).then(function () {
      var shift = rest.getBoundingClientRect().width;
      d.style.opacity = '';
      anim(d, [
        { transform: 'translateX(' + shift + 'px) scale(0.55)', opacity: 0 },
        { transform: 'translateX(' + shift + 'px) scale(1)', opacity: 1 }
      ], { duration: 380, easing: POP, fill: 'both' })
        .then(function () { return wait(140); })
        .then(function () {
          anim(rest, [{ clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)' }], { duration: 720, easing: EASE_IN_OUT, fill: 'forwards' })
            .then(function () { rest.style.clipPath = ''; });
          return anim(d, [
            { transform: 'translateX(' + shift + 'px)' },
            { transform: 'translateX(0)' }
          ], { duration: 720, easing: EASE_IN_OUT, fill: 'forwards' });
        });
    });
  }

  // Bogen wie StreakArc: Füllung federt mit Überschwingen nach -----------
  function Arc(root) {
    this.root = root;
    this.fill = $('.fill', root);
    this.sheen = $('.sheen', root);
    this.tip = $('.tip', root);
    this.sweep = $('.sweep', root);
    this.glow = $('.glow-all', root);
    this.num = $('.arc2-num', root);
    this.shown = parseFloat(root.getAttribute('data-shown')) || 0;
    this.v = 0; this.target = this.shown; this.raf = 0;
    this.draw();
  }
  Arc.point = function (f) {
    var a = (200 - 220 * Math.max(0, Math.min(1, f))) * Math.PI / 180;
    return { x: 120 + 96 * Math.cos(a), y: 120 - 96 * Math.sin(a) };
  };
  Arc.prototype.draw = function () {
    var s = Math.max(0, Math.min(1.04, this.shown));
    this.fill.style.strokeDashoffset = String(1 - s);
    this.sheen.style.strokeDashoffset = String(1 - Math.max(0, s - 0.015));
    this.fill.style.opacity = this.sheen.style.opacity = s > 0.001 ? '1' : '0';
    var p = Arc.point(Math.min(s, 1));
    this.tip.setAttribute('cx', p.x.toFixed(2));
    this.tip.setAttribute('cy', p.y.toFixed(2));
  };
  // Feder wie SwiftUI spring(response: 0.55, dampingFraction: 0.5)
  Arc.prototype.set = function (target, burst) {
    var self = this;
    this.target = target;
    if (reduce) { this.shown = target; this.draw(); return; }
    if (burst && this.tip.animate) {
      this.tip.animate([{ opacity: 0 }, { opacity: 1, offset: 0.17 }, { opacity: 0 }], { duration: 720, easing: 'ease-out' });
    }
    var k = Math.pow(2 * Math.PI / 0.55, 2), c = 2 * 0.5 * Math.sqrt(k);
    var last = performance.now();
    cancelAnimationFrame(this.raf);
    function step(t) {
      var dt = Math.min(0.032, (t - last) / 1000); last = t;
      var a = -k * (self.shown - self.target) - c * self.v;
      self.v += a * dt; self.shown += self.v * dt;
      self.draw();
      if (Math.abs(self.v) > 0.0005 || Math.abs(self.shown - self.target) > 0.0005) {
        self.raf = requestAnimationFrame(step);
      } else { self.shown = self.target; self.draw(); }
    }
    this.raf = requestAnimationFrame(step);
  };
  // Alles genommen: Bogen leuchtet, ein Schein läuft darüber, die Zahl zählt hoch.
  Arc.prototype.celebrate = function (newNumber) {
    var self = this;
    if (reduce) { this.num.textContent = newNumber; return Promise.resolve(); }
    anim(this.glow, [{ opacity: 0 }, { opacity: 0.55, offset: 0.3 }, { opacity: 0 }], { duration: 1000, easing: 'ease-out' });
    anim(this.root, [{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: 900, easing: 'ease-out' });
    this.sweep.style.strokeDasharray = '0.3 2';
    anim(this.sweep, [
      { strokeDashoffset: 0.3, opacity: 1 },
      { strokeDashoffset: -1.0, opacity: 1, offset: 0.95 },
      { strokeDashoffset: -1.0, opacity: 0 }
    ], { duration: 420, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
    return wait(300).then(function () {
      self.num.textContent = newNumber;
      return anim(self.num, [
        { transform: 'scale(1)' }, { transform: 'scale(1.45)', offset: 0.25 },
        { transform: 'scale(0.94)', offset: 0.6 }, { transform: 'scale(1.03)', offset: 0.8 }, { transform: 'scale(1)' }
      ], { duration: 650, easing: 'ease-out' });
    });
  };

  // Vorführung im Hero ------------------------------------------------------
  var demo = $('#demo');
  if (demo) {
    var arc = new Arc($('[data-arc="demo"]', demo));
    var compEl = $('#demoComp', demo);
    var comp = compEl.parentNode;
    var lid = $('.lid2', compEl);
    var pill = $('.p', compEl);
    var layer = $('.fly-layer', demo);
    var status = $('#demoStatus');
    var resetBtn = $('#demoReset');
    var tryRow = $('#tryRow');
    var taken = false, busy = false, interacted = false;

    // Bogen beim ersten Anblick von 0 auf den Stand federn lassen (wie onAppear).
    if (!reduce) {
      arc.shown = 0; arc.draw();
      wait(900).then(function () { arc.set(0.5, false); });
    }

    function setLid(v, animate) {
      lid.style.transition = animate ? 'transform 520ms cubic-bezier(0.34, 1.3, 0.64, 1)' : 'none';
      lid.style.setProperty('--open', String(v));
    }

    function flyPill() {
      if (reduce || !pill.animate) return Promise.resolve();
      var sr = demo.getBoundingClientRect();
      var pr = pill.getBoundingClientRect();
      var unit = sr.width / 393;
      var arcBox = $('.arc2', demo).getBoundingClientRect();
      var end = Arc.point(1);
      var tx = arcBox.left - sr.left + end.x * (arcBox.width / 240);
      var ty = arcBox.top - sr.top + end.y * (arcBox.height / 172);
      var sx = pr.left - sr.left + pr.width / 2, sy = pr.top - sr.top + pr.height / 2;
      var f = pill.cloneNode(true);
      f.classList.remove('drop');
      f.style.cssText = 'left:' + (sx - pr.width / 2) + 'px;top:' + (sy - pr.height / 2) + 'px;bottom:auto;width:' + pr.width + 'px;height:' + pr.height + 'px';
      layer.appendChild(f);
      pill.style.visibility = 'hidden';
      // Bogenflug: erst ein Hüpfer nach oben, dann im Bogen zum Ende der Füllung.
      var cx = (sx + tx) / 2 + 40 * unit, cy = Math.min(sy, ty) - 90 * unit;
      var frames = [];
      for (var i = 0; i <= 16; i++) {
        var t = i / 16, u = 1 - t;
        var x = u * u * sx + 2 * u * t * cx + t * t * tx;
        var y = u * u * sy + 2 * u * t * cy + t * t * ty;
        frames.push({
          transform: 'translate(' + (x - sx).toFixed(1) + 'px,' + (y - sy).toFixed(1) + 'px) rotate(' + Math.round(t * 260) + 'deg) scale(' + (1 - 0.35 * t).toFixed(3) + ')',
          opacity: t > 0.92 ? 0.2 : 1
        });
      }
      return anim(f, frames, { duration: 820, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' })
        .then(function () { f.remove(); });
    }

    function take() {
      if (taken || busy) return;
      busy = true; taken = true; interacted = true;
      tryRow.classList.add('is-done');
      setLid(1, true);
      comp.classList.add('is-done');
      compEl.setAttribute('aria-disabled', 'true');
      wait(reduce ? 0 : 160).then(flyPill).then(function () {
        arc.set(1, true);
        demo.classList.add('is-taken');
        return wait(reduce ? 0 : 650);
      }).then(function () {
        demo.classList.add('is-allDone');
        return arc.celebrate(8);
      }).then(function () {
        status.textContent = 'Metformin als genommen eingetragen. Für heute alles erledigt, 8 Tage in Folge.';
        resetBtn.classList.add('is-visible');
        busy = false;
      });
    }

    function reset() {
      if (busy) return;
      taken = false;
      demo.classList.remove('is-taken', 'is-allDone');
      comp.classList.remove('is-done');
      compEl.removeAttribute('aria-disabled');
      setLid(0, true);
      pill.style.visibility = '';
      pill.classList.remove('drop'); void pill.offsetWidth; pill.classList.add('drop');
      pill.style.setProperty('--d', '250ms');
      arc.num.textContent = '7';
      arc.set(0.5, false);
      resetBtn.classList.remove('is-visible');
      tryRow.classList.remove('is-done');
      status.textContent = 'Zurückgesetzt.';
      compEl.focus({ preventScroll: true });
    }

    // Wischen: Der Deckel folgt dem Finger. Weit genug (50 Punkte): genommen.
    var startY = null, moved = false;
    compEl.addEventListener('pointerdown', function (e) {
      if (taken) return;
      startY = e.clientY; moved = false;
      try { compEl.setPointerCapture(e.pointerId); } catch (_) {}
    });
    compEl.addEventListener('pointermove', function (e) {
      if (startY === null || taken) return;
      var unit = demo.getBoundingClientRect().width / 393;
      var dy = Math.min(0, e.clientY - startY);
      if (dy < -4) moved = true;
      setLid(Math.min(1, -dy / (50 * unit)), false);
      if (-dy > 50 * unit) { startY = null; take(); }
    });
    function release() {
      if (startY !== null && !taken) setLid(0, true);
      startY = null;
    }
    compEl.addEventListener('pointerup', release);
    compEl.addEventListener('pointercancel', release);
    compEl.addEventListener('click', function () { if (!moved) take(); moved = false; });
    resetBtn.addEventListener('click', reset);

    // Einmal vorzeigen, wie es geht: eine Hand wischt das Fach ein Stück auf.
    var hand = $('#ghostHand');
    if (!reduce && hand.animate) {
      onVisible(demo, function () {
        wait(3200).then(function () {
          if (interacted || taken) return;
          var sr = demo.getBoundingClientRect(), cr = compEl.getBoundingClientRect();
          var unit = sr.width / 393;
          var x = cr.left - sr.left + cr.width / 2 - 8 * unit, y = cr.top - sr.top + cr.height * 0.55;
          hand.style.left = x + 'px'; hand.style.top = y + 'px';
          anim(hand, [
            { opacity: 0, transform: 'translateY(' + 20 * unit + 'px) scale(0.9)' },
            { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.2 },
            { opacity: 1, transform: 'translateY(' + -34 * unit + 'px)', offset: 0.55 },
            { opacity: 1, transform: 'translateY(' + -34 * unit + 'px)', offset: 0.7 },
            { opacity: 0, transform: 'translateY(0)' }
          ], { duration: 1900, easing: 'ease-in-out' });
          // Deckel öffnet sich mit der Hand ein Stück und fällt zurück.
          wait(420).then(function () { if (!interacted && !taken) { lid.style.transition = 'transform 600ms ' + EASE_OUT; lid.style.setProperty('--open', '0.55'); } });
          wait(1350).then(function () { if (!interacted && !taken) setLid(0, true); });
        });
      }, '0px');
      compEl.addEventListener('pointerdown', function () { interacted = true; }, { once: true });
    }
  }

  // Zweiter Bogen (Personalisieren) einfach zeichnen
  $$('[data-arc="custom"]').forEach(function (el) { new Arc(el); });

  // Sperrbildschirm: Mitteilung, Live Activity mit Countdown -------------
  var lock = $('#lockStage');
  if (lock) {
    var notif = $('#notif'), la = $('#la'), laDesc = $('#laDesc'), laStatus = $('#laStatus'), bar = $('#laBar');
    var DESC = {
      compact: 'Klein wie eine Mitteilung, mit Abhaken und Später.',
      progress: 'Dazu der Fortschritt des Tages als Kästchen.',
      large: 'Mit großem Countdown, Fortschrittsbalken und breiten Buttons.'
    };
    var remaining = 12 * 60, total = 15 * 60, timer = 0;
    function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
    function paint() {
      $$('[data-cd]', la).forEach(function (el) { el.textContent = fmt(remaining); });
      bar.style.width = Math.round((1 - remaining / total) * 100) + '%';
    }
    function tick() { if (remaining > 0) { remaining--; paint(); } }
    paint();
    onVisible(lock, function () {
      wait(reduce ? 0 : 450).then(function () { notif.classList.add('is-in'); });
      timer = setInterval(tick, 1000);
    });

    function morph(change) {
      var h0 = la.getBoundingClientRect().height;
      change();
      var h1 = la.getBoundingClientRect().height;
      if (!reduce && la.animate && Math.abs(h1 - h0) > 1) {
        la.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 380, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' });
      }
    }
    $$('.la-switch button', lock).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.la-switch button', lock).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        morph(function () { la.setAttribute('data-variant', b.getAttribute('data-v')); });
        laDesc.textContent = DESC[b.getAttribute('data-v')];
      });
    });
    function done() {
      notif.classList.add('is-gone');
      morph(function () { la.classList.add('is-done'); });
      laStatus.textContent = 'Als genommen eingetragen.';
      clearInterval(timer);
      wait(4500).then(function () {
        remaining = 12 * 60; paint();
        morph(function () { la.classList.remove('is-done'); });
        notif.classList.remove('is-gone');
        timer = setInterval(tick, 1000);
      });
    }
    function later() {
      remaining = 15 * 60; paint();
      laStatus.textContent = 'Erinnerung in 15 Minuten.';
      $$('[data-cd]', la).forEach(function (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); });
      notif.classList.add('is-gone');
      wait(3500).then(function () { notif.classList.remove('is-gone'); });
    }
    lock.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act]');
      if (!t) return;
      if (t.getAttribute('data-act') === 'take') done(); else later();
    });
  }

  // Widgets: abhaken im Widget, alle ziehen mit -------------------------
  var home = $('#home');
  if (home) {
    onVisible(home, function () { home.classList.add('is-in'); });
    var wTaken = false, wStatus = $('#wStatus');
    function setW(on) {
      wTaken = on;
      $$('[data-evening]', home).forEach(function (s) { s.classList.toggle('is-done', on); });
      $$('[data-count]', home).forEach(function (c) { c.textContent = on ? '2/2' : '1/2'; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); });
      $$('[data-count-long]', home).forEach(function (c) { c.textContent = on ? '2/2 genommen' : '1/2 genommen'; });
      $$('[data-next-name]', home).forEach(function (c) { c.textContent = on ? 'Alles erledigt' : 'Metformin 500 mg'; });
      $$('[data-next-time]', home).forEach(function (c) { c.textContent = on ? 'Heute · 2 von 2' : 'Heute · 21:00'; });
      $$('[data-w="next"] .wslot', home).forEach(function (s) { s.classList.toggle('is-done', on); });
      $$('[data-take]', home).forEach(function (b) {
        b.setAttribute('aria-disabled', String(on));
        $('span', b).textContent = on ? 'Erledigt' : 'Genommen';
        b.setAttribute('aria-label', on ? 'Erledigt. Noch mal tippen zum Zurücksetzen' : 'Genommen');
      });
      wStatus.textContent = on ? 'Metformin als genommen eingetragen. Alle Widgets zeigen 2 von 2.' : 'Zurückgesetzt.';
    }
    $$('[data-take]', home).forEach(function (b) { b.addEventListener('click', function () { setW(!wTaken); }); });
  }

  // Verlauf: Kalender mit Tagen zum Antippen ------------------------------
  var grid = $('#calGrid');
  if (grid) {
    var STATUS = {}; var i;
    for (i = 1; i <= 20; i++) STATUS[i] = 'ok';
    STATUS[6] = 'late'; STATUS[12] = 'part'; STATUS[17] = 'late'; STATUS[21] = 'today';
    var LABEL = { ok: 'pünktlich', late: 'verspätet', part: 'teilweise', today: 'heute, noch offen' };
    for (i = 0; i < 6; i++) grid.appendChild(document.createElement('span'));
    var idx = 0;
    for (i = 1; i <= 30; i++) {
      var st = STATUS[i];
      var el = document.createElement(st ? 'button' : 'span');
      el.className = 'd' + (st ? ' ' + st : '') + (i >= 27 ? ' warn' : '');
      el.textContent = i;
      el.style.setProperty('--i', idx++);
      if (st) {
        el.type = 'button';
        el.setAttribute('aria-label', i + '. November: ' + LABEL[st]);
        el.setAttribute('aria-pressed', String(i === 21));
        el.dataset.day = i;
      } else {
        el.setAttribute('aria-hidden', 'true');
      }
      grid.appendChild(el);
    }
    var log = $('#dayLog');
    function row(time, name, dose, sub, chip, label) {
      return '<div class="log-row" style="--i:' + (row.n++) + '"><span class="time">' + time + '</span><div><div class="med">' + name + '<small>' + dose + '</small></div><div class="sub">' + sub + '</div></div><span class="chip ' + chip + '">' + label + '</span></div>';
    }
    function showDay(day) {
      var st = STATUS[day]; row.n = 0;
      var wd = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][new Date(2026, 10, day).getDay()];
      var m1 = 2 + (day * 7) % 9, m2 = 1 + (day * 5) % 8;
      var a = row('7:00', 'L-Thyroxin', '50 µg', 'genommen um 7:0' + m1, 'ok', 'Genommen');
      var b;
      if (st === 'late') b = row('21:00', 'Metformin', '500 mg', 'genommen um 22:1' + m2, 'late', 'Verspätet');
      else if (st === 'part') b = row('21:00', 'Metformin', '500 mg', 'ausgelassen', 'skipped', 'Ausgelassen');
      else if (st === 'today') b = row('21:00', 'Metformin', '500 mg', '1 Tablette · zum Essen', 'open', 'Offen');
      else b = row('21:00', 'Metformin', '500 mg', 'genommen um 21:0' + m2, 'ok', 'Genommen');
      var count = st === 'part' ? '1 von 2' : (st === 'today' ? '1 von 2' : '2 von 2');
      log.innerHTML = '<div class="day-title"><b>' + (st === 'today' ? 'Heute' : wd + ', ' + day + '. Nov.') + '</b><span>' + count + '</span></div>' + a + b;
    }
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-day]');
      if (!b) return;
      $$('button[data-day]', grid).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      showDay(+b.dataset.day);
    });
    showDay(21);
    var cal = $('#cal');
    onVisible(cal, function () {
      cal.classList.add('is-in');
      $$('#stats b').forEach(function (b) { countUp(b, +b.dataset.to, b.dataset.suffix, 1100); });
    });
  }

  // Bestand: Packungsgröße einstellen, Vorrat auffüllen -------------------
  var stock = $('#stock');
  if (stock) {
    onVisible(stock, function () { stock.classList.add('is-in'); });
    var left = 5, perDay = 1, pack = 100, filled = false;
    var sizeEl = $('#packSize'), roll = $('#packRoll'), until = $('#refillUntil'), btn = $('#refillBtn');
    function preview() { until.textContent = 'bis ' + shortDate(addDays(Math.floor((left + pack) / perDay))); }
    function stepPack(d) {
      if (filled) return;
      var next = Math.max(10, Math.min(200, pack + d));
      if (next === pack) return;
      pack = next; sizeEl.textContent = pack;
      roll.classList.remove('up', 'down'); void roll.offsetWidth; roll.classList.add(d > 0 ? 'up' : 'down');
      preview();
    }
    $('#packPlus').addEventListener('click', function () { stepPack(10); });
    $('#packMinus').addEventListener('click', function () { stepPack(-10); });
    $('#refillSub').textContent = 'Metformin 500 mg · noch ' + left + ' Tabletten';
    preview();
    btn.addEventListener('click', function () {
      if (filled) return;
      filled = true;
      var count = left + pack, days = Math.floor(count / perDay);
      btn.setAttribute('aria-disabled', 'true');
      btn.textContent = 'Aufgefüllt';
      $('#refillSub').textContent = 'Metformin 500 mg · jetzt ' + count + ' Tabletten';
      var jar = $('#jarMetf');
      jar.style.setProperty('--fill', 'var(--accent)');
      var i = $('i', jar);
      i.style.transition = reduce ? 'none' : 'height 1300ms cubic-bezier(0.34, 1.2, 0.64, 1)';
      i.style.height = Math.min(92, 12 + days / 1.4) + '%';
      var jd = $('#jarMetfDays'); jd.style.color = 'var(--accent)';
      countUp(jd, days, ' T', 1200);
      // Jetzt reicht Vitamin D3 am kürzesten.
      var rd = $('#reachDays');
      rd.style.color = 'var(--accent)';
      if (!reduce && rd.animate) rd.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE_OUT });
      rd.textContent = '38 Tage';
      $('#reachSub').textContent = 'bis ' + shortDate(addDays(38)) + ' · Vitamin D3 1000 IE';
      $('#refillStatus').textContent = 'Vorrat aufgefüllt: ' + count + ' Tabletten, reicht ' + days + ' Tage.';
    });
  }

  // Personalisieren: Hintergründe und App-Symbole ------------------------
  var BDS = [
    ['moss', 'Moos'], ['deepSea', 'Tiefsee'], ['dusk', 'Dämmerung'], ['cognac', 'Cognac'], ['slate', 'Rauch'],
    ['p:leathergreen', 'Grünes Leder'], ['p:linen', 'Leinen'], ['p:marble', 'Marmor'], ['p:wood', 'Holz'],
    ['p:velvet', 'Samt'], ['p:travertine', 'Travertin'], ['p:onyx', 'Onyx'], ['p:slate', 'Schiefer']
  ];
  var ICS = [
    ['default', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel'], ['moss', 'Moos'], ['deepsea', 'Tiefsee'], ['dusk', 'Dämmerung'],
    ['cognac', 'Cognac'], ['leather', 'Leder'], ['leathergreen', 'Grünes Leder'], ['marble', 'Marmor'], ['wood', 'Holz'], ['saddle', 'Sattelleder'],
    ['linen', 'Leinen'], ['onyx', 'Onyx'], ['slate', 'Schiefer'], ['navy', 'Nachtblau'], ['graphite', 'Graphit'], ['plum', 'Pflaume']
  ];
  function makeBd(key) {
    var el = document.createElement('div');
    el.className = 'bd';
    if (key.indexOf('p:') === 0) {
      el.setAttribute('data-photo', '');
      el.style.setProperty('--photo', 'url(../img/backdrops/' + key.slice(2) + '.webp)');
    } else { el.setAttribute('data-bd', key); }
    return el;
  }
  var bdPicker = $('#bdPicker'), icPicker = $('#icPicker'), screen = $('#customScreen'), picked = $('#picked');
  if (bdPicker && screen) {
    var cur = { bd: 'Moos', ic: 'Automatisch' };
    function say() { picked.textContent = 'Hintergrund: ' + cur.bd + ' · Symbol: ' + cur.ic; }
    BDS.forEach(function (b, n) {
      var li = document.createElement('li'), btn = document.createElement('button');
      btn.type = 'button'; btn.setAttribute('aria-label', b[1]); btn.title = b[1];
      btn.setAttribute('aria-pressed', String(n === 0));
      btn.appendChild(makeBd(b[0]));
      btn.addEventListener('click', function () {
        $$('button', bdPicker).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
        var old = $(':scope > .bd', screen);
        var nu = makeBd(b[0]);
        nu.style.opacity = '0';
        old.after(nu);
        requestAnimationFrame(function () {
          nu.style.opacity = '1';
          wait(reduce ? 0 : 520).then(function () { old.remove(); });
        });
        cur.bd = b[1]; say();
      });
      li.appendChild(btn); bdPicker.appendChild(li);
    });
    var homeImg = $('#homeIcon .ic');
    ICS.forEach(function (c, n) {
      var li = document.createElement('li'), btn = document.createElement('button'), img = document.createElement('img');
      img.src = 'assets/img/app-icons/' + c[0] + '.webp'; img.alt = ''; img.loading = 'lazy'; img.width = 52; img.height = 52;
      btn.type = 'button'; btn.setAttribute('aria-label', 'Symbol ' + c[1]); btn.title = c[1];
      btn.setAttribute('aria-pressed', String(n === 0));
      btn.appendChild(img);
      btn.addEventListener('click', function () {
        $$('button', icPicker).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
        var old = $('img', homeImg), nu = document.createElement('img');
        nu.src = img.src; nu.alt = '';
        if (!reduce) { old.classList.add('is-old'); nu.classList.add('is-new'); }
        homeImg.appendChild(nu);
        wait(reduce ? 0 : 400).then(function () { old.remove(); });
        cur.ic = c[1]; say();
      });
      li.appendChild(btn); icPicker.appendChild(li);
    });
  }

  // Sichtbar werden beim Scrollen ------------------------------------------
  $$('.reveal, .stagger, .privacy-band').forEach(function (el) {
    if (reduce) { el.classList.add('is-in'); return; }
    onVisible(el, function () { el.classList.add('is-in'); });
  });
  $$('.stagger').forEach(function (list) {
    $$(':scope > *', list).forEach(function (child, n) { child.style.setProperty('--i', n); });
  });

  // Download: Symbol wechselt durch die Varianten ------------------------
  var cycle = $('#iconCycle');
  if (cycle && !reduce) {
    var order = ['default', 'leathergreen', 'deepsea', 'dusk', 'marble', 'cognac', 'navy', 'linen', 'plum', 'moss'];
    var pos = 0, running = null;
    function next() {
      pos = (pos + 1) % order.length;
      var img = document.createElement('img');
      img.src = 'assets/img/app-icons/' + order[pos] + '.webp'; img.alt = '';
      cycle.appendChild(img);
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        var prev = $('img.is-on', cycle);
        img.classList.add('is-on');
        if (prev) { prev.classList.remove('is-on'); wait(700).then(function () { prev.remove(); }); }
      }); });
    }
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !running) running = setInterval(next, 2400);
        if (!e.isIntersecting && running) { clearInterval(running); running = null; }
      });
    });
    cio.observe(cycle);
  }
})();
