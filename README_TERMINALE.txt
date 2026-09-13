CPG Inkasacja — stała baza współrzędnych parkomatów

Dane źródłowe: Terminals (1).xlsx — poprawny plik przekazany przez użytkownika.
Rekordy w bazie: 2290.
Statusy: Active 2251, Inactive 26, Removed 7, Marked for delete 6.
Powiązanie: po Terminal ID / ID parkomatu.

Działanie:
- jeżeli CSV ma współrzędne, aplikacja użyje ich;
- jeżeli CSV nie ma współrzędnych, aplikacja wyszuka Terminal ID w terminals-data.js;
- z bazy uzupełni latitude, longitude oraz adres (gdy adresu brakuje w CSV);
- rekord bez dopasowania pozostanie bez GPS i będzie policzony w komunikacie po imporcie.

W poprawnym pliku źródłowym 6 rekordów nie ma kompletu współrzędnych: 14060266, 17170636, 9996-Lukasztest, 9997, 9998, 9999.
