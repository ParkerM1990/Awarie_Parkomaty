# CPG Inkasacja — Planista + Konwojent

Wersja z inteligentnym wyborem parkomatów, importem `Terminal Balance.xlsx`, bazą GPS terminali, optymalizacją OSRM, obsługą QR i raportem Excel.

## Przepływ pracy

- **Planista:** Terminal Balance → próg gotówki → liczba parkomatów → inteligentny wybór → optymalizacja → publikacja do Google.
- **Konwojent:** otwiera udostępniony link → pobiera gotowy plan → rozpoczyna trasę → wpisuje plomby/kwoty/statusy → postęp synchronizuje się do Google.
- **Microsoft 365:** opcjonalny i potrzebny tylko planiście, jeśli ma automatycznie pobierać najnowszy `Terminal Balance`.

Konfiguracja wspólnego Google Drive jest opisana w `README_GOOGLE_APPS_SCRIPT.md`.


## QR gotówki
Skaner rozpoznaje kwoty zapisane m.in. jako `1,60 zł`, `1,60 zl`, `1,60 PLN` oraz format parkomatu `1,60 z_`.


## Automatyczna numeracja plomb

Konwojent wpisuje numer plomby ręcznie przy pierwszym zainkasowanym urządzeniu, np. `A12738`. Przy następnym urządzeniu aplikacja automatycznie proponuje `A12739`, następnie `A12740` itd. Zachowywany jest prefiks i liczba cyfr, np. `A00127` → `A00128`, `CPG-0099` → `CPG-0100`. Podpowiedź jest zawsze edytowalna; po ręcznej zmianie dalsza numeracja jest kontynuowana od ostatniego faktycznie zapisanego numeru. Pominięte urządzenie nie zużywa numeru plomby.

## Poprawka automatycznej numeracji plomb — 2026-09-15

Po zapisaniu pierwszego obsłużonego parkomatu aplikacja zapamiętuje faktycznie użyty numer plomby i przy następnym urządzeniu automatycznie wpisuje numer zwiększony o 1. Sekwencja jest zapisywana lokalnie oraz w danych synchronizowanych do Google, więc działa także po ponownym otwarciu trasy. Konwojent może ręcznie zmienić proponowany numer; od zmienionej wartości liczona jest kolejna plomba. Pominięcie urządzenia nie zużywa numeru plomby.


## Warstwa wizualna CPG

Interfejs został dostosowany do Brandbooka City Parking Group 2025: oryginalne logo CPG, kolory Bonnie blue `#009FE3`, French blue `#1E75BA`, Pirate black `#333333`, Gunmetal `#5C5C5C`, Bright smoke `#E6EBEE` i biel. Typografia odwołuje się do rodziny Metropolis z bezpiecznymi fallbackami systemowymi.


## Poprawka logo
Logo CPG jest osadzone bezpośrednio w `index.html` jako obraz PNG (data URI), dzięki czemu nie zależy od katalogu `assets` i ładuje się także przy prostym hostingu statycznym.


## Zmiana widoku mapy — 15.09.2026
- Konwojent nie widzi mapy z zaznaczoną trasą w aplikacji.
- Pozostają przyciski nawigacyjne i odnośniki do Google Maps / Apple Maps.
- Mapa podglądu jest dostępna wyłącznie planiscie przed opublikowaniem konwoju.
- Po skutecznej publikacji mapa jest ukrywana również w widoku planisty.


- **Bezpieczeństwo publikacji:** planista podaje PIN przy każdej próbie publikacji trasy; PIN nie jest zapamiętywany w przeglądarce.


## Publikacja konwoju — ekran postępu

Po podaniu PIN-u planisty aplikacja pokazuje pełnoekranowy status publikacji: wysyłanie planu, potwierdzanie zapisu w Google oraz wynik końcowy. Przycisk publikacji jest w tym czasie blokowany, aby uniknąć podwójnego wysłania.

## Ponowne pobranie raportu zakończonego konwoju
Po zakończeniu konwoju jego końcowy stan (lista parkomatów, numery plomb, faktycznie wybrane kwoty, statusy i czasy) jest zapisywany w Google. Ten sam link konwojenta może zostać otwarty później przez planistę lub inną uprawnioną osobę posiadającą link/kod. Jeżeli konwój ma status `completed`, aplikacja otwiera ekran zakończonego konwoju z podsumowaniem, listą parkomatów oraz przyciskiem ponownego wygenerowania i pobrania raportu Excel.
