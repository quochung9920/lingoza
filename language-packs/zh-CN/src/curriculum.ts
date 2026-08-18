import type {
  Activity,
  Concept,
  Course,
  Lesson,
  LevelDefinition,
  LocalizedText,
  Unit
} from "../../../packages/content-schema/src/index.js";
import { CEFR_REFERENCE, HSK_REFERENCE, provenance } from "./provenance.js";

/**
 * A0/A1 seed curriculum for Chinese.
 *
 * This is a *representative* slice, not a full course: seven concepts, two
 * units, six lessons and two role-plays, chosen so that every engine and every
 * screen is exercised by real content end to end. Scaling it is an authoring
 * task; nothing here needs to change structurally to hold four hundred more
 * lessons.
 */

function text(vi: string, en: string): LocalizedText {
  return { "vi-VN": vi, "en-US": en };
}

/* ------------------------------------------------------------------ */
/* Levels                                                              */
/* ------------------------------------------------------------------ */

/**
 * Level definitions.
 *
 * Note what defines a level here: can-do statements and per-skill targets.
 * `vocabularyTarget` is present because it is useful for planning coverage,
 * but a learner who knows 300 words and cannot order a coffee out loud has not
 * finished A1, and these definitions say so.
 *
 * `cefrTarget` and `externalReferences.hsk` are *alignment references*.
 * Lingoza does not certify CEFR levels and does not claim HSK equivalence.
 */
export const levels: LevelDefinition[] = [
  {
    id: "A0",
    language: "zh-CN",
    name: text("A0 · Khởi động", "A0 · Starter"),
    cefrTarget: "pre-A1",
    sublevels: ["A0.1", "A0.2"],
    canDoObjectives: [
      text("Tôi có thể chào hỏi và đáp lại lời chào.", "I can greet someone and respond to a greeting."),
      text("Tôi có thể nói tên mình và hỏi tên người khác.", "I can say my name and ask someone theirs."),
      text("Tôi có thể cảm ơn và xin lỗi.", "I can say thank you and sorry."),
      text("Tôi có thể đếm và nói số lượng nhỏ.", "I can count and state small quantities.")
    ],
    listeningTargets: [
      text("Nhận ra lời chào và câu hỏi tên khi nói ở tốc độ chậm.", "Recognise greetings and name questions spoken slowly.")
    ],
    speakingTargets: [
      text("Nói được câu 2–4 âm tiết mà người bản xứ hiểu được.", "Produce 2–4 syllable utterances a native speaker can understand.")
    ],
    pronunciationTargets: [
      text("Giữ đúng hướng lên/xuống của thanh điệu trong từ đã học.", "Keep the rise and fall of tones in the right direction on learned words.")
    ],
    syntaxTargets: [
      text("Dùng được mẫu 我叫 + tên.", "Use the 我叫 + name pattern.")
    ],
    conversationTargets: [
      text("Hoàn thành một lượt chào hỏi và giới thiệu tên.", "Complete one greeting-and-introduction exchange.")
    ],
    vocabularyTarget: { active: 20, passive: 40 },
    topicCoverage: ["daily-life.greetings", "daily-life.courtesy", "daily-life.numbers", "people.introductions"],
    masteryRequirements: {
      listeningRecognition: 0.7,
      meaningRecognition: 0.7,
      speaking: 0.6,
      conversation: 0.6
    },
    externalReferences: { hsk: "pre-HSK1", cefr: "pre-A1" }
  },
  {
    id: "A1",
    language: "zh-CN",
    name: text("A1 · Nền tảng", "A1 · Foundation"),
    cefrTarget: "A1",
    sublevels: ["A1.1", "A1.2"],
    canDoObjectives: [
      text("Tôi có thể nói mình muốn làm gì.", "I can say what I want to do."),
      text("Tôi có thể gọi một đồ uống trong quán.", "I can order a drink at a cafe."),
      text("Tôi có thể nói số lượng kèm lượng từ.", "I can state a quantity with the correct measure word."),
      text("Tôi có thể trả lời khi nhân viên hỏi thêm.", "I can respond when staff ask if I want anything else.")
    ],
    listeningTargets: [
      text("Hiểu câu hỏi gọi món ở cả dạng thân mật và lịch sự.", "Understand ordering questions in both casual and polite forms.")
    ],
    speakingTargets: [
      text("Nói câu 5–7 âm tiết trong vòng 5 giây sau khi nghe câu hỏi.", "Produce a 5–7 syllable sentence within 5 seconds of the prompt.")
    ],
    pronunciationTargets: [
      text("Giữ nhịp câu và ngắt nghỉ đúng cụm.", "Keep sentence rhythm and break at phrase boundaries.")
    ],
    syntaxTargets: [
      text("Dùng được 想 + động từ và số + lượng từ + danh từ.", "Use 想 + verb, and number + measure word + noun.")
    ],
    conversationTargets: [
      text("Hoàn thành trọn vẹn một lượt gọi đồ uống, kể cả khi phải nói lại.", "Complete a full drink order, including when asked to repeat.")
    ],
    vocabularyTarget: { active: 60, passive: 120 },
    topicCoverage: ["food.drinks", "food.cafe", "food.restaurant.ordering", "daily-life.numbers"],
    masteryRequirements: {
      listeningRecognition: 0.75,
      meaningRecognition: 0.75,
      activeRecall: 0.7,
      speaking: 0.7,
      conversation: 0.65
    },
    externalReferences: { hsk: 1, cefr: "A1" }
  }
];

