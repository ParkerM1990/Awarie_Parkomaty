# CPG Inkasacja — Google Drive + Apps Script

Ta wersja rozdziela dwa źródła:

- **Microsoft 365** — opcjonalnie tylko dla planisty, do pobierania najnowszego `Terminal Balance.xlsx`.
- **Google Drive** — wspólny magazyn planu i postępu konwoju, dostępny dla konwojenta bez konta Microsoft 365.

## Co zostało przygotowane

Folder Google Drive dla danych konwoju:

- `CPG Inkasacja/Konwoje`
- Folder ID: `1d45coKuP4yPARIXTcP9QZJndjroGtwPk`

Plik `Code.gs` w tej paczce ma już wpisany ten Folder ID.

## Jednorazowe wdrożenie Apps Script

1. Wejdź na `https://script.google.com/` i utwórz **Nowy projekt**.
2. Usuń przykładowy kod i wklej całą zawartość pliku `Code.gs`.
3. Otwórz **Ustawienia projektu → Właściwości skryptu**.
4. Dodaj właściwość:
   - nazwa: `PLANNER_PIN`
   - wartość: wybrany przez Ciebie PIN planisty, np. 6–10 cyfr.
5. Wybierz **Wdróż → Nowe wdrożenie → Aplikacja internetowa**.
6. Ustaw:
   - **Wykonuj jako:** Ty / właściciel skryptu,
   - **Kto ma dostęp:** Każdy / Anyone (również bez logowania, jeżeli opcja jest dostępna).
7. Zatwierdź uprawnienia do Dysku Google.
8. Skopiuj adres wdrożenia kończący się `/exec`.
9. Endpoint Google Apps Script jest już wpisany do `google-config.js`:
   `https://script.google.com/macros/s/AKfycbyP82q5zMtF3k-A4YwoJclRDEC5kPd8z-JySt6BxG7rObRnInARSum8qDBhZyAv_UPq/exec`
10. Opublikuj zaktualizowane pliki aplikacji na GitHub Pages.

## Jak działa planista

1. Wchodzi w **Przygotuj konwój**.
2. Wybiera datę.
3. Pobiera `Terminal Balance` z Microsoft 365 albo wgrywa XLSX ręcznie.
4. Ustawia liczbę parkomatów i próg gotówki.
5. Wyznacza i ewentualnie poprawia trasę.
6. Naciska **Opublikuj konwój**.
7. Przy każdej próbie publikacji podaje `PLANNER_PIN` — aplikacja nie zapamiętuje go w przeglądarce.
8. Aplikacja generuje losowy kod konwoju i publikuje plan w prywatnym folderze Google Drive.
9. Aplikacja pokazuje i kopiuje link dla konwojenta.

## Jak działa konwojent

Najprościej otwiera link przesłany przez planistę. Link zawiera datę i losowy kod dostępu. Aplikacja sama przechodzi do trybu realizacji i pobiera plan z Google.

Można też wejść ręcznie na stronę, wybrać **Realizuj konwój**, wpisać datę i kod konwoju.

Po rozpoczęciu konwoju każda zmiana statusu, plomby, kwoty z QR i notatki jest zapisywana lokalnie na telefonie oraz synchronizowana do pliku na Google Drive.

## Bezpieczeństwo

- Folder Google Drive pozostaje prywatny — nie trzeba go udostępniać publicznie.
- Publikacja nowej trasy wymaga `PLANNER_PIN`, który jest przechowywany w właściwościach Apps Script, a nie w kodzie strony.
- Dostęp do konkretnego konwoju jest możliwy przez losowy kod znajdujący się w linku udostępnionym konwojentowi.
- Nie ma publicznej listy wszystkich planów konwoju.

## Uwaga

Jeżeli administrator Google Workspace nie pozwala wdrażać aplikacji internetowych dla użytkowników anonimowych, opcja „Każdy” może być niedostępna. Wtedy trzeba użyć konta Google, które pozwala na takie wdrożenie, albo zastosować inny backend.
