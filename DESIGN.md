# Дизайн-принципы курса

Ключ: **retro web + modern UX**. Общее ощущение: official but fake; academic but
game-like; retro but clean; dense but navigable; playful but not childish;
mysterious but not unusable.

## Визуальный словарь (использовать)

borders · panels · compact cards · pixel-ish icons · terminal blocks ·
monospace labels · tiny system messages · old web directory layout · status bars ·
table-like navigation · IRC/chat-inspired blocks · low-fi decorative widgets ·
stamps / seals / clearance marks · file-folder metaphors · progress bars · tables ·
ID cards · small decorative warnings · protocol diagrams · badges · status widgets.

## Поведение (современное)

Быстрые transitions; responsive layout; нормальная mobile-версия; readable
typography; keyboard-friendly controls; accessible contrast; predictable
navigation; сохранение прогресса; интерактивные упражнения без лагов.

## Запрещено

Generic gradient SaaS; glassmorphism как основной стиль; huge rounded cards;
corporate illustrations; stock icons; excessive neon hacker clichés; Matrix rain;
cyberpunk overload; childish gamification; NFT-copycat visuals.

## Тон текста

Сухой, плотный, без разжёвываний: аудитория с CS-бэкграундом. Мотивация — одним
абзацем, не метафорами. Полные доказательства ключевых теорем; громоздкие места —
честные скетчи. Юмор допустим в маргиналиях и штампах, не в теле текста.

## Структура главы: повествование + сноски

Основная секция — сплошное повествование по центру, интуитивно понятное без
отвлечений. Формальные блоки в тексте — минимум (одно-два ключевых определения).
Утверждения, требующие доказательства, — кликабельные (`<button class="claim"
data-aside="ID">`); по клику открывается split screen: панель справа с полным
доказательством (`<section id="aside-ID" data-title="…">` в `.aside-store`).
Цель: основной текст читается как рассказ, внимательный читатель может
удостовериться в каждом шаге. Виджеты остаются в основном потоке.

## Текущая реализация (дизайн-система)

- **Бумага и чернила:** кремовый фон + dotted grid, тёмные чернила, тонкие рамки.
- **Типографика:** STIX Two Text (тело и заголовки — academic); VT323 + PT Mono
  (метки, метаданные, штампы, статус-бары — terminal).
- **Акценты:** acid green / hot pink / violet — только в метках, рамках окружений
  и подсветках виджетов; тело текста и математика не окрашиваются.
- **Компоненты:** нумерованные окружения (Определение/Лемма/Теорема/Следствие
  с цветной кромкой), доказательства с ∎ и штампом, `doc-meta` (official but fake
  строка метаданных в шапке главы), виджеты с terminal-титлбаром, статусные строки,
  ASCII-разделители, маргиналии.