/* ------------------------------------------------------------------ */
/* Concepts                                                            */
/* ------------------------------------------------------------------ */

/**
 * The concept graph.
 *
 * `restaurant.order` is the worked example from the product spec: it requires
 * quantity, wanting, beverages and the cup classifier, so a learner is only
 * offered a drink order once each of its components stands on its own. That
 * dependency is data, not a hardcoded lesson order.
 */
export const concepts: Concept[] = [
  {
    id: "greeting.basic",
    language: "zh-CN",
    title: text("Chào hỏi cơ bản", "Basic greetings"),
    canDo: text("Tôi có thể chào và đáp lại lời chào.", "I can greet someone and reply."),
    level: "A0",
    sublevel: "A0.1",
    topics: ["daily-life.greetings", "daily-life.courtesy"],
    skills: ["listeningRecognition", "meaningRecognition", "speaking", "pronunciation"],
    requires: [],
    unlocks: ["intro.name", "want.basic", "beverage.basic", "restaurant.order"],
    relatedConcepts: ["intro.name"],
    lexicalItemIds: ["zh.w.hello", "zh.w.hello-polite", "zh.w.thanks", "zh.w.sorry", "zh.w.correct", "zh.w.not"],
    patternIds: [],
    masteryThresholds: { listeningRecognition: 0.7, speaking: 0.6 },
    provenance: provenance({ sourceReferences: [CEFR_REFERENCE] })
  },
  {
    id: "intro.name",
    language: "zh-CN",
    title: text("Nói tên của mình", "Saying your name"),
    canDo: text("Tôi có thể nói tên mình và hỏi tên người khác.", "I can say my name and ask for someone's."),
    level: "A0",
    sublevel: "A0.1",
    topics: ["people.introductions"],
    skills: ["listeningRecognition", "activeRecall", "speaking", "conversation"],
    requires: ["greeting.basic"],
    unlocks: [],
    relatedConcepts: ["greeting.basic"],
    lexicalItemIds: ["zh.w.i", "zh.w.you", "zh.w.call", "zh.w.name", "zh.w.what"],
    patternIds: ["zh.p.name-introduction"],
    masteryThresholds: { activeRecall: 0.7, conversation: 0.6 },
    provenance: provenance({ sourceReferences: [CEFR_REFERENCE] })
  },
  {
    id: "number.basic",
    language: "zh-CN",
    title: text("Số đếm cơ bản", "Basic numbers"),
    canDo: text("Tôi có thể nói số lượng nhỏ.", "I can state small quantities."),
    level: "A0",
    sublevel: "A0.2",
    topics: ["daily-life.numbers"],
    skills: ["listeningRecognition", "meaningRecognition", "speaking", "pronunciation"],
    requires: [],
    unlocks: ["classifier.cup"],
    relatedConcepts: [],
    lexicalItemIds: ["zh.w.one", "zh.w.two"],
    patternIds: [],
    masteryThresholds: { listeningRecognition: 0.7 },
    provenance: provenance({ sourceReferences: [HSK_REFERENCE] })
  },
  {
    id: "beverage.basic",
    language: "zh-CN",
    title: text("Đồ uống cơ bản", "Basic drinks"),
    canDo: text("Tôi có thể gọi tên các đồ uống quen thuộc.", "I can name common drinks."),
    level: "A1",
    sublevel: "A1.1",
    topics: ["food.drinks", "food.cafe"],
    skills: ["listeningRecognition", "meaningRecognition", "speaking", "pronunciation"],
    requires: ["greeting.basic"],
    unlocks: ["restaurant.order"],
    relatedConcepts: ["want.basic"],
    lexicalItemIds: ["zh.w.coffee", "zh.w.tea", "zh.w.water", "zh.w.drink", "zh.c.drink-coffee", "zh.c.drink-tea"],
    patternIds: [],
    masteryThresholds: { listeningRecognition: 0.75, meaningRecognition: 0.75 },
    provenance: provenance({ sourceReferences: [HSK_REFERENCE] })
  },
  {
    id: "want.basic",
    language: "zh-CN",
    title: text("Nói điều mình muốn", "Expressing what you want"),
    canDo: text("Tôi có thể nói mình muốn làm gì.", "I can say what I want to do."),
    level: "A1",
    sublevel: "A1.1",
    topics: ["food.cafe", "food.restaurant"],
    skills: ["listeningRecognition", "activeRecall", "speaking", "conversation"],
    requires: ["greeting.basic"],
    unlocks: ["restaurant.order"],
    relatedConcepts: ["beverage.basic"],
    lexicalItemIds: ["zh.w.want", "zh.w.eat", "zh.w.meal", "zh.c.eat-meal"],
    patternIds: ["zh.p.want-action"],
    masteryThresholds: { activeRecall: 0.7, speaking: 0.7 },
    provenance: provenance({ sourceReferences: [CEFR_REFERENCE] })
  },
  {
    id: "classifier.cup",
    language: "zh-CN",
    title: text("Lượng từ 杯", "The measure word 杯"),
    canDo: text("Tôi có thể nói “một cốc / hai cốc” đúng ngữ pháp.", "I can say \"one cup / two cups\" correctly."),
    level: "A1",
    sublevel: "A1.1",
    topics: ["daily-life.numbers", "food.drinks"],
    skills: ["listeningRecognition", "activeRecall", "speaking"],
    requires: ["number.basic"],
    unlocks: ["restaurant.order"],
    relatedConcepts: ["number.basic", "beverage.basic"],
    lexicalItemIds: ["zh.w.cup", "zh.c.one-cup-coffee"],
    patternIds: [],
    masteryThresholds: { activeRecall: 0.7 },
    provenance: provenance({ sourceReferences: [HSK_REFERENCE] })
  },
  {
    id: "restaurant.order",
    language: "zh-CN",
    title: text("Gọi đồ uống", "Ordering a drink"),
    canDo: text("Tôi có thể gọi một đồ uống trong quán.", "I can order a drink at a cafe."),
    level: "A1",
    sublevel: "A1.2",
    topics: ["food.restaurant.ordering", "food.cafe"],
    skills: [
      "listeningRecognition",
      "meaningRecognition",
      "activeRecall",
      "speaking",
      "pronunciation",
      "conversation"
    ],
    requires: ["greeting.basic", "want.basic", "beverage.basic", "classifier.cup"],
    unlocks: [],
    relatedConcepts: ["want.basic", "beverage.basic", "classifier.cup"],
    lexicalItemIds: ["zh.w.request", "zh.c.one-cup-coffee"],
    patternIds: ["zh.p.order-drink"],
    masteryThresholds: { speaking: 0.7, conversation: 0.65, activeRecall: 0.7 },
    provenance: provenance({ sourceReferences: [CEFR_REFERENCE] })
  }
];

