/**
 * Панель доказательств (split screen).
 *
 * Контракт со страницей:
 *  - утверждения: <button class="claim" data-aside="ID">…</button>
 *  - доказательства: <section id="aside-ID" data-title="…"> внутри
 *    скрытого контейнера <div class="aside-store" hidden>.
 *
 * Клик по утверждению переносит секцию в панель справа (body.split),
 * повторный клик / ✕ / Escape возвращает её в хранилище.
 */

import { h } from './dom';

interface Current {
  readonly id: string;
  readonly node: HTMLElement;
  readonly claim: HTMLElement;
}

export const initAsidePanel = (): void => {
  const layout = document.querySelector<HTMLElement>('.layout');
  const store = document.querySelector<HTMLElement>('.aside-store');
  if (layout === null || store === null) return;

  const title = h('span', {}, 'proof.viewer');
  const body = h('div', { class: 'proof-panel-body' });
  const closeButton = h(
    'button',
    { class: 'panel-close', 'aria-label': 'закрыть панель', onclick: () => close() },
    '✕',
  );
  const panel = h(
    'aside',
    { class: 'proof-panel', id: 'proof-panel', role: 'complementary', hidden: true },
    h('div', { class: 'proof-panel-title' }, title, closeButton),
    body,
  );
  layout.append(panel);

  let current: Current | undefined;

  const putBack = (): void => {
    if (current === undefined) return;
    store.append(current.node);
    current.claim.classList.remove('active');
    current.claim.setAttribute('aria-expanded', 'false');
    current = undefined;
  };

  const close = (): void => {
    putBack();
    panel.hidden = true;
    document.body.classList.remove('split');
  };

  const open = (id: string, claim: HTMLElement): void => {
    if (current?.id === id) {
      close();
      return;
    }
    const node = document.getElementById(`aside-${id}`);
    if (node === null) {
      console.warn(`Aside not found: ${id}`);
      return;
    }
    putBack();
    body.replaceChildren(node);
    title.textContent = node.dataset['title'] ?? 'доказательство';
    panel.hidden = false;
    document.body.classList.add('split');
    claim.classList.add('active');
    claim.setAttribute('aria-expanded', 'true');
    current = { id, node, claim };
    body.scrollTop = 0;
  };

  document.querySelectorAll<HTMLElement>('button.claim[data-aside]').forEach((claim) => {
    claim.setAttribute('aria-controls', 'proof-panel');
    claim.setAttribute('aria-expanded', 'false');
    claim.addEventListener('click', () => {
      const id = claim.dataset['aside'];
      if (id !== undefined) open(id, claim);
    });
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  });
};
