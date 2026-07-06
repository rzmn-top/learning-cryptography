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
import { mountLatticeCvp } from '../widgets/lattice-cvp';
import { mountLweDemo } from '../widgets/lwe-demo';
import { mountRegevDemo } from '../widgets/regev-demo';
import { mountHero } from '../widgets/hero';

const main = (): void => {
  renderMath(document.body);
  initAsidePanel();
  initKeyboardNav();
  mountAll({
    'lattice-cvp': mountLatticeCvp,
    'lwe-demo': mountLweDemo,
    'regev-demo': mountRegevDemo,
    hero: mountHero,
  });
};

main();
