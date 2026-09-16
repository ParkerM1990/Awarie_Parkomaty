// Usuwa z widocznego interfejsu wszystkie informacje o poziomie/procencie
// zapelnienia parkomatu, pozostawiajac wewnetrzne dane dla zgodnosci ze starszym app.js.
(() => {
  const labelRe = /zape(?:ł|l)nienie|poziom\s+zape(?:ł|l)nienia|procent\s+zape(?:ł|l)nienia/i;

  function hide(el){
    if(!el) return;
    el.hidden = true;
    el.style.setProperty('display', 'none', 'important');
  }

  function hideFillUi() {
    // Widok szczegolow - app.js nadal wpisuje tu wartosc, ale element pozostaje ukryty.
    document.querySelectorAll('#deviceFill').forEach(hide);

    // Lista trasy: starszy app.js generuje procent jako .amount > .sub (np. "74%").
    // To jest jedyne takie pole wewnatrz kolumny kwoty, wiec mozemy je usunac bez
    // ukrywania lokalizacji/adresu ani postepu trasy.
    document.querySelectorAll('.device-row .amount > .sub').forEach(hide);

    // Zabezpieczenie dla ewentualnych etykiet tekstowych w innych miejscach UI.
    document.querySelectorAll('small,label,span,div,p,th,td').forEach(el => {
      const ownText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent || '')
        .join(' ')
        .trim();
      if(ownText && labelRe.test(ownText)) hide(el);
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
