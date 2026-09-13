CPG INKASACJA — IMPORT TERMINAL BALANCE

Obsługiwany jest raport z układem:
- wiersz 1: tytuł raportu
- wiersz 2: filtr
- wiersz 3: nagłówki

Kluczowe kolumny:
- Terminal - Terminal ID — numer parkomatu, używany do powiązania ze stałą bazą terminali
- Terminal - Location — lokalizacja pomocnicza
- Coin - Balance — stan gotówki używany do wyboru parkomatów i budowy trasy

Aplikacja automatycznie wykrywa wiersz nagłówków, więc działa również wtedy, gdy raport ma nad nagłówkami wiersze tytułowe.
Współrzędne GPS oraz adres są uzupełniane po Terminal ID z terminals-data.js.
Do planu można wybrać do 50 parkomatów.

UWAGA: pliku Terminal Balance z bieżącymi stanami gotówki nie należy publikować w publicznym repozytorium.
