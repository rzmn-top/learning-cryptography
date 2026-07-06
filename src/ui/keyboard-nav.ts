/**
 * Стрелки ← / → листают главы по ссылкам нижней навигации
 * (.chapter-nav: первая ссылка — назад, последняя — вперёд).
 * Нажатия в полях ввода и с модификаторами игнорируются.
 */

export const initKeyboardNav = (): void => {
  const links = document.querySelectorAll<HTMLAnchorElement>('.chapter-nav a[href]');
  if (links.length === 0) return;
  const valid = (a: HTMLAnchorElement | undefined): HTMLAnchorElement | undefined =>
    a !== undefined && !(a.getAttribute('href') ?? '#').startsWith('#') ? a : undefined;
  const prev = valid(links[0]);
  const next = valid(links[links.length - 1]);

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName ?? '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft' && prev !== undefined) {
      window.location.href = prev.href;
    } else if (e.key === 'ArrowRight' && next !== undefined && next !== prev) {
      window.location.href = next.href;
    }
  });
};