/* ------------------------------------------------------------------ */
/* Activity helpers                                                    */
/* ------------------------------------------------------------------ */

const instruct = {
  listenMeaning: text("Nghe và chọn nghĩa đúng.", "Listen and choose the correct meaning."),
  listenWord: text("Nghe và chọn từ bạn vừa nghe.", "Listen and choose the word you heard."),
  repeat: text("Nghe rồi nhắc lại thật to.", "Listen, then say it out loud."),
  shadow: text("Nhắc lại theo từng cụm, từ ngắn đến dài.", "Repeat chunk by chunk, building up the sentence."),
  drill: text("Luyện thanh điệu: nghe kỹ rồi nói lại.", "Tone practice: listen closely, then say it back."),
  substitute: text("Nói lại câu, thay bằng từ mới.", "Say the sentence again, swapping in the new word."),
  guided: text("Nói câu tiếng Trung tương ứng.", "Say the matching Chinese sentence."),
  quick: text("Nghe câu hỏi và trả lời ngay bằng lời nói.", "Hear the question and answer out loud straight away."),
  dialogueListen: text("Nghe trọn đoạn hội thoại một lượt.", "Listen through the whole conversation once."),
  rolePlay: text("Đến lượt bạn đóng vai. Hãy nói ra.", "Your turn to play the role. Speak your line."),
  review: text("Ôn nhanh các từ vừa học.", "Quick review of the words you just learned."),
  patternReview: text("Ôn lại mẫu câu.", "Review the sentence pattern."),
  checkpoint: text("Kiểm tra cuối bài.", "End-of-unit check.")
};

