# Dokumentacja: Tworzenie Własnych Szablonów Grafik (CG Control PRO)

Aplikacja **CG Control PRO** (silnik `VinciFlow`) wykorzystuje strukturę opartą o szablony HTML, CSS i JavaScript kompilowane w locie za pomocą biblioteki **Handlebars.js**. Szablony są następnie animowane i renderowane w środowisku przeglądarkowym (źródło Output). 

Poniższa dokumentacja opisuje, jak zdefiniować własny szablon w bazie danych.

---

## 1. Struktura Szablonu (Obiekt JSON)

Każdy szablon składa się z poniższych pól:

```json
{
  "id": "moj-nowy-szablon",
  "name": "Nazwa Wyświetlana",
  "type": "LOWER_THIRD", 
  "version": 2,
  },
  "ocgInputs": [
    {
      "id": "TITLE",
      "label": "Tytuł",
      "default": "Tekst domyślny",
      "type": "richtext"  // "text" (zwykły), "richtext" (WYSIWYG), "list" (tablica)
    }
  ],
  "defaultFields": { ... },
  "defaultLayout": {
    "x": 100, "y": 800, "width": 1600, "height": 60, "scale": 1, "layer": 5
  },
  "defaultStyle": {
    "background": { "type": "gradient", "color": "#ff0000", "color2": "#880000" },
    "typography": { "color": "#ffffff", "fontFamily": "Inter", "fontSize": 30 }
  }
}
```

### Typy grafik (`type`)
* `LOWER_THIRD`: Belki informacyjne, podpisy.
* `TICKER`: Paski informacyjne (np. pilne wiadomości).
* `CLOCK`: Widżety czasowe / odliczania.
* `IMAGE`: Logotypy, grafiki statyczne.

### Typy pól wejściowych (`ocgInputs`)
* `text`: Standardowe pole tekstowe (jedna linia).
* `richtext`: Pole obsługujące formatowanie **WYSIWYG**. Włącza przycisk edycji w Inspektorze. Wartość powinna być renderowana w szablonie za pomocą potrójnych wąsów: `{{{TITLE}}}`.
* `list`: Tablica elementów JSON (np. dla tickerów).

---

## 2. Zmienne Handlebars (Context)

Silnik Handlebars wstrzykuje wartości z ustawień do kodu szablonu.

### Główne Zmienne
* `{{ID}}`: Unikalny identyfikator instancji (np. `lt_abc123`). **Zawsze** używaj `#{{ID}}` w CSS.
* `{{{TITLE}}}`: Główny tekst (HTML). Jeśli używasz formatowania, użyj potrójnych wąsów.
* `{{SUBTITLE}}`: Podtytuł.
* `{{FONT_FAMILY}}`: Wybrana czcionka.
* `{{PRIMARY_BG}}`: Tło skompilowane (kolor lub gradient).
* `{{BORDER_WIDTH}}`, `{{BORDER_COLOR}}`, `{{BORDER_RADIUS}}`: Ustawienia obramowania.
* `{{PADDING_Y}}`: Wyrównanie pionowe tekstu (padding góra/dół).

### Zmienne Ticker / Wiper
* `{{WIPER_TEXT}}`: Tekst na "skrzydełku" (wiperze).
* `{{WIPER_BG}}`: Kolor/gradient tła wipera.
* `{{WIPER_SHOW}}`: Czy wiper powinien być widoczny (`true`/`false`).
* `{{ITEMS}}`: Tablica wiadomości (tekst).
* `{{ITEMS_JSON}}`: Wszystkie wiadomości (razem z kategoriami) jako JSON.
* `{{ITEMS_B64}}`: Zakodowana (Base64) lista wiadomości dla zaawansowanych skryptów JS.

### Zmienne Układu (Layout Overrides)
System automatycznie wstrzykuje zmienne CSS do głównego kontenera:
* `--v-width`: Szerokość grafiki.
* `--v-height`: Wysokość grafiki.

---

## 3. Stylizacja CSS i Izolacja

Wszystkie style **muszą** być poprzedzone `#{{ID}}`. Renderer automatycznie sandboxuje style, ale dobra praktyka to:

```css
#{{ID}} .moja-belka {
    background: {{PRIMARY_BG}};
    border-radius: {{BORDER_RADIUS}}px;
    opacity: 0; 
    transform: translateY(50px);
}
```

**Automatyczne nadpisania (Layout Overrides):**
Renderer automatycznie dodaje style dla:
- Gradientów (jeśli typ tła to `gradient`).
- Zaokrągleń (Global Border Radius).
- Pozycjonowania (Side Layouts: `bottom-right`, `top-left` etc.).

---

## 4. JavaScript i Biblioteka GSAPFX

