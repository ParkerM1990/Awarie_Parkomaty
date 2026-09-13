(() => {
  const labelRe = /zape(?:ł|l)nienie/i;

  function hideFillUi() {
    document.querySelectorAll('#deviceFill').forEach(el => {
      el.hidden = true;
      el.style.display = 'none';
    });

    document.querySelectorAll('small,label,span,div,p,th,td').forEach(el => {
      const ownText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent || '')
        .join(' ')
        .trim();

      if (!ownText || !labelRe.test(ownText)) return;

      const parent = el.parentElement;
      if (parent && parent.children.length <= 4 && !parent.matches('#routeView,#deviceView,.device-card,.card')) {
        parent.style.display = 'none';
      } else {
        el.style.display = 'none';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideFillUi, { once: true });
  } else {
    hideFillUi();
  }

  const observer = new MutationObserver(() => requestAnimationFrame(hideFillUi));
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