/* ------------------------------------------------------------------ */
/* Lessons                                                             */
/* ------------------------------------------------------------------ */

const helloActivities: Activity[] = [
  {
    id: "zh.act.a0.hello.listen",
    kind: "LISTEN_UNDERSTAND",
    instruction: instruct.listenMeaning,
    conceptIds: ["greeting.basic"],
    sentenceId: "zh.s.hello",
    choices: [text("Xin chào!", "Hello!"), text("Cảm ơn!", "Thank you!"), text("Xin lỗi!", "Sorry!")],
    correctChoiceIndex: 0
  },
  {
    id: "zh.act.a0.hello.choose",
    kind: "LISTEN_CHOOSE",
    instruction: instruct.listenWord,
    conceptIds: ["greeting.basic"],
    promptSentenceId: "zh.s.hello",
    optionItemIds: ["zh.w.hello", "zh.w.thanks", "zh.w.sorry"],
    correctItemId: "zh.w.hello"
  },
  {
    id: "zh.act.a0.hello.repeat",
    kind: "LISTEN_REPEAT",
    instruction: instruct.repeat,
    conceptIds: ["greeting.basic"],
    targetId: "zh.w.hello",
    targetType: "lexicalItem",
    slowFirst: true
  },
  {
    id: "zh.act.a0.hello.tone",
    kind: "PRONUNCIATION_DRILL",
    instruction: instruct.drill,
    conceptIds: ["greeting.basic"],
    targetIds: ["zh.w.hello", "zh.w.thanks"],
    targetType: "lexicalItem",
    focus: "tone"
  },
  {
    id: "zh.act.a0.hello.shadow",
    kind: "SHADOWING",
    instruction: instruct.shadow,
    conceptIds: ["greeting.basic"],
    sentenceId: "zh.s.hello-and-thanks",
    segmentOrder: ["zh.s.hello-and-thanks.seg1", "zh.s.hello-and-thanks.seg2"]
  }
];

