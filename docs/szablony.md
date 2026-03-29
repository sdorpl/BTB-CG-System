# Przewodnik Twórcy Szablonów

System opiera się na elastycznej strukturze szablonów, które są kompilowane w locie. Każdy szablon to obiekt JSON zawierający kod HTML, CSS, JS oraz definicje pól wejściowych.

---

## 1. Struktura Obiektu Szablonu

Szablon w bazie danych (lub pliku eksportu) ma następującą strukturę:

```json
{
  "id": "identyfikator-szablonu",
  "name": "Przyjazna Nazwa",
  "type": "LOWER_THIRD",
  "html_template": "...",
  "css_template": "...",
  "js_template": "...",
  "ocgInputs": [
    { "id": "TITLE", "label": "Tytuł", "type": "richtext", "default": "Tekst" }
  ],
  "defaultLayout": { "x": 100, "y": 800, "width": 1600, "height": 60, "layer": 5 },
  "defaultStyle": {
    "background": { "type": "solid", "color": "#1e3a8a", "borderRadius": 0 },
    "typography": { "color": "#ffffff", "fontSize": 48, "fontWeight": "800" }
  }
}
```

**Dostępne typy szablonów:** `LOWER_THIRD`, `TICKER`, `CLOCK`, `IMAGE`, `GRAPHIC`

---

## 2. Język Szablonów (Handlebars)

Renderer wstrzykuje dane do szablonu przed wyświetleniem. Najważniejsze zmienne:

### Identyfikacja i układ

| Zmienna | Opis |
|---|---|
| `{{ID}}` | Unikalny ID instancji (np. `lt_5f3a`). Używaj jako selektora CSS: `#{{ID}}` |
| `{{V_WIDTH}}` | Szerokość grafiki (px) |
| `{{V_HEIGHT}}` | Wysokość grafiki (px) |

### Treść

| Zmienna | Opis |
|---|---|
| `{{{TITLE}}}` | Główny tekst. **Trzy nawiasy** — może zawierać HTML (z edytora WYSIWYG) |
| `{{{SUBTITLE}}}` | Podtytuł/funkcja (HTML-safe) |
| `{{INTRO_TEXT}}` | Tekst wprowadzający / etykieta wipera |

### Styl i kolor

| Zmienna | Opis |
|---|---|
| `{{PRIMARY_BG}}` | Skompilowany kolor lub gradient tła (gotowy do użycia w CSS `background:`) |
| `{{PRIMARY_COLOR}}` | Pierwszy kolor tła (hex) |
| `{{BORDER_RADIUS}}` | Promień zaokrąglenia (px) |
| `{{BORDER_WIDTH}}` | Szerokość obramowania (px) |
| `{{BORDER_COLOR}}` | Kolor obramowania |
| `{{BOX_SHADOW}}` | Skompilowana wartość `box-shadow` (lub `none`) |
| `{{TITLE_COLOR}}` | Kolor tekstu tytułu |
| `{{SUBTITLE_COLOR}}` | Kolor podtytułu |
| `{{FONT_FAMILY}}` | Nazwa aktywnej czcionki |
| `{{FONT_SIZE}}` | Rozmiar fontu (px) |
| `{{TITLE_SIZE}}` | Rozmiar fontu tytułu (px) |
| `{{TITLE_WEIGHT}}` | Grubość fontu tytułu |
| `{{TITLE_TRANSFORM}}` | `text-transform` tytułu |
| `{{PADDING_Y}}` | Padding pionowy (px) |
| `{{LINE_HEIGHT}}` | Interlinia |

### Animacja

| Zmienna | Opis |
|---|---|
| `{{ANIMATION_TRANSFORM}}` | Początkowy `transform` dla animacji wejścia (np. `translateX(-1920px)`) |
| `{{ANIMATION_DURATION}}` | Czas animacji wejścia (s) |
| `{{ANIMATION_DELAY}}` | Opóźnienie animacji wejścia (s) |
| `{{ANIMATION_EASE}}` | Funkcja easing animacji wejścia |
| `{{{ANIMATION_IN_JSON}}}` | Pełna konfiguracja animacji wejścia jako JSON (do użycia w JS szablonu) |
| `{{{ANIMATION_OUT_JSON}}}` | Pełna konfiguracja animacji wyjścia jako JSON |
| `{{{TEXT_ANIM_JSON}}}` | Konfiguracja animacji tekstu jako JSON |

### Ticker / Wiper

