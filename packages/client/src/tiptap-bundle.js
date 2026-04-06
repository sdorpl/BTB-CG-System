// TipTap bundle entry point — bundled with esbuild into vendor/tiptap.bundle.js
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontFamily } from '@tiptap/extension-font-family';

window.TipTap = {
    Editor,
    StarterKit,
    Paragraph,
    Color,
    TextStyle,
    Highlight: Highlight.configure({ multicolor: true }),
    Underline,
    TextAlign: TextAlign.configure({
        types: ['heading', 'paragraph'],
    }),
    FontFamily
};