const nameActivities: Activity[] = [
  {
    id: "zh.act.a0.name.listen",
    kind: "LISTEN_UNDERSTAND",
    instruction: instruct.listenMeaning,
    conceptIds: ["intro.name"],
    sentenceId: "zh.s.what-name",
    choices: [
      text("Bạn tên là gì?", "What's your name?"),
      text("Bạn muốn uống gì?", "What would you like to drink?"),
      text("Bạn có khoẻ không?", "How are you?")
    ],
    correctChoiceIndex: 0
  },
  {
    id: "zh.act.a0.name.shadow",
    kind: "SHADOWING",
    instruction: instruct.shadow,
    conceptIds: ["intro.name"],
    sentenceId: "zh.s.what-name",
    segmentOrder: ["zh.s.what-name.seg1", "zh.s.what-name.seg2", "zh.s.what-name.seg3"]
  },
  {
    id: "zh.act.a0.name.guided",
    kind: "GUIDED_SPEAKING",
    instruction: instruct.guided,
    conceptIds: ["intro.name"],
    prompt: text("Hãy nói: “Tôi tên là Tiểu Nam.”", "Say: \"My name is Xiao Nan.\""),
    targetSentenceId: "zh.s.my-name",
    expectedPatternId: "zh.p.name-introduction",
    hintSentenceIds: ["zh.s.my-name-lan"]
  },
  {
    id: "zh.act.a0.name.roleplay",
    kind: "ROLE_PLAY",
    instruction: instruct.rolePlay,
    conceptIds: ["intro.name", "greeting.basic"],
    scenarioId: "zh.dialogue.greeting-intro",
    learnerRole: "learner"
  }
];

const numberActivities: Activity[] = [
  {
    id: "zh.act.a0.numbers.choose",
    kind: "LISTEN_CHOOSE",
    instruction: instruct.listenWord,
    conceptIds: ["number.basic"],
    promptSentenceId: "zh.s.one-cup-please",
    optionItemIds: ["zh.w.one", "zh.w.two"],
    correctItemId: "zh.w.one"
  },
  {
    id: "zh.act.a0.numbers.listen2",
    kind: "LISTEN_UNDERSTAND",
    instruction: instruct.listenMeaning,
    conceptIds: ["number.basic"],
    sentenceId: "zh.s.two-cups-please",
    choices: [
      text("Hai cốc, cảm ơn.", "Two cups, thank you."),
      text("Một cốc, cảm ơn.", "One cup, thank you."),
      text("Không cần, cảm ơn.", "No thanks.")
    ],
    correctChoiceIndex: 0
  },
  {
    id: "zh.act.a0.numbers.repeat",
    kind: "LISTEN_REPEAT",
    instruction: instruct.repeat,
    conceptIds: ["number.basic"],
    targetId: "zh.w.two",
    targetType: "lexicalItem",
    slowFirst: true
  },
  {
    id: "zh.act.a0.numbers.tone",
    kind: "PRONUNCIATION_DRILL",
    instruction: instruct.drill,
    conceptIds: ["number.basic"],
    targetIds: ["zh.w.one", "zh.w.two"],
    targetType: "lexicalItem",
    focus: "tone"
  }
];

const drinkActivities: Activity[] = [
  {
    id: "zh.act.a1.drinks.choose",
    kind: "LISTEN_CHOOSE",
    instruction: instruct.listenWord,
    conceptIds: ["beverage.basic"],
    promptSentenceId: "zh.s.want-coffee",
    optionItemIds: ["zh.w.coffee", "zh.w.tea", "zh.w.water"],
    correctItemId: "zh.w.coffee"
  },
  {
    id: "zh.act.a1.drinks.repeat",
    kind: "LISTEN_REPEAT",
    instruction: instruct.repeat,
    conceptIds: ["beverage.basic"],
    targetId: "zh.c.drink-coffee",
    targetType: "lexicalItem",
    slowFirst: false
  },
  {
    id: "zh.act.a1.drinks.tone",
    kind: "PRONUNCIATION_DRILL",
    instruction: instruct.drill,
    conceptIds: ["beverage.basic"],
    targetIds: ["zh.w.coffee", "zh.w.tea", "zh.w.water"],
    targetType: "lexicalItem",
    focus: "tone"
  },
  {
    id: "zh.act.a1.drinks.review",
    kind: "VOCABULARY_REVIEW",
    instruction: instruct.review,
    conceptIds: ["beverage.basic"],
    itemIds: ["zh.w.coffee", "zh.w.tea", "zh.w.water", "zh.c.drink-coffee", "zh.c.drink-tea"]
  }
];

