/* Aimbridge Energy — main navigation.
   Disclosure pattern: buttons toggle their panel (aria-expanded). Escape closes the innermost open
   panel and returns focus. Products is two-level (change log #5): category buttons open a flyout
   beside the list (desktop/tablet) or a nested list in place (phone). */
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var navToggle = header.querySelector('.nav-toggle');
  var subToggles = toArray(header.querySelectorAll('.sub-toggle'));
  var catToggles = toArray(header.querySelectorAll('.cat-toggle'));
  var desktop = window.matchMedia('(min-width: 900px)');   // matches the CSS Menu-button breakpoint
  var mouse = window.matchMedia('(hover: hover) and (pointer: fine)');

  function toArray(list) { return Array.prototype.slice.call(list); }
  function isOpen(btn) { return btn.getAttribute('aria-expanded') === 'true'; }
  function flyoutOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }

  // ---- category flyouts
  function setCat(btn, open) {
    btn.setAttribute('aria-expanded', String(open));
    btn.parentNode.classList.toggle('open', open);
  }
  function closeCats(except) {
    catToggles.forEach(function (b) { if (b !== except) setCat(b, false); });
  }
  function placeFlyouts(panel) {
    // flyouts open to the right; if there is no room, the whole panel switches them (and its arrows) to the left
    panel.classList.remove('fly-left');
    if (!desktop.matches) return;
    var flyWidth = 266;
    if (panel.getBoundingClientRect().right + flyWidth > document.documentElement.clientWidth - 8) {
      panel.classList.add('fly-left');
    }
  }

  // ---- top-level dropdowns (Products, Contact)
  function setSub(btn, open) {
    btn.setAttribute('aria-expanded', String(open));
    btn.parentNode.classList.toggle('open', open);
    var panel = btn.parentNode.querySelector('.subnav-products');
    if (!panel) return;
    if (open) { placeFlyouts(panel); openCurrentCategory(btn.parentNode); }
    else closeCats();
  }
  function closeSubs(except) {
    subToggles.forEach(function (b) { if (b !== except) setSub(b, false); });
  }
  function openCurrentCategory(li) {
    // on a product page, open that product's category when Products is opened
    var current = li.querySelector('.flyout a[aria-current="page"]');
    if (current) setCat(current.closest('.cat').querySelector('.cat-toggle'), true);
  }

  // ---- phone menu
  function setMenu(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    header.classList.toggle('nav-open', open);
    if (!open) closeSubs();
  }

  // mark the current page inside dropdowns (before any panel opens)
  var here = location.pathname;
  toArray(header.querySelectorAll('.subnav a')).forEach(function (a) {
    if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  });

  subToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = !isOpen(btn);
      closeSubs(btn);
      setSub(btn, open);
    });
    // desktop: close a dropdown when keyboard focus leaves it
    btn.parentNode.addEventListener('focusout', function (e) {
      if (desktop.matches && !btn.parentNode.contains(e.relatedTarget)) setSub(btn, false);
    });
  });

  catToggles.forEach(function (btn) {
    var li = btn.parentNode;
    btn.addEventListener('click', function (e) {
      // a mouse click on desktop always opens (hover may already have opened it);
      // keyboard (detail 0) and touch/phone toggle
      var viaMouse = e.detail > 0 && desktop.matches && mouse.matches;
      var open = viaMouse ? true : !isOpen(btn);
      closeCats(btn);
      setCat(btn, open);
    });
    li.addEventListener('mouseenter', function () {
      if (desktop.matches && mouse.matches) { closeCats(btn); setCat(btn, true); }
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' && desktop.matches) {
        e.preventDefault();
        closeCats(btn);
        setCat(btn, true);
        flyoutOf(btn).querySelector('a').focus();
      }
    });
    flyoutOf(btn).addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' && desktop.matches) {
        e.preventDefault();
        setCat(btn, false);
        btn.focus();
      }
    });
  });

  // hovering a plain row (Coming Soon category) closes any open flyout
  toArray(header.querySelectorAll('.cat:not(.has-fly)')).forEach(function (li) {
    li.addEventListener('mouseenter', function () {
      if (desktop.matches && mouse.matches) closeCats();
    });
  });

  navToggle.addEventListener('click', function () { setMenu(!isOpen(navToggle)); });

  document.addEventListener('click', function (e) {
    if (!header.contains(e.target)) { closeSubs(); setMenu(false); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var cat = catToggles.filter(isOpen)[0];
    var sub = subToggles.filter(isOpen)[0];
    if (cat && cat.parentNode.contains(document.activeElement) && document.activeElement !== cat) {
      setCat(cat, false); cat.focus();            // inside a flyout: back to its category
    } else if (sub) {
      setSub(sub, false); sub.focus();            // inside a dropdown: back to Products / Contact
    } else if (header.classList.contains('nav-open')) {
      setMenu(false); navToggle.focus();          // phone menu
    }
  });

  desktop.addEventListener('change', function () { setMenu(false); closeSubs(); });
})();

