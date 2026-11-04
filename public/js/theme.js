// Runs in <head> before first paint so the saved theme never flashes. Classic script (no module) on purpose.
(function () {
  try {
    var t = localStorage.getItem('tot-theme')
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t)
  } catch (e) { /* storage blocked: fall back to the system theme */ }
})()