const wantActivities: Activity[] = [
  {
    id: "zh.act.a1.want.listen",
    kind: "LISTEN_UNDERSTAND",
    instruction: instruct.listenMeaning,
    conceptIds: ["want.basic"],
    sentenceId: "zh.s.want-tea",
    choices: [
      text("Tôi muốn uống trà.", "I want to drink tea."),
      text("Tôi muốn ăn cơm.", "I want to eat."),
      text("Tôi muốn uống cà phê.", "I want to drink coffee.")
    ],
    correctChoiceIndex: 0
  },
  {
    id: "zh.act.a1.want.shadow",
    kind: "SHADOWING",
    instruction: instruct.shadow,
    conceptIds: ["want.basic"],
    sentenceId: "zh.s.want-coffee",
    segmentOrder: ["zh.s.want-coffee.seg1", "zh.s.want-coffee.seg2", "zh.s.want-coffee.seg3"]
  },
  {
    id: "zh.act.a1.want.substitute",
    kind: "SUBSTITUTION_DRILL",
    instruction: instruct.substitute,
    conceptIds: ["want.basic"],
    patternId: "zh.p.want-action",
    slotName: "object",
    substitutionItemIds: ["zh.w.coffee", "zh.w.tea", "zh.w.water", "zh.w.meal"]
  },
  {
    id: "zh.act.a1.want.guided",
    kind: "GUIDED_SPEAKING",
    instruction: instruct.guided,
    conceptIds: ["want.basic"],
    prompt: text("Hãy nói: “Tôi muốn uống nước.”", "Say: \"I want to drink water.\""),
    targetSentenceId: "zh.s.want-water",
    expectedPatternId: "zh.p.want-action",
    hintSentenceIds: ["zh.s.want-coffee"]
  },
  {
    id: "zh.act.a1.want.pattern",
    kind: "PATTERN_REVIEW",
    instruction: instruct.patternReview,
    conceptIds: ["want.basic"],
    patternIds: ["zh.p.want-action"]
  }
];

const orderActivities: Activity[] = [
  {
    id: "zh.act.a1.order.dialogue",
    kind: "DIALOGUE",
    instruction: instruct.dialogueListen,
    conceptIds: ["restaurant.order"],
    scenarioId: "zh.dialogue.cafe-order",
    mode: "listen-through"
  },
  {
    id: "zh.act.a1.order.listen",
    kind: "LISTEN_UNDERSTAND",
    instruction: instruct.listenMeaning,
    conceptIds: ["restaurant.order"],
    sentenceId: "zh.s.npc-what-drink",
    choices: [
      text("Bạn muốn uống gì?", "What would you like to drink?"),
      text("Bạn tên là gì?", "What's your name?"),
      text("Bạn muốn ăn gì?", "What would you like to eat?")
    ],
    correctChoiceIndex: 0
  },
  {
    id: "zh.act.a1.order.shadow",
    kind: "SHADOWING",
    instruction: instruct.shadow,
    conceptIds: ["restaurant.order", "classifier.cup"],
    sentenceId: "zh.s.order-one-coffee",
    segmentOrder: [
      "zh.s.order-one-coffee.seg1",
      "zh.s.order-one-coffee.seg2",
      "zh.s.order-one-coffee.seg3"
    ]
  },
  {
    id: "zh.act.a1.order.substitute",
    kind: "SUBSTITUTION_DRILL",
    instruction: instruct.substitute,
    conceptIds: ["restaurant.order", "classifier.cup"],
    patternId: "zh.p.order-drink",
    slotName: "item",
    substitutionItemIds: ["zh.w.coffee", "zh.w.tea", "zh.w.water"]
  },
  {
    id: "zh.act.a1.order.quick",
    kind: "QUICK_RESPONSE",
    instruction: instruct.quick,
    conceptIds: ["restaurant.order"],
    promptSentenceId: "zh.s.npc-what-drink",
    expectedPatternId: "zh.p.order-drink",
    responseWindowMs: 5000,
    hintSentenceIds: ["zh.s.order-one-coffee"]
  },
  {
    id: "zh.act.a1.order.roleplay",
    kind: "ROLE_PLAY",
    instruction: instruct.rolePlay,
    conceptIds: ["restaurant.order"],
    scenarioId: "zh.dialogue.cafe-order",
    learnerRole: "customer"
  },
  {
    id: "zh.act.a1.order.checkpoint",
    kind: "UNIT_CHECKPOINT",
    instruction: instruct.checkpoint,
    conceptIds: ["restaurant.order", "want.basic", "beverage.basic", "classifier.cup"],
    assessmentId: "zh.assess.a1.cafe"
  }
];

