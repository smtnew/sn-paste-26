/* ============================================
   Main UI: Modals, Carousel, Smooth Scroll
   ============================================ */

(function () {
  'use strict';

  // ---- Modal Management ----
  const modals = {
    family: document.getElementById('modalFamily'),
    festive: document.getElementById('modalFestive'),
  };

  function openModal(type, amount) {
    const modal = modals[type];
    if (!modal) return;

    if (type === 'family' && amount) {
      document.getElementById('familyModalAmount').textContent = amount;
      document.getElementById('familyAmount').value = amount;
      document.getElementById('familyDonationType').value = 'family_' + amount;
      document.getElementById('familySubmitAmount').textContent = amount;

      const descriptions = {
        150: 'Lumină pentru început — pachet alimentar de bază',
        250: 'Lumină care aduce liniște — pachet alimentar extins',
        400: 'Lumină deplină — pachet alimentar complet',
      };
      document.getElementById('familyModalDesc').textContent =
        descriptions[amount] || 'Pachet alimentar pentru o familie nevoiașă';
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function closeAllModals() {
    Object.values(modals).forEach(closeModal);
  }

  // Open modal buttons
  document.querySelectorAll('[data-open-modal]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var type = this.dataset.openModal;
      var amount = this.dataset.amount || null;
      openModal(type, amount);
    });
  });

  // Close modal buttons & overlay
  document.querySelectorAll('[data-close-modal]').forEach(function (el) {
    el.addEventListener('click', function () {
      var modal = this.closest('.modal');
      if (modal) closeModal(modal);
    });
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllModals();
  });

  // ---- Carousel ----
  var track = document.querySelector('.carousel__track');
  var prevBtn = document.querySelector('.carousel__btn--prev');
  var nextBtn = document.querySelector('.carousel__btn--next');

  if (track && prevBtn && nextBtn) {
    var slideWidth = function () {
      var slide = track.querySelector('.carousel__slide');
      if (!slide) return 300;
      return slide.offsetWidth + 20; // gap
    };

    prevBtn.addEventListener('click', function () {
      track.scrollBy({ left: -slideWidth(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', function () {
      track.scrollBy({ left: slideWidth(), behavior: 'smooth' });
    });

    // Touch swipe support
    var startX = 0;
    var scrollStart = 0;

    track.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      scrollStart = track.scrollLeft;
    }, { passive: true });

    track.addEventListener('touchmove', function (e) {
      var dx = startX - e.touches[0].clientX;
      track.scrollLeft = scrollStart + dx;
    }, { passive: true });
  }

  // ---- Amount Presets (Festive Modal) ----
  var presetBtns = document.querySelectorAll('.amount-btn[data-preset]');
  var customAmountInput = document.getElementById('festiveCustomAmount');
  var festiveAmountHidden = document.getElementById('festiveAmount');
  var festiveSubmitAmount = document.getElementById('festiveSubmitAmount');

  function setFestiveAmount(amount) {
    festiveAmountHidden.value = amount;
    festiveSubmitAmount.textContent = amount;
  }

  presetBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      presetBtns.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      customAmountInput.value = '';
      setFestiveAmount(this.dataset.preset);
    });
  });

  if (customAmountInput) {
    customAmountInput.addEventListener('input', function () {
      if (this.value && parseInt(this.value) > 0) {
        presetBtns.forEach(function (b) { b.classList.remove('active'); });
        setFestiveAmount(this.value);
      }
    });
  }

  // ---- Ambassador Select Population ----
  fetch('ambassadors.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var selects = [
        document.getElementById('familyAmbassador'),
        document.getElementById('festiveAmbassador'),
      ];
      selects.forEach(function (sel) {
        if (!sel) return;
        sel.innerHTML = '';
        data.ambassadors.forEach(function (name) {
          var opt = document.createElement('option');
          opt.value = name === 'Nici unul' ? '' : name;
          opt.textContent = name;
          sel.appendChild(opt);
        });
      });
    })
    .catch(function () { /* silently fail — default option already in HTML */ });

  // ---- Smooth Scroll for anchor links ----
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (this.dataset.openModal) return; // skip modal triggers
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
