import type {
  AudioAsset,
  ChineseLanguageData,
  ExampleSentence,
  FrequencyBand,
  LexicalItem,
  LingozaLevel,
  PartOfSpeech,
  Register
} from "../../../packages/content-schema/src/index.js";
import { HSK_REFERENCE, provenance } from "./provenance.js";

/**
 * Lexical items and example sentences for the A0/A1 seed.
 *
 * Chinese-specific fields (hanzi variants, pinyin, tone numbers, classifier)
 * all live inside `languageData`. Nothing in the framework reads them; the
 * Chinese renderer in the app does. That separation is what makes a future
 * ja-JP pack a data problem rather than a refactor.
 */

/* ------------------------------------------------------------------ */
/* Audio placeholders                                                  */
/* ------------------------------------------------------------------ */

/**
 * Placeholder audio metadata.
 *
 * `available: false` is the honest state: the paths, speeds and segment
 * structure are authored, but no studio recording exists yet. The player
 * renders a disabled speaker with a "recording coming soon" affordance instead
 * of failing, and the validator reports every one of these as a publish
 * blocker -- so the gap is tracked rather than forgotten.
 *
 * Browser speech synthesis is deliberately *not* used as a substitute: it is
 * unreliable for tone, absent inside the Zalo Mini App webview, and shipping it
 * would disguise missing content as finished content.
 */
function placeholderAudio(
  slug: string,
  idBase: string,
  durationMs: number,
  segments?: Array<[string, number, number]>
): AudioAsset {
  return {
    available: false,
    normal: {
      src: `${slug}.mp3`,
      speed: "normal",
      speakerId: "zh-female-01",
      gender: "female",
      accent: "standard-mandarin",
      durationMs,
      segments: segments?.map(([text, startMs, endMs], index) => ({
        id: `${idBase}.seg${index + 1}`,
        text,
        startMs,
        endMs
      }))
    },
    slow: {
      src: `${slug}.slow.mp3`,
      speed: "slow",
      speakerId: "zh-female-01",
      gender: "female",
      accent: "standard-mandarin",
      durationMs: Math.round(durationMs * 1.45)
    }
  };
}

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

interface ItemSpec {
  id: string;
  text: string;
  pinyin: string;
  tones: number[];
  vi: string;
  en: string;
  pos: PartOfSpeech;
  level: LingozaLevel;
  topics: string[];
  kind?: LexicalItem["kind"];
  targetDepth?: LexicalItem["targetDepth"];
  register?: Register;
  frequencyBand?: FrequencyBand;
  classifier?: string;
  traditional?: string;
  hsk?: number;
  collocations?: string[];
  examples?: string[];
  semanticCategory?: string;
  durationMs?: number;
}

function item(spec: ItemSpec): LexicalItem {
  const languageData: ChineseLanguageData = {
    simplified: spec.text,
    traditional: spec.traditional ?? spec.text,
    pinyin: spec.pinyin,
    tones: spec.tones,
    classifier: spec.classifier,
    hskReference: spec.hsk
  };

  return {
    id: spec.id,
    language: "zh-CN",
    kind: spec.kind ?? "word",
    text: spec.text,
    romanization: spec.pinyin,
    meaning: { "vi-VN": spec.vi, "en-US": spec.en },
    partOfSpeech: spec.pos,
    level: spec.level,
    targetDepth: spec.targetDepth ?? "active",
    topics: spec.topics,
    semanticCategory: spec.semanticCategory,
    register: spec.register ?? "neutral",
    frequencyBand: spec.frequencyBand ?? 1,
    synonyms: [],
    antonyms: [],
    collocations: spec.collocations ?? [],
    exampleSentenceIds: spec.examples ?? [],
    audio: placeholderAudio(`items/${spec.id}`, spec.id, spec.durationMs ?? 900),
    languageData,
    provenance: provenance({
      sourceReferences: spec.hsk === undefined ? [] : [HSK_REFERENCE]
    })
  };
}

interface SentenceSpec {
  id: string;
  text: string;
  pinyin: string;
  vi: string;
  en: string;
  level: LingozaLevel;
  topics: string[];
  items: string[];
  patternId?: string;
  register?: Register;
  durationMs?: number;
  /** [chunk text, startMs, endMs] used for shadowing build-up. */
  segments?: Array<[string, number, number]>;
}

