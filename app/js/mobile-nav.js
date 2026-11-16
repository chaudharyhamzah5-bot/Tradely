/* mobile-nav.js - bottom navbar for phones: [Accounts] [Pages drop-up] [Settings].
   Built from the existing sidebar buttons, so it works on tradely.html and terminal.html without duplicating the page list. */
(function () {
  var mq = window.matchMedia('(max-width: 767px)');
  var CFG = { home: (document.body.dataset.mnavHome||'nav-accounts-overview'), label: (document.body.dataset.mnavLabel||'Accounts'), icon: (document.body.dataset.mnavIcon||'wallet'), match: (document.body.dataset.mnavMatch||'^nav-(accounts|forex)') };
  var side, bar, pop, scrim, bAcc, bMid, bSet, built = false;

  function iconName(el) {
    if (!el) return 'circle';
    var n = el.getAttribute('data-lucide'); if (n) return n;
    var m = /lucide-([a-z0-9-]+)/.exec(el.getAttribute('class') || ''); return m ? m[1] : 'circle';
  }
  function colorCls(el) { var m = /text-[a-z]+-\d+/.exec((el && el.getAttribute('class')) || ''); return m ? m[0] : ''; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function icons() { try { if (window.lucide) window.lucide.createIcons(); } catch (e) {} }

  function activeId() { var a = side.querySelector('.nav-item.active-tab'); return a ? a.id : ''; }
  function updateActive() {
    if (!built) return;
    var id = activeId();
    var acc = new RegExp(CFG.match).test(id), set = id === 'nav-settings';
    bAcc.classList.toggle('on', acc);
    bSet.classList.toggle('on', set);
    bMid.classList.toggle('on', !acc && !set && !!id);
    [].forEach.call(pop.querySelectorAll('.mnav-item[data-nav]'), function (b) { b.classList.toggle('on', b.getAttribute('data-nav') === id); });
  }

  function renderPop() {
    var html = '', id = activeId();
    [].forEach.call(side.querySelectorAll('nav'), function (nav) {
      var sec = nav.previousElementSibling, items = '';
      [].forEach.call(nav.querySelectorAll('.nav-item'), function (b) {
        if (b.id === 'nav-settings') return;
        var ic = b.querySelector('[data-lucide], svg'), sp = b.querySelector('span');
        var custom = ic && ic.tagName.toLowerCase() === 'svg' && !ic.getAttribute('data-lucide') && !/lucide/.test(ic.getAttribute('class') || '');
        var icHtml = custom ? ic.outerHTML : '<i data-lucide="' + iconName(ic) + '" class="' + colorCls(ic) + '"></i>';
        items += '<button type="button" class="mnav-item' + (b.id === id ? ' on' : '') + '" data-nav="' + esc(b.id) + '">' + icHtml + '<span>' + esc(sp ? sp.textContent.trim() : b.textContent.trim()) + '</span></button>';
      });
      if (!items) return;
      html += '<div class="mnav-sec">' + esc(sec ? sec.textContent.trim() : '') + '</div><div class="mnav-grid">' + items + '</div>';
    });
    var pb = document.getElementById('profile-btn');
    if (pb) {
      var nm = pb.querySelector('.text-white');
      html += '<button type="button" class="mnav-item mnav-prof" data-prof="1"><i data-lucide="user-round" class="text-gray-400"></i><span>' + esc(nm ? nm.textContent.trim() : 'Profile') + '</span></button>';
    }
    pop.innerHTML = html;
    icons();
  }

  function setOpen(o) {
    if (o) renderPop();
    pop.classList.toggle('open', o); scrim.classList.toggle('open', o); bMid.classList.toggle('open', o);
    bMid.setAttribute('aria-expanded', o ? 'true' : 'false');
  }
  function isOpen() { return pop.classList.contains('open'); }
  function go(sidebarId) { var b = document.getElementById(sidebarId); if (b) b.click(); }

  function build() {
    if (built) return;
    side = document.getElementById('sidebar');
    var root = document.querySelector('.app-root');
    if (!side || !root) return;
    bar = document.createElement('nav'); bar.id = 'mnav'; bar.setAttribute('aria-label', 'Main');
    bar.innerHTML =
      '<button type="button" class="mnav-btn" id="mnav-acc" aria-label="' + esc(CFG.label) + '"><i data-lucide="' + esc(CFG.icon) + '"></i><span>' + esc(CFG.label) + '</span></button>' +
      '<button type="button" class="mnav-btn mid" id="mnav-mid" aria-label="All pages" aria-haspopup="true" aria-expanded="false"><i data-lucide="layout-grid"></i><span class="mnav-mid-row">Pages <i data-lucide="chevron-up" class="chev"></i></span></button>' +
      '<button type="button" class="mnav-btn" id="mnav-set" aria-label="Settings"><i data-lucide="settings"></i><span>Settings</span></button>';
    pop = document.createElement('div'); pop.id = 'mnav-pop'; pop.setAttribute('role', 'menu');
    scrim = document.createElement('div'); scrim.id = 'mnav-scrim';
    root.appendChild(bar); document.body.appendChild(scrim); document.body.appendChild(pop);
    bAcc = bar.querySelector('#mnav-acc'); bMid = bar.querySelector('#mnav-mid'); bSet = bar.querySelector('#mnav-set');
    built = true;

    bAcc.onclick = function () { setOpen(false); go(CFG.home); };
    bSet.onclick = function () { setOpen(false); go('nav-settings'); };
    bMid.onclick = function () { setOpen(!isOpen()); };
    scrim.onclick = function () { setOpen(false); };
    pop.onclick = function (e) {
      var t = e.target.closest('.mnav-item'); if (!t) return;
      setOpen(false);
      if (t.getAttribute('data-prof')) { var pb = document.getElementById('profile-btn'); if (pb) pb.click(); return; }
      go(t.getAttribute('data-nav'));
    };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) setOpen(false); });
    mq.addEventListener && mq.addEventListener('change', function () { if (!mq.matches) setOpen(false); });
    new MutationObserver(updateActive).observe(side, { subtree: true, attributes: true, attributeFilter: ['class'] });
    icons(); updateActive();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  window.addEventListener('load', function () { icons(); updateActive(); });
})();
