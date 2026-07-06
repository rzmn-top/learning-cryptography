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
import { mountBloch } from '../widgets/bloch';
import { mountCircuitSim } from '../widgets/circuit-sim';
import { mountBellMeasure } from '../widgets/bell-measure';
import { mountHero } from '../widgets/hero';

const main = (): void => {
  renderMath(document.body);
  initAsidePanel();
  initKeyboardNav();
  mountAll({
    bloch: mountBloch,
    'circuit-sim': mountCircuitSim,
    'bell-measure': mountBellMeasure,
    hero: mountHero,
  });
};

main();
