/* ============================================
   Donations - Form handling & EuPlatesc flow
   Reads createPaymentUrl from config.json
   (loaded by progress.js into window.__cfg)
   ============================================ */

(function () {
  'use strict';

  function getPaymentUrl() {
    return (window.__cfg && window.__cfg.createPaymentUrl) || '';
  }

  function setButtonLoading(btn, loading) {
    btn.disabled = loading;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Se procesează...';
    } else {
      btn.textContent = btn.dataset.originalText || btn.textContent;
    }
  }

  function submitDonation(formData) {
    var url = getPaymentUrl();
    if (!url || url.indexOf('YOUR_PROJECT') !== -1) {
      alert('Plățile nu sunt configurate încă. Verifică config.json.');
      return;
    }

    var btn = formData._submitBtn;
    setButtonLoading(btn, true);

    var body = {
      donation_type: formData.donation_type,
      amount: parseInt(formData.amount, 10),
      donor_name: formData.donor_name,
      donor_email: formData.donor_email,
      donor_phone: formData.donor_phone,
    };

    if (formData.ambassador) {
      body.ambassador = formData.ambassador;
    }

    if (formData.donation_type === 'campaign' && window.__campaignId) {
      body.campaign_id = window.__campaignId;
    }

    var anonKey = (window.__cfg && window.__cfg.supabasePublishableKey) || '';

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + anonKey,
        'apikey': anonKey,
      },
      body: JSON.stringify(body),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.redirect) {
          window.location.href = data.redirect;
        } else if (data.error) {
          alert('Eroare: ' + data.error);
          setButtonLoading(btn, false);
        }
      })
      .catch(function (err) {
        console.error('Payment error:', err);
        alert('A apărut o eroare. Te rugăm să încerci din nou.');
        setButtonLoading(btn, false);
      });
  }

  // Family donation form
  var familyForm = document.getElementById('familyDonationForm');
  if (familyForm) {
    familyForm.addEventListener('submit', function (e) {
      e.preventDefault();
      submitDonation({
        donation_type: document.getElementById('familyDonationType').value,
        amount: document.getElementById('familyAmount').value,
        donor_name: document.getElementById('familyName').value.trim(),
        donor_email: document.getElementById('familyEmail').value.trim(),
        donor_phone: document.getElementById('familyPhone').value.trim(),
        ambassador: document.getElementById('familyAmbassador').value,
        _submitBtn: document.getElementById('familySubmitBtn'),
      });
    });
  }

  // Festive meal donation form
  var festiveForm = document.getElementById('festiveDonationForm');
  if (festiveForm) {
    festiveForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var amount = parseInt(document.getElementById('festiveAmount').value, 10);
      if (!amount || amount < 10) {
        alert('Suma minimă este 10 lei.');
        return;
      }
      submitDonation({
        donation_type: 'campaign',
        amount: amount,
        donor_name: document.getElementById('festiveName').value.trim(),
        donor_email: document.getElementById('festiveEmail').value.trim(),
        donor_phone: document.getElementById('festivePhone').value.trim(),
        ambassador: document.getElementById('festiveAmbassador').value,
        _submitBtn: document.getElementById('festiveSubmitBtn'),
      });
    });
  }
})();
