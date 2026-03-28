# Dokumentacja Techniczna API i Kodu

Sekcja ta opisuje kluczowe mechanizmy w kodzie źródłowym istotne dla programistów chcących rozwijać system.

## Struktura Plików

*   `server.js` — Główny proces Node.js. Zarządza SQLite i Socket.io.
*   `app.js` — Logika panelu sterowania. Obsługa UI, edytorów i komunikacji z serwerem.
*   `renderer.js` — Samodzielny moduł odpowiadający za poprawne wyrenderowanie grafiki z parametrów JSON.
*   `gsap-fx.js` — Biblioteka animacji GSAPFX (nakładka na GSAP).
*   `index.html` — Główny szkielet panelu sterowania.
*   `output.html` — Strona wyjściowa ("Clean Feed"), którą podaje się do miksera (np. OBS, vMix, Tricaster).

## Kluczowe Funkcje Backendowe (`server.js`)

### Synchronizacja Bazy

*   `syncFullStateToDB(state)`: Główna funkcja zapisu — przeprowadza pojedynczą atomową transakcję SQLite zapisującą ustawienia, szablony, grupy i grafiki w jednej operacji. Zastąpiła poprzednie `syncGraphicsToDB` i `syncStateToDB`, eliminując ryzyko race condition przy dwóch równoległych `BEGIN TRANSACTION`. Pusta lista szablonów (gdy `state.templates` jest tablicą, nie `undefined`) jest zapisywana poprawnie.

### Inicjalizacja

*   `ensureDatabaseInitialized()`: Tworzy schemat tabel i importuje dane startowe z `db.json` w razie ich braku (pierwsze uruchomienie).
*   `loadStateFromDB(callback)`: Ładuje pełny stan z SQLite do pamięci (`appState`). Wywoływana przy starcie serwera.
*   `syncTemplateFilesToDB(callback)`: Przy starcie serwera automatycznie wczytuje wszystkie pliki `.json` z katalogu `templates/` do bazy danych. Obsługuje format eksportu v2 (`_exportVersion: 2`).

### Zarządzanie Presetami

*   `savePreset` (socket event): Zapisuje aktualny zestaw grafik i grup jako nazwany preset.
*   `deletePreset` (socket event): Usuwa preset po ID.
*   `loadPreset` (socket event): Przywraca preset — wszystkie bieżące grafiki są wyłączane, następnie ładowany jest zestaw z presetu.

## Zdarzenia Socket.io

| Zdarzenie | Kierunek | Opis |
|---|---|---|
| `initialState` | serwer → klient | Pełny stan przy połączeniu nowego klienta |
| `stateUpdated` | serwer → wszyscy | Rozgłoszenie zaktualizowanego stanu |
| `updateState` | klient → serwer | Klient wysyła nowy stan (grafiki, szablony) |
| `savePreset` | klient → serwer | Zapis presetu |
| `deletePreset` | klient → serwer | Usunięcie presetu |
| `loadPreset` | klient → serwer | Załadowanie presetu |
| `set_background` | klient ↔ serwer ↔ klient | Zmiana koloru tła output.html |

## Kluczowe Funkcje Frontendowe (`app.js`)

*   `saveState()`: Wysyła pełny obiekt `state` do serwera. Wykorzystuje Socket.io.
*   `openInspector(id)`: Buduje dynamicznie panel edycji na podstawie typu szablonu wybranej grafiki.
*   `openWysiwygModal(id)`: Otwiera modal zaawansowanego edytora tekstu (TipTap WYSIWYG) dla wybranej grafiki. **Uwaga:** w starszej dokumentacji funkcja ta mogła być podana jako `openWysiwyg(id)` — poprawna nazwa to `openWysiwygModal`.
*   `switchPage(page)`: Przełącza widok między stronami: `'dashboard'`, `'templates'`, `'settings'`.
*   `renderShotbox()`: Odświeża widok banku grafik (shotbox).

## Moduł Renderujący (`renderer.js`)

Głównym zadaniem tego modułu jest zamiana parametrów logicznych na widoczny HTML.

*   `buildPreviewContext(graphic, tpl, instanceId, settings)`: Centralne miejsce, gdzie obliczane są wszystkie zmienne Handlebars (np. zamiana kierunku animacji "left" na konkretny CSS `translateX(-1920px)`). Obsługuje: style typografii, gradienty, animacje wejścia/wyjścia, ITEMS, wiper, separator, globalne ustawienia fontu/cienia/zaokrąglenia.
*   `handleStateUpdate(state)`: Funkcja "diffing" — sprawdza co się zmieniło w stanie i odświeża tylko te grafiki, których parametry uległy zmianie (porównanie JSON hash).
*   `showGraphic(data, settings, allGraphics)`: Kompiluje szablon Handlebars, izoluje CSS (scoping), wykonuje JS szablonu przez `eval()` w sandboxowanym IIFE, wywołuje `__slt_show()`.
*   `hideGraphic(id)`: Wywołuje `__slt_hide()` i po zakończeniu animacji usuwa element z DOM.
*   `recalculateAttachments(graphics)`: Przelicza pozycje grafik z włączoną opcją "przyklejenia" (`attachedToGraphicId`) gdy zmieniają się widoczności grafik nadrzędnych. Używa `transition: transform 0.6s` dla płynnego przesunięcia.
*   `window.__cgRenderer.renderPreview(containerEl, graphics, tpls, settings, options)`: Publiczne API używane przez panel sterowania do renderowania monitorów Preview i Program. Parametr `options.instant` wymusza natychmiastowe pokazanie grafiki bez animacji wejścia.

## Izolacja CSS i Scoping

Renderer automatycznie:
1. Stripuje `#instanceId` wygenerowany przez `{{ID}}` z szablonu CSS.
2. Dodaje `#instanceId` jako prefix do selektorów klas (`rep-`, `lt-`, `utk-`, itd.).
3. Zmienia nazwy `@keyframes` dodając suffix `_instanceId` — zapobiega konfliktom przy wielu instancjach tego samego szablonu.
4. Dodaje override dla gradientów tła, zaokrągleń i układu side.

## Ustawienia Globalne (`state.settings`)

| Pole | Typ | Opis |
|---|---|---|
| `globalFontFamily` | string | Nazwa fontu stosowana do grafik z listy `globalFontGraphics` |
| `globalFontGraphics` | string[] | Lista ID grafik z aktywnym globalnym fontem |
| `globalBorderRadius` | number | Globalne zaokrąglenie dla grafik z listy `globalRadiusGraphics` |
| `globalRadiusGraphics` | string[] | Lista ID grafik z aktywnym globalnym zaokrągleniem |
| `globalShadow` | object | Konfiguracja globalnego cienia tekstu: `{ enabled, color, blur, offsetX, offsetY }` |
