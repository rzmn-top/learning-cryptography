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
import { mountEuclidTable } from '../widgets/euclid-table';
import { mountCrtGrid } from '../widgets/crt-grid';
import { mountPhiCalc } from '../widgets/phi-calc';

const main = (): void => {
  renderMath(document.body);
  initAsidePanel();
  mountAll({
    'euclid-table': mountEuclidTable,
    'crt-grid': mountCrtGrid,
    'phi-calc': mountPhiCalc,
  });
};

main();
