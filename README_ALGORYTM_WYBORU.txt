CPG Inkasacja - inteligentny wybór parkomatów

1. Najpierw stosowany jest twardy próg gotówki (domyślnie 1500 PLN).
2. Parkomaty poniżej progu nie biorą udziału w wyborze.
3. Do optymalizacji trafiają tylko urządzenia z prawidłowym GPS.
4. Jeżeli kandydatów jest dużo, aplikacja tworzy krótszą listę maks. 80 sensownych kandydatów metodą geograficzną, zachowując również część najwyższych stanów gotówki.
5. Dla kandydatów pobierana jest macierz czasów przejazdu po drogach z publicznego OSRM/OpenStreetMap.
6. Zamiast wybierać najwyższe kwoty, algorytm buduje zestaw N urządzeń przez minimalizację dodatkowego czasu wstawienia kolejnego parkomatu do trasy.
7. Jeżeli różnica dodatkowego czasu między dwoma kandydatami wynosi maks. 30 sekund, preferowany jest parkomat z większą gotówką.
8. Sprawdzanych jest kilka różnych punktów startowych/ziaren, a finalnie wybierana jest trasa o najniższym czasie. Przy różnicy końcowej do 60 sekund preferowana jest większa suma gotówki.
9. Kolejność jest dodatkowo poprawiana metodą 2-opt.
10. Jeżeli OSRM jest niedostępny, aplikacja wykonuje analogiczną selekcję awaryjną na podstawie odległości GPS.
11. KOR 48 jest używany tylko jako punkt startowy obliczeń. Google Maps nawigację rozpoczyna z aktualnej pozycji telefonu.
