import '@fontsource/stix-two-text/400.css';
import '@fontsource/stix-two-text/400-italic.css';
import '@fontsource/stix-two-text/700.css';
import '@fontsource/vt323';
import '@fontsource/pt-mono';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';

import { renderMath } from '../ui/katex';
import { mountAll } from '../ui/widgets';
import { initAsidePanel } from '../ui/aside-panel';
import { initKeyboardNav } from '../ui/keyboard-nav';
import { mountToyKyber } from '../widgets/toy-kyber';
import { mountLamport } from '../widgets/lamport';
import { mountKeySizes } from '../widgets/key-sizes';
import { mountHero } from '../widgets/hero';

const main = (): void => {
  renderMath(document.body);
  initAsidePanel();
  initKeyboardNav();
  mountAll({
    'toy-kyber': mountToyKyber,
    lamport: mountLamport,
    'key-sizes': mountKeySizes,
    hero: mountHero,
  });
};

main();
