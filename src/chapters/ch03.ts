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
import { mountAvalanche } from '../widgets/avalanche';
import { mountEcbCtr } from '../widgets/ecb-ctr';
import { mountBirthday } from '../widgets/birthday';
import { mountHero } from '../widgets/hero';

const main = (): void => {
  renderMath(document.body);
  initAsidePanel();
  initKeyboardNav();
  mountAll({
    avalanche: mountAvalanche,
    'ecb-ctr': mountEcbCtr,
    birthday: mountBirthday,
    hero: mountHero,
  });
};

main();
