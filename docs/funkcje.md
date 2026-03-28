# Instrukcja Obsługi Operatora (Funkcje Systemu)

Witaj w systemie **CG Control Pro** (silnik `VinciFlow`). Jest to profesjonalne narzędzie do emisji grafik telewizyjnych i streamingowych w czasie rzeczywistym. Poniższa instrukcja przeprowadzi Cię przez wszystkie aspekty codziennej pracy z systemem.

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
*   **Tytuł/Podtytuł**: Wpisz tekst. Jeśli obok pola jest ikona pióra, kliknij ją, aby otworzyć zaawansowany edytor (pogrubienia, kolory, rozmiar poszczególnych słów).
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
4. Wybierz tryb działania (np. *Whip* dla dynamicznej zmiany lub *Horizontal* dla płynnego przewijania).

---

## 4. Skróty Klawiszowe

System obsługuje skróty klawiszowe pozwalające na szybką pracę operatorską bez użycia myszy. Skróty są aktywne tylko wtedy, gdy kursor nie znajduje się w polu tekstowym (input, textarea, edytor kodu).

Aby wyświetlić pomoc ze skrótami w aplikacji, naciśnij klawisz **?** lub kliknij ikonę znaku zapytania w nagłówku.

| Klawisz | Akcja | Opis |
|---------|-------|------|
| **F1** / **Spacja** | TAKE | Wejdź na antenę / Ściągnij z anteny wybraną grafikę z Preview |
| **F2** | Synchronizuj | Aktualizuj aktywną grafikę na antenie danymi z Preview (odpowiednik przycisku SYNCHR.) |
| **Escape** | Wyczyść Program | Natychmiast ściąga wszystkie grafiki z anteny (Kill All) |
| **Delete** | Usuń grafikę | Usuwa aktualnie wybraną grafikę z banku (z potwierdzeniem) |
| **↑** / **↓** | Nawigacja | Przechodzi do poprzedniej / następnej grafiki w banku (Shotbox) |
| **Tab** | Zmiana strony | Przełącza widok między Dashboard a Szablon |
| **B** | Ustaw tło | Ustawia tło na stronie Output na aktualnie wybrany kolor z color pickera (domyślnie czarne) |
| **T** | Tło OBS | Ustawia przezroczyste tło na stronie Output (domyślne dla OBS/vMix Browser Source) |
| **?** | Pomoc | Wyświetla/ukrywa okno ze skrótami klawiszowymi |

### Tło Output (Color Picker / B / T)

W nagłówku panelu znajduje się **color picker** z polem hex oraz przyciski **Ustaw Tło** i **Tło OBS**, które sterują kolorem tła strony `output.html` — czyli strony, którą podaje się jako Browser Source do miksera (OBS, vMix, Tricaster).

*   **Color Picker** — pozwala wybrać dowolny kolor tła (np. zielony chroma key `#00ff00`, niebieski `#0000ff`, czarny itp.). Kolor aktualizuje się w czasie rzeczywistym podczas przesuwania suwaka.
*   **Ustaw Tło** (`B`) — wysyła aktualnie wybrany kolor z color pickera na stronę Output.
*   **Tło OBS** (`T`) — przywraca przezroczyste tło (domyślne). W OBS/vMix Browser Source transparentne piksele przepuszczają warstwę poniżej, co pozwala nakładać grafiki CG na obraz z kamery bez potrzeby chroma key.
*   **Szachownica** — gdy tło jest ustawione na przezroczyste, monitory Preview i Program wyświetlają wzór szachownicy (jak w programach graficznych), co wizualnie potwierdza transparentność.
*   **Zapamiętywanie** — wybór tła jest zapisywany w `localStorage` strony Output, dzięki czemu przetrwa odświeżenie przeglądarki.

---

## 5. Dodatkowe Funkcje

### Skalowanie tekstu (Squashing)
System posiada wbudowany mechanizm automatycznego "ściskania" tekstu w poziomie (`scaleX`), aby zmieścić długie treści bez zmiany rozmiaru fontu czy łamania linii.

### Edytor WYSIWYG
Moduł edycji tekstu pozwalający na zaawansowane formatowanie (pogrubienia, kolory, czcionki) w obrębie jednego pola tekstowego.

---

## 6. Rozwiązywanie problemów

1. **Brak sygnału w Programie**: Sprawdź, czy okno Output.html jest otwarte.
2. **Grafika nie odświeża się**: Kliknij ikonę "Reset Database" w prawym górnym rogu.
