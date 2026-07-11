// MIT Vanta — SW registration
// Uses a RELATIVE path so the proxy works whether the files are at the root
// (https://user.github.io/) or in a subdirectory (https://user.github.io/myproxy/).
(async function () {
  if (!('serviceWorker' in navigator)) {
    document.dispatchEvent(new CustomEvent('vanta:error', { detail: 'No service worker support' }));
    return;
  }
  try {
    // './sw.js' = relative to index.html → works at any deploy path
    var reg = await navigator.serviceWorker.register('./sw.js', {
      // scope = same directory as sw.js (the default) — covers /service/ paths
      updateViaCache: 'none',
    });

    // Activate immediately on update
    function tryActivate(sw) {
      if (sw.state === 'installed') sw.postMessage({ type: 'SKIP_WAITING' });
      sw.addEventListener('statechange', function () {
        if (sw.state === 'installed') sw.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    if (reg.waiting)   tryActivate(reg.waiting);
    if (reg.installing) tryActivate(reg.installing);
    reg.addEventListener('updatefound', function () {
      if (reg.installing) tryActivate(reg.installing);
    });

    await navigator.serviceWorker.ready;
    document.dispatchEvent(new CustomEvent('vanta:ready'));
  } catch (err) {
    document.dispatchEvent(new CustomEvent('vanta:error', { detail: err.message }));
  }
})();
