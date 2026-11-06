import { FORK_SETTINGS } from './store';

// One entry per switch shown in Preferences → Michi. A feature adds its entry when it lands.
export const FORK_SETTING_ENTRIES = [
  {
    id: FORK_SETTINGS.SENSITIVE_WRITES_ONLY,
    label: 'Confirm only write requests in sensitive environments',
    description:
      'Ask before POST, PUT, PATCH and DELETE (and GraphQL mutations, gRPC, WebSocket and runs). GET, HEAD and OPTIONS go out without asking. Turn it off to confirm every request.'
  },
  {
    id: FORK_SETTINGS.LOCAL_TIME,
    label: 'Show local time next to ISO dates',
    description:
      'In responses, dates with a time zone (2026-11-06T09:00:00Z) get the local time and how long ago it was next to them. Only on screen: copying the response gives the original text.'
  }
];
