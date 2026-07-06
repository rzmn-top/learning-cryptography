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
import { mountFourierWind } from '../widgets/fourier-wind';
import { mountQftPeriod } from '../widgets/qft-period';
import { mountShor15 } from '../widgets/shor15';
import { mountGrover } from '../widgets/grover';
import { mountHero } from '../widgets/hero';

const main = (): void => {
  renderMath(document.body);
  initAsidePanel();
  initKeyboardNav();
  mountAll({
    'fourier-wind': mountFourierWind,
    'qft-period': mountQftPeriod,
    shor15: mountShor15,
    grover: mountGrover,
    hero: mountHero,
  });
};

main();
