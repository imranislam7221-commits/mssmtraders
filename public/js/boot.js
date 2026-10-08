/* ---------- init ---------- */
router();

document.addEventListener('click', function (e) { document.querySelectorAll('.pdrop').forEach(function (d) { if (!d.parentElement.contains(e.target)) d.style.display = 'none'; }); });
