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

## 4. Dodatkowe Funkcje

### Skalowanie tekstu (Squashing)
System posiada wbudowany mechanizm automatycznego "ściskania" tekstu w poziomie (`scaleX`), aby zmieścić długie treści bez zmiany rozmiaru fontu czy łamania linii. 

### Edytor WYSIWYG
Moduł edycji tekstu pozwalający na zaawansowane formatowanie (pogrubienia, kolory, czcionki) w obrębie jednego pola tekstowego.

---

## 5. Rozwiązywanie problemów

1. **Brak sygnału w Programie**: Sprawdź, czy okno Output.html jest otwarte.
2. **Grafika nie odświeża się**: Kliknij ikonę "Reset Database" w prawym górnym rogu.
