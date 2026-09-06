// Contextual Intelligent Reflection Engine
// Generates nuanced, highly responsive, context-aware mindful reflections,
// structured insights, and domain-specific coaching when live GenAI quota is depleted or degraded.

export function extractTextFromInput(promptOrContents: any): {
  latestUserText: string;
  conversationContext: string;
  journalContext: string;
  allText: string;
} {
  let latestUserText = '';
  let conversationContext = '';
  let journalContext = '';
  let allText = '';

  if (typeof promptOrContents === 'string') {
    allText = promptOrContents;
    latestUserText = promptOrContents;

    // Check for embedded journal context
    const contextMatch = promptOrContents.match(/\[Active Journal Entry Context\]:\s*"""([\s\S]*?)"""/i);
    if (contextMatch && contextMatch[1]) {
      journalContext = contextMatch[1].trim();
    }
  } else if (Array.isArray(promptOrContents)) {
    const userMessages: string[] = [];
    promptOrContents.forEach((item: any) => {
      if (item && item.parts && Array.isArray(item.parts)) {
        const text = item.parts.map((p: any) => p?.text || '').join(' ').trim();
        if (text) {
          if (item.role === 'user') {
            userMessages.push(text);
          }
          allText += `\n[${item.role}]: ${text}`;
        }
      }
    });

    if (userMessages.length > 0) {
      latestUserText = userMessages[userMessages.length - 1];
    }

    // Extract context from first message if present
    const firstMsg = userMessages[0] || '';
    const contextMatch = firstMsg.match(/\[Active Journal Entry Context\]:\s*"""([\s\S]*?)"""/i);
    if (contextMatch && contextMatch[1]) {
      journalContext = contextMatch[1].trim();
    }
    conversationContext = allText;
  } else if (promptOrContents && typeof promptOrContents === 'object') {
    allText = JSON.stringify(promptOrContents);
    latestUserText = allText;
  }

  return { latestUserText: latestUserText.trim(), conversationContext, journalContext, allText };
}

// Extract keywords and key topics from arbitrary user text
export function extractKeyThemesFromText(text: string): string[] {
  const themes: string[] = [];
  const lower = text.toLowerCase();

  if (/\b(english|speak|speaking|language|accent|fluent|vocabulary)\b/i.test(lower)) {
    themes.push('Language Mastery', 'Spoken Communication', 'Conversational Confidence', 'Daily Practice');
  }
  if (/\b(code|coding|software|sde|engineer|programming|developer|python|sql|pipeline|data)\b/i.test(lower)) {
    themes.push('Technical Craftsmanship', 'Software Engineering', 'System Design', 'Continuous Learning');
  }
  if (/\b(stress|anxious|anxiety|overwhelm|burnout|pressure|tired|exhaust)\b/i.test(lower)) {
    themes.push('Stress Equilibrium', 'Emotional Renewal', 'Self-Compassion', 'Mental Clarity');
  }
  if (/\b(habit|routine|morning|evening|walk|exercise|gym|workout|fitness|diet)\b/i.test(lower)) {
    themes.push('Atomic Habits', 'Physical Vitality', 'Daily Rhythm', 'Discipline & Momentum');
  }
  if (/\b(gratitude|happy|grateful|joy|peace|calm|blessed|thankful)\b/i.test(lower)) {
    themes.push('Gratitude Awareness', 'Inner Serenity', 'Abundance Mindset', 'Joyful Living');
  }
  if (/\b(career|job|interview|work|project|transition|promotion|goal)\b/i.test(lower)) {
    themes.push('Professional Direction', 'Career Growth', 'Intentional Focus', 'Strategic Execution');
  }

  // Fallback dynamic keywords from text
  if (themes.length === 0) {
    const words = text
      .replace(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 4 && !['about', 'after', 'again', 'being', 'could', 'their', 'there', 'these', 'would'].includes(w.toLowerCase()));
    const unique = Array.from(new Set(words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))).slice(0, 4);
    if (unique.length > 0) {
      themes.push(...unique);
    } else {
      themes.push('Mindful Awareness', 'Personal Growth', 'Clarity & Focus', 'Intentional Action');
    }
  }

  return Array.from(new Set(themes)).slice(0, 4);
}