export const lessons: Lesson[] = [
  {
    id: "zh.lesson.a0.hello",
    unitId: "zh.unit.a0.greetings",
    title: text("Chào hỏi", "Saying hello"),
    canDo: text("Tôi có thể chào và cảm ơn.", "I can greet someone and say thank you."),
    level: "A0",
    sublevel: "A0.1",
    topics: ["daily-life.greetings", "daily-life.courtesy"],
    conceptIds: ["greeting.basic"],
    estimatedMinutes: 5,
    context: text(
      "Bạn gặp một người mới. Câu đầu tiên luôn là lời chào.",
      "You meet someone new. The first thing you say is a greeting."
    ),
    activities: helloActivities,
    provenance: provenance()
  },
  {
    id: "zh.lesson.a0.name",
    unitId: "zh.unit.a0.greetings",
    title: text("Tên của bạn", "Your name"),
    canDo: text("Tôi có thể nói tên mình và hỏi tên người khác.", "I can say my name and ask for someone's."),
    level: "A0",
    sublevel: "A0.1",
    topics: ["people.introductions"],
    conceptIds: ["intro.name"],
    estimatedMinutes: 6,
    context: text(
      "Sau lời chào, người ta thường hỏi tên bạn.",
      "After a greeting, people usually ask your name."
    ),
    activities: nameActivities,
    provenance: provenance()
  },
  {
    id: "zh.lesson.a0.numbers",
    unitId: "zh.unit.a0.greetings",
    title: text("Một và hai", "One and two"),
    canDo: text("Tôi có thể nói số lượng nhỏ.", "I can state small quantities."),
    level: "A0",
    sublevel: "A0.2",
    topics: ["daily-life.numbers"],
    conceptIds: ["number.basic"],
    estimatedMinutes: 4,
    context: text(
      "Số lượng xuất hiện ở khắp nơi — nhất là khi gọi món.",
      "Quantities come up everywhere, especially when ordering."
    ),
    activities: numberActivities,
    provenance: provenance()
  },
  {
    id: "zh.lesson.a1.drinks",
    unitId: "zh.unit.a1.cafe",
    title: text("Đồ uống", "Drinks"),
    canDo: text("Tôi có thể gọi tên các đồ uống quen thuộc.", "I can name common drinks."),
    level: "A1",
    sublevel: "A1.1",
    topics: ["food.drinks", "food.cafe"],
    conceptIds: ["beverage.basic"],
    estimatedMinutes: 5,
    context: text("Ba đồ uống bạn sẽ gặp ở mọi quán.", "Three drinks you'll meet in every cafe."),
    activities: drinkActivities,
    provenance: provenance()
  },
  {
    id: "zh.lesson.a1.want",
    unitId: "zh.unit.a1.cafe",
    title: text("Tôi muốn…", "I want to…"),
    canDo: text("Tôi có thể nói mình muốn làm gì.", "I can say what I want to do."),
    level: "A1",
    sublevel: "A1.1",
    topics: ["food.cafe", "food.restaurant"],
    conceptIds: ["want.basic"],
    estimatedMinutes: 7,
    context: text(
      "Một mẫu câu, dùng được cho hàng trăm tình huống.",
      "One pattern that works in hundreds of situations."
    ),
    activities: wantActivities,
    provenance: provenance()
  },
  {
    id: "zh.lesson.a1.order",
    unitId: "zh.unit.a1.cafe",
    title: text("Gọi một đồ uống", "Ordering a drink"),
    canDo: text("Tôi có thể gọi một đồ uống trong quán.", "I can order a drink at a cafe."),
    level: "A1",
    sublevel: "A1.2",
    topics: ["food.restaurant.ordering", "food.cafe"],
    conceptIds: ["restaurant.order", "classifier.cup"],
    estimatedMinutes: 9,
    context: text(
      "Bạn đứng ở quầy. Nhân viên vừa hỏi bạn muốn uống gì.",
      "You're at the counter. The barista has just asked what you'd like."
    ),
    activities: orderActivities,
    provenance: provenance()
  }
];

