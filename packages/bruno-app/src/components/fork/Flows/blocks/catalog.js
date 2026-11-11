// Ready-made blocks: a few steps already joined that solve something people do all the time. Picking
// one drops it on the canvas and opens a short guide with what is left to fill in.
//
// steps: where each step goes, in columns and rows from the first one, which is the one a cable arrives at.
// cables: [from step, its port, to step, its port]. guide: what is left to do, in order; "check" says
// how the canvas can tell a point is done (see guide.js).

const step = (key, type, column, row, config) => ({ key, type, column, row, config });
const next = (from, to) => [from, 'out', to, 'in'];

const RUN = { text: 'Press Run and watch it go', check: 'run' };

export const BLOCK_GROUPS = [
  {
    title: 'The basics',
    blocks: [
      {
        id: 'sequence',
        title: 'Call several requests in a row',
        description: 'Three requests, one after the other. You only choose which.',
        steps: [step('first', 'request', 0, 0), step('second', 'request', 1, 0), step('third', 'request', 2, 0)],
        cables: [next('first', 'second'), next('second', 'third')],
        guide: [
          { step: 'first', text: 'Choose the first request', check: 'request' },
          { step: 'second', text: 'Choose the second request', check: 'request' },
          { step: 'third', text: 'Choose the third request', check: 'request' },
          RUN
        ]
      },
      {
        id: 'pass-value',
        title: 'Use a value from one response in the next call',
        description: 'Like logging in and using the token in what comes after.',
        steps: [step('gives', 'request', 0, 0), step('needs', 'request', 1, 0)],
        cables: [next('gives', 'needs')],
        guide: [
          { step: 'gives', text: 'Choose the request that gives the value, a login for example', check: 'request' },
          { step: 'needs', text: 'Choose the request that needs that value', check: 'request' },
          { step: 'needs', text: 'On that second step, click the square of the value it needs and choose where it comes from', check: 'value' },
          RUN
        ]
      },
      {
        id: 'wait-between',
        title: 'Wait between two calls',
        description: 'For when the server needs a moment before the next request.',
        steps: [step('first', 'request', 0, 0), step('wait', 'wait', 1, 0, { seconds: '2' }), step('second', 'request', 2, 0)],
        cables: [next('first', 'wait'), next('wait', 'second')],
        guide: [
          { step: 'first', text: 'Choose the first request', check: 'request' },
          { step: 'second', text: 'Choose the second request', check: 'request' },
          { step: 'wait', text: 'Set how many seconds it waits', check: 'manual' },
          RUN
        ]
      }
    ]
  },
  {
    title: 'When something fails',
    blocks: [
      {
        id: 'stop-on-failure',
        title: 'Stop if a call fails',
        description: 'The flow only goes on when the response is OK.',
        steps: [step('call', 'request', 0, 0), step('check', 'if', 1, 0, { check: 'success' }), step('stop', 'stop', 2, 0.8, { message: 'The call failed' })],
        cables: [next('call', 'check'), ['check', 'no', 'stop', 'in']],
        guide: [
          { step: 'call', text: 'Choose the request', check: 'request' },
          RUN,
          { step: 'check', text: 'Pull a cable out of Yes to go on with what comes next', check: 'output:yes' }
        ]
      },
      {
        id: 'check-value',
        title: 'Check a value of the response',
        description: 'Stops the flow when a value is not the one you expect.',
        steps: [
          step('call', 'request', 0, 0),
          step('check', 'if', 1, 0, { check: 'compare', operator: 'equals' }),
          step('stop', 'stop', 2, 1.2, { message: 'The value is not the expected one' })
        ],
        cables: [next('call', 'check'), ['check', 'no', 'stop', 'in']],
        guide: [
          { step: 'call', text: 'Choose the request', check: 'request' },
          { step: 'check', text: 'On the If, click the square of "This" and choose the value to check', check: 'input:left' },
          { step: 'check', text: 'Type in "That" what it should be', check: 'input:right' },
          RUN
        ]
      },
      {
        id: 'validate-field',
        title: 'Validate a field of the response',
        description: 'For answers that come back OK but carry an error inside: they are told apart and left out.',
        steps: [
          step('call', 'request', 0, 0),
          step('check', 'validate', 1, 0, { operator: 'equals' }),
          step('note', 'note', 2, 1.2, { message: 'The response is not valid' })
        ],
        cables: [next('call', 'check'), ['check', 'invalid', 'note', 'in']],
        guide: [
          { step: 'call', text: 'Choose the request', check: 'request' },
          { step: 'check', text: 'On Validate, click the square of "Not valid if" and choose the field to look at', check: 'input:left' },
          { step: 'check', text: 'Choose how it compares and type in "That" the value that means it is not valid', check: 'input:right' },
          RUN,
          { step: 'check', text: 'Pull a cable out of Valid to go on with what uses the response', check: 'output:valid' }
        ]
      },
      {
        id: 'retry',
        title: 'Retry until it works',
        description: 'Sends the request again, waiting a little, until the response is OK.',
        steps: [
          step('repeat', 'repeat', 0, 0, { times: '5' }),
          step('call', 'request', 1, 0),
          step('check', 'if', 2, 0, { check: 'success' }),
          step('leave', 'leave', 3, 0),
          step('wait', 'wait', 3, 0.5, { seconds: '2' }),
          step('worked', 'if', 1, 1.5, { check: 'success' }),
          step('stop', 'stop', 2, 2, { message: 'It did not work after several tries' })
        ],
        cables: [
          ['repeat', 'body', 'call', 'in'],
          next('call', 'check'),
          ['check', 'yes', 'leave', 'in'],
          ['check', 'no', 'wait', 'in'],
          ['repeat', 'exit', 'worked', 'in'],
          ['worked', 'no', 'stop', 'in']
        ],
        guide: [
          { step: 'call', text: 'Choose the request to retry', check: 'request' },
          { step: 'repeat', text: 'Set how many times it tries, and in Wait how long between tries', check: 'manual' },
          RUN
        ]
      },
      {
        id: 'health-check',
        title: 'Check that several services answer',
        description: 'Calls them one by one and stops at the first that fails.',
        steps: [
          step('first', 'request', 0, 0),
          step('firstOk', 'if', 1, 0, { check: 'success' }),
          step('second', 'request', 2, 0),
          step('secondOk', 'if', 3, 0, { check: 'success' }),
          step('third', 'request', 4, 0),
          step('thirdOk', 'if', 5, 0, { check: 'success' }),
          step('stop', 'stop', 3, 1.2, { message: 'A service does not answer' })
        ],
        cables: [
          next('first', 'firstOk'),
          ['firstOk', 'yes', 'second', 'in'],
          next('second', 'secondOk'),
          ['secondOk', 'yes', 'third', 'in'],
          next('third', 'thirdOk'),
          ['firstOk', 'no', 'stop', 'in'],
          ['secondOk', 'no', 'stop', 'in'],
          ['thirdOk', 'no', 'stop', 'in']
        ],
        guide: [
          { step: 'first', text: 'Choose the request of the first service', check: 'request' },
          { step: 'second', text: 'Choose the request of the second service', check: 'request' },
          { step: 'third', text: 'Choose the request of the third service', check: 'request' },
          RUN
        ]
      }
    ]
  },
  {
    title: 'Repeating',
    blocks: [
      {
        id: 'repeat-collect',
        title: 'Repeat a call and keep the results',
        description: 'Each round adds its response to a list you can use afterwards.',
        steps: [
          step('repeat', 'repeat', 0, 0, { times: '3' }),
          step('call', 'request', 1, 0),
          step('add', 'listappend', 2, 0, { mode: 'value' }),
          step('list', 'list', 2, 1.2)
        ],
        cables: [['repeat', 'body', 'call', 'in'], next('call', 'add'), ['call', 'field:', 'add', 'value:value'], ['list', 'field:items', 'add', 'list']],
        guide: [
          { step: 'call', text: 'Choose the request to repeat', check: 'request' },
          { step: 'repeat', text: 'Set how many times it repeats', check: 'manual' },
          RUN
        ]
      },
      {
        id: 'collect-valid',
        title: 'Repeat a call and keep only the valid responses',
        description: 'Each round looks at a field of the response; the ones that are not valid stay out of the list.',
        steps: [
          step('repeat', 'repeat', 0, 0, { times: '3' }),
          step('call', 'request', 1, 0),
          step('check', 'validate', 2, 0, { operator: 'equals' }),
          step('add', 'listappend', 3, 0, { mode: 'value' }),
          step('list', 'list', 3, 1.2)
        ],
        cables: [
          ['repeat', 'body', 'call', 'in'],
          next('call', 'check'),
          ['check', 'valid', 'add', 'in'],
          ['call', 'field:', 'add', 'value:value'],
          ['list', 'field:items', 'add', 'list']
        ],
        guide: [
          { step: 'call', text: 'Choose the request to repeat', check: 'request' },
          { step: 'check', text: 'On Validate, click the square of "Not valid if" and choose the field to look at', check: 'input:left' },
          { step: 'check', text: 'Choose how it compares and type in "That" the value that means it is not valid', check: 'input:right' },
          { step: 'repeat', text: 'Set how many times it repeats', check: 'manual' },
          RUN
        ]
      },
      {
        id: 'pages',
        title: 'Go through the pages of a result',
        description: 'Asks for page 1, 2, 3… and keeps them all in a list.',
        steps: [
          step('repeat', 'repeat', 0, 0, { times: '5' }),
          step('call', 'request', 1, 0),
          step('add', 'listappend', 2, 0, { mode: 'value' }),
          step('list', 'list', 2, 1.2)
        ],
        cables: [['repeat', 'body', 'call', 'in'], next('call', 'add'), ['call', 'field:', 'add', 'value:value'], ['list', 'field:items', 'add', 'list']],
        guide: [
          { step: 'call', text: 'Choose the request that returns one page', check: 'request' },
          { step: 'call', text: 'On that step, click the square of its page value and choose "Round number"', check: 'value' },
          { step: 'repeat', text: 'Set how many pages to ask for', check: 'manual' },
          RUN
        ]
      },
      {
        id: 'for-each',
        title: 'Send a request for each item of a list',
        description: 'One call returns a list and another one runs once per item.',
        steps: [step('all', 'request', 0, 0), step('each', 'foreach', 1, 0), step('one', 'request', 2, 0)],
        cables: [next('all', 'each'), ['each', 'body', 'one', 'in']],
        guide: [
          { step: 'all', text: 'Choose the request that returns the list', check: 'request' },
          { step: 'each', text: 'On "For each item", choose the list', check: 'list' },
          { step: 'one', text: 'Choose the request to send for each item', check: 'request' },
          { step: 'one', text: 'On that step, click the square of the value it needs and choose "Item"', check: 'value' },
          RUN
        ]
      },
      {
        id: 'for-each-row',
        title: 'Send a request for each row of a table',
        description: 'Paste your data from a spreadsheet: each row is sent with its own values.',
        steps: [step('each', 'foreach', 0, 0), step('one', 'request', 1, 0), step('table', 'table', 0, 1.3)],
        cables: [['table', 'field:items', 'each', 'value:list'], ['each', 'body', 'one', 'in']],
        guide: [
          { step: 'table', text: 'On the table, press "Edit the data" and paste your rows', check: 'manual' },
          { step: 'one', text: 'Choose the request to send for each row', check: 'request' },
          { step: 'one', text: 'On that step, click the square of each value and choose its column', check: 'value' },
          RUN
        ]
      },
      {
        id: 'wait-until-ready',
        title: 'Wait until something is ready',
        description: 'Asks how it is going every few seconds and goes on when it is done.',
        steps: [
          step('repeat', 'repeat', 0, 0, { times: '10' }),
          step('ask', 'request', 1, 0),
          step('check', 'if', 2, 0, { check: 'compare', operator: 'equals' }),
          step('leave', 'leave', 3, 0),
          step('wait', 'wait', 3, 0.5, { seconds: '3' })
        ],
        cables: [['repeat', 'body', 'ask', 'in'], next('ask', 'check'), ['check', 'yes', 'leave', 'in'], ['check', 'no', 'wait', 'in']],
        guide: [
          { step: 'ask', text: 'Choose the request that tells how it is going', check: 'request' },
          { step: 'check', text: 'On the If, click the square of "This" and choose the value to look at', check: 'input:left' },
          { step: 'check', text: 'Type in "That" the value that means it is ready', check: 'input:right' },
          RUN
        ]
      }
    ]
  },
  {
    title: 'Typical cases',
    blocks: [
      {
        id: 'create-check-delete',
        title: 'Create, check and delete',
        description: 'Creates something, reads it back and removes it, passing its id along.',
        steps: [step('create', 'request', 0, 0), step('read', 'request', 1, 0), step('remove', 'request', 2, 0)],
        cables: [next('create', 'read'), next('read', 'remove')],
        guide: [
          { step: 'create', text: 'Choose the request that creates it', check: 'request' },
          { step: 'read', text: 'Choose the request that reads it', check: 'request' },
          { step: 'remove', text: 'Choose the request that deletes it', check: 'request' },
          { step: 'read', text: 'On the second and third steps, click the square of the id and choose it from the first', check: 'value' },
          RUN
        ]
      },
      {
        id: 'create-if-missing',
        title: 'Create it only if it does not exist',
        description: 'Looks for it first: creates it on a 404 and updates it otherwise.',
        steps: [
          step('find', 'request', 0, 0),
          step('missing', 'if', 1, 0, { check: 'status', status: '404' }),
          step('create', 'request', 2, 0),
          step('update', 'request', 2, 1.3)
        ],
        cables: [next('find', 'missing'), ['missing', 'yes', 'create', 'in'], ['missing', 'no', 'update', 'in']],
        guide: [
          { step: 'find', text: 'Choose the request that looks for it', check: 'request' },
          { step: 'create', text: 'Choose the request that creates it', check: 'request' },
          { step: 'update', text: 'Choose the request that updates it', check: 'request' },
          RUN
        ]
      }
    ]
  }
];

export const READY_BLOCKS = BLOCK_GROUPS.flatMap((group) => group.blocks);
