# Instrukcja Obsługi Operatora (Funkcje Systemu)

Witaj w systemie **BTB-CG** (CG Master Alpha). Jest to profesjonalne narzędzie do emisji grafik telewizyjnych i streamingowych w czasie rzeczywistym. Poniższa instrukcja przeprowadzi Cię przez wszystkie aspekty codziennej pracy z systemem.

---

## 1. Przegląd Interfejsu (Dashboard)

Główny panel podzielony jest na kilka kluczowych sekcji:

### A. Monitory (Góra)
*   **PREVIEW (Podgląd)**: Żółty monitor po lewej stronie. Pokazuje grafikę, którą aktualnie edytujesz, zanim trafi ona "na antenę".
    *   **Bezpieczny Obszar (Safe Area)**: Przycisk pozwalający nałożyć ramki EBU, aby upewnić się, że tekst nie wyjdzie poza marginesy telewizyjne.
*   **PROGRAM (Wizja)**: Czerwony monitor po prawej stronie. Pokazuje dokładnie to, co widzą widzowie (Output).

### B. Bank Grafik / Shotbox (Dół - Lewo)
To Twoje podręczne archiwum. Zawiera gotowe "kafelki" z grafikami (np. podpisy gości, belki pilne, zegary).
*   **Nowa Grafika**: Dodaje pusty element na podstawie wybranego szablonu.
*   **Wyczyść**: Usuwa wszystkie grafiki z banku.

### C. Inspektor (Prawa Strona)
Pojawia się po kliknięciu w dowolną grafikę w Banku Grafik. Tutaj zmieniasz treść, kolory i zachowanie elementu.

---

## 2. Podstawowy Workflow (Krok po Kroku)

### Krok 1: Wybór grafiki
Kliknij w kafelkę w **Banku Grafik**. Zostanie ona podświetlona, a w panelu **PREVIEW** zobaczysz jej podgląd. Po prawej stronie otworzy się **Inspektor**.

### Krok 2: Edycja Treści
W Inspektorze (zakładka "Wygląd i Treść") wprowadź dane:
*   **Tytuł/Podtytuł**: Wpisz tekst. Jeśli obok pola jest ikona pióra, kliknij ją, aby otworzyć zaawansowany edytor WYSIWYG (pogrubienia, kolory, rozmiar poszczególnych słów).
*   **Opcje**: Zmień kolory tła, wybierz stronę (lewa/prawa) lub dostosuj szerokość belki.

### Krok 3: Synchronizacja (Opcjonalnie)
Jeśli edytujesz grafikę, która jest już "Na Żywo", użyj przycisku **SYNCHR.** pod oknem Preview, aby wysłać poprawki bez wyłączania grafiki.

### Krok 4: Emisja (TAKE)
Kliknij zielony przycisk **NA ŻYWO** pod monitorem Preview lub przycisk **ON** na kafelce w Banku Grafik. Grafika pojawi się w oknie PROGRAM z płynną animacją wejścia.

### Krok 5: Wyłączenie (OFF)
Kliknij przycisk **OFF** na kafelce lub użyj czerwonego przycisku **WYCZYŚĆ PROGRAM** w nagłówku, aby natychmiast ukryć wszystkie grafiki.

---

## 3. Praca z Tickerem (Paskiem Informacyjnym)

Jeśli używasz szablonu typu **TICKER**:
1. Otwórz go w Inspektorze.
2. W sekcji "Wiadomości" zobaczysz listę wpisów.
3. Możesz dodawać nowe linie, zmieniać ich kolejność (drag & drop) lub usuwać niepotrzebne.
4. Każdy wpis może mieć pole **Kategoria** — wyświetlana jest ona w wiperze (etykiecie po lewej).
5. Wybierz tryb działania:
    *   **horizontal** — płynne przewijanie od prawej do lewej.
    *   **whip** — dynamiczne wyskakiwanie kolejnych wiadomości z efektem "whip".
    *   **vertical** — zmiana wiadomości z efektem zanikania/pojawiania.

---

## 4. Presety (Zestawy Grafik)

Presety pozwalają na zapisanie całego aktualnego zestawu grafik i grup, a następnie błyskawiczne przywrócenie go w przyszłości — np. dla różnych segmentów programu.

### Zapis Presetu
1. Skonfiguruj bank grafik tak, jak chcesz go zachować.
2. Przejdź do zakładki **Ustawienia**.
3. W sekcji "Presety" kliknij **Zapisz Preset** i nadaj mu nazwę.

### Wczytanie Presetu
1. W sekcji "Presety" kliknij nazwę presetu na liście.
2. Wszystkie bieżące grafiki zostaną wyłączone (zdjęte z anteny).
3. Załadowany zestaw grafik pojawi się w Banku Grafik — gotowy do emisji.

### Usunięcie Presetu
Kliknij ikonę kosza obok nazwy presetu.

> **Uwaga:** Presety przechowują konfigurację grafik i grup, ale nie szablonów. Szablony muszą być dostępne w bazie danych.

---

## 5. Ustawienia Globalne

Strona **Ustawienia** oferuje opcje stosowane do wielu grafik jednocześnie.

