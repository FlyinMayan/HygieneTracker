const bar = document.getElementById('pageLoader');

document.querySelectorAll('a[href]').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || e.metaKey || e.ctrlKey || e.shiftKey) return;
    bar.classList.add('loading');
  });
});

// Reset if user navigates back via bfcache
window.addEventListener('pageshow', e => {
  if (e.persisted) bar.classList.remove('loading');
});