| Zmienna | Opis |
|---|---|
| `{{ITEMS}}` | Tablica ciągów tekstowych (elementy tikera) |
| `{{ITEMS_B64}}` | Elementy tikera jako JSON zakodowany Base64 (z kategorią) — zalecane dla nowych szablonów |
| `{{TICKER_MODE}}` | Tryb tikera: `horizontal`, `whip`, `vertical` |
| `{{TICKER_SPEED}}` | Prędkość tikera |
| `{{SEPARATOR_CSS}}` | Gotowe reguły CSS dla separatora (dot, pipe, square, skewed) |
| `{{WIPER_TEXT}}` | Domyślna etykieta wipera (z pola `introText`) |
| `{{WIPER_SHOW}}` | `true`/`false` — czy wiper jest widoczny |
| `{{WIPER_BG}}` | Tło wipera (kolor lub gradient) |
| `{{WIPER_TEXT_COLOR}}` | Kolor tekstu wipera |
| `{{WIPER_FONT}}` | Font wipera |
| `{{WIPER_FONT_SIZE}}` | Rozmiar fontu wipera (px) |
| `{{WIPER_FONT_WEIGHT}}` | Grubość fontu wipera |
| `{{WIPER_LETTER_SPACING}}` | Spacing liter wipera (px) |
| `{{WIPER_GLEAM_ENABLED}}` | `true`/`false` — efekt gleam |
| `{{WIPER_GLEAM_BG}}` | Gradient efektu gleam |
| `{{WIPER_GLEAM_DURATION}}` | Czas jednego cyklu gleam (s) |
| `{{WIPER_GLEAM_WIDTH}}` | Szerokość gleam (%) |
| `{{WIPER_GLEAM_HEIGHT}}` | Wysokość gleam (px) |

### Pola OCG (własne)

Wszystkie pola zdefiniowane w `ocgInputs` są dostępne bezpośrednio przez `{{ID_POLA}}` (wersalia). Tablice są serializowane do JSON.

---

## 3. Stylizacja (CSS) i Izolacja

System automatycznie izoluje style każdego szablonu. Renderer:
1. Usuwa `#{{ID}}` wygenerowany przez Handlebars.
2. Dodaje `#instanceId` jako prefix do znanych selektorów klas (patrz lista w `renderer.js`).
3. Przemianowuje wszystkie `@keyframes` dodając suffix `_instanceId` — wiele instancji tego samego szablonu nie nadpisuje sobie nawzajem animacji.

Dobrą praktyką jest jednak zawsze zaczynać reguły od `#{{ID}}`:

```css
#{{ID}} .container {
    background: {{PRIMARY_BG}};
    border-radius: {{BORDER_RADIUS}}px;
    font-family: '{{FONT_FAMILY}}', sans-serif;
    opacity: 0;
    transform: {{ANIMATION_TRANSFORM}};
}

/* Automatyczne ściskanie tekstu (squashing) */
#{{ID}} .slt-squash {
    display: inline-block;
    transform-origin: left center;
    white-space: nowrap;
}
```

---

## 4. Logika Animacji (JavaScript & GSAPFX)

Każdy szablon musi implementować funkcje wejścia i wyjścia wewnątrz IIFE. Funkcje te są przypisywane do `root.__slt_show` i `root.__slt_hide`, gdzie `root` to element DOM z `id="{{ID}}"`.

```javascript
(() => {
    const container = root.querySelector('.main-box');

    root.__slt_show = () => {
        const tl = gsap.timeline();

        // Animacja wejścia z biblioteki GSAPFX
        tl.add(GSAPFX.standardIn(container, {
            type: 'slide',
            direction: 'bottom',
            duration: 0.6
        }));

        // Animacja tekstu (opcjonalnie)
        const textAnimConfig = JSON.parse('{{{TEXT_ANIM_JSON}}}');
        if (textAnimConfig.type !== 'none') {
            tl.add(GSAPFX.applyTextEffect(root, textAnimConfig), 0.2);
        }

        return tl;
    };

    root.__slt_hide = () => {
        const tl = gsap.timeline();
        tl.add(GSAPFX.standardOut(container, {
            type: 'slide',
            direction: 'bottom',
            duration: 0.4
        }));
        return tl;
    };
})();
```

> **Ważne:** `__slt_show` i `__slt_hide` muszą zwracać obiekt GSAP Timeline (lub `null`). Renderer używa zwróconego obiektu do synchronizacji czasu usunięcia elementu z DOM.

---

## 5. Biblioteka GSAPFX (`gsap-fx.js`)

Globalna biblioteka `window.GSAPFX` udostępnia gotowe efekty animacyjne.

### `GSAPFX.standardIn(target, config)` — animacja wejścia

