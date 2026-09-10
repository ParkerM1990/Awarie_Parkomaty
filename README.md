# CPG Inkasacja v3 — optymalizacja po drogach

Mobilny prototyp PWA do obsługi inkasacji parkomatów bez klucza Google.

## Najważniejsze funkcje
- import Excel/CSV z listą parkomatów, adresem, GPS, gotówką i zapełnieniem,
- wybór do 40 urządzeń według największej szacowanej ilości gotówki,
- kolejność urządzeń optymalizowana według orientacyjnego czasu przejazdu po rzeczywistych drogach,
- mapa trasy prowadzona po ulicach na danych OpenStreetMap/OSRM,
- ponowne przeliczenie pozostałej trasy od aktualnej pozycji telefonu,
- prowadzenie do kolejnego urządzenia w Apple Maps lub Google Maps przez zwykły link,
- oznaczenie: opróżniono / nie można zainkasować,
- obowiązkowy numer plomby dla opróżnionego urządzenia,
- skanowanie QR z kwotą fizycznie wybranej gotówki albo wpis ręczny,
- zapis postępu lokalnie i eksport/wznowienie przez plik JSON,
- końcowy raport Excel.

## Raport Excel
Raport końcowy zawiera jeden arkusz i tylko 5 kolumn:
1. Lp.
2. Numer parkomatu
3. Adres parkomatu
4. Numer plomby
5. Kwota fizycznie wybranej gotówki [PLN]

Urządzenia, których nie udało się opróżnić, pozostają na liście z pustym numerem plomby i pustą kwotą.

## Optymalizacja trasy po drogach
Przy tworzeniu trasy aplikacja wysyła współrzędne punktu startowego i wybranych parkomatów do publicznego serwera OSRM. Pobierana jest macierz orientacyjnych czasów przejazdu samochodem pomiędzy punktami. Na tej macierzy aplikacja układa kolejność urządzeń metodą najbliższego czasu przejazdu i dodatkowo poprawia ją iteracyjnie, aby skrócić całą trasę.

Po kliknięciu „Przelicz od mojej pozycji” analogicznie układane są ponownie tylko pozostałe do wykonania urządzenia, od aktualnej pozycji GPS telefonu.

Jeżeli publiczny serwer drogowy jest chwilowo niedostępny, aplikacja nie blokuje pracy: przechodzi automatycznie na awaryjną optymalizację według odległości GPS.

Publiczny OSRM jest dobrym rozwiązaniem do pilotażu, ale nie zapewnia gwarantowanego SLA produkcyjnego. Nie uwzględnia również korków na żywo.

## QR
Obsługiwane przykłady:
- `2840,50`
- `KWOTA=2840,50`
- `PLN: 2840.50`
- `{"amount":2840.50,"id":"RA-101"}`

Jeśli QR zawiera numer urządzenia, aplikacja porównuje go z aktualnie otwartym parkomatem.

## Uruchomienie
Do pełnego testu aparatu, GPS i PWA aplikacja powinna działać przez HTTPS, np. na GitHub Pages. Po pierwszym uruchomieniu telefon poprosi o zgodę na aparat i lokalizację.


## v4 – edycja listy planowanych parkomatów
Przed rozpoczęciem trasy aplikacja pokazuje osobny ekran planu z kolumnami: Lp., ID parkomatu, lokalizacja i adres. Użytkownik może poprawić pola, zmienić kolejność pozycji, usunąć urządzenie albo dodać inne z wczytanego pliku. Dopiero po zatwierdzeniu planu aplikacja optymalizuje kolejność przejazdu po drogach.


## Uproszczone kryterium wyboru
Parametr „waga zapełnienia” został usunięty. Procent zapełnienia może być nadal pokazany informacyjnie, ale lista planowanych urządzeń jest wybierana wyłącznie według szacowanej ilości gotówki.


## v5 – lista planowanych parkomatów dla konwojentów
Na ekranie planu dodano przycisk „Pobierz listę planowanych parkomatów (Excel)”. Plik zawiera wyłącznie cztery kolumny: Lp., ID parkomatu, Lokalizacja i Adres.

Po wyznaczeniu trasy na ekranie trasy dostępny jest również przycisk „Lista dla konwojentów”. Ten eksport wykorzystuje już kolejność urządzeń po optymalizacji trasy, więc liczba porządkowa odpowiada planowanej kolejności przejazdu.
