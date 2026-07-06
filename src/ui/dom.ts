/**
 * Типизированный hyperscript: чистое создание DOM-узлов без фреймворка.
 * Виджеты строят разметку как чистую функцию (state) → Node.
 */

export type Child = Node | string | number | null | undefined | false;

export type Attrs = Readonly<
  Record<string, string | number | boolean | EventListener | undefined>
>;

const isEventKey = (key: string): boolean => key.startsWith('on');

export const h = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: readonly Child[]
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (isEventKey(key) && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else if (typeof value !== 'function') {
      el.setAttribute(key, String(value));
    }
  }
  el.append(
    ...children.flatMap((c): (Node | string)[] =>
      c === null || c === undefined || c === false ? [] : [typeof c === 'number' ? String(c) : c],
    ),
  );
  return el;
};

/** Заменить содержимое узла (идемпотентный перерендер). */
export const replaceChildrenOf = (root: Element, ...children: readonly Child[]): void => {
  root.replaceChildren(
    ...children.flatMap((c): (Node | string)[] =>
      c === null || c === undefined || c === false ? [] : [typeof c === 'number' ? String(c) : c],
    ),
  );
};
