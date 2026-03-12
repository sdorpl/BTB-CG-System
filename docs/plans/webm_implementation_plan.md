# Plan Wdrożenia: Silnik Animacji WebM

Ten plan opisuje kroki niezbędne do zaimplementowania obsługi wideo WebM z kanałem alfa w systemie.

## Proponowane Zmiany

### 1. Rozszerzenie Szablonów (db.json)
Dodanie wsparcia dla wideo w strukturze szablonów.

#### [MODIFY] [db.json](file:///home/maciej/Documents/GitHub/BTB-CG-System_main/db.json)
- Dodanie meta-danych wideo do wybranych grafik.
- Aktualizacja `html_template` dla `republika-logo` i `republika-composite`.

### 2. Silnik WebM (Nowy Moduł)
Stworzenie dedykowanego silnika obsługi wideo.

#### [NEW] [webm-fx.js](file:///home/maciej/Documents/GitHub/BTB-CG-System_main/webm-fx.js)
- Klasa `WebMManager` do zarządzania odtwarzaniem klipów In, Out i Loop.
- Obsługa przezroczystości i pre-loadingu wideo.
- API: `playIn(videoUrl, revealDelay)`, `playOut(videoUrl)`, `setLoop(videoUrl)`.
- Obsługa `onended` dla sekwencji Out (usunięcie grafiki).

### 3. Integracja z Rendererem (renderer.js)
Zmiana logiki `showGraphic` i `hideGraphic` na hybrydową.

#### [MODIFY] [renderer.js](file:///home/maciej/Documents/GitHub/BTB-CG-System_main/renderer.js)
- Dodanie instancji `WebMManager`.
- Logika: jeśli grafika posiada `inVideo`, użyj `WebMManager.playIn()`, w przeciwnym razie użyj `GSAPFX.standardIn()`.
- Synchronizacja logotypu "Republika" z silnikiem WebM.

---

## Plan Weryfikacji

### Testy Manualne
1. **Weryfikacja podglądu**: Dodanie grafiki z tłem WebM i sprawdzenie, czy wideo odtwarza się w pętli.
2. **Weryfikacja animacji In/Out**: Sprawdzenie, czy animacje wideo wyzwalają się poprawnie przy pokazywaniu/ukrywaniu.
3. **Republika Logo**: Testowanie animowanego logotypu z przezroczystością.