```javascript
GSAPFX.standardIn(element, {
    type: 'slide',      // 'slide' | 'fade' | 'zoom' | 'wipe' | 'none'
    direction: 'bottom', // 'left' | 'right' | 'top' | 'bottom'
    duration: 0.6,
    delay: 0,
    ease: 'ease-out'
});
```

### `GSAPFX.standardOut(target, config)` — animacja wyjścia

Identyczne parametry jak `standardIn`.

### `GSAPFX.applyTextEffect(root, config)` — efekty tekstu (wejście)

Automatycznie wyszukuje elementy z klasami `.title`, `.subtitle`, `.modern-title`, `.rep-title`, `.utk-msg-box`, `.utk-item` i innymi.

```javascript
GSAPFX.applyTextEffect(root, {
    type: 'reveal',    // 'reveal' | 'typewriter' | 'fade' | 'blur' | 'scale'
                       // | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'
    duration: 1,
    delay: 0.2,
    stagger: 0.15,
    ease: 'ease-out'
});
```

### `GSAPFX.applyTextOutEffect(root, config)` — efekty tekstu (wyjście)

```javascript
GSAPFX.applyTextOutEffect(root, {
    type: 'fade',     // 'fade' | 'blur' | 'scale' | 'hide' | 'slideHide'
                      // | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'
    duration: 0.5,
    stagger: 0
});
```

### `GSAPFX.revealText(target, duration, delay, ease)` — odsłonięcie przez clip-path

Animuje `clip-path: inset(0 100% 0 0)` → `inset(0 0% 0 0)`. Efekt "wipe-in" dla tekstu.

### `GSAPFX.hideText(target, duration, delay, ease)` — ukrycie przez clip-path

Animuje `clip-path: inset(0 0 0 0)` → `inset(0 0 0 100%)`.

### `GSAPFX.blurIn(target, duration, delay, ease)` — wejście przez blur

Animuje `filter: blur(20px)` → `blur(0px)` + `opacity: 0` → `1`.

### `GSAPFX.blurOut(target, duration, delay, ease)` — wyjście przez blur

### Normalizer ease

`GSAPFX.normalizeEase(ease)` — konwertuje nazwy CSS na nazwy GSAP (np. `'ease-in-out'` → `'power2.inOut'`).

---

## 6. Skalowanie tekstu (Squashing)

Dodaj klasę `.slt-squash` do elementu tekstowego. Renderer automatycznie zmniejszy `scaleX` elementu jeśli tekst jest szerszy niż kontener — bez zmiany rozmiaru fontu i bez łamania linii.

```html
<span class="slt-squash">{{{TITLE}}}</span>
```

Squashing można wyłączyć per-grafika z panelu Inspektora (checkbox "Automatyczne ściskanie tekstu") — zapisuje się w polu `style.typography.squashEnabled`.

---

## 7. Przykłady

### Przykład: Prosta Belka (Lower Third)

**HTML:**
```html
<div class="lt-container">
    <div class="lt-bar">
        <span class="slt-squash">{{{TITLE}}}</span>
    </div>
    <div class="lt-subber">{{{SUBTITLE}}}</div>
</div>
```

**ocgInputs:**
```json
[
  { "id": "TITLE", "label": "Imię i Nazwisko", "type": "richtext", "default": "Jan Kowalski" },
  { "id": "SUBTITLE", "label": "Funkcja", "type": "text", "default": "Ekspert" }
]
```

### Przykład: Odczyt danych tikera w JS szablonu

```javascript
const dataEl = root.querySelector('#f-news-list');
const b64 = dataEl.getAttribute('data-b64');
let items = [];
try {
    items = JSON.parse(decodeURIComponent(escape(atob(b64))));
} catch(e) { items = ['BRAK WIADOMOŚCI']; }
// items = [{ text: "...", category: "POLSKA" }, ...]
```

---

## 8. Wskazówki

1. **Transform Origin**: Przy animacjach `scale` i `wipe` kontroluj `transform-origin` w CSS.
2. **Warstwy (Z-Index)**: Używaj parametru `layer` w `defaultLayout` — wartości 1-10.
3. **Debugowanie**: `console.log` wewnątrz `js_template` widoczny jest w konsoli okna `output.html`.
4. **Wiele instancji**: Każda grafika ma unikalny `instanceId` — `@keyframes` są automatycznie scopowane, więc nie ma ryzyka konfliktów.
5. **Gleam Color**: Pole `wiper.gleamColor` akceptuje zarówno format `#rrggbb` jak i `rgba(r,g,b,a)`.
