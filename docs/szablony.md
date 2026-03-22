# Przewodnik Twórcy Szablonów (VinciFlow)

System **CG Control Pro** opiera się na elastycznej strukturze szablonów, które są kompilowane w locie. Każdy szablon to obiekt JSON zawierający kod HTML, CSS, JS oraz definicje pól wejściowych.

---

## 1. Struktura Obiektu Szablonu

Szablon w bazie danych (lub pliku eksportu) ma następującą strukturę:

```json
{
  "id": "identyfikator-szablonu",
  "name": "Przyjazna Nazwa",
  "type": "LOWER_THIRD", // LOWER_THIRD, TICKER, CLOCK, IMAGE
  "html_template": "...", // Kod Handlebars
  "css_template": "...", // Style CSS (izolowane)
  "js_template": "...",  // Logika animacji (GSAP)
  "ocgInputs": [          // Definicja pół w Inspektorze
    { "id": "TITLE", "label": "Tytuł", "type": "richtext", "default": "Tekst" }
  ],
  "defaultLayout": { "x": 100, "y": 800, "width": 1600, "height": 60, "layer": 5 }
}
```

---

## 2. Język Szablonów (Handlebars)

Renderer wstrzykuje dane do szablonu przed wyświetleniem. Najważniejsze zmienne to:

*   `{{ID}}`: Unikalny ID instancji (np. `lt_5f3a`). Używaj go do selektorów CSS: `#{{ID}}`.
*   `{{{TITLE}}}`: Główny tekst. **Ważne**: Trzy nawiasy `{{{ }}}` oznaczają, że tekst może zawierać kod HTML (np. z edytora WYSIWYG).
*   `{{PRIMARY_BG}}`: Skompilowany kolor lub gradient tła.
*   `{{BORDER_RADIUS}}`: Wartość promienia zaokrąglenia (globalna lub lokalna).

---

## 3. Stylizacja (CSS) i Izolacja

System automatycznie izoluje style każdego szablonu, ale dobrą praktyką jest rozpoczynanie reguł od `#{{ID}}`:

```css
#{{ID}} .container {
    background: {{PRIMARY_BG}};
    border-radius: {{BORDER_RADIUS}}px;
    padding-top: {{PADDING_Y}}px;
}

/* Automatyczne ściskanie tekstu */
#{{ID}} .slt-squash {
    display: inline-block;
    transform-origin: left center;
    white-space: nowrap;
}
```

---

## 4. Logika Animacji (JavaScript & GSAPFX)

Każdy szablon musi implementować funkcje wejścia i wyjścia wewnątrz IIFE:

```javascript
(() => {
    const container = root.querySelector('.main-box');

    root.__slt_show = () => {
        const tl = gsap.timeline();
        
        // Użycie biblioteki GSAPFX dla standardowych efektów
        tl.add(GSAPFX.standardIn(container, { 
            type: 'slide', 
            direction: 'bottom', 
            duration: 0.6 
        }));
        
        return tl;
    };

    root.__slt_hide = () => {
        return GSAPFX.standardOut(container, { 
            type: 'slide', 
            direction: 'bottom' 
        });
    };
})();
```

### Biblioteka GSAPFX
- `standardIn(el, { type, direction, duration })`: slide, fade, scale.
- `applyTextEffect(root, { type, stagger })`: reveal, slide-up, typewriter.

---

## 5. Przykłady

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

**JSON (ocgInputs):**
```json
[
  { "id": "TITLE", "label": "Imię i Nazwisko", "type": "richtext", "default": "Jan Kowalski" },
  { "id": "SUBTITLE", "label": "Funkcja", "type": "text", "default": "Ekspert" }
]
```

---

## 6. Wskazówki

1. **Transform Origin**: Przy animacjach typu `scale` kontroluj `transform-origin`.
2. **Warstwy (Z-Index)**: Używaj parametru `layer` w ustawieniach Layout.
3. **Debugowanie**: Używaj `console.log` wewnątrz `js_template` — wyniki zobaczysz w konsoli okna Output.
