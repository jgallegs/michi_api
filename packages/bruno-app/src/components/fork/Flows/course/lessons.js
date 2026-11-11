// The guided course: what there is to know to use flows, lesson by lesson, in the order it is best
// learned. "practice" is what a lesson lets try on the canvas: a ready-made block or a single step.
// Every text here has its Spanish in SpanishUi/flowsCourse.js.
export const COURSE = [
  {
    title: 'The canvas',
    lessons: [
      {
        id: 'what-is-a-flow',
        title: 'What a flow is',
        text: [
          'A flow is a list of things to do with the requests of your collection, in order: send this one, look at what it answers, send the next one with a value of the first, repeat it five times.',
          'You build it by joining steps on a canvas. Nobody writes code: every step is a box with its settings, and the cables between boxes say what goes after what.',
          'A flow is saved in the collection, so the whole team gets it. The requests it sends are the same ones you already have, with their environment and their scripts.'
        ]
      },
      {
        id: 'moving-around',
        title: 'Moving around the canvas',
        text: [
          'Drag with the right button to move the canvas, and turn the wheel to zoom in and out. The button with four corners in the bar shows the whole flow.',
          'Drag a step by its title to move it. Drag over the background to select several, or click them holding Ctrl. Steps never end up on top of each other: they step aside when you drop them.',
          'Ctrl+Z undoes and Ctrl+Y redoes. Tidy up puts every step in columns, following the order of the flow.'
        ]
      },
      {
        id: 'shapes',
        title: 'The three shapes',
        text: [
          'A triangle is the order. A cable from the triangle of one step to the triangle of another means: when this one finishes, that one runs.',
          'A circle is a value that comes out of a step, like a field of a response. A square is a value a step needs, like a variable of its request.',
          'A shape is filled only while it has a cable. Rest the pointer on any of them and it tells you what it is for.'
        ]
      },
      {
        id: 'adding-things',
        title: 'Adding steps, requests and blocks',
        text: [
          'There are three kinds of things to add, each with its own list: steps that do something (If, Repeat, Wait), requests of your collection, and blocks, which are several steps already joined.',
          'The bar has a button for each. A right click on an empty spot offers the three and drops what you pick right there.',
          'The quickest way: pull a cable out of a triangle and let go on empty space. The list opens, and what you pick is born already joined. You can also drag a request from the sidebar onto the canvas.'
        ]
      },
      {
        id: 'first-flow',
        title: 'Your first flow: several requests in a row',
        text: [
          'Press the button below. Three request steps land on the canvas, joined one after the other, and a guide opens with what is left to do.',
          'Each step asks which request it sends. Click inside it and choose one; for a first try, pick requests that only read, like a GET.',
          'The points of the guide tick themselves as you go, and the canvas moves to the next step on its own.'
        ],
        practice: { block: 'sequence' }
      },
      {
        id: 'running',
        title: 'Running a flow',
        text: [
          'Run goes through the whole flow from Start. Step runs one step and waits, to follow it slowly. Stop cuts the run, also a request on its way.',
          'The environment the flow runs against is always next to Run. If it is red, it is a sensitive environment and the app asks you before sending anything.',
          'A 404 or a 500 does not stop a flow: it is an answer, and the flow can react to it. What stops it is not being able to send a request at all. Then it waits on that step, and Continue goes on from there once it is fixed.'
        ]
      },
      {
        id: 'output',
        title: 'The output and the report of a run',
        text: [
          'On the right, Output tells what each run did: the status and the time of every request, the round of every loop, what went into each list and how it ended. A line with an arrow unfolds to show the whole response.',
          'Each run starts with the name of the flow. The small table button on that line opens the report of that run: every step with its result, ready to copy into a mail or to save as a page.',
          'The output keeps every run since you opened the app, until you press Clear.'
        ]
      }
    ]
  },
  {
    title: 'Values',
    lessons: [
      {
        id: 'pass-a-value',
        title: 'Using a value of one response in the next call',
        text: [
          'This is what flows are used for the most: the token of a login, the number of what was just created.',
          'A request step shows on its left the values it uses, which are the variables written in the request, and on its right what it returns.',
          'To hand a value over, click the square of the step that needs it and choose where it comes from. The box becomes a tag with the name of the step and the field.'
        ],
        practice: { block: 'pass-value' }
      },
      {
        id: 'fields',
        title: 'Picking one field of a response',
        text: [
          'Whole response is the entire body. For a single piece of it, press Add a field on the request and choose it: it becomes one more output of the step.',
          'The list already knows the fields without running anything. It remembers the ones seen the last time that request was sent, from a flow or from its own tab; it reads the ones the Swagger of the service declares, if it is open in API Specs; and the ones the script of the request mentions.',
          'If a field is still not there, type its name: data.number.'
        ]
      },
      {
        id: 'text-or-value',
        title: 'Text, or a value of another step',
        text: [
          'What you type inside a box is text as it is. If you type token, the step uses the word token, not the field.',
          'To use the field you have to join it. While you type, the canvas offers underneath the values called like that: pick one, or press Enter if the name matches, and the box becomes a tag.',
          'In a text you can also write a name between double braces, and it is replaced by the variable of the flow or of the environment with that name.'
        ]
      },
      {
        id: 'positions',
        title: 'When the value is inside a list',
        text: [
          'A response often carries lists: the parcels of a shipment, the lines of an order. A field inside a list reads the first item, and says so with a small tag: #1.',
          'Click that tag to read another one: the first, the last, or the position you type. Typing 3 reads the third.',
          'You can also ask for the item that holds something: type state=open and the field reads the first item whose state is open.',
          'To do something with every item, use the For each item step, a few lessons ahead.'
        ]
      },
      {
        id: 'set-variable',
        title: 'Set variable: a value with a name',
        text: [
          'Set variable keeps a value under a name. From then on, any later step can use it by writing that name between double braces in its texts, or by joining its output.',
          'It is useful for a value used in many places, or to give a clear name to something that comes out of a long response.'
        ],
        practice: { step: 'setvalue' }
      },
      {
        id: 'questions',
        title: 'Asking before running',
        text: [
          'A flow can ask what it needs to know before it runs: how many shipments, which product. On the Start step, press Ask before running, write the question and, if you want, its usual answer.',
          'Each question is a value Start hands out: join it to whatever needs it, like the number of rounds of a Repeat.',
          'When someone presses Run, a small window asks the questions. That way anybody can use the flow without touching the canvas.'
        ]
      }
    ]
  },
  {
    title: 'Deciding',
    lessons: [
      {
        id: 'if',
        title: 'If: choosing a way',
        text: [
          'If has two outputs, Yes and No, and the flow follows one of them. The cable that leaves Yes is green and the one that leaves No is red.',
          'It can check three things: that the last response was fine, that its status code is a given one, or that two values compare the way you say.',
          'This block stops the flow when a call fails: from No hangs a Stop step, and from Yes you go on with whatever comes next.'
        ],
        practice: { block: 'stop-on-failure' }
      },
      {
        id: 'check-value',
        title: 'Checking a value of the response',
        text: [
          'Set If to compare two values. Join the first one, This, to a field of the response, and type in the second what it should be.',
          'There are many ways to compare: is equal to, is greater than, contains, starts with, is empty. Choose the one that reads like what you mean.'
        ],
        practice: { block: 'check-value' }
      },
      {
        id: 'validate',
        title: 'Validate: a 200 with an error inside',
        text: [
          'Some services answer 200 and carry inside a code that says nothing was done. Validate tells those answers apart.',
          'It reads as a sentence: Not valid if this value is equal to that one. Join the value to the field that holds the code, choose the comparison and type the value.',
          'The flow goes on through Valid or through Not valid. What hangs from Valid never sees the bad answers.'
        ],
        practice: { block: 'validate-field' }
      },
      {
        id: 'tests',
        title: 'The tests of your requests',
        text: [
          'If a request has tests or assertions, they run when a flow sends it, exactly as when you send it by hand.',
          'The output tells how many passed next to each answer, and at the end of the run, the total. A request with a test that fails stands out, and unfolding its line shows which one.',
          'If can follow them too: choose The tests of the response pass, and the flow goes through Yes only when none fails.'
        ]
      },
      {
        id: 'stop-and-note',
        title: 'Note and Stop',
        text: [
          'Note writes a message in the output and goes on. Use it to leave a trace of what happened: a value, a warning, which way the flow took.',
          'Stop ends the flow right there, with a message. Nothing after it runs.'
        ],
        practice: { step: 'note' }
      },
      {
        id: 'wait',
        title: 'Wait: giving the server a moment',
        text: [
          'Wait pauses the flow for the seconds you say. It is for when what one request starts needs time before the next one can see it.',
          'The number of seconds can also arrive through a cable, if it depends on something.'
        ],
        practice: { block: 'wait-between' }
      }
    ]
  },
  {
    title: 'Repeating',
    lessons: [
      {
        id: 'repeat',
        title: 'Repeat: the same thing several times',
        text: [
          'Repeat runs what hangs from On each round as many times as you say. What it repeats is drawn inside a frame, with the number of rounds.',
          'A round ends when its way has nothing else to run, or when it reaches End of round. When there are no rounds left, the flow goes on through When finished.',
          'Round number is a value you can use inside the loop, to make each round different.'
        ],
        practice: { block: 'repeat-collect' }
      },
      {
        id: 'lists',
        title: 'List and Add to list',
        text: [
          'A List starts empty on every run. Add to list puts something in it each time the flow goes through: one value, or several fields with the names you give them.',
          'Add to list chooses its list by name inside the step. If the flow has only one, it is already chosen.',
          'The List step shows inside what it holds as the flow runs. View report opens it as a table, one row per item, to copy into a spreadsheet or a mail, or to save as a page.'
        ]
      },
      {
        id: 'collect-valid',
        title: 'Keeping only the answers that are valid',
        text: [
          'Put a Validate between the request and Add to list, and join Add to list to Valid.',
          'When an answer is not valid, nothing hangs from that way, so the round ends there and the next one starts. The bad answer never reaches the list and the flow goes on.'
        ],
        practice: { block: 'collect-valid' }
      },
      {
        id: 'for-each',
        title: 'For each item: once per item of a list',
        text: [
          'For each item goes through a list and runs its round once for every item. The list can be a field of a response, a List of the flow or a table of data.',
          'On each round it hands out the item and, with Add a field, the fields of the item you need. Join them to the request of the round.',
          'A typical use: one request returns the shipments, and another one is sent for each of them.'
        ],
        practice: { block: 'for-each' }
      },
      {
        id: 'table',
        title: 'A table of data: each round with its own values',
        text: [
          'A Data table step holds rows that you paste from a spreadsheet. The first line holds the names of the columns.',
          'Join it to a For each item step: each round gets one row, and its columns are the fields to join to the request.',
          'That is how the same request is sent many times with different data: a reference and a phone number per row, for example.'
        ],
        practice: { block: 'for-each-row' }
      },
      {
        id: 'leave-loop',
        title: 'Leave loop: retrying until it works',
        text: [
          'Leave loop ends the loop it is in, even if it had rounds left, and the flow goes on through When finished.',
          'With it a Repeat becomes a retry: send the request; if it went fine, leave; if not, wait a little and let the round end.',
          'After the loop, an If checks whether it finally worked or the tries ran out.'
        ],
        practice: { block: 'retry' }
      },
      {
        id: 'wait-until-ready',
        title: 'Waiting until something is ready',
        text: [
          'The same idea serves to wait for a process: each round asks how it is going and, when the value is the one that means done, leaves the loop.',
          'Between one question and the next there is a Wait, so the service is not asked without pause.'
        ],
        practice: { block: 'wait-until-ready' }
      },
      {
        id: 'pages',
        title: 'Going through the pages of a result',
        text: [
          'When a list comes in pages, a Repeat asks for one page per round and Add to list keeps what each one brings.',
          'The number of the page is the Round number of the loop: join it to the variable of the request that says which page to bring.'
        ],
        practice: { block: 'pages' }
      }
    ]
  },
  {
    title: 'Typical cases',
    lessons: [
      {
        id: 'health-check',
        title: 'Checking that several services answer',
        text: [
          'A chain of requests, each followed by an If that checks it went fine. The first one that fails stops the flow with a message that says which.',
          'It is a quick way to know, before a test session, that everything you depend on is up.'
        ],
        practice: { block: 'health-check' }
      },
      {
        id: 'create-check-delete',
        title: 'Create, check and delete',
        text: [
          'The full life of something: one request creates it, another reads it to see it is there, and a third deletes it.',
          'The identifier that the first one returns travels by cable to the other two. It is the pattern of most end to end tests.'
        ],
        practice: { block: 'create-check-delete' }
      },
      {
        id: 'create-if-missing',
        title: 'Creating something only if it is not there',
        text: [
          'First a request looks for it. An If checks whether the status code is 404: if it is, the flow creates it; if not, it updates the one that exists.',
          'It shows that an error status is just one more answer, and a flow can take a different way because of it.'
        ],
        practice: { block: 'create-if-missing' }
      }
    ]
  },
  {
    title: 'Working well',
    lessons: [
      {
        id: 'cables',
        title: 'Reading the cables',
        text: [
          'The thick cables are the order, and they carry a mark that says which way they run: orange the usual one, green what leaves Yes or Valid, red what leaves No or Not valid.',
          'The cables of the values are not drawn until you rest the pointer on a step or select it: then its own appear, thin and in the colour of the step the value comes from. They are not needed to read the flow, because each input already says it in its tag.',
          'The eye in the bar shows them all. Drag any stretch of a cable to shape it, and double click to put it back.'
        ]
      },
      {
        id: 'try-a-step',
        title: 'Trying one step without running everything',
        text: [
          'While you build a flow that creates things, running it whole for every change creates them again and again.',
          'Right click on a step: Run only this step runs it alone, and Run from this step runs from it to the end. Both use what the last run left, so the values of the steps before are still there.',
          'The first time, run the whole flow once so there is something to start from.'
        ]
      },
      {
        id: 'own-blocks',
        title: 'Your own blocks',
        text: [
          'When you have a few steps you are going to repeat in other flows, like your login with its request already chosen, select them and press Save as block.',
          'From then on the block is in the gallery, under My blocks, for you and for everyone who has the collection. It keeps the requests, the settings and the cables between its steps.'
        ]
      },
      {
        id: 'flows-in-flows',
        title: 'A flow inside another flow',
        text: [
          'Run a flow uses another flow of the collection as one step. If the original changes, it changes everywhere it is used, which a copied block does not do.',
          'The questions that flow asks at Start are the inputs of the step, and what it leaves with a name, its variables and its lists, are the outputs.',
          'The output tells what happens inside, with the name of the flow in front of each line.'
        ],
        practice: { step: 'flow' }
      },
      {
        id: 'care',
        title: 'Real data and sensitive environments',
        text: [
          'A flow sends real requests. One that creates shipments in a loop creates real shipments in the environment that is chosen: look at the name next to Run before pressing it.',
          'In an environment marked as sensitive the name is red and the app asks for confirmation once per run. If you change the environment before continuing, it asks again.'
        ]
      },
      {
        id: 'team',
        title: 'Saving and sharing',
        text: [
          'Save keeps the flow in the collection, in a file the official Bruno ignores. With the next push, the team has it.',
          'In the Flows section of the sidebar you can search a flow by name, duplicate it to start from a copy, and see with a dot how its last run went.',
          'If a pull brings another version of a flow you are editing, the bar tells you, and lets you discard your changes to see the one that arrived.'
        ]
      },
      {
        id: 'troubleshooting',
        title: 'When something does not come out',
        text: [
          'A faded step is not joined to Start and does not run: pull a cable from the triangle of the step before it. It is also a way to leave spare pieces on the canvas.',
          'A step with an orange warning says underneath what it is missing. While there are warnings, Run sends nothing and writes them in the output.',
          'If a step lost its request because it was moved or renamed in the collection, click inside the step and choose it again.'
        ]
      }
    ]
  }
];

export const LESSONS = COURSE.flatMap((chapter) => chapter.lessons);
