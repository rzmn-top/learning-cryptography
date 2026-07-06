import '@fontsource/stix-two-text/400.css';
import '@fontsource/stix-two-text/400-italic.css';
import '@fontsource/stix-two-text/700.css';
import '@fontsource/vt323';
import '@fontsource/pt-mono';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/index-page.css';

import { mountHeroCollage } from './widgets/hero';

const collageRoot = document.querySelector<HTMLElement>('[data-widget="hero-collage"]');
if (collageRoot !== null) mountHeroCollage(collageRoot);
