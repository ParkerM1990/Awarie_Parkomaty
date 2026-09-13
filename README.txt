CPG Inkasacja - poprawka mobilna: nawigacja Google Maps + brak zapelnienia

ZMIANY:
1. Usunieto z widocznego interfejsu ostatnia informacje o procencie zapelnienia parkomatu.
   Starszy app.js moze nadal przechowywac pole fill wewnetrznie, ale nie jest ono nigdzie wyswietlane.
2. Przycisk "Nawigacja Google Maps (do 50)" dzieli trase na odcinki po maks. 10 parkomatow.
3. Google Maps NIE dostaje stalego punktu poczatkowego KOR 48.
4. Kazdy odcinek otwiera sie z parametrem dir_action=navigate i bez origin, dzieki czemu
   Google Maps korzysta z biezacej lokalizacji telefonu i moze uruchomic prowadzenie.
5. Adres KOR 48 pozostaje w aplikacji CPG tylko jako baza do obliczenia/optymalizacji trasy.
6. Zmieniono wersje cache PWA, aby telefon pobral nowe pliki.

PODMIEN W REPOZYTORIUM:
- index.html
- styles.css
- sw.js
- route50.js
- hide-fill.js

Pliku app.js nie trzeba zmieniac.