Każdy skrypt musi być zamknięty w IIFE i eksponować dwie metody: `__slt_show` oraz `__slt_hide`.

### Dostępne biblioteki:
- `window.gsap`: Pełna biblioteka GSAP (do animacji).
- `window.GSAPFX`: Zbiór gotowych efektów dla systemu CG.

### Przykład użycia GSAPFX:
```javascript
(() => {
    const root = document.getElementById("{{ID}}");
    const container = root.querySelector(".moja-belka");

    root.__slt_show = () => {
        const tl = gsap.timeline();
        // Standardowe wejście (slide z dołu)
        tl.add(GSAPFX.standardIn(container, { 
            type: 'slide', 
            direction: 'bottom', 
            duration: 0.6 
        }));
        
        // Efekt na tekście (np. reveal/slide-up)
        tl.add(GSAPFX.applyTextEffect(root, { 
            type: 'slide-up', 
            stagger: 0.1 
        }), "-=0.3");
        
        return tl; // Zwróć timeline dla synchronizacji systemowej
    };

    root.__slt_hide = () => {
        return GSAPFX.standardOut(container, { 
            type: 'slide', 
            direction: 'bottom', 
            duration: 0.4 
        });
    };
})();
```

---

## 5. Tickers (Paski Informacyjne)

Dla Tickerów system przesyła listę wiadomości. Tryb pracy (`TICKER_MODE`) może być:
- `horizontal`: Pasek przewijany płynnie (Scroll).
- `whip`: Wiadomości zmieniające się za pomocą animacji "bicia" (Whip).
- `vertical`: Prosta zmiana wiadomości (Flicker/Slide).

**Przykład obsługi bazy wiadomości w JS:**
```javascript
const dataEl = root.querySelector('#f-news-list');
const b64 = dataEl ? dataEl.getAttribute('data-b64') : null;
let items = [];
if (b64) {
    items = JSON.parse(decodeURIComponent(escape(atob(b64))));
}
// item to obiekt: { text: "Treść", category: "Kategoria/Wiper" }
```

---

## 6. Automatyczne Skalowanie (Squashing) Tekstu

System posiada wbudowany mechanizm "ściskania" tekstu w poziomie (`scaleX`), aby zmieścić długie treści bez zmiany rozmiaru fontu czy łamania linii. Jest to obsługiwane **globalnie** przez renderer.

### Jak użyć (Metoda Globalna)

Aby włączyć automatyczne ściskanie dla dowolnego elementu tekstowego:

1. **HTML**: Dodaj klasę `slt-squash` do elementu, który ma być ściskany. Element ten **musi** znajdować się wewnątrz kontenera o określonej szerokości (np. `width` lub `max-width`).

```html
<div class="my-container" style="width: 400px; overflow: hidden;">
    <span class="slt-squash">{{{TITLE}}}</span>
</div>
```

2. **Działanie**: Renderer automatycznie wykryje wszystkie elementy z klasą `slt-squash` po wyrenderowaniu grafiki i obliczy wymaganą skalę `scaleX`, jeśli tekst jest szerszy niż jego rodzic (kontener).

### Zalety Metody Globalnej
- Nie wymaga pisania własnego JavaScriptu w szablonie.
- Działa automatycznie zarówno w emisji (Output), jak i w podglądzie (Preview).
- Zachowuje stałą wysokość tekstu i linię bazową.
- Punkt zakotwiczenia (`transform-origin`) jest ustawiony domyślnie na `left center` (wyrównanie do lewej).

> [!TIP]
> Jeśli potrzebujesz wyrównania do środka lub do prawej przy ściskaniu, nadpisz `transform-origin` w CSS szablonu dla klasy `.slt-squash`.


---

## 7. Porady i Dobre Praktyki

1. **Efekt Gleam**: Użyj `@keyframes` w CSS i steruj widocznością przez `{{WIPER_GLEAM_ENABLED}}`.
2. **Synchronizacja**: Zawsze zwracaj `Promise` lub `gsap.timeline` z funkcji `__slt_show`/`__slt_hide`. System czeka na zakończenie animacji przed usunięciem elementu z DOM.
3. **Z-Index**: Nie używaj ekstremalnie wysokich `z-index`. Warstwy są zarządzane przez parametr `layer` w ustawieniach układu (Layout).
4. **Fonty**: System ładuje fonty systemowe oraz te zdefiniowane w `/font`. Używaj nazwy fontu bezpośrednio w `font-family`.
bsolute`).
* **Testowanie:** Najłatwiej modyfikować szablony otwierając edytor kodu z uruchomionym serwerem, a następnie przeładowując przeglądarkę z Control Panelem przyciskiem "Reload DB", aby wgrał on Twój nowy kod z dysku.