function sentence(spec: SentenceSpec): ExampleSentence {
  return {
    id: spec.id,
    language: "zh-CN",
    text: spec.text,
    romanization: spec.pinyin,
    translation: { "vi-VN": spec.vi, "en-US": spec.en },
    level: spec.level,
    topics: spec.topics,
    register: spec.register ?? "neutral",
    lexicalItemIds: spec.items,
    patternId: spec.patternId,
    audio: placeholderAudio(`sentences/${spec.id}`, spec.id, spec.durationMs ?? 1600, spec.segments),
    languageData: { simplified: spec.text, pinyin: spec.pinyin } satisfies Record<string, unknown>,
    provenance: provenance()
  };
}

/* ------------------------------------------------------------------ */
/* Words                                                               */
/* ------------------------------------------------------------------ */

export const lexicalItems: LexicalItem[] = [
  /* A0 -- greetings & courtesy ------------------------------------- */
  item({
    id: "zh.w.hello",
    text: "你好",
    pinyin: "nǐ hǎo",
    tones: [3, 3],
    vi: "xin chào",
    en: "hello",
    pos: "phrase",
    level: "A0",
    topics: ["daily-life.greetings"],
    hsk: 1,
    semanticCategory: "greeting",
    examples: ["zh.s.hello", "zh.s.hello-and-thanks"]
  }),
  item({
    id: "zh.w.hello-polite",
    text: "您好",
    pinyin: "nín hǎo",
    tones: [2, 3],
    vi: "xin chào (lịch sự)",
    en: "hello (polite)",
    pos: "phrase",
    level: "A0",
    topics: ["daily-life.greetings"],
    register: "polite",
    semanticCategory: "greeting",
    examples: ["zh.s.npc-polite-what-drink"]
  }),
  item({
    id: "zh.w.thanks",
    text: "谢谢",
    pinyin: "xièxie",
    tones: [4, 5],
    vi: "cảm ơn",
    en: "thank you",
    pos: "phrase",
    level: "A0",
    topics: ["daily-life.courtesy"],
    hsk: 1,
    semanticCategory: "courtesy",
    examples: ["zh.s.hello-and-thanks", "zh.s.learner-thats-all"]
  }),
  item({
    id: "zh.w.sorry",
    text: "对不起",
    pinyin: "duìbuqǐ",
    tones: [4, 5, 3],
    vi: "xin lỗi",
    en: "sorry",
    pos: "phrase",
    level: "A0",
    topics: ["daily-life.courtesy"],
    hsk: 1,
    semanticCategory: "courtesy",
    examples: ["zh.s.npc-sorry-again"]
  }),
  item({
    id: "zh.w.correct",
    text: "对",
    pinyin: "duì",
    tones: [4],
    vi: "đúng, phải",
    en: "correct, right",
    pos: "adjective",
    level: "A0",
    topics: ["daily-life.greetings"],
    hsk: 1,
    semanticCategory: "confirmation",
    examples: ["zh.s.yes-correct"]
  }),
  item({
    id: "zh.w.not",
    text: "不",
    pinyin: "bù",
    tones: [4],
    vi: "không",
    en: "not, no",
    pos: "adverb",
    level: "A0",
    topics: ["daily-life.greetings"],
    hsk: 1,
    semanticCategory: "negation",
    examples: ["zh.s.no-not-correct", "zh.s.learner-thats-all"]
  }),

  /* A0 -- self-introduction ---------------------------------------- */
  item({
    id: "zh.w.i",
    text: "我",
    pinyin: "wǒ",
    tones: [3],
    vi: "tôi",
    en: "I, me",
    pos: "pronoun",
    level: "A0",
    topics: ["people.introductions"],
    hsk: 1,
    examples: ["zh.s.my-name", "zh.s.want-coffee"]
  }),
  item({
    id: "zh.w.you",
    text: "你",
    pinyin: "nǐ",
    tones: [3],
    vi: "bạn",
    en: "you",
    pos: "pronoun",
    level: "A0",
    topics: ["people.introductions"],
    hsk: 1,
    examples: ["zh.s.what-name", "zh.s.npc-what-drink"]
  }),
  item({
    id: "zh.w.call",
    text: "叫",
    pinyin: "jiào",
    tones: [4],
    vi: "gọi là, tên là",
    en: "to be called",
    pos: "verb",
    level: "A0",
    topics: ["people.introductions"],
    hsk: 1,
    examples: ["zh.s.my-name", "zh.s.what-name"]
  }),
  item({
    id: "zh.w.name",
    text: "名字",
    pinyin: "míngzi",
    tones: [2, 5],
    vi: "tên",
    en: "name",
    pos: "noun",
    level: "A0",
    topics: ["people.introductions"],
    hsk: 1,
    examples: ["zh.s.what-name"]
  }),
  item({
    id: "zh.w.what",
    text: "什么",
    pinyin: "shénme",
    tones: [2, 5],
    vi: "gì, cái gì",
    en: "what",
    pos: "pronoun",
    level: "A0",
    topics: ["people.introductions"],
    hsk: 1,
    examples: ["zh.s.what-name", "zh.s.npc-what-drink"]
  }),

  /* A0 -- numbers & measure words ---------------------------------- */
  item({
    id: "zh.w.one",
    text: "一",
    pinyin: "yī",
    tones: [1],
    vi: "một",
    en: "one",
    pos: "numeral",
    level: "A0",
    topics: ["daily-life.numbers"],
    hsk: 1,
    collocations: ["zh.c.one-cup-coffee"],
    examples: ["zh.s.order-one-coffee"]
  }),
  item({
    id: "zh.w.two",
    text: "两",
    pinyin: "liǎng",
    tones: [3],
    vi: "hai (dùng trước lượng từ)",
    en: "two (before a measure word)",
    pos: "numeral",
    level: "A0",
    topics: ["daily-life.numbers"],
    hsk: 1,
    examples: ["zh.s.order-two-tea"]
  }),
  item({
    id: "zh.w.cup",
    text: "杯",
    pinyin: "bēi",
    tones: [1],
    vi: "cốc, ly (lượng từ)",
    en: "cup, glass (measure word)",
    pos: "measure-word",
    level: "A1",
    topics: ["food.drinks", "daily-life.numbers"],
    hsk: 1,
    collocations: ["zh.c.one-cup-coffee"],
    examples: ["zh.s.order-one-coffee", "zh.s.order-two-tea"]
  }),

  /* A1 -- drinks & food -------------------------------------------- */
  item({
    id: "zh.w.coffee",
    text: "咖啡",
    pinyin: "kāfēi",
    tones: [1, 1],
    vi: "cà phê",
    en: "coffee",
    pos: "noun",
    level: "A1",
    topics: ["food.drinks", "food.cafe"],
    hsk: 1,
    classifier: "杯",
    semanticCategory: "beverage",
    collocations: ["zh.c.drink-coffee", "zh.c.one-cup-coffee"],
    examples: ["zh.s.want-coffee", "zh.s.order-one-coffee"]
  }),
  item({
    id: "zh.w.tea",
    text: "茶",
    pinyin: "chá",
    tones: [2],
    vi: "trà",
    en: "tea",
    pos: "noun",
    level: "A1",
    topics: ["food.drinks", "food.cafe"],
    hsk: 1,
    classifier: "杯",
    semanticCategory: "beverage",
    collocations: ["zh.c.drink-tea"],
    examples: ["zh.s.want-tea", "zh.s.order-two-tea"]
  }),
  item({
    id: "zh.w.water",
    text: "水",
    pinyin: "shuǐ",
    tones: [3],
    vi: "nước",
    en: "water",
    pos: "noun",
    level: "A1",
    topics: ["food.drinks"],
    hsk: 1,
    classifier: "杯",
    semanticCategory: "beverage",
    examples: ["zh.s.learner-more-water"]
  }),
  item({
    id: "zh.w.drink",
    text: "喝",
    pinyin: "hē",
    tones: [1],
    vi: "uống",
    en: "to drink",
    pos: "verb",
    level: "A1",
    topics: ["food.drinks"],
    hsk: 1,
    collocations: ["zh.c.drink-coffee", "zh.c.drink-tea"],
    examples: ["zh.s.want-coffee", "zh.s.npc-what-drink"]
  }),
  item({
    id: "zh.w.eat",
    text: "吃",
    pinyin: "chī",
    tones: [1],
    vi: "ăn",
    en: "to eat",
    pos: "verb",
    level: "A1",
    topics: ["food.restaurant"],
    hsk: 1,
    collocations: ["zh.c.eat-meal"],
    examples: ["zh.s.want-eat"]
  }),
  item({
    id: "zh.w.meal",
    text: "饭",
    pinyin: "fàn",
    tones: [4],
    vi: "cơm, bữa ăn",
    en: "rice, meal",
    pos: "noun",
    level: "A1",
    topics: ["food.restaurant"],
    hsk: 1,
    collocations: ["zh.c.eat-meal"],
    examples: ["zh.s.want-eat"]
  }),
  item({
    id: "zh.w.want",
    text: "想",
    pinyin: "xiǎng",
    tones: [3],
    vi: "muốn",
    en: "to want to",
    pos: "verb",
    level: "A1",
    topics: ["food.restaurant.ordering"],
    hsk: 1,
    semanticCategory: "modality",
    examples: ["zh.s.want-coffee", "zh.s.want-tea", "zh.s.want-eat"]
  }),
  item({
    id: "zh.w.request",
    text: "要",
    pinyin: "yào",
    tones: [4],
    vi: "muốn, cần (khi gọi món)",
    en: "to want, to order",
    pos: "verb",
    level: "A1",
    topics: ["food.restaurant.ordering"],
    hsk: 1,
    semanticCategory: "modality",
    examples: ["zh.s.order-one-coffee", "zh.s.order-two-tea"]
  }),

  /* A1 -- collocations --------------------------------------------- */
  item({
    id: "zh.c.drink-coffee",
    text: "喝咖啡",
    pinyin: "hē kāfēi",
    tones: [1, 1, 1],
    vi: "uống cà phê",
    en: "to drink coffee",
    pos: "phrase",
    kind: "collocation",
    level: "A1",
    topics: ["food.cafe"],
    examples: ["zh.s.want-coffee"],
    durationMs: 1100
  }),
  item({
    id: "zh.c.one-cup-coffee",
    text: "一杯咖啡",
    pinyin: "yì bēi kāfēi",
    tones: [1, 1, 1, 1],
    vi: "một cốc cà phê",
    en: "a cup of coffee",
    pos: "phrase",
    kind: "collocation",
    level: "A1",
    topics: ["food.cafe"],
    examples: ["zh.s.order-one-coffee"],
    durationMs: 1200
  }),
  item({
    id: "zh.c.drink-tea",
    text: "喝茶",
    pinyin: "hē chá",
    tones: [1, 2],
    vi: "uống trà",
    en: "to drink tea",
    pos: "phrase",
    kind: "collocation",
    level: "A1",
    topics: ["food.cafe"],
    examples: ["zh.s.want-tea"],
    durationMs: 1000
  }),
  item({
    id: "zh.c.eat-meal",
    text: "吃饭",
    pinyin: "chī fàn",
    tones: [1, 4],
    vi: "ăn cơm",
    en: "to eat (a meal)",
    pos: "phrase",
    kind: "collocation",
    level: "A1",
    topics: ["food.restaurant"],
    examples: ["zh.s.want-eat"],
    durationMs: 1000
  })
];

