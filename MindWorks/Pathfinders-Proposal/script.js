(() => {
  'use strict';

  const REASONING_PURPLE = '#6B3FA6';

  const LINES_DATA = [
    {
      id: 'justice', name: 'Justice', letter: 'J', color: '#000099', identity: 'The Policy Architects',
      coreQ: 'What should the rule or policy be, who gets to decide, and how would it actually work?',
      pathwayLink: 'Global Issues Problem Solving Competition and Future Problem Solving Program Australia',
      criteria: [
        'Who holds the power to decide this, and who should?',
        'Which stakeholders are affected, and were they consulted?',
        'What rule, policy or system change would respond best?',
        'Could the school actually implement and enforce it?',
        'Does it protect the rights of students with less power?',
        'What trade-off or pushback would it face?'
      ],
      skills: ['Futures thinking', 'Stakeholder analysis', 'Civic and legal knowledge', 'Policy thinking', 'Negotiation and advocacy', 'Action planning', 'Concise proposal writing'],
      knowledge34: ['Rules versus laws, and who has power to make each.', 'How groups decide: voting, consensus, leaders.', "Rights and responsibilities, including children's rights.", 'What a stakeholder is, and why groups differ.', 'Introductory ideas of fairness across different rules and contexts, using simple case comparisons.'],
      knowledge56: ['How laws are made in Australia; the three levels of government.', 'The policy cycle: identify, explore, consult, decide, implement, review.', 'Separation of powers, and why power is shared and checked.', 'Advocacy, lobbying and petitions.'],
      deliverableName: 'Justice Policy Proposal',
      deliverableIntro: 'A concise written policy brief the group presents and defends at the Showcase, covering:',
      deliverableSteps: [
        { n: 1, text: 'Problem statement: the underlying governance problem.' },
        { n: 2, text: 'Stakeholders: who is affected, who decides.' },
        { n: 3, text: 'Guiding principle: the right or principle at stake.' },
        { n: 4, text: 'Policy options considered.' },
        { n: 5, text: 'Recommended policy.' },
        { n: 6, text: 'Implementation: how it is introduced, resourced, enforced.' },
        { n: 7, text: 'Risk or objection, and refinement after critique.' }
      ],
      exampleProducts: ['Fair AI Learning Policy: a short student recommendation on transparency, review rights and data limits.'],
      showcaseQuote: '"Here is the governance problem, who it affects, who decides, and the policy we recommend."',
      exampleTitle: 'The Fair Play Charter',
      exampleStory: 'Six students, Years 4 to 6, mapped every group that uses the playground and found the oval and handball courts had never been formally allocated, just claimed by habit. Their finished proposal: a zoned weekly roster guaranteeing every year level access, a protected quiet zone, and an elected Play Space Advocate, with a swap system so classes could trade rostered days by agreement.'
    },
    {
      id: 'innovation', name: 'Innovation', letter: 'I', color: '#FFCC00', identity: 'The Systems Designers',
      coreQ: 'How could a solution actually work?',
      pathwayLink: 'Australian Mathematics Competition, APSMO Olympiad, Explorer and Games, and Matific Maths Olympiad',
      criteria: [
        'Does the model actually work?',
        'What rules does it use?',
        'Can we test it with examples?',
        'What happens in unusual cases?',
        'Is it simple enough for people to use?',
        'What would break it?'
      ],
      skills: ['Pattern recognition', 'Non-routine problem solving', 'Modelling', 'Working backwards', 'Testing cases', 'Spatial and numerical reasoning', 'Prototype testing'],
      knowledge34: ['Patterns and rules in number and shape.', 'Sorting and classifying with clear criteria.', 'Step by step instructions and simple flowcharts.', 'Fair testing: change one thing at a time.', 'Introductory data representation: tables, tally charts and simple graphs.'],
      knowledge56: ['Decision trees, algorithms and conditional rules.', 'Constraints, optimisation and trade-offs in design.', 'Data collection, sampling and simple probability.', 'Systems thinking: inputs, outputs, feedback loops.', "Polya's four steps: understand, plan, solve, look back.", 'Proof by exhaustive case-checking, and recognising when a single counterexample disproves a rule.'],
      deliverableName: 'Innovation Model',
      deliverableIntro: 'A working model or prototype the group builds, tests and explains at the Showcase, covering:',
      deliverableSteps: [
        { n: 1, text: 'Problem statement: the practical problem being solved.' },
        { n: 2, text: 'Model or system the group built.' },
        { n: 3, text: 'Rules: how it works.' },
        { n: 4, text: 'Test case: the model working with an example.' },
        { n: 5, text: 'Failure case: where it fails or needs a human decision.' },
        { n: 6, text: 'Reasoning: why the model makes sense.' },
        { n: 7, text: 'Refinement after testing.' }
      ],
      exampleProducts: ['Student Review Button: a decision tree for challenging an AI recommendation.', 'Pathway Choice Model: a three option system avoiding single track lock-in.', 'Privacy Risk Rating: a scoring system for what data should be collected.'],
      showcaseQuote: '"Here is the system we built, its rules, how we tested it, where it fails and what we improved."',
      exampleTitle: 'The Zone Rotation Model',
      exampleStory: 'Five students, Years 3 to 6, treated the playground as a measurement problem: they used enrolment data and use patterns, then built a five zone, five day rotation table guaranteeing every year level fair turns on the oval, handball courts and a new equipment zone. Testing surfaced a wet weather failure case, so they added a covered walkway zone that activates automatically.'
    },
    {
      id: 'expression', name: 'Expression', letter: 'E', color: '#009933', identity: 'The Storymakers',
      coreQ: 'How do we make people understand, care and act?',
      pathwayLink: 'Junior Expression Showcase (in development), informed by Storyathon and Write a Book in a Day',
      criteria: [
        'Who is the audience?',
        'What do we need them to understand?',
        'What do we need them to feel or reconsider?',
        'What form will best carry the message?',
        'What details make the issue human?',
        'What should change after someone sees or hears this?'
      ],
      skills: ['Audience awareness', 'Voice', 'Narrative compression', 'Persuasive communication', 'Editing and refinement', 'Multimodal communication', 'Purposeful presentation'],
      knowledge34: ['Audience and purpose as the first questions of any text.', 'Story structure: orientation, complication, resolution.', 'Word choice: strong verbs, precise nouns.', "Show, don't tell.", "Distinguishing fact from opinion, and identifying an author's intended effect on a reader."],
      knowledge56: ['Narrative point of view and crafted voice.', 'The persuasion triangle: character, emotion, logic.', 'Persuasive devices: repetition, rhetorical questions, imagery.', 'Editing as craft: drafting, cutting, compression.', 'Multimodal design: words, images and layout together.', 'Intertextuality and allusion as devices for layering meaning into a short text.'],
      deliverableName: 'Expression Project',
      deliverableIntro: 'A polished creative artefact the group presents and unpacks at the Showcase, covering:',
      deliverableSteps: [
        { n: 1, text: 'Audience: who this is for.' },
        { n: 2, text: 'Purpose: what the audience should understand, feel or do.' },
        { n: 3, text: 'Artefact the group created.' },
        { n: 4, text: 'Craft choices, and why.' },
        { n: 5, text: 'Connection: how it reveals the problem.' },
        { n: 6, text: 'Refinement after feedback.' }
      ],
      exampleProducts: ['100 word story: a student feels trapped by a label.', 'Campaign poster: "Guide me. Don’t define me."', 'Two minute student voice speech to school leaders.'],
      showcaseQuote: '"Here is the story or campaign we created, who it is for, and why we made these creative choices."',
      exampleTitle: 'The Space I Never Found',
      exampleStory: 'Five students, Years 3 to 5, combined interviews with younger students into one fictional character, Ren, who circles the playground looking for somewhere to belong. Their ninety second spoken word performance and three panel poster series were cut down from an original three minutes after testing on a Year 4 class showed the shorter version landed harder.'
    },
    {
      id: 'reasoning', name: 'Reasoning', letter: 'R', color: REASONING_PURPLE, identity: 'The Master Critics',
      coreQ: 'What is the deeper question, and what should we believe after thinking carefully?',
      pathwayLink: 'Junior Ethics and Philosophy Event (in development), informed by the Primary Ethics Olympiad',
      criteria: [
        'What is the real question underneath the problem?',
        'What important words need defining?',
        'What are the strongest positions, and which frameworks sit behind them?',
        'What reasons and evidence support each position?',
        'What counterexample challenges our thinking?',
        'What biases or group pressures might be shaping our view?'
      ],
      skills: ['Philosophical questioning', 'Reason giving', 'Identifying assumptions', 'Applying ethical frameworks', 'Recognising cognitive bias', 'Argument mapping', 'Intellectual humility'],
      knowledge34: ['What makes a good reason, and how to spot a weak one.', 'Agreeing and disagreeing respectfully.', 'Fairness, honesty and kindness, defined carefully.', 'Examples and counterexamples as thinking tools.', 'Distinguishing between a claim, an assumption and a piece of evidence in a simple argument.'],
      knowledge56: ['Three ways to think about right and wrong: consequences, duties, character.', 'Argument structure: claim, reasons, evidence, rebuttal.', 'How minds trick us: confirmation bias, bandwagon effect.', 'Persuasion versus manipulation.', 'How leaders make hard decisions and own the outcome.', 'Formal validity versus soundness, and why a logically valid argument can still be false.'],
      deliverableName: 'Reasoning Case Defence',
      deliverableIntro: 'A defended ethical judgement the group presents and tests under live questioning at the Showcase, covering:',
      deliverableSteps: [
        { n: 1, text: 'Central question beneath the challenge.' },
        { n: 2, text: 'Key concepts needing definition.' },
        { n: 3, text: 'Mapped positions, reasons and frameworks.' },
        { n: 4, text: 'Counterexample testing.' },
        { n: 5, text: 'Psychological insight: biases at play.' },
        { n: 6, text: 'Defended judgement, and its acknowledged weakness.' },
        { n: 7, text: 'Live defence: unrehearsed audience questions.' }
      ],
      exampleProducts: ['Is it fair to use AI to predict what a student might become?', 'Should students always have the right to challenge a recommendation?', 'Is it better to protect students from failure, or let them struggle?'],
      showcaseQuote: '"Here is the question underneath the problem, our judgement, its weakest point. Ask us your hardest question."',
      exampleTitle: 'Who Earns the Oval?',
      exampleStory: 'Five students, Years 5 and 6, tested the assumption that the oval belongs to whoever has used it longest. They mapped three competing positions, earned use, equal opportunity and need-based priority, against real ethical frameworks, defended a hybrid judgement live, and left the audience with an open question about the difference between earning space and simply taking it.'
    }
  ];

  const WEEK_LABELS = [
    { n: 1, stage: 'Explore the future scene', justice: 'Stakeholders and fairness tensions', innovation: 'Systems and design possibilities', expression: 'Audience and emotional stakes', reasoning: 'Concepts and big questions' },
    { n: 2, stage: 'Identify the underlying problem', justice: 'Write the fairness problem', innovation: 'Define the modelling problem', expression: 'Define the communication problem', reasoning: 'Write the central question' },
    { n: 3, stage: 'Generate possibilities, mentors join', justice: 'Generate possible actions or rules', innovation: 'Generate possible models and tools', expression: 'Generate artefact forms and messages', reasoning: 'Generate possible positions and reasons' },
    { n: 4, stage: 'Select, develop and refine', justice: 'Select proposal, test objections', innovation: 'Build and test the model', expression: 'Draft, edit, sharpen the artefact', reasoning: 'Map positions and counterexamples' },
    { n: 5, stage: 'Present, defend and refine', justice: 'Present Justice Policy Proposal', innovation: 'Present Innovation Model', expression: 'Present Expression Project', reasoning: 'Present Reasoning Case Defence' }
  ];

  const WEEK_DETAILS = {
    justice: [
      'Students map who is affected by the future scene and where power currently sits.',
      'Groups commit to a single sentence naming the fairness or governance problem beneath the scene.',
      'With a senior mentor, groups generate multiple policy options before narrowing to one.',
      'Groups choose their strongest policy and pressure-test it against likely objections.',
      'Groups present their policy to parents as a junior policy panel and defend it under questioning.'
    ],
    innovation: [
      'Students identify the systems, data and design constraints at play in the scene.',
      "Groups define the practical problem their model needs to solve.",
      'With a senior mentor, groups generate multiple models before choosing one to build.',
      'Groups build their model and test it against real and edge cases.',
      'Groups present their model, its rules, its test case and where it still fails.'
    ],
    expression: [
      'Students identify who the audience is and what makes the scene human.',
      'Groups define exactly what they need their audience to understand or feel.',
      'With a senior mentor, groups generate possible artefacts and messages.',
      'Groups draft, edit and sharpen their chosen artefact.',
      'Groups present their creative work and explain the craft behind it.'
    ],
    reasoning: [
      'Students identify the concepts and assumptions hidden inside the scene.',
      'Groups commit to the single philosophical question underneath the problem.',
      'With a senior mentor, groups map possible positions and reasons.',
      'Groups test their position against counterexamples and refine their judgement.',
      'Groups defend their judgement live, answering unrehearsed questions from parents.'
    ]
  };

  const SCENES_DATA = [
    {
      id: 'playground', title: 'Playground Redesign', badge: 'Recommended for the pilot',
      fullTitle: 'The Playground Redesign Problem',
      description: 'One shared playground. Some students want quiet space, some want sport, some want to sit with friends, and the loudest groups dominate the best areas while quieter students are pushed to the edges. The school has a small budget and can change zones, rules, schedules, signage and student leadership roles, but cannot build a new playground.',
      coreQuestion: 'How should the school redesign playground use so the space is active, fair, safe and welcoming for different kinds of students?',
      whyJustice: 'Access, fairness, and whose needs count.', whyInnovation: 'Zoning, timetabling and testing traffic flow.', whyExpression: 'A campaign to shift playground culture.', whyReasoning: 'Is fairness equal space, or different space for different needs?'
    },
    {
      id: 'future-school', title: 'Future School 2040', badge: 'Reserved for a later cycle',
      fullTitle: 'Future School 2040',
      description: 'Many schools use AI learning guides that track how students learn, predict what they may find difficult and recommend future pathways. Some students improve quickly with the right challenge, and teachers can spot support needs earlier. But some students feel labelled too early, and some worry the system knows too much about them.',
      coreQuestion: 'How should a school use AI learning guides in a way that improves learning without unfairly limiting, labelling or exposing students?',
      whyJustice: 'Fairness, privacy and student voice.', whyInnovation: 'Systems, rules and data use.', whyExpression: 'Student stories and parent communication.', whyReasoning: 'Can a tool be unfair even if nobody meant it to be?'
    },
    {
      id: 'challenge-pass', title: 'Challenge Pass', badge: 'Reserved, more sensitive',
      fullTitle: 'The Challenge Pass Problem',
      description: 'A Challenge Pass would let students who show readiness in a subject access harder tasks and extension workshops. Staff worry the same students will always be picked, some parents may complain, and some students may hide their ability to avoid standing out.',
      coreQuestion: 'How should a school identify and offer extra challenge without creating unfair labels, fixed groups or unnecessary pressure?',
      whyJustice: 'Fair identification, access and dignity.', whyInnovation: 'Selection models and rotating criteria.', whyExpression: 'Explaining the program without elitist language.', whyReasoning: 'What does it mean to deserve an opportunity?'
    }
  ];

  const STAGES_DATA = [
    { n: 1, label: 'Explore', text: 'Read the future scene.', detail: 'Students identify what is changing, who is involved, what might improve, what might become difficult, and what facts they still need.' },
    { n: 2, label: 'Identify', text: 'List the challenges.', detail: 'Students list the possible challenges hidden inside the scene, without judging them yet.' },
    { n: 3, label: 'Define', text: 'Name the problem.', detail: "Groups choose the most important problem beneath the surface, using the stem: 'The underlying problem is that...'" },
    { n: 4, label: 'Generate', text: 'Brainstorm freely.', detail: 'Groups generate many possible responses before choosing one. Quantity first, quality second.' },
    { n: 5, label: 'Select', text: 'Choose a response.', detail: 'Groups choose their strongest response using the criteria of their specialist line.' },
    { n: 6, label: 'Present', text: 'Defend and refine.', detail: 'Groups explain what they noticed, what problem they chose, what they developed, and what they would improve next.' }
  ];

  const COMPETITION_LINES = [
    { id: 'justice', name: 'Justice', letter: 'J', color: '#000099', status: 'Established pipeline', established: true,
      stops: [
        { name: 'Global Issues Problem Solving', description: 'The senior arm of Future Problem Solving Program Australia. Teams of four research a real global issue, identify the underlying problem and write a full solution paper before defending it competitively. It is the most direct rehearsal for the six-stage process Pathfinders already teaches.' },
        { name: 'Future Problem Solving Program Australia', description: 'The national body running Future Problem Solving competitions from Years 3 to 12, including the Global Issues and Community Problem Solving divisions. The shared thinking process used across all four Pathfinders lines is adapted directly from its method.' },
        { name: 'Law, diplomacy and advocacy', description: 'Longer-term pathways for students drawn to governance, law and civic life, including school-based mock trial, Model United Nations and debating, building toward senior competitions such as Global Issues Problem Solving.' }
      ]
    },
    { id: 'innovation', name: 'Innovation', letter: 'I', color: '#FFCC00', status: 'Established pipeline', established: true,
      stops: [
        { name: 'Australian Mathematics Competition', description: 'A large-scale problem-solving competition open to students from Year 3 to Year 12, run by the Australian Mathematics Trust. It rewards the same non-routine problem-solving and strategy selection skills built in the Innovation line.' },
        { name: 'APSMO Olympiad, Explorer and Games', description: 'A staged suite of primary mathematics competitions: Maths Games and Explorer build early pattern recognition and confidence, while the Maths Olympiad introduces multi-step, non-routine problems for more advanced students.' },
        { name: 'Matific Maths Olympiad', description: 'An online mathematics olympiad with problems targeted at primary year levels, giving students a lower-stakes entry point into formal competition mathematics.' },
        { name: 'STEM and engineering', description: 'Longer-term pathways into applied mathematics, science and engineering competitions as students move into senior year levels.' }
      ]
    },
    { id: 'expression', name: 'Expression', letter: 'E', color: '#009933', status: 'In development', established: false,
      stops: [
        { name: 'Junior Expression Showcase', description: 'A College-based writing and communication showcase, currently in development, intended to give Years 3 to 6 a reliable local pathway while external writing and speaking competitions in this age range remain limited.' },
        { name: 'Storyathon', description: 'A timed creative writing competition that gives students a fixed window to plan, draft and submit a complete story, rewarding concise, controlled storytelling under pressure.' },
        { name: 'Write a Book in a Day', description: 'A national competition in which teams of students write, illustrate and publish a complete book within twenty-four hours, building collaborative creative production skills.' },
        { name: "Kids' Lit Quiz and Readers Cup", description: 'Team quiz competitions testing deep engagement with literature, rewarding students who read widely and recall detail, character and plot with precision.' }
      ]
    },
    { id: 'reasoning', name: 'Reasoning', letter: 'R', color: REASONING_PURPLE, status: 'In development', established: false,
      stops: [
        { name: 'Junior Ethics and Philosophy Event', description: 'A College-based ethics and philosophy event, currently in development, built around community of inquiry practice, structured dialogue and a defended judgement, mirroring the format of the Primary Ethics Olympiad.' },
        { name: 'Primary Ethics Olympiad', description: 'A national competition in which students discuss an ethical dilemma in a structured format and defend a reasoned judgement under live questioning from judges.' },
        { name: 'Junior Thinkers Conference', description: 'A student philosophy conference built around structured dialogue and inquiry, giving younger students practice presenting and defending ideas in a low-stakes public forum.' },
        { name: 'Minds on Fire', description: 'A philosophy and critical thinking event for primary-aged students, focused on collaborative inquiry into open philosophical questions.' }
      ]
    }
  ];

  const STATIONS_DATA = [
    { id: 'sec-overview', label: 'Overview' },
    { id: 'sec-model', label: 'The Model' },
    { id: 'sec-journey', label: 'The Journey' },
    { id: 'sec-lines', label: 'The Four Lines' },
    { id: 'sec-beyond', label: 'Beyond' },
    { id: 'sec-showcase', label: 'Showcase' }
  ];

  const STATS = [
    { value: '5', label: 'Weeks' },
    { value: '~5 hrs', label: 'Contact Time' },
    { value: '4', label: 'Specialist Lines' },
    { value: 'Yrs 3-6', label: 'Target Cohort' },
    { value: '6-10', label: 'Students / Line' }
  ];

  const SHOWCASE_STEPS = [
    { n: 1, text: 'Welcome: introduce Pathfinders and the four lines.' },
    { n: 2, text: 'Future scene: one student or teacher reads the shared challenge.' },
    { n: 3, text: 'Specialist presentations: each line presents for three to five minutes.' },
    { n: 4, text: 'Parent questions: framed to invite reflection, kept low-pressure for students.' },
    { n: 5, text: 'Student reflection: pathway strengths and next steps.' },
    { n: 6, text: 'Close: next opportunities.' }
  ];

  const PARENT_QUESTIONS = [
    'What changed in your thinking over the five weeks?',
    'What was the hardest part of the problem?',
    'Who might disagree with your proposal?',
    'What would you improve with one more week?',
    'What is the weakest part of your current response?',
    'What would you test next?'
  ];

  const textOnColor = (hex) => hex.toUpperCase() === '#FFCC00' ? '#000099' : '#ffffff';
  const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  const state = {
    activeLine: 'justice',
    activeStage: 0,
    autoplay: false,
    autoplayTimer: null,
    activeScene: 'playground'
  };

  // ---------------------------------------------------------------
  // Stats (section 1)
  // ---------------------------------------------------------------
  function renderStats() {
    const el = document.getElementById('pf-stats');
    el.innerHTML = STATS.map(s => `
      <div class="pf-stats__item">
        <div class="pf-stats__value">${escapeHtml(s.value)}</div>
        <div class="pf-stats__label">${escapeHtml(s.label)}</div>
      </div>
    `).join('');
  }

  // ---------------------------------------------------------------
  // Floating nav (scroll spy)
  // ---------------------------------------------------------------
  function initNav() {
    const nav = document.getElementById('pf-nav');
    const track = nav.querySelector('.pf-nav__track');
    STATIONS_DATA.forEach(st => {
      const btn = document.createElement('button');
      btn.className = 'pf-nav__item';
      btn.dataset.target = st.id;
      btn.innerHTML = `<span class="pf-nav__dot"></span><span class="pf-nav__label">${escapeHtml(st.label)}</span>`;
      btn.addEventListener('click', () => goTo(st.id));
      track.appendChild(btn);
    });

    const items = Array.from(track.querySelectorAll('.pf-nav__item'));

    function onScroll() {
      let active = STATIONS_DATA[0].id;
      for (const st of STATIONS_DATA) {
        const el = document.getElementById(st.id);
        if (el && el.getBoundingClientRect().top - 100 <= 0) active = st.id;
      }
      items.forEach(item => item.classList.toggle('is-active', item.dataset.target === active));
      nav.classList.toggle('is-visible', window.scrollY > 320);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function goTo(id) {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
  }

  // ---------------------------------------------------------------
  // Section 2 — The Model (stage stepper + autoplay + scenes)
  // ---------------------------------------------------------------
  function initStageStepper() {
    const buttonsEl = document.getElementById('pf-stage-buttons');
    const stageCount = STAGES_DATA.length;

    STAGES_DATA.forEach((stg, idx) => {
      const frac = idx / (stageCount - 1);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pf-stage-btn';
      btn.style.left = `calc(20px + (100% - 40px) * ${frac})`;
      btn.dataset.n = String(stg.n);
      btn.innerHTML = `<div class="pf-stage-btn__dot">${stg.n}</div><div class="pf-stage-btn__label">${escapeHtml(stg.label)}</div>`;
      btn.addEventListener('click', () => {
        if (state.autoplay) toggleAutoplay();
        setStage(stg.n - 1);
      });
      buttonsEl.appendChild(btn);
    });

    document.getElementById('pf-autoplay-btn').addEventListener('click', toggleAutoplay);

    renderStageStepper();
  }

  function setStage(n) {
    state.activeStage = n;
    renderStageStepper();
  }

  function toggleAutoplay() {
    if (state.autoplay) {
      clearInterval(state.autoplayTimer);
      state.autoplay = false;
    } else {
      state.autoplay = true;
      state.autoplayTimer = setInterval(() => {
        state.activeStage = (state.activeStage + 1) % STAGES_DATA.length;
        renderStageStepper();
      }, 2400);
    }
    renderStageStepper();
  }

  function renderStageStepper() {
    const stageCount = STAGES_DATA.length;
    const activeFrac = state.activeStage / (stageCount - 1);

    document.getElementById('pf-stage-fill').style.width = `calc((100% - 40px) * ${activeFrac})`;
    document.getElementById('pf-autoplay-btn').textContent = state.autoplay ? '❚❚ Pause' : '▶ Play the process';

    const buttons = document.querySelectorAll('#pf-stage-buttons .pf-stage-btn');
    buttons.forEach(btn => {
      const n = Number(btn.dataset.n);
      const isActive = n - 1 === state.activeStage;
      const isDone = n - 1 < state.activeStage;
      btn.classList.toggle('is-active', isActive);
      btn.classList.toggle('is-done', isDone);
    });

    const activeStage = STAGES_DATA[state.activeStage];
    document.getElementById('pf-stage-quicktext').textContent = activeStage.text;
    const detailEl = document.getElementById('pf-stage-detail');
    detailEl.textContent = activeStage.detail;
    detailEl.classList.remove('pf-fadein');
    // force reflow so the fade-in animation replays
    void detailEl.offsetWidth;
    detailEl.classList.add('pf-fadein');
  }

  function initScenes() {
    const tabsEl = document.getElementById('pf-scene-tabs');
    const contentEl = document.getElementById('pf-scene-content');

    tabsEl.innerHTML = SCENES_DATA.map(sc => `
      <button type="button" class="pf-scene-tab" data-scene="${escapeHtml(sc.id)}">${escapeHtml(sc.title)}</button>
    `).join('');

    contentEl.innerHTML = SCENES_DATA.map(sc => `
      <div class="pf-scene" data-scene="${escapeHtml(sc.id)}">
        <h3 class="pf-scene__title">${escapeHtml(sc.fullTitle)}</h3>
        <p class="pf-scene__desc">${escapeHtml(sc.description)}</p>
        <div class="pf-scene__question">${escapeHtml(sc.coreQuestion)}</div>
        <div class="pf-scene__why-grid">
          <div class="pf-scene__why pf-scene__why--justice"><div class="pf-scene__why-label">Justice</div><div class="pf-scene__why-text">${escapeHtml(sc.whyJustice)}</div></div>
          <div class="pf-scene__why pf-scene__why--innovation"><div class="pf-scene__why-label">Innovation</div><div class="pf-scene__why-text">${escapeHtml(sc.whyInnovation)}</div></div>
          <div class="pf-scene__why pf-scene__why--expression"><div class="pf-scene__why-label">Expression</div><div class="pf-scene__why-text">${escapeHtml(sc.whyExpression)}</div></div>
          <div class="pf-scene__why pf-scene__why--reasoning"><div class="pf-scene__why-label">Reasoning</div><div class="pf-scene__why-text">${escapeHtml(sc.whyReasoning)}</div></div>
        </div>
      </div>
    `).join('');

    tabsEl.querySelectorAll('.pf-scene-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeScene = btn.dataset.scene;
        renderScenes();
      });
    });

    renderScenes();
  }

  function renderScenes() {
    document.querySelectorAll('#pf-scene-tabs .pf-scene-tab').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.scene === state.activeScene);
    });
    document.querySelectorAll('#pf-scene-content .pf-scene').forEach(panel => {
      const isActive = panel.dataset.scene === state.activeScene;
      panel.classList.toggle('is-active', isActive);
      if (isActive) {
        panel.classList.remove('pf-fadein');
        void panel.offsetWidth;
        panel.classList.add('pf-fadein');
      }
    });
  }

  // ---------------------------------------------------------------
  // Section 3 — The Journey
  // ---------------------------------------------------------------
  function initJourney() {
    const grid = document.getElementById('pf-journey-grid');
    const gridwrap = document.getElementById('pf-journey-gridwrap');
    const lineOrder = ['justice', 'innovation', 'expression', 'reasoning'];
    const lineMeta = {
      justice: { name: 'Justice', color: '#000099' },
      innovation: { name: 'Innovation', color: '#FFCC00' },
      expression: { name: 'Expression', color: '#009933' },
      reasoning: { name: 'Reasoning', color: REASONING_PURPLE }
    };

    let html = '';

    // Header row: week columns
    WEEK_LABELS.forEach((wk, i) => {
      const col = i + 2;
      html += `
        <div class="pf-journey__header-cell" style="grid-column:${col};grid-row:1;">
          <div class="pf-journey__header-week">WEEK ${wk.n}</div>
          <div class="pf-journey__header-stage">${escapeHtml(wk.stage)}</div>
        </div>`;
    });

    // Row labels + bars
    lineOrder.forEach((key, idx) => {
      const row = idx + 2;
      const meta = lineMeta[key];
      html += `
        <div class="pf-journey__row-label" style="grid-column:1;grid-row:${row};">
          <span class="pf-journey__row-dot" style="background:${meta.color};"></span>
          <span class="pf-journey__row-name">${escapeHtml(meta.name)}</span>
        </div>
        <div class="pf-journey__row-bar" style="grid-row:${row};background:${meta.color};"></div>`;
    });

    // Branch cells
    WEEK_LABELS.forEach((wk, i) => {
      const col = i + 2;
      lineOrder.forEach((key, li) => {
        const row = li + 2;
        const meta = lineMeta[key];
        const label = wk[key];
        const detail = WEEK_DETAILS[key][i];
        const isLastRow = key === 'reasoning';
        html += `
          <div class="pf-journey__cell${isLastRow ? ' pf-journey__cell--last-row' : ''}" style="grid-column:${col};grid-row:${row};">
            <div class="pf-journey__branch-dot" style="border-color:${meta.color};"></div>
            <div class="pf-journey__branch-label">${escapeHtml(label)}</div>
            <div class="pf-journey__branch-pop" style="border-top-color:${meta.color};">
              <div class="pf-journey__branch-pop-text">${escapeHtml(detail)}</div>
            </div>
          </div>`;
      });
    });

    grid.innerHTML = html;

    grid.querySelectorAll('.pf-journey__cell--last-row').forEach(cell => {
      cell.addEventListener('mouseenter', () => gridwrap.classList.add('pad-open'));
      cell.addEventListener('mouseleave', () => gridwrap.classList.remove('pad-open'));
    });
  }

  // ---------------------------------------------------------------
  // Section 4 — The Four Lines
  // ---------------------------------------------------------------
  function initLines() {
    const cardsEl = document.getElementById('pf-line-cards');
    const detailEl = document.getElementById('pf-line-detail');

    cardsEl.innerHTML = LINES_DATA.map(ln => {
      const textOn = textOnColor(ln.color);
      return `
        <button type="button" class="pf-line-card" data-line="${escapeHtml(ln.id)}">
          <div class="pf-line-card__top">
            <span class="pf-line-card__badge" style="background:${ln.color};color:${textOn};">${escapeHtml(ln.letter)}</span>
            <div>
              <div class="pf-line-card__name">${escapeHtml(ln.name)} Line</div>
              <div class="pf-line-card__identity">${escapeHtml(ln.identity)}</div>
            </div>
          </div>
          <div class="pf-line-card__q">${escapeHtml(ln.coreQ)}</div>
        </button>`;
    }).join('');

    detailEl.innerHTML = LINES_DATA.map(ln => {
      const textOn = textOnColor(ln.color);
      return `
        <div class="pf-line-detail" data-line="${escapeHtml(ln.id)}" style="border-top-color:${ln.color};">
          <div class="pf-line-detail__identity" style="background:${ln.color}14;">
            <span class="pf-line-detail__identity-chip" style="background:${ln.color};"></span>
            <span class="pf-line-detail__identity-text">${escapeHtml(ln.name)} Line · ${escapeHtml(ln.identity)}</span>
          </div>

          <div class="pf-line-detail__banner" style="background:${ln.color};color:${textOn};">
            <div class="pf-line-detail__banner-label">Direct competition pathway</div>
            <div class="pf-line-detail__banner-link">→ ${escapeHtml(ln.pathwayLink)}</div>
          </div>

          <h3 class="pf-line-detail__coreq">${escapeHtml(ln.coreQ)}</h3>

          <div class="pf-line-detail__example">
            <div class="pf-line-detail__example-label" style="color:${ln.color};">What this could look like</div>
            <div class="pf-line-detail__example-title">${escapeHtml(ln.exampleTitle)}</div>
            <p class="pf-line-detail__example-story">${escapeHtml(ln.exampleStory)}</p>
          </div>

          <h4>How groups choose their final response</h4>
          <p class="pf-line-detail__criteria-intro">Before committing to one idea, each group tests it against these questions:</p>
          <div class="pf-line-detail__criteria">
            ${ln.criteria.map(c => `
              <div class="pf-line-detail__criterion">
                <span class="pf-line-detail__criterion-mark" style="color:${ln.color};">?</span><span>${escapeHtml(c)}</span>
              </div>`).join('')}
          </div>

          <h4>Skills developed</h4>
          <div class="pf-line-detail__skills">
            ${ln.skills.map(sk => `<span class="pf-line-detail__skill" style="border-color:${ln.color};">${escapeHtml(sk)}</span>`).join('')}
          </div>

          <div class="pf-line-detail__knowledge-grid">
            <div class="pf-line-detail__knowledge-box" style="border-top-color:${ln.color};">
              <h4>Deep knowledge, Years 3 and 4</h4>
              ${ln.knowledge34.map(k => `<div class="pf-line-detail__knowledge-item">${escapeHtml(k)}</div>`).join('')}
            </div>
            <div class="pf-line-detail__knowledge-box" style="border-top-color:${ln.color};">
              <h4>Deep knowledge, Years 5 and 6</h4>
              ${ln.knowledge56.map(k => `<div class="pf-line-detail__knowledge-item">${escapeHtml(k)}</div>`).join('')}
            </div>
          </div>

          <div class="pf-line-detail__deliverable" style="border-left-color:${ln.color};">
            <h4>End-of-Program Learning Product</h4>
            <div class="pf-line-detail__deliverable-name">${escapeHtml(ln.deliverableName)}</div>
            <p class="pf-line-detail__deliverable-intro">${escapeHtml(ln.deliverableIntro)}</p>
            ${ln.deliverableSteps.map(d => `
              <div class="pf-line-detail__step">
                <span class="pf-line-detail__step-num" style="background:${ln.color};color:${textOn};">${d.n}</span><span>${escapeHtml(d.text)}</span>
              </div>`).join('')}
          </div>

          <div class="pf-line-detail__bottom">
            <div>
              <h4>Example products</h4>
              ${ln.exampleProducts.map(ep => `<div class="pf-line-detail__product" style="border-left-color:${ln.color};">${escapeHtml(ep)}</div>`).join('')}
            </div>
            <div>
              <div class="pf-line-detail__showcase">
                <div class="pf-line-detail__showcase-label">Showcase format</div>
                <div class="pf-line-detail__showcase-quote">${escapeHtml(ln.showcaseQuote)}</div>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    cardsEl.querySelectorAll('.pf-line-card').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeLine = btn.dataset.line;
        renderLines();
      });
    });

    renderLines();
  }

  function renderLines() {
    document.querySelectorAll('#pf-line-cards .pf-line-card').forEach(card => {
      const isActive = card.dataset.line === state.activeLine;
      card.classList.toggle('is-active', isActive);
      const ln = LINES_DATA.find(l => l.id === card.dataset.line);
      card.style.borderBottomColor = isActive ? ln.color : '#e8e8e8';
    });
    document.querySelectorAll('#pf-line-detail .pf-line-detail').forEach(panel => {
      const isActive = panel.dataset.line === state.activeLine;
      panel.classList.toggle('is-active', isActive);
      if (isActive) {
        panel.classList.remove('pf-fadein');
        void panel.offsetWidth;
        panel.classList.add('pf-fadein');
      }
    });
  }

  // ---------------------------------------------------------------
  // Section 5 — Beyond Pathfinders
  // ---------------------------------------------------------------
  function initRoads() {
    const roadsEl = document.getElementById('pf-roads');

    roadsEl.innerHTML = COMPETITION_LINES.map(cl => {
      const textOn = textOnColor(cl.color);
      const statusClass = cl.established ? 'pf-road__status--done' : 'pf-road__status--dev';

      const stopsMarkup = cl.stops.map((s, idx) => {
        const key = `${cl.id}-${idx}`;
        const leftPct = ((idx + 0.5) / cl.stops.length * 100) + '%';
        const above = idx % 2 === 0;
        const tickTop = above ? 'calc(50% - 22px)' : 'calc(50% + 8px)';
        const labelPos = above
          ? `bottom:calc(50% + 22px);`
          : `top:calc(50% + 22px);`;
        return `
          <div class="pf-road__tick" data-stop="${key}" style="left:${leftPct};top:${tickTop};background:${cl.color};"></div>
          <button type="button" class="pf-road__stop-dot" data-stop="${key}" style="left:${leftPct};border-color:${cl.color};"></button>
          <div class="pf-road__stop-label" data-stop="${key}" style="left:${leftPct};${labelPos}">${escapeHtml(s.name)}</div>`;
      }).join('');

      const detailsMarkup = cl.stops.map((s, idx) => {
        const key = `${cl.id}-${idx}`;
        return `
          <div class="pf-road__detail" data-stop="${key}" style="border-left-color:${cl.color};">${escapeHtml(s.description)}</div>`;
      }).join('');

      return `
        <div class="pf-road" data-line="${escapeHtml(cl.id)}">
          <div class="pf-road__head">
            <div class="pf-road__badge" style="background:${cl.color};color:${textOn};">${escapeHtml(cl.letter)} · ${escapeHtml(cl.name)}</div>
            <div class="pf-road__status ${statusClass}">${escapeHtml(cl.status)}</div>
          </div>
          <div class="pf-road__path">
            <div class="pf-road__bar" style="background:${cl.color};"></div>
            ${stopsMarkup}
          </div>
          <div class="pf-road__details">
            ${detailsMarkup}
          </div>
        </div>`;
    }).join('');

    roadsEl.querySelectorAll('.pf-road__stop-dot').forEach(btn => {
      btn.addEventListener('click', () => toggleStop(btn.dataset.stop));
    });
  }

  function toggleStop(key) {
    const [lineId] = key.split('-');
    const road = document.querySelector(`.pf-road[data-line="${lineId}"]`);
    const isCurrentlyActive = road.querySelector(`.pf-road__stop-dot[data-stop="${key}"]`).classList.contains('is-active');
    road.querySelectorAll('.pf-road__stop-dot').forEach(d => d.classList.remove('is-active'));
    road.querySelectorAll('.pf-road__detail').forEach(d => {
      d.classList.remove('is-active');
      d.classList.remove('pf-fadein');
    });
    if (!isCurrentlyActive) {
      road.querySelector(`.pf-road__stop-dot[data-stop="${key}"]`).classList.add('is-active');
      const detail = road.querySelector(`.pf-road__detail[data-stop="${key}"]`);
      detail.classList.add('is-active');
      void detail.offsetWidth;
      detail.classList.add('pf-fadein');
    }
  }

  // ---------------------------------------------------------------
  // Section 6 — Showcase
  // ---------------------------------------------------------------
  function renderShowcase() {
    document.getElementById('pf-showcase-steps').innerHTML = SHOWCASE_STEPS.map(s => `
      <div class="pf-showcase__step">
        <span class="pf-showcase__step-num">${s.n}</span>
        <div class="pf-showcase__step-text">${escapeHtml(s.text)}</div>
      </div>`).join('');

    document.getElementById('pf-parent-questions').innerHTML = PARENT_QUESTIONS.map(q => `
      <div class="pf-showcase__question">${escapeHtml(q)}</div>`).join('');
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    renderStats();
    initNav();
    initStageStepper();
    initScenes();
    initJourney();
    initLines();
    initRoads();
    renderShowcase();
  });
})();