/* Homepage product panel (change log #84): show one product per page load, chosen at random but never the
   same one twice in a row. Without JavaScript (or storage) the first product stays visible. */
(function () {
  var items = document.querySelectorAll('[data-hero-product]');
  if (items.length < 2) return;
  var key = 'aimbridge-hero-product', last = -1, pick;
  try { last = parseInt(localStorage.getItem(key), 10); } catch (e) {}
  if (last >= 0 && last < items.length) {
    pick = Math.floor(Math.random() * (items.length - 1));
    if (pick >= last) pick += 1;            // skip the one shown last time
  } else {
    pick = Math.floor(Math.random() * items.length);
  }
  Array.prototype.forEach.call(items, function (el, i) { el.hidden = i !== pick; });
  try { localStorage.setItem(key, String(pick)); } catch (e) {}
})();

/* Product gallery (change log #20): one view at a time; arrows, dots, swipe (native horizontal
   scroll-snap, which leaves vertical page scrolling alone) and left/right arrow keys. No auto-rotation. */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.product-gallery'), function (gallery) {
    var track = gallery.querySelector('.gallery-track');
    var slides = gallery.querySelectorAll('.gallery-slide');
    var dots = gallery.querySelectorAll('.gallery-dot');
    var status = gallery.querySelector('[role="status"]');
    var index = 0, settle;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    function mark(i) {
      index = i;
      Array.prototype.forEach.call(dots, function (d, n) { d.setAttribute('aria-pressed', String(n === i)); });
      status.textContent = slides[i].getAttribute('aria-label');
    }
    function show(i) {
      i = (i + slides.length) % slides.length;
      mark(i);
      track.scrollTo({ left: i * track.clientWidth, behavior: reduce.matches ? 'auto' : 'smooth' });
    }
    Array.prototype.forEach.call(gallery.querySelectorAll('[data-gallery-step]'), function (b) {
      b.addEventListener('click', function () { show(index + Number(b.getAttribute('data-gallery-step'))); });
    });
    Array.prototype.forEach.call(dots, function (d) {
      d.addEventListener('click', function () { show(Number(d.getAttribute('data-gallery-index'))); });
    });
    gallery.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        show(index + (e.key === 'ArrowRight' ? 1 : -1));
      }
    });
    track.addEventListener('scroll', function () {   // swipe / trackpad: follow where the track settles
      clearTimeout(settle);
      settle = setTimeout(function () {
        mark(Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth))));
      }, 120);
    }, { passive: true });
    window.addEventListener('resize', function () { track.scrollTo({ left: index * track.clientWidth }); });
  });
})();

/* Inquiry forms (change log #6). Preview mode: nothing is sent anywhere. A submit (after the browser's
   required-field checks pass) only reports that the message was not sent. The inquiry type can be
   preselected by ?inquiry=<value> in the page address or by a link with data-inquiry. */
(function () {
  var forms = document.querySelectorAll('form.inquiry-form');
  if (!forms.length) return;
  var params = new URLSearchParams(location.search);
  var wanted = params.get('inquiry');
  var wantedProduct = params.get('product');   // support form: preselect the product from a product page link

  function select(form, value) {
    var sel = form.querySelector('select[name="inquiry_type"]');
    if (!sel || !value) return;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === value) { sel.value = value; return; }
    }
  }

  Array.prototype.forEach.call(forms, function (form) {
    form.querySelector('[type="submit"]').disabled = false;
    select(form, wanted);
    var prod = form.querySelector('select[name="product"]');
    if (prod && wantedProduct) {
      for (var i = 0; i < prod.options.length; i++) {
        if (prod.options[i].value === wantedProduct) { prod.value = wantedProduct; break; }
      }
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      status.textContent = 'Not sent. This preview form is not connected yet, so your message was not delivered.';
      status.hidden = false;
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('a[data-inquiry]'), function (link) {
    link.addEventListener('click', function () {
      var target = document.querySelector(link.getAttribute('href'));
      var form = target && target.querySelector('form.inquiry-form');
      if (form) select(form, link.getAttribute('data-inquiry'));
    });
  });
})();

/* Policy pages: the Contents list starts closed on narrow screens; the Print button appears only with JavaScript. */
(function () {
  var toc = document.querySelector('.policy-toc details');
  if (toc && !window.matchMedia('(min-width: 900px)').matches) toc.open = false;
  var btn = document.querySelector('.policy-print-btn');
  if (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function () { window.print(); });
  }
})();
