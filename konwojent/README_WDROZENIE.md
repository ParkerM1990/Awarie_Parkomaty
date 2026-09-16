# CPG Inkasacja — wersja produkcyjna V2

W tej wersji aplikacja jest rozdzielona na dwa niezależne fronty:

- `planista/` — pełna aplikacja do Terminal Balance, wyboru parkomatów, optymalizacji, mapy przed publikacją i historii konwojów. Ten katalog zawiera `terminals-data.js` i integrację Microsoft 365.
- `konwojent/` — lekka aplikacja realizacyjna. Nie zawiera `terminals-data.js`, konfiguracji Microsoft 365 ani danych prognozowanych o stanie gotówki. Dostaje wyłącznie urządzenia opublikowane dla konkretnego konwoju.

## WAŻNE — aktualizacja Apps Script

Nowe funkcje historii, blokady równoczesnej pracy i wersjonowania wymagają nowego `Code.gs` z katalogu głównego tej paczki.

W Google Apps Script:
1. Otwórz istniejący projekt CPG Inkasacja.
2. Zastąp zawartość `Code.gs` plikiem z tej paczki.
3. Nie zmieniaj Script Property `PLANNER_PIN`.
4. Wybierz **Deploy -> Manage deployments -> Edit -> New version -> Deploy**.
5. Użyj tego samego wdrożenia Web App. Jeżeli adres `/exec` się nie zmieni, nie trzeba zmieniać `google-config.js`.

Po aktualizacji `health` zwraca wersję `cpg-convoy-google-v2`.

## Co zostało dodane

### 1. Oddzielny Planista i Konwojent

Planista publikuje link kierujący do:
`https://parkerm1990.github.io/Awarie_Parkomaty/konwojent/`

Adres jest ustawiony w `planista/google-config.js` jako `executorUrl` i można go zmienić.

**Nie publikuj katalogu `planista/` w publicznym repozytorium**, jeśli ma zawierać pełną bazę `terminals-data.js`. Publicznie może być hostowany katalog `konwojent/`.

### 2. Historia opublikowanych konwojów

W Planista -> Przygotuj konwój jest sekcja **Opublikowane konwoje**. Po podaniu PIN-u planisty pobierana jest lista z prywatnego folderu Google Drive. Dla każdego konwoju można skopiować link albo go otworzyć. Zakończony konwój otwiera ekran raportu z dotychczasową funkcją pobrania Excel.

PIN nie jest przesyłany w adresie URL. Front pobiera jednorazowe wyzwanie, oblicza SHA-256 z PIN-u i wyzwania, a serwer wydaje krótkotrwały token administracyjny.

### 3. Synchronizacja offline

Każda niezapisana zmiana konwojenta jest zapisywana lokalnie jako najnowszy oczekujący stan konwoju. Pasek synchronizacji pokazuje:
- zapisano w Google,
- zapisywanie,
- brak Internetu — dane czekają na synchronizację,
- konflikt / inne urządzenie.

Po powrocie Internetu aplikacja automatycznie próbuje zapisać oczekujące dane.

### 4. Ochrona przed równoczesną pracą

Po otwarciu aktywnego konwoju aplikacja konwojenta rezerwuje go dla bieżącej sesji. Rezerwacja jest odnawiana co minutę i wygasa po około 3 minutach bez kontaktu.

Jeżeli drugi telefon lub druga karta przeglądarki otworzy ten sam aktywny konwój, otrzyma tryb tylko do odczytu. Dodatkowo każdy zapis ma numer rewizji. Jeżeli mimo pracy offline pojawi się nowsza wersja na serwerze, aplikacja nie nadpisuje jej automatycznie — pokazuje przycisk **Wczytaj najnowsze**.

## Dane publikowane dla konwojenta

Payload w Google został ograniczony do danych potrzebnych do realizacji: ID, adres/lokalizacja, GPS, status, plomba, faktycznie wybrana gotówka, QR, uwagi i dane zakończenia. Prognozowany `Coin - Balance`, pełna baza terminali i metadane źródłowe Planisty nie są publikowane do aplikacji Konwojenta.

## Cache PWA

Planista: `cpg-inkasacja-planista-20260915-v11`
Konwojent: `cpg-inkasacja-konwojent-20260915-v11`


## Endpoint Apps Script
Aktualny endpoint: `https://script.google.com/macros/s/AKfycbzzAeEoP0QSE--wy3NgYB7Cxs7_oNJverCGZ-D2B-sn-3TcxGjJ8eK8ZTEF2U9HWNoc/exec`
