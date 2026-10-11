/* ---------- init ---------- */
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  window.mstDeferredPrompt = e;
  var pwaBtn = document.getElementById('btnPwaInstall');
  if (pwaBtn) pwaBtn.style.display = 'inline-block';
});

router();

document.addEventListener('click', function (e) { document.querySelectorAll('.pdrop').forEach(function (d) { if (!d.parentElement.contains(e.target)) d.style.display = 'none'; }); });
