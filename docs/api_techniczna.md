# Dokumentacja Techniczna API i Kodu

Sekcja ta opisuje kluczowe mechanizmy w kodzie źródłowym istotne dla programistów chcących rozwijać system.

## Struktura Plików

*   `server.js` — Główny proces Node.js. Zarządza SQLite i Socket.io.
*   `app.js` — Logika panelu sterowania. Obsługa UI, edytorów i komunikacji z serwerem.
*   `renderer.js` — Samodzielny moduł odpowiadający za poprawne wyrenderowanie grafiki z parametrów JSON.
*   `index.html` — Główny szkielet panelu sterowania.
*   `output.html` — Strona wyjściowa ("Clean Feed"), którą podaje się do miksera (np. OBS, vMix, Tricaster).

## Kluczowe Funkcje Backendowe (`server.js`)

### Synchronizacja Bazy
*   `syncStateToDB(state)`: Przeprowadza atomową transakcję zapisu aktualnego stanu szablonów i grup.
*   `syncGraphicsToDB(graphicsArray)`: Szybka synchronizacja listy zdefiniowanych grafik. Wywoływana przy każdej zmianie widoczności lub treści.

### Inicjalizacja
*   `ensureDatabaseInitialized()`: Sprawdza obecność tabel i importuje dane startowe z `db.json` w razie ich braku.

## Kluczowe Funkcje Frontendowe (`app.js`)

*   `saveState()`: Wysyła pełny obiekt `state` do serwera. Wykorzystuje Socket.io dla efektywności.
*   `openInspector(id)`: Buduje dynamicznie panel edycji na podstawie typu szablonu wybranej grafiki.
*   `openWysiwyg(id)`: Przełącza aplikację w tryb edycji tekstu z podglądem na żywo.

## Moduł Renderujący (`renderer.js`)

Głównym zadaniem tego modułu jest zamiana parametrów logicznych na widoczny HTML.
*   `buildPreviewContext(...)`: Centralne miejsce, gdzie obliczane są wszystkie zmienne Handlebars (np. zamiana kierunku animacji "Left" na konkretny CSS `translateX(-1920px)`).
*   `handleStateUpdate(state)`: Funkcja typu "diffing" — sprawdza co się zmieniło w stanie i odświeża tylko te grafiki, których parametry uległy zmianie.