/* ------------------------------------------------------------------ */
/* Units & courses                                                     */
/* ------------------------------------------------------------------ */

export const units: Unit[] = [
  {
    id: "zh.unit.a0.greetings",
    courseId: "zh.course.a0",
    title: text("Những câu đầu tiên", "Your first words"),
    canDoObjectives: [
      text("Chào hỏi và cảm ơn.", "Greet someone and say thank you."),
      text("Nói tên mình và hỏi tên người khác.", "Say your name and ask for someone's."),
      text("Nói số lượng một và hai.", "State the quantities one and two.")
    ],
    topics: ["daily-life.greetings", "daily-life.courtesy", "people.introductions", "daily-life.numbers"],
    lessonIds: ["zh.lesson.a0.hello", "zh.lesson.a0.name", "zh.lesson.a0.numbers"],
    conceptIds: ["greeting.basic", "intro.name", "number.basic"],
    checkpointAssessmentId: "zh.assess.a0.greetings",
    icon: "👋",
    provenance: provenance()
  },
  {
    id: "zh.unit.a1.cafe",
    courseId: "zh.course.a1",
    title: text("Ở quán cà phê", "At the cafe"),
    canDoObjectives: [
      text("Gọi tên đồ uống quen thuộc.", "Name common drinks."),
      text("Nói mình muốn uống hay ăn gì.", "Say what you want to drink or eat."),
      text("Gọi một đồ uống kèm số lượng và lượng từ.", "Order a drink with a quantity and measure word."),
      text("Trả lời khi nhân viên hỏi thêm.", "Reply when the barista asks if you want anything else.")
    ],
    topics: ["food.cafe", "food.drinks", "food.restaurant.ordering"],
    lessonIds: ["zh.lesson.a1.drinks", "zh.lesson.a1.want", "zh.lesson.a1.order"],
    conceptIds: ["beverage.basic", "want.basic", "classifier.cup", "restaurant.order"],
    checkpointAssessmentId: "zh.assess.a1.cafe",
    icon: "☕",
    provenance: provenance()
  }
];

export const courses: Course[] = [
  {
    id: "zh.course.a0",
    language: "zh-CN",
    level: "A0",
    title: text("A0 · Khởi động", "A0 · Starter"),
    description: text(
      "Từ con số không đến câu chào hỏi đầu tiên bạn nói ra được.",
      "From zero to the first sentence you can actually say out loud."
    ),
    unitIds: ["zh.unit.a0.greetings"],
    provenance: provenance()
  },
  {
    id: "zh.course.a1",
    language: "zh-CN",
    level: "A1",
    title: text("A1 · Nền tảng", "A1 · Foundation"),
    description: text(
      "Những tình huống hằng ngày đầu tiên: quán cà phê, đồ uống, gọi món.",
      "Your first everyday situations: cafes, drinks, ordering."
    ),
    unitIds: ["zh.unit.a1.cafe"],
    provenance: provenance()
  }
];