### Globalny Font
Możesz przypisać jeden font do wybranych grafik — przydatne gdy chcesz szybko zmienić krój pisma dla całego pakietu graficznego bez edytowania każdej grafiki z osobna.
1. Wybierz font z listy rozwijanej.
2. Zaznacz grafiki, do których ma być stosowany.

### Globalne Zaokrąglenie (Border Radius)
Ustaw wspólną wartość zaokrąglenia rogów dla wybranych grafik.

### Globalny Cień Tekstu
Włącz cień tekstu i skonfiguruj jego kolor, rozmycie i offset. Stosowany do wszystkich grafik obsługujących `{{BOX_SHADOW}}`.

---

## 6. Skróty Klawiszowe

System obsługuje skróty klawiszowe pozwalające na szybką pracę operatorską bez użycia myszy. Skróty są aktywne tylko wtedy, gdy kursor nie znajduje się w polu tekstowym (input, textarea, edytor kodu).

Aby wyświetlić pomoc ze skrótami w aplikacji, naciśnij klawisz **?** lub kliknij ikonę znaku zapytania w nagłówku.

| Klawisz | Akcja | Opis |
|---------|-------|------|
| **F1** / **Spacja** | TAKE | Wejdź na antenę / Ściągnij z anteny wybraną grafikę z Preview |
| **F2** | Synchronizuj | Aktualizuj aktywną grafikę na antenie danymi z Preview (odpowiednik przycisku SYNCHR.) |
| **Escape** | Wyczyść Program | Natychmiast ściąga wszystkie grafiki z anteny (Kill All) |
| **Delete** | Usuń grafikę | Usuwa aktualnie wybraną grafikę z banku (z potwierdzeniem) |
| **↑** / **↓** | Nawigacja | Przechodzi do poprzedniej / następnej grafiki w banku (Shotbox) |
| **Tab** | Zmiana strony | Przełącza widok między Dashboard a Szablony (nie działa ze strony Ustawienia) |
| **B** | Ustaw tło | Ustawia tło na stronie Output na aktualnie wybrany kolor z color pickera |
| **T** | Tło OBS | Ustawia przezroczyste tło na stronie Output (domyślne dla OBS/vMix Browser Source) |
| **?** | Pomoc | Wyświetla/ukrywa okno ze skrótami klawiszowymi |

### Tło Output (Color Picker / B / T)

W nagłówku panelu znajduje się **color picker** z polem hex oraz przyciski **Ustaw Tło** i **Tło OBS**, które sterują kolorem tła strony `output.html`.

*   **Color Picker** — pozwala wybrać dowolny kolor tła (np. zielony chroma key `#00ff00`).
*   **Ustaw Tło** (`B`) — wysyła aktualnie wybrany kolor z color pickera na stronę Output.
*   **Tło OBS** (`T`) — przywraca przezroczyste tło. W OBS/vMix Browser Source transparentne piksele przepuszczają warstwę poniżej.
*   **Szachownica** — gdy tło jest ustawione na przezroczyste, monitory Preview i Program wyświetlają wzór szachownicy potwierdzający transparentność.
*   **Zapamiętywanie** — wybór tła jest zapisywany w `localStorage` strony Output i przetrwa odświeżenie przeglądarki.

---

## 7. Dodatkowe Funkcje

### Skalowanie tekstu (Squashing)
System posiada wbudowany mechanizm automatycznego "ściskania" tekstu w poziomie (`scaleX`), aby zmieścić długie treści bez zmiany rozmiaru fontu czy łamania linii. Włączone domyślnie — można wyłączyć per-grafika w Inspektorze (checkbox "Automatyczne ściskanie tekstu").

### Edytor WYSIWYG
Moduł edycji tekstu (TipTap) pozwalający na zaawansowane formatowanie (pogrubienia, kolory, czcionki, rozmiar) w obrębie jednego pola tekstowego. Otwierany kliknięciem ikony pióra obok pola tekstowego.

### System Przyczepiania Grafik (Attachment)
Grafiki można "przyczepiać" do innych grafik — gdy grafika nadrzędna jest widoczna, grafika podrzędna automatycznie przesuwa się o zdefiniowany offset (Y lub X). Gdy grafika nadrzędna znika, grafika podrzędna wraca do swojej domyślnej pozycji z płynną animacją. Funkcja konfigurowana jest przez `layout.attachedToGraphicId` i `layout.attachOffsetY/X` w ustawieniach grafiki.

> **Uwaga:** System przyczepiania działa wyłącznie w oknie Output (`output.html`). Monitory Preview i Program w panelu sterowania nie uwzględniają offset przyczepiania.

---

## 8. Rozwiązywanie problemów

1. **Brak sygnału w Programie**: Sprawdź, czy okno `output.html` jest otwarte i podłączone do serwera (zielona ikona połączenia).
2. **Grafika nie odświeża się**: Kliknij ikonę "Reset Database" w prawym górnym rogu.
3. **Brak animacji gleam na wiperze**: Upewnij się, że `gleamColor` w ustawieniach wipera jest w formacie `#rrggbb` lub `rgba(r,g,b,a)`.
4. **Font nie zmienia się**: Sprawdź czy grafika jest zaznaczona na liście "Globalny Font" w Ustawieniach.
