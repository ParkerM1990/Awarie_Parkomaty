# CPG Inkasacja v3

Mobilny prototyp PWA do obsługi inkasacji parkomatów bez płatnych API i bez kluczy Google.

## Nowości v3
- raport końcowy w Excelu (`.xlsx`) zamiast PDF,
- osobna kolumna „Szacowana gotówka” i „Wybrana gotówka”,
- automatyczna kolumna różnicy między kwotą szacowaną i faktyczną,
- suma faktycznie wybranej gotówki na pulpicie i w podsumowaniu,
- skanowanie kodu QR aparatem telefonu przy każdym parkomacie,
- możliwość ręcznego wpisania kwoty, jeżeli QR nie może zostać zeskanowany,
- oznaczenie w raporcie, czy kwota pochodziła z QR czy z wpisu ręcznego,
- opcjonalna kontrola numeru urządzenia, jeśli ID jest zapisane w kodzie QR,
- numer plomby pozostaje obowiązkowy dla urządzenia oznaczonego „Opróżniono”,
- zachowana obsługa urządzeń pominiętych, notatek, OneDrive/JSON, GPS i nawigacji bez kluczy API.

## Obsługiwane formaty QR
Najprostszy kod może zawierać samą kwotę, np. `2840,50`. Obsługiwane są również m.in.:
- `KWOTA=2840,50`
- `PLN: 2840.50`
- JSON: `{"amount":2840.50,"id":"RA-101"}`

Jeśli QR zawiera `id`, aplikacja porównuje je z numerem aktualnie otwartego urządzenia i ostrzega przy niezgodności.

## Raport Excel
Plik zawiera arkusze:
1. `Podsumowanie` — czas trasy, liczba urządzeń, kwota szacowana i faktycznie wybrana.
2. `Urządzenia` — numer, lokalizacja, GPS, kwoty, różnica, zapełnienie, status, plomba, powód pominięcia, uwagi, czas obsługi i źródło kwoty.

## Uruchomienie
Do testu interfejsu na komputerze można otworzyć `index.html`. Do skanowania aparatem i GPS aplikacja powinna być uruchomiona przez HTTPS, np. na GitHub Pages. Po pierwszym użyciu Safari/Chrome poprosi o zgodę na aparat i lokalizację.

## OneDrive
Dane robocze są przechowywane lokalnie w przeglądarce. Eksport sesji JSON i raport Excel można zapisać do OneDrive przez systemowy dialog plików.


## Raport Excel - uproszczony układ
Raport koncowy zawiera jeden arkusz i tylko 5 kolumn: Lp., Numer parkomatu, Adres parkomatu, Numer plomby, Kwota fizycznie wybranej gotowki [PLN]. Urzadzenia niewykonane pozostaja na liscie z pustym numerem plomby i pusta kwota.
