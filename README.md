# BTB CG System

System profesjonalnej emisji grafik telewizyjnych i streamingowych w czasie rzeczywistym, oparty na silniku **VinciFlow**.

## Kluczowe Cechy
- **Dynamiczne Szablony**: HTML5 + CSS + GSAP (animacje).
- **Inspektor**: Edycja treści w czasie rzeczywistym z podglądem Preview.
- **Bank Grafik (Shotbox)**: Szybki dostęp do przygotowanych elementów.
- **Global Squashing**: Automatyczne ściskanie tekstu w poziomie.
- **Edytor WYSIWYG**: Zaawansowane formatowanie tekstu wewnątrz grafik.

## Dokumentacja

Pełna dokumentacja systemu znajduje się w katalogu `/docs`:

1.  **[Instrukcja Obsługi Operatora](docs/funkcje.md)** — Wszystko co musisz wiedzieć, aby emitować grafiki.
2.  **[Przewodnik Twórcy Szablonów](docs/szablony.md)** — Jak budować własne szablony (HTML/CSS/JS).
3.  **[Architektura Systemu](docs/architektura.md)** — Szczegóły techniczne i struktura bazy danych.
4.  **[API Techniczne](docs/api_techniczna.md)** — Opis kluczowych funkcji i synchronizacji.

## Instalacja i Uruchomienie

1. Zainstaluj zależności: `npm install`
2. Uruchom serwer developerski: `npm run dev`
3. Otwórz panel sterowania: `http://localhost:5173` (lub inny port wskazany przez Vite).
4. Otwórz wyjście wideo (Output): `http://localhost:5173/output.html`

---
*System BTB CG System — Wersja ALPHA*
