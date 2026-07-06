import renderMathInElement from 'katex/contrib/auto-render';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/** Отрендерить все \( … \) и \[ … \] внутри узла. */
export const renderMath = (root: HTMLElement): void => {
  renderMathInElement(root, {
    delimiters: [
      { left: '\\(', right: '\\)', display: false },
      { left: '\\[', right: '\\]', display: true },
    ],
    throwOnError: false,
  });
};

/** Отрендерить одну формулу в элемент (для виджетов). */
export const tex = (source: string, displayMode = false): HTMLElement => {
  const span = document.createElement('span');
  katex.render(source, span, { throwOnError: false, displayMode });
  return span;
};
