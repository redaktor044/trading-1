# Przystań

Lokalny dashboard analizy spot i futures USDT MEXC.

Wymagany Node.js 20.19+ lub 22.12+. W katalogu repozytorium uruchom `npm ci`, a następnie `npm run dev`. Serwer nasłuchuje na porcie 3000. `npm test` uruchamia testy, a `npm run build` buduje interfejs.

Klucz OpenRouter można dodać w ustawieniach. Pozostaje w pamięci serwera do ponownego uruchomienia. Serwer nie ma logowania użytkowników i powinien działać wyłącznie w zaufanym środowisku. Bez klucza działają podstawowe polecenia dotyczące pary USDT, rynku, interwału i warstw.

Analiza używa zamkniętych świec oraz reguł eksperymentalnych, które nie zostały poddane walidacji skuteczności. Cele scenariuszy to hipotetyczne poziomy 2R. Kalkulator pomija funding, poślizg i likwidację. Wpisz własną prowizję. Narzędzie nie łączy się z kontem giełdy i nie składa zleceń.
