import { translatePhrase } from 'components/fork/SpanishUi';
import { FORK_SETTINGS, getForkSetting } from 'components/fork/settings/store';

// Interface texts that the Spanish interface cannot reach on screen, because they end up inside a box
// or a drop-down: the options of a choice, or a message written into a step. They follow its switch.
export const say = (text) => (getForkSetting(FORK_SETTINGS.SPANISH_UI) && translatePhrase(text)) || text;
