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
import { mountRsaCalc } from '../widgets/rsa-calc';
import { mountDhDemo } from '../widgets/dh-demo';
import { mountDlogScatter } from '../widgets/dlog-scatter';
import { mountHero } from '../widgets/hero';

const main = (): void => {
  renderMath(document.body);
  initAsidePanel();
  mountAll({
    'rsa-calc': mountRsaCalc,
    'dh-demo': mountDhDemo,
    'dlog-scatter': mountDlogScatter,
    hero: mountHero,
  });
};

main();
