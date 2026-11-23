// Settings → Attackfee: live show/hide for the payouts rows (before saving), Withdraw disabled in Test
// mode, while there is no address, or while the payment server is down, and Show/Hide for the secret.
(function () {
  var root = document.getElementById('attackfee-settings');
  if (!root) return;
  var pay = document.getElementById('attackfee-payouts');
  var be = document.getElementById('attackfee-connection');
  var psa = document.getElementById('attackfee-server-url');
  var inv = document.getElementById('attackfee-invoice');
  var wd = document.getElementById('attackfee-withdraw');
  var wasDown = root.classList.contains('down');
  function sync() {
    var srv = be.value === 'server';
    root.classList.toggle('down', wasDown && pay.checked && srv && !!psa.value.trim());
    root.classList.toggle('payouts', pay.checked);
    root.classList.toggle('server', srv);
    root.classList.toggle('noaddr', !srv || !psa.value.trim()); // Test mode is work-only: no balance
    var off = root.classList.contains('noaddr') || root.classList.contains('down');
    inv.disabled = off;
    wd.disabled = off;
  }
  pay.addEventListener('change', sync);
  be.addEventListener('change', sync);
  psa.addEventListener('input', sync);
  sync();
  var sec = document.getElementById('attackfee-secret');
  var show = document.getElementById('attackfee-show');
  show.addEventListener('click', function () {
    var hidden = sec.type === 'password';
    sec.type = hidden ? 'text' : 'password';
    show.textContent = hidden ? show.dataset.hide : show.dataset.show;
  });
})();
