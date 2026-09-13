CPG Inkasacja - poprawka Google Maps do 50 punktow

Co zmieniono:
- przycisk "Google Maps (do 50)" nie ogranicza sie juz do pierwszych 10 parkomatow,
- do 50 pozostalych punktow jest dzielonych automatycznie na odcinki po maks. 10,
- odcinki zachowuja kolejnosc trasy,
- kazdy kolejny odcinek zaczyna sie od ostatniego punktu poprzedniego,
- dodano prosty mobilny panel wyboru odcinka,
- podbito cache service workera.

Wazne:
Google Maps URLs maja limit punktow posrednich w jednym linku, dlatego 50 punktow nie da sie wiarygodnie wyswietlic jako jedna trasa w pojedynczym linku bez uzycia platnego/kluczowanego API. Ta poprawka obsluguje cala trase przez maks. 5 kolejnych odcinkow.

Pliki do podmiany/dodania w repozytorium:
- index.html
- styles.css
- sw.js
- route50.js (nowy)

app.js pozostaje bez zmian.

Zmiana: usunięto całkowicie widoczny procent zapełnienia parkomatu z interfejsu. Pole techniczne pozostaje ukryte wyłącznie dla zgodności z app.js.