/* ------------------------------------------------------------------ */
/* Sentences                                                           */
/* ------------------------------------------------------------------ */

export const sentences: ExampleSentence[] = [
  /* A0 greetings ---------------------------------------------------- */
  sentence({
    id: "zh.s.hello",
    text: "你好！",
    pinyin: "Nǐ hǎo!",
    vi: "Xin chào!",
    en: "Hello!",
    level: "A0",
    topics: ["daily-life.greetings"],
    items: ["zh.w.hello"],
    durationMs: 900
  }),
  sentence({
    id: "zh.s.hello-and-thanks",
    text: "你好，谢谢你！",
    pinyin: "Nǐ hǎo, xièxie nǐ!",
    vi: "Xin chào, cảm ơn bạn!",
    en: "Hello, thank you!",
    level: "A0",
    topics: ["daily-life.greetings", "daily-life.courtesy"],
    items: ["zh.w.hello", "zh.w.thanks", "zh.w.you"],
    durationMs: 1500,
    segments: [
      ["你好", 0, 700],
      ["谢谢你", 700, 1500]
    ]
  }),
  sentence({
    id: "zh.s.yes-correct",
    text: "对，是我。",
    pinyin: "Duì, shì wǒ.",
    vi: "Đúng rồi, là tôi.",
    en: "Right, that's me.",
    level: "A0",
    topics: ["daily-life.greetings"],
    items: ["zh.w.correct", "zh.w.i"],
    durationMs: 1200
  }),
  sentence({
    id: "zh.s.no-not-correct",
    text: "不，不是我。",
    pinyin: "Bù, bú shì wǒ.",
    vi: "Không, không phải tôi.",
    en: "No, that's not me.",
    level: "A0",
    topics: ["daily-life.greetings"],
    items: ["zh.w.not", "zh.w.i"],
    durationMs: 1400
  }),

  /* A0 introductions ------------------------------------------------ */
  sentence({
    id: "zh.s.my-name",
    text: "我叫小南。",
    pinyin: "Wǒ jiào Xiǎo Nán.",
    vi: "Tôi tên là Tiểu Nam.",
    en: "My name is Xiao Nan.",
    level: "A0",
    topics: ["people.introductions"],
    items: ["zh.w.i", "zh.w.call"],
    patternId: "zh.p.name-introduction",
    durationMs: 1500,
    segments: [
      ["我叫", 0, 700],
      ["小南", 700, 1500]
    ]
  }),
  sentence({
    id: "zh.s.my-name-lan",
    text: "我叫兰兰。",
    pinyin: "Wǒ jiào Lánlan.",
    vi: "Tôi tên là Lan Lan.",
    en: "My name is Lanlan.",
    level: "A0",
    topics: ["people.introductions"],
    items: ["zh.w.i", "zh.w.call"],
    patternId: "zh.p.name-introduction",
    durationMs: 1500
  }),
  sentence({
    id: "zh.s.what-name",
    text: "你叫什么名字？",
    pinyin: "Nǐ jiào shénme míngzi?",
    vi: "Bạn tên là gì?",
    en: "What's your name?",
    level: "A0",
    topics: ["people.introductions"],
    items: ["zh.w.you", "zh.w.call", "zh.w.what", "zh.w.name"],
    durationMs: 1800,
    segments: [
      ["你叫", 0, 600],
      ["什么", 600, 1200],
      ["名字", 1200, 1800]
    ]
  }),
  sentence({
    id: "zh.s.how-do-i-call-you",
    text: "请问您怎么称呼？",
    pinyin: "Qǐngwèn nín zěnme chēnghu?",
    vi: "Cho hỏi, tôi nên xưng hô với anh/chị thế nào?",
    en: "May I ask how I should address you?",
    level: "A1",
    topics: ["people.introductions"],
    items: ["zh.w.hello-polite"],
    register: "formal",
    durationMs: 2000
  }),

  /* A0 numbers ------------------------------------------------------ */
  sentence({
    id: "zh.s.one-cup-please",
    text: "一杯，谢谢。",
    pinyin: "Yì bēi, xièxie.",
    vi: "Một cốc, cảm ơn.",
    en: "One cup, thank you.",
    level: "A0",
    topics: ["daily-life.numbers", "food.cafe"],
    items: ["zh.w.one", "zh.w.cup", "zh.w.thanks"],
    durationMs: 1400
  }),
  sentence({
    id: "zh.s.two-cups-please",
    text: "两杯，谢谢。",
    pinyin: "Liǎng bēi, xièxie.",
    vi: "Hai cốc, cảm ơn.",
    en: "Two cups, thank you.",
    level: "A0",
    topics: ["daily-life.numbers", "food.cafe"],
    items: ["zh.w.two", "zh.w.cup", "zh.w.thanks"],
    durationMs: 1450
  }),

  /* A1 wanting ------------------------------------------------------ */
  sentence({
    id: "zh.s.want-coffee",
    text: "我想喝咖啡。",
    pinyin: "Wǒ xiǎng hē kāfēi.",
    vi: "Tôi muốn uống cà phê.",
    en: "I want to drink coffee.",
    level: "A1",
    topics: ["food.cafe"],
    items: ["zh.w.i", "zh.w.want", "zh.w.drink", "zh.w.coffee"],
    patternId: "zh.p.want-action",
    durationMs: 1700,
    segments: [
      ["我想", 0, 600],
      ["我想喝", 0, 1000],
      ["我想喝咖啡", 0, 1700]
    ]
  }),
  sentence({
    id: "zh.s.want-tea",
    text: "我想喝茶。",
    pinyin: "Wǒ xiǎng hē chá.",
    vi: "Tôi muốn uống trà.",
    en: "I want to drink tea.",
    level: "A1",
    topics: ["food.cafe"],
    items: ["zh.w.i", "zh.w.want", "zh.w.drink", "zh.w.tea"],
    patternId: "zh.p.want-action",
    durationMs: 1500
  }),
  sentence({
    id: "zh.s.want-eat",
    text: "我想吃饭。",
    pinyin: "Wǒ xiǎng chī fàn.",
    vi: "Tôi muốn ăn cơm.",
    en: "I want to eat.",
    level: "A1",
    topics: ["food.restaurant"],
    items: ["zh.w.i", "zh.w.want", "zh.w.eat", "zh.w.meal"],
    patternId: "zh.p.want-action",
    durationMs: 1500
  }),
  sentence({
    id: "zh.s.want-water",
    text: "我想喝水。",
    pinyin: "Wǒ xiǎng hē shuǐ.",
    vi: "Tôi muốn uống nước.",
    en: "I want to drink water.",
    level: "A1",
    topics: ["food.drinks"],
    items: ["zh.w.i", "zh.w.want", "zh.w.drink", "zh.w.water"],
    patternId: "zh.p.want-action",
    durationMs: 1500
  }),

  /* A1 ordering ----------------------------------------------------- */
  sentence({
    id: "zh.s.order-one-coffee",
    text: "我要一杯咖啡。",
    pinyin: "Wǒ yào yì bēi kāfēi.",
    vi: "Tôi muốn một cốc cà phê.",
    en: "I'd like a cup of coffee.",
    level: "A1",
    topics: ["food.restaurant.ordering", "food.cafe"],
    items: ["zh.w.i", "zh.w.request", "zh.w.one", "zh.w.cup", "zh.w.coffee"],
    patternId: "zh.p.order-drink",
    durationMs: 1900,
    segments: [
      ["我要", 0, 600],
      ["我要一杯", 0, 1200],
      ["我要一杯咖啡", 0, 1900]
    ]
  }),
  sentence({
    id: "zh.s.order-two-tea",
    text: "我要两杯茶。",
    pinyin: "Wǒ yào liǎng bēi chá.",
    vi: "Tôi muốn hai cốc trà.",
    en: "I'd like two cups of tea.",
    level: "A1",
    topics: ["food.restaurant.ordering", "food.cafe"],
    items: ["zh.w.i", "zh.w.request", "zh.w.two", "zh.w.cup", "zh.w.tea"],
    patternId: "zh.p.order-drink",
    durationMs: 1800
  }),
  sentence({
    id: "zh.s.learner-more-water",
    text: "我还要一杯水。",
    pinyin: "Wǒ hái yào yì bēi shuǐ.",
    vi: "Tôi muốn thêm một cốc nước nữa.",
    en: "I'd also like a glass of water.",
    level: "A1",
    topics: ["food.restaurant.ordering"],
    items: ["zh.w.i", "zh.w.request", "zh.w.one", "zh.w.cup", "zh.w.water"],
    durationMs: 2000
  }),
  sentence({
    id: "zh.s.learner-thats-all",
    text: "不用了，谢谢。",
    pinyin: "Búyòng le, xièxie.",
    vi: "Không cần nữa, cảm ơn.",
    en: "That's all, thank you.",
    level: "A1",
    topics: ["food.restaurant.ordering", "daily-life.courtesy"],
    items: ["zh.w.not", "zh.w.thanks"],
    register: "polite",
    durationMs: 1600
  }),

  /* A1 cafe staff lines --------------------------------------------- */
  sentence({
    id: "zh.s.npc-welcome",
    text: "你好，欢迎光临！",
    pinyin: "Nǐ hǎo, huānyíng guānglín!",
    vi: "Xin chào, hoan nghênh quý khách!",
    en: "Hello, welcome!",
    level: "A1",
    topics: ["food.cafe"],
    items: ["zh.w.hello"],
    register: "polite",
    durationMs: 1900
  }),
  sentence({
    id: "zh.s.npc-what-drink",
    text: "你想喝什么？",
    pinyin: "Nǐ xiǎng hē shénme?",
    vi: "Bạn muốn uống gì?",
    en: "What would you like to drink?",
    level: "A1",
    topics: ["food.cafe"],
    items: ["zh.w.you", "zh.w.want", "zh.w.drink", "zh.w.what"],
    durationMs: 1600,
    segments: [
      ["你想", 0, 600],
      ["你想喝", 0, 1000],
      ["你想喝什么", 0, 1600]
    ]
  }),
  sentence({
    id: "zh.s.npc-polite-what-drink",
    text: "请问，您要喝点什么？",
    pinyin: "Qǐngwèn, nín yào hē diǎn shénme?",
    vi: "Cho hỏi, quý khách muốn dùng đồ uống gì ạ?",
    en: "Excuse me, what would you like to drink?",
    level: "A1",
    topics: ["food.restaurant.ordering"],
    items: ["zh.w.hello-polite", "zh.w.request", "zh.w.drink", "zh.w.what"],
    register: "formal",
    durationMs: 2300
  }),
  sentence({
    id: "zh.s.npc-anything-else",
    text: "好的。还需要别的吗？",
    pinyin: "Hǎo de. Hái xūyào biéde ma?",
    vi: "Vâng ạ. Quý khách cần thêm gì nữa không?",
    en: "Certainly. Anything else?",
    level: "A1",
    topics: ["food.restaurant.ordering"],
    items: ["zh.w.correct"],
    register: "polite",
    durationMs: 2200
  }),
  sentence({
    id: "zh.s.npc-thanks-end",
    text: "好的，谢谢！请稍等。",
    pinyin: "Hǎo de, xièxie! Qǐng shāo děng.",
    vi: "Vâng, cảm ơn! Xin đợi một chút.",
    en: "Alright, thank you! One moment please.",
    level: "A1",
    topics: ["food.restaurant.ordering"],
    items: ["zh.w.thanks"],
    register: "polite",
    durationMs: 2400
  }),
  sentence({
    id: "zh.s.npc-sorry-again",
    text: "对不起，请再说一次。",
    pinyin: "Duìbuqǐ, qǐng zài shuō yí cì.",
    vi: "Xin lỗi, bạn nói lại một lần nữa nhé.",
    en: "Sorry, could you say that again?",
    level: "A1",
    topics: ["food.restaurant.ordering", "daily-life.courtesy"],
    items: ["zh.w.sorry", "zh.w.one"],
    register: "polite",
    durationMs: 2100
  }),
  sentence({
    id: "zh.s.npc-greeting-intro",
    text: "你好！你叫什么名字？",
    pinyin: "Nǐ hǎo! Nǐ jiào shénme míngzi?",
    vi: "Xin chào! Bạn tên là gì?",
    en: "Hello! What's your name?",
    level: "A0",
    topics: ["daily-life.greetings", "people.introductions"],
    items: ["zh.w.hello", "zh.w.you", "zh.w.call", "zh.w.what", "zh.w.name"],
    durationMs: 2300
  }),
  sentence({
    id: "zh.s.npc-nice-to-meet",
    text: "很高兴认识你！",
    pinyin: "Hěn gāoxìng rènshi nǐ!",
    vi: "Rất vui được làm quen với bạn!",
    en: "Nice to meet you!",
    level: "A0",
    topics: ["people.introductions"],
    items: ["zh.w.you"],
    durationMs: 1800
  })
];
