// Dosano: Bewegung und Vorführungen für neu.html. Ohne JavaScript ist alles
// lesbar; hier kommt nur Bewegung dazu. Bei "Bewegung reduzieren" springen
// alle Zustände direkt, ohne Flug, Feder oder Schwung.
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var iconUse = document.querySelector('use[href*="icons.svg"]');
  var ICONS = iconUse ? iconUse.getAttribute('href').split('#')[0] : 'assets/img/icons.svg';
  // Sprache der Seite: Englisch unter /en/, sonst Deutsch. Begriffe wie in der englischen App.
  var EN = (document.documentElement.lang || '').indexOf('en') === 0;
  function t(de, en) { return EN ? en : de; }
  // Pfad zur Wurzel der Website ("" oder "../"), aus der Symbol-Datei abgeleitet
  var BASE = ICONS.split('assets/')[0];
  var EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
  var POP = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

  function safe(fn) {
    try { fn(); } catch (err) { if (window.console) console.error('Dosano:', err); }
  }
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
    if (EN) {
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ', ' +
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getDate();
    }
    var wd = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'][d.getDay()];
    var mo = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'][d.getMonth()];
    return wd + ', ' + d.getDate() + '. ' + mo;
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

  // Sichtbar werden beim Scrollen ------------------------------------------
  $$('.reveal, .stagger, .privacy-band').forEach(function (el) {
    if (reduce) { el.classList.add('is-in'); return; }
    onVisible(el, function () { el.classList.add('is-in'); });
  });
  $$('.stagger').forEach(function (list) {
    $$(':scope > *', list).forEach(function (child, n) { child.style.setProperty('--i', n); });
  });

  // Auftritt der Seite ------------------------------------------------------
  function ready() { document.body.classList.add('is-ready'); }
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, wait(600)]).then(ready);
  } else { ready(); }

  // Schriftzug im Hero: Das Logo erscheint am Ende des Namens und fährt an
  // seinen Platz als "D". Dabei deckt es "osano" hinter sich auf, wie der
  // Ladebildschirm der App.
  safe(function () {
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
  });

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
  safe(function () {
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
          status.textContent = t('Metformin als genommen eingetragen. Für heute alles erledigt, 8 Tage in Folge.', 'Metformin logged as taken. All done for today, 8 days in a row.');
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
        status.textContent = t('Zurückgesetzt.', 'Reset.');
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
  });

  // Zweiter Bogen (Personalisieren) einfach zeichnen
  safe(function () {
    $$('[data-arc="custom"]').forEach(function (el) { new Arc(el); });
  });

  // Sperrbildschirm: Mitteilung, Live Activity mit Countdown -------------
  safe(function () {
    var lock = $('#lockStage');
    if (lock) {
      var la = $('#la'), laDesc = $('#laDesc'), laStatus = $('#laStatus'), bar = $('#laBar');
      var DESC = {
        compact: t('Klein wie eine Mitteilung, mit Abhaken und Später.', 'As small as a notification, with check off and Later.'),
        progress: t('Dazu der Fortschritt des Tages als Kästchen.', "Plus the day's progress as little boxes."),
        large: t('Mit großem Countdown, Fortschrittsbalken und breiten Buttons.', 'With a large countdown, progress bar and wide buttons.')
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
        morph(function () { la.classList.add('is-done'); });
        laStatus.textContent = t('Als genommen eingetragen.', 'Logged as taken.');
        clearInterval(timer);
        wait(4500).then(function () {
          remaining = 12 * 60; paint();
          morph(function () { la.classList.remove('is-done'); });
          timer = setInterval(tick, 1000);
        });
      }
      function later() {
        remaining = 15 * 60; paint();
        laStatus.textContent = t('Erinnerung in 15 Minuten.', 'Reminder in 15 minutes.');
        $$('[data-cd]', la).forEach(function (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); });
      }
      lock.addEventListener('click', function (e) {
        var t = e.target.closest('[data-act]');
        if (!t) return;
        if (t.getAttribute('data-act') === 'take') done(); else later();
      });
    }
  });

  // Widgets: abhaken im Widget, alle ziehen mit -------------------------
  safe(function () {
    var home = $('#home');
    if (home) {
      $$('.hs-cell', home).forEach(function (c, n) { c.style.setProperty('--i', n); });
      onVisible(home, function () { home.classList.add('is-in'); });
      var wTaken = false, wStatus = $('#wStatus');
      function setW(on) {
        wTaken = on;
        $$('[data-evening]', home).forEach(function (slot) {
          slot.classList.toggle('current', !on); slot.classList.toggle('done', on);
          $('.sc', slot).classList.toggle('is-open', on);
        });
        $$('[data-count]', home).forEach(function (c) { c.textContent = on ? '2/2' : '1/2'; c.classList.remove('pulse-num'); void c.offsetWidth; c.classList.add('pulse-num'); });
        $$('[data-count-long]', home).forEach(function (c) { c.textContent = on ? t('2/2 genommen', '2/2 taken') : t('1/2 genommen', '1/2 taken'); });
        $$('[data-next-head]', home).forEach(function (c) { c.textContent = on ? t('Heute', 'Today') : t('Als Nächstes', 'Up next'); });
        $$('[data-next-body]', home).forEach(function (c) { c.hidden = on; });
        $$('[data-next-done]', home).forEach(function (c) {
          c.hidden = !on;
          if (on && !reduce && c.animate) c.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE_OUT });
        });
        wStatus.textContent = on ? t('Metformin als genommen eingetragen. Alle Widgets zeigen 2 von 2.', 'Metformin logged as taken. All widgets show 2 of 2.') : '';
      }
      $$('[data-take]', home).forEach(function (b) { b.addEventListener('click', function () { setW(true); }); });
      // Nach einer Weile wieder zurück, damit man es noch einmal ausprobieren kann.
      home.addEventListener('click', function (e) {
        if (wTaken && e.target.closest('.wg') && !e.target.closest('[data-take]')) setW(false);
      });
    }
  });

  // Verlauf: Kalender wie in der App, Tage zum Antippen --------------------
  safe(function () {
    var grid = $('#calGrid');
    if (grid) {
      var ICO = function (n) { return '<svg aria-hidden="true"><use href="' + ICONS + '#' + n + '"/></svg>'; };
      var STATUS = {}; var i;
      for (i = 1; i <= 20; i++) STATUS[i] = 'perfect';
      STATUS[6] = 'allTaken'; STATUS[12] = 'partial'; STATUS[17] = 'allTaken'; STATUS[21] = 'open';
      var LABEL = EN ? { perfect: 'everything taken on time', allTaken: 'everything taken, some late', partial: 'partly taken', open: 'still open' }
        : { perfect: 'alles pünktlich genommen', allTaken: 'alles genommen, manches verspätet', partial: 'teilweise genommen', open: 'noch offen' };
      var WD = EN ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        : ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      for (i = 0; i < 6; i++) grid.appendChild(document.createElement('span'));
      for (i = 1; i <= 30; i++) {
        var st = STATUS[i] || 'future', short = i >= 27;
        var cell = document.createElement(STATUS[i] ? 'button' : 'span');
        cell.className = 'h-cell';
        var c = document.createElement('span');
        c.className = 'h-day-c ' + st + (i === 21 ? ' today' : '') + (short ? ' short' : '');
        c.textContent = i;
        c.style.setProperty('--i', i);
        c.setAttribute('aria-hidden', 'true');
        cell.appendChild(c);
        if (STATUS[i]) {
          cell.type = 'button';
          cell.setAttribute('aria-label', (i === 21 ? t('Heute, ', 'Today, ') : '') + WD[new Date(2026, 10, i).getDay()] + ', ' + t(i + '. November', 'November ' + i) + ': ' + LABEL[st]);
          cell.setAttribute('aria-pressed', String(i === 21));
          cell.dataset.day = i;
        } else {
          cell.setAttribute('aria-hidden', 'true');
        }
        grid.appendChild(cell);
      }
      var log = $('#dayLog');
      function row(time, name, dose, sub, chip) {
        return '<div class="h-row"><span class="t">' + time + '</span><div class="n"><b>' + name + '<small>' + dose + '</small></b><div>' + sub + '</div></div>' + chip + '</div>';
      }
      function chip(kind, icon, text) { return '<span class="ochip ' + kind + '">' + ICO(icon) + text + '</span>'; }
      function showDay(day) {
        var st = STATUS[day];
        var d = new Date(2026, 10, day);
        var title = (day === 21 ? t('Heute · ', 'Today · ') : (day === 20 ? t('Gestern · ', 'Yesterday · ') : '')) + WD[d.getDay()] + ', ' + t(day + '. November', 'November ' + day);
        var m1 = 2 + (day * 7) % 8, m2 = 1 + (day * 5) % 8;
        var a = row(t('7:00', '7:00 AM'), 'L-Thyroxin', '50 µg', t('1 Tablette · nüchtern', '1 tablet · on an empty stomach'), chip('ok', 'i-tick', t('7:0' + m1, '7:0' + m1 + ' AM')));
        var b;
        if (st === 'allTaken') b = row(t('21:00', '9:00 PM'), 'Metformin', '500 mg', t('1 Tablette · zum Essen', '1 tablet · with food'), chip('late', 'i-clock', t('22:1' + m2, '10:1' + m2 + ' PM')));
        else if (st === 'partial') b = row(t('21:00', '9:00 PM'), 'Metformin', '500 mg', t('1 Tablette · zum Essen', '1 tablet · with food'), chip('skip', 'i-xmark', t('Ausgelassen', 'Skipped')));
        else if (st === 'open') b = row(t('21:00', '9:00 PM'), 'Metformin', '500 mg', t('1 Tablette · zum Essen', '1 tablet · with food'), chip('open', 'i-circle-dashed', t('Offen', 'Open')));
        else b = row(t('21:00', '9:00 PM'), 'Metformin', '500 mg', t('1 Tablette · zum Essen', '1 tablet · with food'), chip('ok', 'i-tick', t('21:0' + m2, '9:0' + m2 + ' PM')));
        var count = (st === 'partial' || st === 'open') ? t('1 von 2', '1 of 2') : t('2 von 2', '2 of 2');
        log.innerHTML = '<div class="h-daycard"><div class="h-dh"><b>' + title + '</b><span>' + count + '</span></div>' + a + b + '</div>';
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
  });

  // Bestand wie in der App: Fläschchen, Liste, Blatt "Packung nachgekauft" ----
  safe(function () {
    var stock = $('#stock');
    if (stock) {
      onVisible(stock, function () { stock.classList.add('is-in'); });
      var MEDS = [
        { id: 'ibu', name: 'Ibuprofen', strength: '400 mg', short: 'Ibuprofen', pill: 'white', stock: 0, perDay: 0, pack: 20, low: 5 },
        { id: 'metf', name: 'Metformin', strength: '500 mg', short: 'Metformin', pill: '', stock: 5, perDay: 1, pack: 100, low: 7 },
        { id: 'vitd', name: 'Vitamin D3', strength: t('1000 IE', '1000 IU'), short: 'Vitamin', pill: 'yellow', stock: 38, perDay: 1, pack: 60, low: 7 },
        { id: 'thyr', name: 'L-Thyroxin', strength: '50 µg', short: 'L-Thyroxin', pill: 'teal', stock: 64, perDay: 1, pack: 100, low: 7 }
      ];
      var START = MEDS.map(function (m) { return m.stock; });
      var ICO = function (n) { return '<svg aria-hidden="true"><use href="' + ICONS + '#' + n + '"/></svg>'; };
      function days(m) { return m.perDay ? Math.floor(m.stock / m.perDay) : null; }
      function level(m) { if (m.stock <= 0) return 'empty'; var d = days(m); return (d !== null ? d <= m.low : m.stock <= m.low) ? 'low' : 'ok'; }
      function ratio(m) { return Math.min(1, m.stock / Math.max(m.pack, 1)); }
      function tage(n) { return n === 1 ? t('1 Tag', '1 day') : n + t(' Tage', ' days'); }
      function tabs(n) { return n + (n === 1 ? t(' Tablette', ' tablet') : t(' Tabletten', ' tablets')); }
      function daysText(m) { var d = days(m); return d === null ? tabs(m.stock) : t('noch ' + tage(d), tage(d) + ' left'); }
      function order() {
        return MEDS.slice().sort(function (a, b) {
          function rem(m) { if (m.stock <= 0) return -1; var d = days(m); return d !== null ? d / 30 : m.stock / m.pack; }
          return rem(a) - rem(b);
        });
      }
      var sum = $('#stSum'), vials = $('#vials'), list = $('#stList');
      function render() {
        var meds = order();
        var withDays = meds.filter(function (m) { return days(m) !== null; });
        var next = withDays.reduce(function (a, m) { return !a || days(m) < days(a) ? m : a; }, null);
        var refillCount = meds.filter(function (m) { return level(m) !== 'ok'; }).length;
        var nd = days(next), lv = level(next);
        var until = t('bis ', 'until ') + shortDate(addDays(nd)) + ' · ' + next.name + ' ' + next.strength;
        if (refillCount > 1) until += ' · ' + refillCount + t(' werden knapp', ' running low');
        sum.innerHTML = '<small>' + t('Reicht noch', 'Lasts') + '</small><b class="' + (lv === 'ok' ? '' : lv) + '">' + tage(nd) + '</b><span>' + until + '</span>';
        vials.innerHTML = meds.map(function (m) {
          var lv2 = level(m), d = days(m);
          var col = lv2 === 'ok' ? 'var(--accent)' : (lv2 === 'low' ? 'var(--amber)' : 'var(--red-fill)');
          return '<div class="vial" data-med="' + m.id + '"><i class="p ' + m.pill + '"></i><span class="vial-body' + (m.stock <= 0 ? ' empty' : '') + '"><i style="--r:' + ratio(m).toFixed(3) + ';--c:' + col + '"></i></span>' +
            '<b class="' + (lv2 === 'ok' ? '' : lv2) + '">' + (d === null ? m.stock : d + t(' T', ' d')) + '</b><span>' + m.short + '</span></div>';
        }).join('');
        list.innerHTML = meds.map(function (m) {
          var lv2 = level(m);
          return '<div class="srow" data-med="' + m.id + '"><div class="srow-top"><i class="p ' + m.pill + '"></i><span class="srow-name">' + m.name + ' ' + m.strength + '</span>' +
            '<span class="srow-days ' + (lv2 === 'ok' ? '' : lv2) + '">' + daysText(m) + '</span>' + ICO('i-chev-right') + '</div>' +
            '<span class="wg-bar paper"><i class="' + (lv2 === 'ok' ? '' : lv2) + '" style="--r:' + ratio(m).toFixed(3) + '"></i></span>' +
            '<div class="srow-bottom"><span>' + t(tabs(m.stock) + ' übrig', tabs(m.stock) + ' left') + '</span><button type="button" class="rbtn ' + (lv2 === 'ok' ? '' : lv2) + (m.id === 'metf' && !refilledOnce ? ' hint' : '') + '" data-refill="' + m.id + '">' + ICO('i-plus') + t('Nachgekauft', 'Bought more') + '</button></div></div>';
        }).join('');
      }
      var refilledOnce = false;
      render();

      // Blatt "Packung nachgekauft"
      var sheet = $('#rsheet'), dim = $('#sheetDim'), chips = $('#rsChips'), amountEl = $('#rsAmount');
      var cur = null, amount = 0, lastFocus = null;
      function sheetFill() {
        var after = cur.stock + amount, d = cur.perDay ? Math.floor(after / cur.perDay) : null;
        var lvNow = level(cur), dNow = days(cur);
        $('#rsName').innerHTML = cur.name + '<small>' + cur.strength + '</small>';
        var now = $('#rsNow');
        now.textContent = t('Noch ' + tabs(cur.stock), tabs(cur.stock) + ' left') + (dNow !== null ? t(' · reicht ', ' · lasts ') + tage(dNow) : '');
        now.className = 'rs-now ' + (lvNow === 'ok' ? '' : lvNow);
        amountEl.textContent = amount;
        $('#rsAfter').textContent = tabs(after);
        $('#rsDays').textContent = d !== null ? t('reicht ', 'lasts ') + tage(d) : '';
        $('#rsBar').style.setProperty('--r', Math.min(1, after / Math.max(cur.pack, after, 1)).toFixed(3));
        $('#rsGoText').textContent = t(tabs(amount) + ' auffüllen', 'Add ' + tabs(amount));
        $$('button', chips).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.n === amount)); });
      }
      function openSheet(id) {
        cur = MEDS.filter(function (m) { return m.id === id; })[0];
        amount = cur.pack;
        var sizes = [cur.pack].concat([20, 30, 50, 100].filter(function (n) { return n !== cur.pack; }));
        chips.innerHTML = sizes.map(function (n) { return '<button type="button" data-n="' + n + '">' + (n === cur.pack ? n + t(' · deine Packung', ' · your package') : n) + '</button>'; }).join('');
        sheetFill();
        lastFocus = document.activeElement;
        sheet.hidden = false;
        requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('is-open'); dim.classList.add('is-on'); }); });
        wait(reduce ? 0 : 200).then(function () { $('#rsGo').focus({ preventScroll: true }); });
      }
      function closeSheet() {
        sheet.classList.remove('is-open'); dim.classList.remove('is-on');
        wait(reduce ? 0 : 430).then(function () { sheet.hidden = true; });
        if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
      }
      chips.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        amount = +b.dataset.n; sheetFill();
        amountEl.classList.remove('pulse-num'); void amountEl.offsetWidth; amountEl.classList.add('pulse-num');
      });
      $('#rsClose').addEventListener('click', closeSheet);
      dim.addEventListener('click', closeSheet);
      sheet.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
      $('#rsGo').addEventListener('click', function () {
        var m = cur;
        m.stock += amount; refilledOnce = true;
        closeSheet();
        wait(reduce ? 0 : 250).then(function () {
          render();
          var row = $('.srow[data-med="' + m.id + '"]', list);
          if (row && !reduce && row.animate) row.animate([{ backgroundColor: 'color-mix(in srgb, var(--accent) 14%, transparent)' }, { backgroundColor: 'transparent' }], { duration: 1400, easing: 'ease-out' });
          $('#stockReset').hidden = false;
          $('#refillStatus').textContent = t(m.name + ' aufgefüllt: jetzt ' + tabs(m.stock) + (m.perDay ? ', reicht ' + tage(days(m)) : '') + '.', m.name + ' refilled: now ' + tabs(m.stock) + (m.perDay ? ', lasts ' + tage(days(m)) : '') + '.');
        });
      });
      list.addEventListener('click', function (e) {
        var b = e.target.closest('[data-refill]'); if (b) openSheet(b.dataset.refill);
      });
      $('#stockReset').addEventListener('click', function () {
        MEDS.forEach(function (m, n) { m.stock = START[n]; });
        refilledOnce = false; render();
        this.hidden = true;
        $('#refillStatus').textContent = t('Zurückgesetzt.', 'Reset.');
      });
    }
  });

  // Personalisieren: Hintergründe und App-Symbole ------------------------
  safe(function () {
    // Namen wie in der App (Deutsch / Englisch)
    var BDS = [
      ['moss', t('Moos', 'Moss')], ['deepSea', t('Tiefsee', 'Deep sea')], ['dusk', t('Dämmerung', 'Dusk')], ['cognac', 'Cognac'], ['slate', t('Rauch', 'Smoke')],
      ['p:leathergreen', t('Grünes Leder', 'Green leather')], ['p:linen', t('Leinen', 'Linen')], ['p:marble', t('Marmor', 'Marble')], ['p:wood', t('Holz', 'Wood')],
      ['p:velvet', t('Samt', 'Velvet')], ['p:travertine', t('Travertin', 'Travertine')], ['p:onyx', 'Onyx'], ['p:slate', t('Schiefer', 'Slate')]
    ];
    var ICS = [
      ['default', t('Automatisch', 'Automatic')], ['light', t('Hell', 'Light')], ['dark', t('Dunkel', 'Dark')], ['moss', t('Moos', 'Moss')], ['deepsea', t('Tiefsee', 'Deep sea')], ['dusk', t('Dämmerung', 'Dusk')],
      ['cognac', 'Cognac'], ['leather', t('Leder', 'Leather')], ['leathergreen', t('Grünes Leder', 'Green leather')], ['marble', t('Marmor', 'Marble')], ['wood', t('Holz', 'Wood')], ['saddle', t('Sattelleder', 'Saddle leather')],
      ['linen', t('Leinen', 'Linen')], ['onyx', 'Onyx'], ['slate', t('Schiefer', 'Slate')], ['navy', t('Nachtblau', 'Night blue')], ['graphite', t('Graphit', 'Graphite')], ['plum', t('Pflaume', 'Plum')]
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
      var cur = { bd: BDS[0][1], ic: ICS[0][1] };
      function say() { picked.textContent = t('Hintergrund: ', 'Background: ') + cur.bd + t(' · Symbol: ', ' · Icon: ') + cur.ic; }
      BDS.forEach(function (b, n) {
        var li = document.createElement('li'), btn = document.createElement('button');
        btn.type = 'button'; btn.setAttribute('aria-label', b[1]); btn.title = b[1];
        btn.setAttribute('aria-pressed', String(n === 0));
        btn.appendChild(makeBd(b[0]));
        btn.addEventListener('click', function () {
          $$('button', bdPicker).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
          // Neue Schicht immer als oberste einfügen und alle älteren danach entfernen.
          var layers = $$(':scope > .bd', screen);
          var nu = makeBd(b[0]);
          nu.style.opacity = '0';
          layers[layers.length - 1].after(nu);
          requestAnimationFrame(function () { requestAnimationFrame(function () { nu.style.opacity = '1'; }); });
          wait(reduce ? 0 : 520).then(function () {
            if (nu.parentNode) layers.forEach(function (l) { if (l.parentNode) l.parentNode.removeChild(l); });
          });
          cur.bd = b[1]; say();
        });
        li.appendChild(btn); bdPicker.appendChild(li);
      });
      var homeImg = $('#homeIcon .ic');
      ICS.forEach(function (c, n) {
        var li = document.createElement('li'), btn = document.createElement('button'), img = document.createElement('img');
        img.src = BASE + 'assets/img/app-icons/' + c[0] + '.webp'; img.alt = ''; img.loading = 'lazy'; img.width = 52; img.height = 52;
        btn.type = 'button'; btn.setAttribute('aria-label', t('Symbol ', 'Icon ') + c[1]); btn.title = c[1];
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
  });

  // Download: Symbol wechselt durch die Varianten ------------------------
  safe(function () {
    var cycle = $('#iconCycle');
    if (cycle && !reduce) {
      var order = ['default', 'leathergreen', 'deepsea', 'dusk', 'marble', 'cognac', 'navy', 'linen', 'plum', 'moss'];
      var pos = 0, running = null;
      function next() {
        pos = (pos + 1) % order.length;
        var img = document.createElement('img');
        img.src = BASE + 'assets/img/app-icons/' + order[pos] + '.webp'; img.alt = '';
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
  });

  document.documentElement.classList.add('js-ok');
})();
