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
