/**
 * Реестр виджетов: страница объявляет <div data-widget="имя" data-...>,
 * реестр монтирует соответствующий модуль. Контент (HTML) ничего не знает
 * о реализации, виджеты ничего не знают о странице.
 */

export type WidgetMount = (root: HTMLElement) => void;

export const mountAll = (registry: Readonly<Record<string, WidgetMount>>): void => {
  document.querySelectorAll<HTMLElement>('[data-widget]').forEach((root) => {
    const name = root.dataset['widget'];
    const mount = name === undefined ? undefined : registry[name];
    if (mount === undefined) {
      console.warn(`Unknown widget: ${String(name)}`);
      return;
    }
    mount(root);
  });
};

/** Прочитать числовой параметр из data-атрибута с дефолтом. */
export const numParam = (root: HTMLElement, key: string, fallback: number): number => {
  const raw = root.dataset[key];
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};
