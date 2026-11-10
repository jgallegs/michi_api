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
    id: FORK_SETTINGS.LABEL_PREVIEW,
    label: 'Preview labels found in responses',
    description:
      'When a response carries a PDF, PNG, JPEG or ZPL label (as base64 or as text, in any field), a bar above the body shows it and lets you save it. ZPL labels are drawn on this machine.'
  },
  {
    id: FORK_SETTINGS.QR_TOOL,
    label: 'QR code tool',
    description:
      'QR in the status bar: draws a QR code from a text or from a variable of the active collection, on this machine, and saves it as PNG.'
  },
  {
    id: FORK_SETTINGS.VISUALIZE,
    label: 'Show script panels (bru.visualize)',
    description:
      'Panels that post-response scripts draw with bru.visualize appear as tabs next to the response format. They run in an isolated frame and cannot reach the app.'
  },
  {
    id: FORK_SETTINGS.FLOWS,
    label: 'Flows',
    description:
      'A Flows section in the sidebar to chain the requests of a collection on a visual canvas, without code. Flows are saved in the collection, in the same shared settings file as the sensitive environments.',
    note: 'Off by default: flows can be built but not run yet.'
  },
  {
    id: FORK_SETTINGS.REQUEST_HISTORY,
    label: 'Keep a request history',
    description:
      'Every request sent from a tab is recorded on this machine: when, which environment, the resolved URL, status, time and a short excerpt of the response. Open it with History in the status bar. Request headers are not kept and credentials are masked.'
  },
  {
    id: FORK_SETTINGS.LOCAL_TIME,
    label: 'Show local time next to ISO dates',
    description:
      'In responses, dates with a time zone (2026-11-06T09:00:00Z) get the local time and how long ago it was next to them. Only on screen: copying the response gives the original text.'
  },
  {
    id: FORK_SETTINGS.SPANISH_UI,
    label: 'Spanish interface',
    description:
      'Shows menus, tabs, buttons and dialogs in Spanish. Request, folder and collection names, editors and responses are never changed. Texts without a translation stay in English.'
  }
];
