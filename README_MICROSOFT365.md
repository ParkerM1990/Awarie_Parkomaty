# CPG Inkasacja — wspólny konwój Planista / Konwojent

## Co zmienia ta wersja

Aplikacja ma dwa tryby:

1. **Planista** — wybiera datę, wczytuje Terminal Balance ręcznie albo pobiera najnowszy plik z Microsoft 365, tworzy i optymalizuje trasę, a następnie publikuje plan.
2. **Konwojent** — otwiera tę samą stronę, wybiera datę i pobiera gotową trasę. Nie wgrywa ponownie Terminal Balance i nie generuje planu od początku. Po kliknięciu „Rozpocznij konwój” aplikacja zapisuje postęp po każdej zmianie urządzenia.

KOR 48 nadal służy tylko do obliczania początkowego planu. Nawigacja Google Maps korzysta z bieżącej pozycji telefonu.

## Wspólny magazyn danych

Do pracy dwóch osób na różnych urządzeniach potrzebny jest wspólny magazyn Microsoft 365. Najlepiej użyć **biblioteki dokumentów SharePoint/Teams** widocznej dla obu pracowników. Technicznie jest ona obsługiwana przez ten sam Microsoft Graph co OneDrive.

Nie zaleca się używania prywatnego OneDrive jednego pracownika jako docelowego magazynu produkcyjnego.

Domyślne foldery:

- `CPG/Inkasacja/Terminal Balance` — źródłowe raporty XLSX/XLS/CSV,
- `CPG/Inkasacja/Plany` — opublikowane plany `Konwoj_RRRR-MM-DD.json` i bieżący postęp.

Folder `Plany` aplikacja może utworzyć sama. Folder ze źródłowym Terminal Balance powinien wskazywać miejsce, do którego trafiają raporty.

## Jednorazowa konfiguracja Microsoft Entra ID

1. Administrator Microsoft 365 rejestruje aplikację typu **Single-page application (SPA)** w Microsoft Entra ID.
2. Jako Redirect URI dodaje dokładny adres opublikowanej strony CPG Inkasacja, np. adres GitHub Pages.
3. Aplikacji nadaje delegowane uprawnienia Microsoft Graph:
   - `User.Read`,
   - `Files.ReadWrite.All`.
4. Jeżeli polityka firmy tego wymaga, administrator udziela zgody administracyjnej.
5. W pliku `ms365-config.js` wpisuje:
   - `clientId` — Application (client) ID,
   - `tenantId` — Directory (tenant) ID,
   - `driveId` — ID wspólnej biblioteki dokumentów.

`clientId`, `tenantId` i `driveId` są identyfikatorami konfiguracji, a nie hasłami. **Nie wpisuj do aplikacji client secret, hasła ani tokenu.**

## Jak działa pobieranie Terminal Balance

Planista naciska „Pobierz najnowszy Terminal Balance z OneDrive”. Aplikacja:

1. odczytuje zawartość skonfigurowanego folderu,
2. wybiera pliki XLSX/XLS/CSV zawierające w nazwie `Terminal Balance`,
3. sortuje je po `lastModifiedDateTime`,
4. pobiera najnowszy,
5. uruchamia ten sam importer co przy ręcznym wgrywaniu pliku.

## Jak działa publikacja planu

Po optymalizacji trasa nie jest już automatycznie traktowana jako rozpoczęta. Planista widzi podgląd i naciska **„Opublikuj konwój”**.

Aplikacja zapisuje plik:

`Konwoj_RRRR-MM-DD.json`

W środku znajdują się m.in. data, źródło Terminal Balance, kolejność parkomatów, stany planowane, statusy, współrzędne i metadane trasy.

## Jak działa realizacja

Konwojent wybiera „Realizuj konwój”, wskazuje datę i pobiera gotowy plan. Dopiero przycisk **„Rozpocznij konwój”** ustawia rzeczywisty czas startu.

Po rozpoczęciu zapisywane są na bieżąco:

- status parkomatu,
- numer plomby,
- faktycznie wybrana gotówka,
- dane z QR,
- pominięcie i powód,
- notatka,
- zmieniona kolejność po przeliczeniu trasy,
- czas rozpoczęcia i zakończenia.

Dane są równocześnie przechowywane lokalnie na telefonie, więc chwilowy brak internetu nie kasuje postępu. Gdy zapis Microsoft 365 się powiedzie, aplikacja pokazuje godzinę ostatniej synchronizacji.

## Ograniczenie bieżącej wersji

Jeden opublikowany plan powinien być realizowany przez **jedną ekipę / jedno urządzenie jednocześnie**. Ta wersja zapisuje cały plik JSON przy aktualizacji. Jeśli dwa telefony równocześnie edytowałyby ten sam konwój, ostatni zapis mógłby nadpisać poprzedni. Jeżeli w przyszłości ma być wielu konwojentów równocześnie na jednej trasie, trzeba przejść na rekordowy backend (np. SharePoint List / baza danych / API).