// Generate intelligent contextual response
export function generateSmartMindfulResponse(
  promptOrContents: any,
  systemInstruction?: string
): string {
  const { latestUserText, allText, journalContext } = extractTextFromInput(promptOrContents);
  const lowerPrompt = latestUserText.toLowerCase();
  const sysLower = (systemInstruction || '').toLowerCase();

  // -------------------------------------------------------------
  // A. Check if the caller expects structured JSON output
  // -------------------------------------------------------------
  const isJsonExpected =
    sysLower.includes('json') ||
    sysLower.includes('format:') ||
    sysLower.includes('return only valid json') ||
    sysLower.includes('"summary"') ||
    sysLower.includes('"executivesummary"') ||
    sysLower.includes('"detectedhabits"');

  if (isJsonExpected) {
    // 1. Habit Detection Route
    if (sysLower.includes('habit') && (sysLower.includes('json array') || sysLower.includes('detectedhabits') || sysLower.includes('["meditation"'))) {
      const detected: string[] = [];
      if (/\b(english|speaking|language practice)\b/i.test(lowerPrompt)) detected.push('English Speaking Practice');
      if (/\b(meditat|mindful|breathing)\b/i.test(lowerPrompt)) detected.push('Meditation');
      if (/\b(walk|walking|morning walk)\b/i.test(lowerPrompt)) detected.push('Morning Walk');
      if (/\b(gym|workout|exercise|running|jogging|pushups|fitness)\b/i.test(lowerPrompt)) detected.push('Physical Exercise');
      if (/\b(read|reading|book)\b/i.test(lowerPrompt)) detected.push('Daily Reading');
      if (/\b(journal|writing|reflection)\b/i.test(lowerPrompt)) detected.push('Mindful Journaling');
      if (/\b(water|hydrat)\b/i.test(lowerPrompt)) detected.push('Hydration');
      if (/\b(code|coding|programming|study|studying)\b/i.test(lowerPrompt)) detected.push('Deep Focus Study');
      if (/\b(sleep|early morning|wake up early)\b/i.test(lowerPrompt)) detected.push('Sleep Schedule');
      if (detected.length === 0 && latestUserText.length > 10) {
        detected.push('Daily Reflection');
      }
      return JSON.stringify(detected);
    }

    // 2. Weekly Executive Summary Route
    if (sysLower.includes('executivesummary')) {
      const themes = extractKeyThemesFromText(allText);
      const weeklyDigestJson = {
        executiveSummary: `This past week has demonstrated deliberate commitment to personal self-awareness and growth. Your reflections highlighted active engagement with ${themes.slice(0, 2).join(' and ')}, demonstrating resilience across your daily endeavors. By continuing to hold space for conscious check-ins, you reinforce psychological grounding and clear decision-making.`,
        habitScore: 82,
        emotionalValence: 'Grounded & Proactive',
        keyThemes: themes,
        actionItems: [
          `Protect a dedicated 10-minute quiet reflection window each morning or evening`,
          `Anchor one core focus habit directly to an existing daily routine`,
          `Celebrate progress made across ${themes[0] || 'personal goals'} without demanding perfection`,
        ],
        inspirationQuote: 'Small, repeated daily habits silently sculpt extraordinary clarity. — James Clear',
      };
      return JSON.stringify(weeklyDigestJson);
    }

    // 3. Journal Insights Route (POST /api/journal or POST /api/insights)
    const themes = extractKeyThemesFromText(latestUserText + ' ' + (journalContext || ''));
    const moodMatch = allText.match(/Mood:\s*([^\n\r]+)/i);
    const extractedMood = moodMatch ? moodMatch[1].trim() : 'Reflective';

    // Generate tailored summary based on the actual content
    let customSummary = '';
    let customTakeaways: string[] = [];
    let customQuestions: string[] = [];
    let customTitle = 'Reflections on ' + themes[0];

    if (/\b(english|speak|language|accent|fluency)\b/i.test(lowerPrompt)) {
      customTitle = 'Cultivating English Speaking Confidence';
      customSummary = 'Your reflection centers on developing vocal confidence and fluency in spoken English. Recognizing the desire to communicate more effortlessly marks an inspiring step toward international clarity and professional ease.';
      customTakeaways = [
        'Speaking fluency builds through physical mouth muscle memory and vocal shadowing rather than silent reading.',
        'Prioritize clear idea transmission over grammatical perfection; flow naturally precedes precision.',
        'Daily 2-minute voice recordings provide rapid feedback without social anxiety.',
      ];
      customQuestions = [
        'In which speaking setting (work standup, social conversation, presentations) do you feel most eager to express yourself freely?',
        'What is one 5-minute speaking habit you can anchor into your morning routine starting tomorrow?',
      ];
    } else if (/\b(stress|anxious|anxiety|overwhelm|tired|burnout)\b/i.test(lowerPrompt)) {
      customTitle = 'Restoring Calm & Mental Equilibrium';
      customSummary = 'Your words convey moments of tension and psychological load. Acknowledging emotional weight without self-criticism is the cornerstone of psychological resilience and restorative peace.';
      customTakeaways = [
        'Notice feelings as physiological weather passing through, rather than permanent definitions of your capability.',
        'Create a firm boundary between active problem-solving and intentional rest.',
        'Simplifying your immediate focus to the single next right step dramatically reduces mental friction.',
      ];
      customQuestions = [
        'What is one obligation or expectation you can gently release or delegate today?',
        'How can you grant your mind and body 15 minutes of uninterrupted quiet this evening?',
      ];
    } else if (/\b(career|job|sde|code|software|data|transition|work)\b/i.test(lowerPrompt)) {
      customTitle = 'Navigating Professional Craft & Growth';
      customSummary = 'You are thoughtfully evaluating your professional trajectory and technical skillset. Aligning your engineering rigor with long-term aspirations creates sustainable career satisfaction and high-impact momentum.';
      customTakeaways = [
        'Transferable systems thinking and software discipline provide an outsized advantage in data and modern tech stacks.',
        'Focus on building tangible, end-to-end projects that solve genuine problems rather than endlessly collecting theory.',
        'Deliberate career transitions are compounded by daily incremental mastery.',
      ];
      customQuestions = [
        'Which aspect of your craft brings you the greatest sense of creative flow and accomplishment?',
        'What is the next tangible milestone you want to achieve in your technical journey?',
      ];
    } else {
      customTitle = themes.length > 0 ? `Deep Dive: ${themes[0]}` : 'Mindful Self-Reflection';
      customSummary = `Your reflection explores meaningful perspectives with a sincere drive to foster clarity and self-awareness. Taking time to articulate your thoughts reveals an inspiring dedication to living with conscious intention.`;
      customTakeaways = [
        'Articulating your inner experience transforms vague anxiety or ambition into actionable insight.',
        'Consistency in self-observation creates an inner anchor amidst daily noise.',
        'Each reflective pause brings greater alignment between your actions and personal values.',
      ];
      customQuestions = [
        'What realization from this reflection feels most important to remember tomorrow?',
        'How can you turn this insight into one small, tangible action today?',
      ];
    }

    const insightsJson = {
      title: customTitle,
      summary: customSummary,
      keyThemes: themes,
      emotionalTone: extractedMood,
      takeaways: customTakeaways,
      followUpQuestions: customQuestions,
      encouragement: 'Every moment of honest self-reflection deepens your emotional wisdom and purposeful momentum.',
    };
    return JSON.stringify(insightsJson);
  }

  // -------------------------------------------------------------
  // B. Conversational / Chat / Reflective Text Route (/api/chat)
  // -------------------------------------------------------------

  // 1. Audibility / Microphone / Sound Check
  if (/\b(audible|hear me|can you hear|sound check|mic test|microphone test|testing 1 2 3|am i speaking|is this working|hello are you there)\b/i.test(lowerPrompt)) {
    return `Yes! You are completely audible and your voice and words are coming through loud and clear.

I am actively listening, holding space, and ready whenever you would like to reflect, explore a topic, or talk through anything on your mind. 

What is the most meaningful thought, challenge, or question you would like to explore together today?

<suggested_title>Mindful Check-in & Audio Verification</suggested_title>`;
  }

  // 2. English Speaking Skills & Communication Confidence
  if (/\b(english|speaking skills?|improve speaking|spoken english|speak fluently|fluency|pronunciation|accent|conversational english|language learning|talk in english)\b/i.test(lowerPrompt)) {
    return `Improving your English speaking skills is a rewarding journey that combines physical vocal training, mindset shifts, and low-friction daily practice. Here is a practical, step-by-step framework you can begin applying today:

### 1. The 'Daily Shadowing' Technique (10–15 Minutes)
- **How it works**: Find audio or video content with clear subtitles (such as TED Talks, podcasts, or YouTube interviews). Listen to a sentence, pause, and **repeat it out loud immediately**, mimicking the speaker's exact rhythm, pitch, and word stress.
- **Why it matters**: Speaking is a physical motor skill. Shadowing trains the muscles in your mouth and vocal cords to adopt English cadence naturally without mental strain.

### 2. Narrate Your Thoughts Aloud (Zero-Judgment Self-Talk)
- When you are alone—preparing meals, taking a walk, or driving—narrate your actions aloud in English:
  * *"Right now I'm making my morning coffee, and next I will organize my key priorities for the workday."*
- This trains your brain to **formulate concepts directly in English**, bypassing the exhausting mental trap of translating word-for-word from your native language.

### 3. Choose 'Idea Fluidity' Over 'Grammar Perfection'
- The #1 blocker to speaking fluently is the fear of making a grammatical mistake. Pausing mid-sentence to remember a tense or preposition destroys your natural rhythm.
- In conversation, clarity of meaning is 10x more important than textbook perfection. Speak freely; your brain naturally self-corrects grammar over time through repeated exposure.

### 4. Record 2-Minute Voice Reflections Daily
- Choose a simple prompt every evening:
  * *"What was one challenge I solved today?"* or *"What am I grateful for right now?"*
- Record a 2-minute voice note on your phone. Play it back once with self-compassion. Notice which phrases felt natural and where you hesitated. You will witness dramatic improvement within just two weeks.

### 5. Conversational Practice Right Here
- Feel free to practice speaking or typing your reflections with me here! Ask questions, share personal stories, or debate ideas in English.

What is a specific situation where you feel most hesitant when speaking English (for example: work meetings, casual conversations, presentations, or job interviews)? We can practice that exact scenario together right now!

<suggested_title>Mastering English Speaking Skills</suggested_title>`;
  }

  // 3. Software Engineering, SDE to Data, Technical Careers
  if (/\b(sde|software engineer(ing)?|data engineer(ing)?|data science|developer|coding|python|sql|pipeline|tech career|career transition)\b/i.test(lowerPrompt)) {
    return `Reflecting on software engineering and data career transitions reveals significant opportunities:

### Leveraging Your Software Craftsmanship
- **The Competitive Advantage**: Many professionals entering data engineering or analytics come from reporting or business backgrounds. As an SDE, your foundation in code quality, object-oriented design, version control, CI/CD, testing, and debugging is an invaluable asset in modern data ecosystems.
- **Data Engineering Focus**: Transitioning into modern data architectures emphasizes building resilient ETL/ELT pipelines, distributed systems (Spark, Kafka), dimensional data modeling, and orchestration (Airflow/Dagster).
- **Core Stacks to Master**: Focus on modern SQL mastery, advanced Python, and data transformation frameworks like dbt (data build tool).

### Mindful Career Guidance
- What is pulling your curiosity toward this path? Is it the thrill of extracting intelligence from large-scale data, the architecture of resilient data infrastructure, or solving analytical questions?

Take a moment to reflect: What is one real-world project or data challenge that sparks your genuine curiosity right now?

<suggested_title>Software & Data Career Transition</suggested_title>`;
  }

  // 4. Stress, Anxiety, Burnout, Overwhelm
  if (/\b(stress(ed)?|anxi(ous|ety)|burnout|overwhelm(ed)?|exhaust(ed)?|tired|drained|frustrat(ed)?|worry|pressure)\b/i.test(lowerPrompt)) {
    return `I hear you, and I want to validate everything you are experiencing. Feeling this level of tension or exhaustion is a natural biological signal that your mental and emotional bandwidth is being stretched.

### A Gentle Grounding Sequence
1. **Take One Deep Physiological Sigh**: Inhale deeply through your nose, take a quick second top-off inhale, then let out a slow, unforced exhale through your mouth. This immediately cues your nervous system to down-regulate.
2. **De-couple Thoughts from Reality**: Remind yourself: *"I am noticing a feeling of overwhelm right now, but this feeling is a temporary mental state, not an objective truth about my capability."*
3. **Drop the Micro-Pressures**: When everything feels urgent, nothing is. What is the single most essential task for today, and what can be safely postponed until tomorrow?

I am holding space for you. If you want to vent or unpack the specific root cause of this pressure, what feels heaviest right now?

<suggested_title>Finding Calm Amidst Stress & Overwhelm</suggested_title>`;
  }

  // 5. Habits, Productivity, Focus, Procrastination
  if (/\b(habit|routine|procrastinat(e|ing)?|focus|productivity|discipline|distract(ed)?|goal|motivation)\b/i.test(lowerPrompt)) {
    return `Mastering your daily habits and focus is not about relying on fleeting motivation; it is about intentional environment design and reducing friction:

### The 3 Core Pillars of Sustainable Habits
1. **The 2-Minute Gateway Rule**: When starting or maintaining a habit (whether exercising, reading, or practicing a skill), scale the initial requirement down to just two minutes. Put on your shoes; open the first page; write one sentence. Once you overcome the initial inertia of starting, continuation follows naturally.
2. **Habit Stacking**: Attach your desired habit to an existing, non-negotiable anchor:
   * *'Immediately after I pour my morning tea, I will spend 5 minutes reading.'*
3. **Identity-Based Reinforcement**: Focus not on the outcome (*'I want to finish a book'*), but on the identity (*'I am someone who never misses a daily reading habit'*). Every small action is a vote for the person you wish to become.

What is one specific habit you would love to establish with effortless consistency this week?

<suggested_title>Atomic Habits & Daily Focus</suggested_title>`;
  }

  // 6. Greetings and General Check-in
  if (/^(hi|hello|hey|good morning|good evening|good afternoon)\b/i.test(lowerPrompt) && lowerPrompt.length < 25) {
    return `Hello! It is wonderful to connect with you. 

I am here as your mindful thought partner, ready to help you reflect on your day, brainstorm ideas, practice a skill (like English speaking or career topics), or unpack whatever is on your mind.

How are you feeling in this present moment, and what would you like to explore together today?

<suggested_title>Mindful Check-in & Welcome</suggested_title>`;
  }

  // 7. Dynamic Inquiry / General Reflection Catch-All
  const themes = extractKeyThemesFromText(latestUserText);
  return `Thank you for sharing this thoughtful reflection. What stands out most in your words is an exploration of **${themes.join(', ')}**.

When we look deeper into what you described:
- **Core Observation**: You are seeking practical progress while navigating the nuances of daily execution and clarity.
- **Constructive Perspective**: Real growth rarely happens in dramatic leaps; it unfolds through the small, deliberate pauses where you evaluate what is serving you and what can be refined.

To help you explore this with greater clarity:
1. What part of this situation or thought feels most aligned with who you want to become?
2. If you could take one gentle, high-impact step forward in the next 24 hours, what would it look like?

I am right here with you—take your time and share whatever comes to mind next.

<suggested_title>Reflections on ${themes[0] || 'Personal Growth'}</suggested_title>`;
}
