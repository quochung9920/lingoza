import type {
  Activity,
  AudioAsset,
  Concept,
  Course,
  ExampleSentence,
  FrequencyBand,
  Lesson,
  LexicalItem,
  LocalizedText,
  LingozaLevel,
  PartOfSpeech,
  Register,
  Unit
} from "../../../packages/content-schema/src/index.js";
import { provenance } from "./provenance.js";

/**
 * Commercial-content expansion slice.
 *
 * This file intentionally uses compact authoring specs and deterministic
 * builders instead of hand-writing every schema field. It adds breadth without
 * weakening the same ContentBundle contracts used by the core seed. Content is
 * still VALIDATED, not PUBLISHED: native/linguistic/audio review remains a
 * separate production gate.
 */

function text(vi: string, en: string): LocalizedText {
  return { "vi-VN": vi, "en-US": en };
}

function audio(slug: string, durationMs = 1200): AudioAsset {
  return {
    available: false,
    normal: {
      src: `expansion/${slug}.mp3`,
      speed: "normal",
      speakerId: "zh-female-01",
      gender: "female",
      accent: "standard-mandarin",
      durationMs
    },
    slow: {
      src: `expansion/${slug}.slow.mp3`,
      speed: "slow",
      speakerId: "zh-female-01",
      gender: "female",
      accent: "standard-mandarin",
      durationMs: Math.round(durationMs * 1.45)
    }
  };
}

interface WordSpec {
  id: string;
  text: string;
  pinyin: string;
  vi: string;
  en: string;
  detailVi: string;
  detailEn: string;
  pos: PartOfSpeech;
  level: LingozaLevel;
  topics: string[];
  example: string;
  tones?: number[];
  classifier?: string;
  usageVi?: string;
  usageEn?: string;
  frequencyBand?: FrequencyBand;
  register?: Register;
}

function word(spec: WordSpec): LexicalItem {
  return {
    id: spec.id,
    language: "zh-CN",
    kind: spec.pos === "phrase" ? "phrase" : "word",
    text: spec.text,
    romanization: spec.pinyin,
    meaning: text(spec.vi, spec.en),
    senses: [
      {
        id: `${spec.id}.sense.primary`,
        gloss: text(spec.vi, spec.en),
        definition: text(spec.detailVi, spec.detailEn),
        usageNote:
          spec.usageVi && spec.usageEn ? text(spec.usageVi, spec.usageEn) : undefined,
        exampleSentenceIds: [spec.example]
      }
    ],
    usageNote: spec.usageVi && spec.usageEn ? text(spec.usageVi, spec.usageEn) : undefined,
    partOfSpeech: spec.pos,
    level: spec.level,
    targetDepth: "active",
    topics: spec.topics,
    register: spec.register ?? "neutral",
    frequencyBand: spec.frequencyBand ?? 1,
    synonyms: [],
    antonyms: [],
    collocations: [],
    exampleSentenceIds: [spec.example],
    audio: audio(`items/${spec.id}`, 900),
    languageData: {
      simplified: spec.text,
      traditional: spec.text,
      pinyin: spec.pinyin,
      tones: spec.tones ?? [],
      classifier: spec.classifier
    },
    provenance: provenance()
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
}

function sentence(spec: SentenceSpec): ExampleSentence {
  return {
    id: spec.id,
    language: "zh-CN",
    text: spec.text,
    romanization: spec.pinyin,
    translation: text(spec.vi, spec.en),
    level: spec.level,
    topics: spec.topics,
    register: "neutral",
    lexicalItemIds: spec.items,
    audio: audio(`sentences/${spec.id}`, 1700),
    languageData: { simplified: spec.text, traditional: spec.text, pinyin: spec.pinyin },
    provenance: provenance()
  };
}

/* ------------------------------------------------------------------ */
/* Lexicon: 60+ practical items                                        */
/* ------------------------------------------------------------------ */

const W = (id: string) => `zh.x.w.${id}`;
const S = (id: string) => `zh.x.s.${id}`;

const wordSpecs: WordSpec[] = [
  // Family
  { id: W("mother"), text: "妈妈", pinyin: "māma", vi: "mẹ", en: "mother", detailVi: "Cách gọi thông dụng, thân mật dành cho mẹ.", detailEn: "The common, familiar way to say mother.", pos: "noun", level: "A0", topics: ["people.family"], example: S("family-mother"), tones: [1, 5] },
  { id: W("father"), text: "爸爸", pinyin: "bàba", vi: "bố", en: "father", detailVi: "Cách gọi thông dụng, thân mật dành cho bố.", detailEn: "The common, familiar way to say father.", pos: "noun", level: "A0", topics: ["people.family"], example: S("family-mother"), tones: [4, 5] },
  { id: W("home"), text: "家", pinyin: "jiā", vi: "nhà; gia đình", en: "home; family", detailVi: "Có thể chỉ nơi ở hoặc gia đình như một đơn vị.", detailEn: "Can refer to one's home or family as a unit.", pos: "noun", level: "A0", topics: ["people.family", "daily-life.routine"], example: S("routine-home"), tones: [1] },
  { id: W("family"), text: "家人", pinyin: "jiārén", vi: "người nhà", en: "family members", detailVi: "Chỉ những người thuộc gia đình của mình.", detailEn: "Refers to the people in one's family.", pos: "noun", level: "A0", topics: ["people.family"], example: S("family-mother"), tones: [1, 2] },
  { id: W("this-is"), text: "这是", pinyin: "zhè shì", vi: "đây là", en: "this is", detailVi: "Cụm dùng để giới thiệu người hoặc vật ở gần người nói.", detailEn: "Used to introduce a person or thing near the speaker.", pos: "phrase", level: "A0", topics: ["people.family", "people.introductions"], example: S("family-mother"), tones: [4, 4] },

  // Time
  { id: W("today"), text: "今天", pinyin: "jīntiān", vi: "hôm nay", en: "today", detailVi: "Ngày hiện tại.", detailEn: "The current day.", pos: "noun", level: "A0", topics: ["daily-life.time"], example: S("time-now"), tones: [1, 1] },
  { id: W("tomorrow"), text: "明天", pinyin: "míngtiān", vi: "ngày mai", en: "tomorrow", detailVi: "Ngày ngay sau hôm nay.", detailEn: "The day after today.", pos: "noun", level: "A0", topics: ["daily-life.time", "work.meetings"], example: S("meeting-tomorrow"), tones: [2, 1] },
  { id: W("now"), text: "现在", pinyin: "xiànzài", vi: "bây giờ", en: "now", detailVi: "Thời điểm hiện tại; thường đứng trước động từ hoặc câu hỏi về thời gian.", detailEn: "The present moment; often appears before a verb or time question.", pos: "noun", level: "A0", topics: ["daily-life.time"], example: S("time-now"), tones: [4, 4] },
  { id: W("oclock"), text: "点", pinyin: "diǎn", vi: "giờ", en: "o'clock", detailVi: "Dùng sau số để nói giờ trên đồng hồ.", detailEn: "Used after a number to state the hour.", pos: "measure-word", level: "A0", topics: ["daily-life.time"], example: S("time-now"), tones: [3] },
  { id: W("how-many"), text: "几", pinyin: "jǐ", vi: "mấy", en: "how many", detailVi: "Từ hỏi số lượng nhỏ hoặc thời gian như 几点.", detailEn: "Asks about a small quantity or time, as in 几点.", pos: "pronoun", level: "A0", topics: ["daily-life.time", "daily-life.numbers"], example: S("time-now"), tones: [3] },
  { id: W("morning"), text: "上午", pinyin: "shàngwǔ", vi: "buổi sáng", en: "morning", detailVi: "Khoảng thời gian trước buổi trưa.", detailEn: "The period before noon.", pos: "noun", level: "A1", topics: ["daily-life.time", "work.meetings"], example: S("meeting-tomorrow"), tones: [4, 3] },
  { id: W("afternoon"), text: "下午", pinyin: "xiàwǔ", vi: "buổi chiều", en: "afternoon", detailVi: "Khoảng thời gian sau buổi trưa và trước buổi tối.", detailEn: "The period after noon and before evening.", pos: "noun", level: "A1", topics: ["daily-life.time", "work.meetings"], example: S("meeting-tomorrow"), tones: [4, 3] },

  // Shopping & price
  { id: W("this"), text: "这个", pinyin: "zhège", vi: "cái này", en: "this one", detailVi: "Dùng để chỉ một người hoặc vật ở gần; 个 là lượng từ phổ biến.", detailEn: "Points to a nearby person or thing; 个 is the common measure word.", pos: "pronoun", level: "A0", topics: ["shopping.prices", "shopping.buying"], example: S("price-this"), tones: [4, 5] },
  { id: W("how-much"), text: "多少钱", pinyin: "duōshao qián", vi: "bao nhiêu tiền", en: "how much", detailVi: "Câu hỏi giá thông dụng nhất khi mua hàng.", detailEn: "The most common expression for asking a price.", pos: "phrase", level: "A0", topics: ["shopping.prices"], example: S("price-this"), tones: [1, 5, 2] },
  { id: W("money"), text: "钱", pinyin: "qián", vi: "tiền", en: "money", detailVi: "Danh từ chung chỉ tiền hoặc tiền bạc.", detailEn: "General noun for money.", pos: "noun", level: "A0", topics: ["shopping.prices"], example: S("price-this"), tones: [2] },
  { id: W("expensive"), text: "贵", pinyin: "guì", vi: "đắt", en: "expensive", detailVi: "Tính từ mô tả giá cao.", detailEn: "Adjective describing a high price.", pos: "adjective", level: "A1", topics: ["shopping.prices"], example: S("shopping-buy"), tones: [4] },
  { id: W("cheap"), text: "便宜", pinyin: "piányi", vi: "rẻ", en: "cheap", detailVi: "Tính từ mô tả giá thấp hoặc món hời.", detailEn: "Adjective describing a low price or good value.", pos: "adjective", level: "A1", topics: ["shopping.prices"], example: S("shopping-buy"), tones: [2, 5] },
  { id: W("buy"), text: "买", pinyin: "mǎi", vi: "mua", en: "buy", detailVi: "Động từ dùng khi mua hàng hoặc dịch vụ.", detailEn: "Verb used for purchasing goods or services.", pos: "verb", level: "A1", topics: ["shopping.buying"], example: S("shopping-buy"), tones: [3] },
  { id: W("sell"), text: "卖", pinyin: "mài", vi: "bán", en: "sell", detailVi: "Động từ chỉ hành động bán hàng; khác thanh điệu với 买.", detailEn: "Verb meaning sell; contrasts in tone with 买.", pos: "verb", level: "A1", topics: ["shopping.buying"], example: S("shopping-buy"), tones: [4] },
  { id: W("try"), text: "试", pinyin: "shì", vi: "thử", en: "try", detailVi: "Dùng khi thử quần áo, sản phẩm hoặc thử làm một việc.", detailEn: "Used for trying on products or attempting an action.", pos: "verb", level: "A1", topics: ["shopping.buying"], example: S("shopping-buy"), tones: [4] },

  // Directions & transport
  { id: W("where"), text: "哪里", pinyin: "nǎli", vi: "ở đâu", en: "where", detailVi: "Đại từ nghi vấn dùng để hỏi địa điểm.", detailEn: "Interrogative pronoun used to ask about location.", pos: "pronoun", level: "A0", topics: ["travel.directions", "services.toilet"], example: S("directions-metro"), tones: [3, 5] },
  { id: W("where-is"), text: "在哪里", pinyin: "zài nǎli", vi: "ở đâu", en: "where is", detailVi: "Mẫu hỏi vị trí trực tiếp: X 在哪里？ = X ở đâu?", detailEn: "Direct location pattern: X 在哪里? = Where is X?", pos: "phrase", level: "A0", topics: ["travel.directions", "services.toilet"], example: S("directions-metro"), tones: [4, 3, 5] },
  { id: W("at"), text: "在", pinyin: "zài", vi: "ở; tại", en: "at; be located", detailVi: "Động từ/giới từ vị trí; dùng để nói ai hoặc vật đang ở đâu.", detailEn: "Location verb/preposition used to say where someone or something is.", pos: "preposition", level: "A0", topics: ["travel.directions", "work.office"], example: S("office-work"), tones: [4] },
  { id: W("metro-station"), text: "地铁站", pinyin: "dìtiě zhàn", vi: "ga tàu điện ngầm", en: "metro station", detailVi: "Địa điểm lên và xuống tàu điện ngầm.", detailEn: "A station for boarding and leaving the metro.", pos: "noun", level: "A0", topics: ["travel.directions", "travel.transport"], example: S("directions-metro"), tones: [4, 3, 4] },
  { id: W("left"), text: "左边", pinyin: "zuǒbian", vi: "bên trái", en: "left side", detailVi: "Chỉ phía bên trái của một vị trí hoặc vật.", detailEn: "The left side of a place or object.", pos: "noun", level: "A1", topics: ["travel.directions"], example: S("directions-metro"), tones: [3, 5] },
  { id: W("right"), text: "右边", pinyin: "yòubian", vi: "bên phải", en: "right side", detailVi: "Chỉ phía bên phải của một vị trí hoặc vật.", detailEn: "The right side of a place or object.", pos: "noun", level: "A1", topics: ["travel.directions"], example: S("directions-metro"), tones: [4, 5] },
  { id: W("metro"), text: "地铁", pinyin: "dìtiě", vi: "tàu điện ngầm", en: "metro", detailVi: "Hệ thống tàu điện đô thị chạy chủ yếu dưới lòng đất.", detailEn: "Urban rail system that commonly runs underground.", pos: "noun", level: "A1", topics: ["travel.transport"], example: S("transport-airport"), tones: [4, 3] },
  { id: W("taxi"), text: "出租车", pinyin: "chūzūchē", vi: "taxi", en: "taxi", detailVi: "Xe taxi; từ rất thông dụng trong giao tiếp du lịch.", detailEn: "Taxi; very common in travel situations.", pos: "noun", level: "A1", topics: ["travel.transport"], example: S("transport-airport"), tones: [1, 1, 1] },
  { id: W("bus"), text: "公交车", pinyin: "gōngjiāochē", vi: "xe buýt", en: "bus", detailVi: "Phương tiện giao thông công cộng bằng đường bộ.", detailEn: "Public road transport vehicle.", pos: "noun", level: "A1", topics: ["travel.transport"], example: S("transport-airport"), tones: [1, 1, 1] },
  { id: W("take-ride"), text: "坐", pinyin: "zuò", vi: "đi bằng; ngồi", en: "take; sit", detailVi: "Trong giao thông, dùng trước phương tiện: 坐地铁, 坐出租车.", detailEn: "For transport, used before a vehicle: 坐地铁, 坐出租车.", pos: "verb", level: "A1", topics: ["travel.transport"], example: S("transport-airport"), tones: [4] },
  { id: W("go"), text: "去", pinyin: "qù", vi: "đi", en: "go", detailVi: "Động từ chỉ di chuyển đến một nơi khác.", detailEn: "Verb for moving to another place.", pos: "verb", level: "A1", topics: ["travel.transport", "health.basic"], example: S("transport-airport"), tones: [4] },
  { id: W("airport"), text: "机场", pinyin: "jīchǎng", vi: "sân bay", en: "airport", detailVi: "Nơi máy bay cất cánh, hạ cánh và hành khách làm thủ tục.", detailEn: "Place where flights depart/arrive and passengers check in.", pos: "noun", level: "A1", topics: ["travel.transport", "travel.airport"], example: S("transport-airport"), tones: [1, 3] },

  // Restaurant
  { id: W("dish"), text: "菜", pinyin: "cài", vi: "món ăn; rau", en: "dish; vegetable", detailVi: "Trong nhà hàng thường chỉ một món ăn; trong một số ngữ cảnh có thể chỉ rau.", detailEn: "In restaurants commonly means a dish; in some contexts it can mean vegetables.", pos: "noun", level: "A1", topics: ["food.restaurant.ordering"], example: S("food-noodles"), tones: [4] },
  { id: W("rice"), text: "米饭", pinyin: "mǐfàn", vi: "cơm", en: "cooked rice", detailVi: "Cơm đã nấu chín, dùng trong bữa ăn.", detailEn: "Cooked rice served as food.", pos: "noun", level: "A1", topics: ["food.restaurant.ordering"], example: S("food-noodles"), tones: [3, 4] },
  { id: W("noodles"), text: "面条", pinyin: "miàntiáo", vi: "mì sợi", en: "noodles", detailVi: "Tên chung cho các món mì sợi.", detailEn: "General noun for noodles.", pos: "noun", level: "A1", topics: ["food.restaurant.ordering"], example: S("food-noodles"), tones: [4, 2] },
  { id: W("bowl"), text: "碗", pinyin: "wǎn", vi: "bát; tô", en: "bowl", detailVi: "Vừa là danh từ 'bát/tô' vừa có thể làm lượng từ cho món đựng trong bát.", detailEn: "A bowl and also a measure word for food served in bowls.", pos: "measure-word", level: "A1", topics: ["food.restaurant.ordering"], example: S("food-noodles"), tones: [3] },
  { id: W("chicken"), text: "鸡肉", pinyin: "jīròu", vi: "thịt gà", en: "chicken meat", detailVi: "Thịt gà dùng như nguyên liệu hoặc món ăn.", detailEn: "Chicken meat as an ingredient or dish.", pos: "noun", level: "A1", topics: ["food.restaurant.ordering"], example: S("food-noodles"), tones: [1, 4] },
  { id: W("beef"), text: "牛肉", pinyin: "niúròu", vi: "thịt bò", en: "beef", detailVi: "Thịt bò dùng như nguyên liệu hoặc món ăn.", detailEn: "Beef as an ingredient or dish.", pos: "noun", level: "A1", topics: ["food.restaurant.ordering"], example: S("food-noodles"), tones: [2, 4] },
  { id: W("spicy"), text: "辣", pinyin: "là", vi: "cay", en: "spicy", detailVi: "Tính từ mô tả vị cay.", detailEn: "Adjective describing spicy heat.", pos: "adjective", level: "A1", topics: ["food.restaurant.preferences"], example: S("preference-not-spicy"), tones: [4] },
  { id: W("not-spicy"), text: "不辣", pinyin: "bú là", vi: "không cay", en: "not spicy", detailVi: "Yêu cầu mức cay bằng không; rất hữu ích khi gọi món.", detailEn: "Requests no spicy heat; useful when ordering food.", pos: "phrase", level: "A1", topics: ["food.restaurant.preferences"], example: S("preference-not-spicy"), tones: [2, 4] },
  { id: W("do-not-want"), text: "不要", pinyin: "bú yào", vi: "không muốn; đừng", en: "do not want; don't", detailVi: "Có thể từ chối một món hoặc yêu cầu không thêm thành phần nào đó.", detailEn: "Can refuse an item or request that an ingredient not be added.", pos: "phrase", level: "A1", topics: ["food.restaurant.preferences"], example: S("preference-not-spicy"), tones: [2, 4] },
  { id: W("less"), text: "少", pinyin: "shǎo", vi: "ít; bớt", en: "less; few", detailVi: "Dùng để yêu cầu lượng ít hơn, ví dụ 少糖 = ít đường.", detailEn: "Used to request less of something, e.g. 少糖 = less sugar.", pos: "adjective", level: "A1", topics: ["food.restaurant.preferences"], example: S("preference-not-spicy"), tones: [3] },

  // Daily routine & work
  { id: W("early-morning"), text: "早上", pinyin: "zǎoshang", vi: "buổi sáng", en: "morning", detailVi: "Cách nói thông dụng về buổi sáng trong sinh hoạt hằng ngày.", detailEn: "Common everyday expression for morning.", pos: "noun", level: "A1", topics: ["daily-life.routine"], example: S("routine-home"), tones: [3, 5] },
  { id: W("evening"), text: "晚上", pinyin: "wǎnshang", vi: "buổi tối", en: "evening", detailVi: "Khoảng thời gian buổi tối và đầu đêm.", detailEn: "The evening and early night period.", pos: "noun", level: "A1", topics: ["daily-life.routine"], example: S("routine-home"), tones: [3, 5] },
  { id: W("work"), text: "工作", pinyin: "gōngzuò", vi: "làm việc; công việc", en: "work", detailVi: "Có thể là động từ 'làm việc' hoặc danh từ 'công việc'.", detailEn: "Can be the verb 'work' or the noun 'work/job'.", pos: "verb", level: "A1", topics: ["daily-life.routine", "work.office"], example: S("office-work"), tones: [1, 4] },
  { id: W("study"), text: "学习", pinyin: "xuéxí", vi: "học", en: "study; learn", detailVi: "Động từ chỉ quá trình học hoặc nghiên cứu một kỹ năng/kiến thức.", detailEn: "Verb for studying or learning a skill or body of knowledge.", pos: "verb", level: "A1", topics: ["daily-life.routine", "education"], example: S("routine-home"), tones: [2, 2] },
  { id: W("return-home"), text: "回家", pinyin: "huí jiā", vi: "về nhà", en: "go home", detailVi: "Cụm động từ rất thường dùng để nói quay về nhà.", detailEn: "Very common phrase for returning home.", pos: "phrase", level: "A1", topics: ["daily-life.routine"], example: S("routine-home"), tones: [2, 1] },
  { id: W("company"), text: "公司", pinyin: "gōngsī", vi: "công ty", en: "company", detailVi: "Tổ chức kinh doanh hoặc nơi làm việc của một người.", detailEn: "A business organization or someone's workplace.", pos: "noun", level: "A1", topics: ["work.office"], example: S("office-work"), tones: [1, 1] },
  { id: W("colleague"), text: "同事", pinyin: "tóngshì", vi: "đồng nghiệp", en: "colleague", detailVi: "Người làm việc cùng công ty hoặc cùng tổ chức.", detailEn: "A person working in the same company or organization.", pos: "noun", level: "A1", topics: ["work.office"], example: S("office-work"), tones: [2, 4] },
  { id: W("manager"), text: "经理", pinyin: "jīnglǐ", vi: "quản lý", en: "manager", detailVi: "Người phụ trách quản lý một nhóm, bộ phận hoặc hoạt động kinh doanh.", detailEn: "Person responsible for managing a team, department or business activity.", pos: "noun", level: "A1", topics: ["work.office"], example: S("office-work"), tones: [1, 3] },
  { id: W("office"), text: "办公室", pinyin: "bàngōngshì", vi: "văn phòng", en: "office", detailVi: "Phòng hoặc khu vực dùng để làm việc hành chính/chuyên môn.", detailEn: "Room or area used for office work.", pos: "noun", level: "A1", topics: ["work.office"], example: S("office-work"), tones: [4, 1, 4] },
  { id: W("meeting"), text: "开会", pinyin: "kāihuì", vi: "họp", en: "have a meeting", detailVi: "Cụm động từ thông dụng để nói tham gia hoặc tiến hành cuộc họp.", detailEn: "Common verb phrase for holding or attending a meeting.", pos: "phrase", level: "A1", topics: ["work.meetings"], example: S("meeting-tomorrow"), tones: [1, 4] },
  { id: W("meeting-noun"), text: "会议", pinyin: "huìyì", vi: "cuộc họp", en: "meeting; conference", detailVi: "Danh từ chỉ cuộc họp hoặc hội nghị.", detailEn: "Noun for a meeting or conference.", pos: "noun", level: "A1", topics: ["work.meetings"], example: S("meeting-tomorrow"), tones: [4, 4] },

  // Health & help
  { id: W("hospital"), text: "医院", pinyin: "yīyuàn", vi: "bệnh viện", en: "hospital", detailVi: "Cơ sở y tế để khám và điều trị bệnh.", detailEn: "Medical facility for examination and treatment.", pos: "noun", level: "A1", topics: ["health.basic"], example: S("health-unwell"), tones: [1, 4] },
  { id: W("doctor"), text: "医生", pinyin: "yīshēng", vi: "bác sĩ", en: "doctor", detailVi: "Người hành nghề y khám và điều trị bệnh.", detailEn: "Medical professional who examines and treats patients.", pos: "noun", level: "A1", topics: ["health.basic"], example: S("health-unwell"), tones: [1, 1] },
  { id: W("unwell"), text: "不舒服", pinyin: "bù shūfu", vi: "không khoẻ; khó chịu", en: "feel unwell", detailVi: "Cách nói chung khi cơ thể không khoẻ nhưng chưa cần nêu triệu chứng cụ thể.", detailEn: "General way to say you feel unwell without naming a specific symptom.", pos: "phrase", level: "A1", topics: ["health.basic"], example: S("health-unwell"), tones: [4, 1, 5] },
  { id: W("headache"), text: "头疼", pinyin: "tóuténg", vi: "đau đầu", en: "have a headache", detailVi: "Cụm thông dụng để mô tả triệu chứng đau đầu.", detailEn: "Common phrase describing a headache.", pos: "phrase", level: "A1", topics: ["health.basic"], example: S("health-unwell"), tones: [2, 2] },
  { id: W("medicine"), text: "药", pinyin: "yào", vi: "thuốc", en: "medicine", detailVi: "Danh từ chung chỉ thuốc dùng để điều trị bệnh.", detailEn: "General noun for medicine used to treat illness.", pos: "noun", level: "A1", topics: ["health.pharmacy"], example: S("health-unwell"), tones: [4] },
  { id: W("excuse-me"), text: "请问", pinyin: "qǐngwèn", vi: "xin hỏi", en: "excuse me; may I ask", detailVi: "Cách mở đầu lịch sự trước khi hỏi thông tin người lạ hoặc nhân viên.", detailEn: "Polite opener before asking a stranger or staff member a question.", pos: "phrase", level: "A1", topics: ["services.help", "services.toilet"], example: S("toilet-where"), tones: [3, 4] },
  { id: W("restroom"), text: "洗手间", pinyin: "xǐshǒujiān", vi: "nhà vệ sinh", en: "restroom", detailVi: "Cách nói lịch sự và phổ biến cho nhà vệ sinh.", detailEn: "Common polite term for a restroom.", pos: "noun", level: "A1", topics: ["services.toilet"], example: S("toilet-where"), tones: [3, 3, 1] },
  { id: W("toilet"), text: "厕所", pinyin: "cèsuǒ", vi: "nhà vệ sinh", en: "toilet", detailVi: "Từ trực tiếp hơn để chỉ nhà vệ sinh.", detailEn: "A more direct word for toilet/restroom.", pos: "noun", level: "A1", topics: ["services.toilet"], example: S("toilet-where"), tones: [4, 3] },
  { id: W("can"), text: "可以", pinyin: "kěyǐ", vi: "có thể; được", en: "can; may", detailVi: "Dùng để hỏi/cho phép hoặc nói một việc có thể thực hiện được.", detailEn: "Used for permission or to say something is possible.", pos: "verb", level: "A1", topics: ["services.help", "food.restaurant.preferences"], example: S("help-me"), tones: [3, 3] },
  { id: W("help"), text: "帮", pinyin: "bāng", vi: "giúp", en: "help", detailVi: "Động từ dùng khi giúp ai làm một việc.", detailEn: "Verb used for helping someone do something.", pos: "verb", level: "A1", topics: ["services.help"], example: S("help-me"), tones: [1] },
  { id: W("trouble-you"), text: "麻烦", pinyin: "máfan", vi: "phiền; làm phiền", en: "trouble; inconvenience", detailVi: "Có thể dùng lịch sự khi nhờ ai làm điều gì: 麻烦你…", detailEn: "Can politely preface a request: 麻烦你…", pos: "verb", level: "A1", topics: ["services.help"], example: S("help-me"), tones: [2, 5] },

  // Airport & hotel
  { id: W("gate"), text: "登机口", pinyin: "dēngjīkǒu", vi: "cửa ra máy bay", en: "boarding gate", detailVi: "Cổng tại sân bay nơi hành khách lên máy bay.", detailEn: "Airport gate where passengers board a flight.", pos: "noun", level: "A1", topics: ["travel.airport"], example: S("airport-gate"), tones: [1, 1, 3] },
  { id: W("airplane"), text: "飞机", pinyin: "fēijī", vi: "máy bay", en: "airplane", detailVi: "Phương tiện hàng không chở người hoặc hàng hoá.", detailEn: "Aircraft used to carry passengers or cargo.", pos: "noun", level: "A1", topics: ["travel.airport"], example: S("airport-gate"), tones: [1, 1] },
  { id: W("luggage"), text: "行李", pinyin: "xíngli", vi: "hành lý", en: "luggage", detailVi: "Túi, vali và đồ đạc mang theo khi đi xa.", detailEn: "Bags and belongings carried while travelling.", pos: "noun", level: "A1", topics: ["travel.airport", "travel.hotel"], example: S("airport-gate"), tones: [2, 5] },
  { id: W("depart"), text: "出发", pinyin: "chūfā", vi: "khởi hành", en: "depart", detailVi: "Động từ chỉ bắt đầu một chuyến đi.", detailEn: "Verb for starting a journey.", pos: "verb", level: "A1", topics: ["travel.airport"], example: S("airport-gate"), tones: [1, 1] },
  { id: W("arrive"), text: "到达", pinyin: "dàodá", vi: "đến nơi", en: "arrive", detailVi: "Động từ chỉ đến đích hoặc địa điểm đã định.", detailEn: "Verb for arriving at a destination.", pos: "verb", level: "A1", topics: ["travel.airport"], example: S("airport-gate"), tones: [4, 2] },
  { id: W("hotel"), text: "酒店", pinyin: "jiǔdiàn", vi: "khách sạn", en: "hotel", detailVi: "Cơ sở lưu trú dành cho khách du lịch hoặc công tác.", detailEn: "Accommodation for travellers or business guests.", pos: "noun", level: "A1", topics: ["travel.hotel"], example: S("hotel-room"), tones: [3, 4] },
  { id: W("room"), text: "房间", pinyin: "fángjiān", vi: "phòng", en: "room", detailVi: "Không gian riêng trong nhà, khách sạn hoặc toà nhà.", detailEn: "A room in a home, hotel or building.", pos: "noun", level: "A1", topics: ["travel.hotel"], example: S("hotel-room"), tones: [2, 1] },
  { id: W("reserve"), text: "预订", pinyin: "yùdìng", vi: "đặt trước", en: "reserve; book", detailVi: "Động từ dùng khi đặt trước phòng, vé hoặc dịch vụ.", detailEn: "Verb for booking a room, ticket or service in advance.", pos: "verb", level: "A1", topics: ["travel.hotel"], example: S("hotel-room"), tones: [4, 4] },
  { id: W("passport"), text: "护照", pinyin: "hùzhào", vi: "hộ chiếu", en: "passport", detailVi: "Giấy tờ nhận dạng quốc tế dùng khi xuất nhập cảnh.", detailEn: "International identity document used for border travel.", pos: "noun", level: "A1", topics: ["travel.hotel", "travel.airport"], example: S("hotel-room"), tones: [4, 4] },
  { id: W("one-night"), text: "一晚", pinyin: "yì wǎn", vi: "một đêm", en: "one night", detailVi: "Cụm dùng khi nói thời lượng lưu trú một đêm.", detailEn: "Phrase for a one-night stay.", pos: "phrase", level: "A1", topics: ["travel.hotel"], example: S("hotel-room"), tones: [4, 3] }
];

export const expansionLexicalItems: LexicalItem[] = wordSpecs.map(word);

/* ------------------------------------------------------------------ */
/* Sentences                                                           */
/* ------------------------------------------------------------------ */

const sentenceSpecs: SentenceSpec[] = [
  { id: S("family-mother"), text: "这是我妈妈。", pinyin: "Zhè shì wǒ māma.", vi: "Đây là mẹ tôi.", en: "This is my mother.", level: "A0", topics: ["people.family"], items: [W("this-is"), "zh.w.i", W("mother")] },
  { id: S("time-now"), text: "现在几点？", pinyin: "Xiànzài jǐ diǎn?", vi: "Bây giờ là mấy giờ?", en: "What time is it now?", level: "A0", topics: ["daily-life.time"], items: [W("now"), W("how-many"), W("oclock")] },
  { id: S("price-this"), text: "这个多少钱？", pinyin: "Zhège duōshao qián?", vi: "Cái này bao nhiêu tiền?", en: "How much is this?", level: "A0", topics: ["shopping.prices"], items: [W("this"), W("how-much"), W("money")] },
  { id: S("directions-metro"), text: "地铁站在哪里？", pinyin: "Dìtiě zhàn zài nǎli?", vi: "Ga tàu điện ngầm ở đâu?", en: "Where is the metro station?", level: "A0", topics: ["travel.directions"], items: [W("metro-station"), W("at"), W("where")] },
  { id: S("transport-airport"), text: "我坐地铁去机场。", pinyin: "Wǒ zuò dìtiě qù jīchǎng.", vi: "Tôi đi tàu điện ngầm đến sân bay.", en: "I take the metro to the airport.", level: "A1", topics: ["travel.transport"], items: ["zh.w.i", W("take-ride"), W("metro"), W("go"), W("airport")] },
  { id: S("food-noodles"), text: "我要一碗面条。", pinyin: "Wǒ yào yì wǎn miàntiáo.", vi: "Tôi muốn một bát mì.", en: "I'd like a bowl of noodles.", level: "A1", topics: ["food.restaurant.ordering"], items: ["zh.w.i", "zh.w.request", W("bowl"), W("noodles")] },
  { id: S("preference-not-spicy"), text: "我不要辣的。", pinyin: "Wǒ bú yào là de.", vi: "Tôi không muốn món cay.", en: "I don't want anything spicy.", level: "A1", topics: ["food.restaurant.preferences"], items: ["zh.w.i", W("do-not-want"), W("spicy")] },
  { id: S("routine-home"), text: "我晚上回家。", pinyin: "Wǒ wǎnshang huí jiā.", vi: "Buổi tối tôi về nhà.", en: "I go home in the evening.", level: "A1", topics: ["daily-life.routine"], items: ["zh.w.i", W("evening"), W("return-home")] },
  { id: S("office-work"), text: "我在公司工作。", pinyin: "Wǒ zài gōngsī gōngzuò.", vi: "Tôi làm việc ở công ty.", en: "I work at a company.", level: "A1", topics: ["work.office"], items: ["zh.w.i", W("at"), W("company"), W("work")] },
  { id: S("meeting-tomorrow"), text: "明天下午开会。", pinyin: "Míngtiān xiàwǔ kāihuì.", vi: "Chiều mai có cuộc họp.", en: "There's a meeting tomorrow afternoon.", level: "A1", topics: ["work.meetings", "daily-life.time"], items: [W("tomorrow"), W("afternoon"), W("meeting")] },
  { id: S("health-unwell"), text: "我不舒服，想去医院。", pinyin: "Wǒ bù shūfu, xiǎng qù yīyuàn.", vi: "Tôi không khoẻ, muốn đi bệnh viện.", en: "I feel unwell and want to go to the hospital.", level: "A1", topics: ["health.basic"], items: ["zh.w.i", W("unwell"), "zh.w.want", W("go"), W("hospital")] },
  { id: S("toilet-where"), text: "请问，洗手间在哪里？", pinyin: "Qǐngwèn, xǐshǒujiān zài nǎli?", vi: "Xin hỏi, nhà vệ sinh ở đâu?", en: "Excuse me, where is the restroom?", level: "A1", topics: ["services.toilet", "services.help"], items: [W("excuse-me"), W("restroom"), W("where-is")] },
  { id: S("help-me"), text: "可以帮我吗？", pinyin: "Kěyǐ bāng wǒ ma?", vi: "Bạn có thể giúp tôi không?", en: "Can you help me?", level: "A1", topics: ["services.help"], items: [W("can"), W("help"), "zh.w.i"] },
  { id: S("airport-gate"), text: "登机口在哪里？", pinyin: "Dēngjīkǒu zài nǎli?", vi: "Cửa ra máy bay ở đâu?", en: "Where is the boarding gate?", level: "A1", topics: ["travel.airport"], items: [W("gate"), W("where-is")] },
  { id: S("hotel-room"), text: "我预订了一个房间。", pinyin: "Wǒ yùdìng le yí ge fángjiān.", vi: "Tôi đã đặt một phòng.", en: "I booked a room.", level: "A1", topics: ["travel.hotel"], items: ["zh.w.i", W("reserve"), W("room")] },
  { id: S("shopping-buy"), text: "我想买这个。", pinyin: "Wǒ xiǎng mǎi zhège.", vi: "Tôi muốn mua cái này.", en: "I want to buy this.", level: "A1", topics: ["shopping.buying"], items: ["zh.w.i", "zh.w.want", W("buy"), W("this")] }
];

export const expansionSentences: ExampleSentence[] = sentenceSpecs.map(sentence);

/* ------------------------------------------------------------------ */
/* Concepts                                                            */
/* ------------------------------------------------------------------ */

interface ConceptSpec {
  id: string;
  titleVi: string;
  titleEn: string;
  canDoVi: string;
  canDoEn: string;
  level: LingozaLevel;
  sublevel: string;
  topics: string[];
  items: string[];
}

const conceptSpecs: ConceptSpec[] = [
  { id: "family.basic", titleVi: "Gia đình gần gũi", titleEn: "Close family", canDoVi: "Tôi có thể giới thiệu người thân gần gũi.", canDoEn: "I can introduce close family members.", level: "A0", sublevel: "A0.2", topics: ["people.family"], items: [W("mother"), W("father"), W("family"), W("this-is")] },
  { id: "time.clock", titleVi: "Hỏi giờ", titleEn: "Asking the time", canDoVi: "Tôi có thể hỏi bây giờ là mấy giờ.", canDoEn: "I can ask what time it is.", level: "A0", sublevel: "A0.2", topics: ["daily-life.time"], items: [W("now"), W("how-many"), W("oclock"), W("today")] },
  { id: "shopping.price", titleVi: "Hỏi giá", titleEn: "Asking the price", canDoVi: "Tôi có thể hỏi giá một món đồ.", canDoEn: "I can ask how much an item costs.", level: "A0", sublevel: "A0.2", topics: ["shopping.prices"], items: [W("this"), W("how-much"), W("money"), W("expensive"), W("cheap")] },
  { id: "directions.where", titleVi: "Hỏi một nơi ở đâu", titleEn: "Asking where a place is", canDoVi: "Tôi có thể hỏi một địa điểm ở đâu.", canDoEn: "I can ask where a place is.", level: "A0", sublevel: "A0.2", topics: ["travel.directions"], items: [W("where"), W("where-is"), W("metro-station"), W("left"), W("right")] },
  { id: "transport.city", titleVi: "Đi lại trong thành phố", titleEn: "Getting around the city", canDoVi: "Tôi có thể nói mình đi bằng phương tiện gì.", canDoEn: "I can say which transport I take.", level: "A1", sublevel: "A1.1", topics: ["travel.transport"], items: [W("metro"), W("taxi"), W("bus"), W("take-ride"), W("go"), W("airport")] },
  { id: "restaurant.food", titleVi: "Món ăn cơ bản", titleEn: "Basic restaurant food", canDoVi: "Tôi có thể gọi một món ăn đơn giản.", canDoEn: "I can order a simple dish.", level: "A1", sublevel: "A1.1", topics: ["food.restaurant.ordering"], items: [W("dish"), W("rice"), W("noodles"), W("bowl"), W("chicken"), W("beef")] },
  { id: "restaurant.preference", titleVi: "Nói khẩu vị", titleEn: "Food preferences", canDoVi: "Tôi có thể yêu cầu món không cay hoặc ít hơn một thành phần.", canDoEn: "I can ask for non-spicy food or less of an ingredient.", level: "A1", sublevel: "A1.2", topics: ["food.restaurant.preferences"], items: [W("spicy"), W("not-spicy"), W("do-not-want"), W("less"), W("can")] },
  { id: "routine.home", titleVi: "Sinh hoạt hằng ngày", titleEn: "Daily routine", canDoVi: "Tôi có thể nói một việc mình làm trong ngày.", canDoEn: "I can say something I do during the day.", level: "A1", sublevel: "A1.1", topics: ["daily-life.routine"], items: [W("early-morning"), W("evening"), W("work"), W("study"), W("return-home")] },
  { id: "work.office", titleVi: "Ở văn phòng", titleEn: "At the office", canDoVi: "Tôi có thể nói nơi mình làm việc và gọi tên người trong văn phòng.", canDoEn: "I can say where I work and name people in the office.", level: "A1", sublevel: "A1.1", topics: ["work.office"], items: [W("company"), W("colleague"), W("manager"), W("office"), W("work")] },
  { id: "work.meeting", titleVi: "Hẹn giờ họp", titleEn: "Meeting time", canDoVi: "Tôi có thể hiểu một thông báo họp đơn giản.", canDoEn: "I can understand a simple meeting-time announcement.", level: "A1", sublevel: "A1.2", topics: ["work.meetings", "daily-life.time"], items: [W("meeting"), W("meeting-noun"), W("tomorrow"), W("morning"), W("afternoon")] },
  { id: "health.unwell", titleVi: "Nói mình không khoẻ", titleEn: "Saying you feel unwell", canDoVi: "Tôi có thể nói mình không khoẻ và muốn đi bệnh viện.", canDoEn: "I can say I feel unwell and want to go to a hospital.", level: "A1", sublevel: "A1.2", topics: ["health.basic"], items: [W("hospital"), W("doctor"), W("unwell"), W("headache"), W("medicine")] },
  { id: "services.restroom", titleVi: "Tìm nhà vệ sinh", titleEn: "Finding a restroom", canDoVi: "Tôi có thể lịch sự hỏi nhà vệ sinh ở đâu.", canDoEn: "I can politely ask where the restroom is.", level: "A1", sublevel: "A1.1", topics: ["services.toilet", "services.help"], items: [W("excuse-me"), W("restroom"), W("toilet"), W("where-is")] },
  { id: "services.help", titleVi: "Nhờ giúp đỡ", titleEn: "Asking for help", canDoVi: "Tôi có thể nhờ người khác giúp mình.", canDoEn: "I can ask someone to help me.", level: "A1", sublevel: "A1.2", topics: ["services.help"], items: [W("can"), W("help"), W("trouble-you")] },
  { id: "airport.gate", titleVi: "Ở sân bay", titleEn: "At the airport", canDoVi: "Tôi có thể hỏi cửa ra máy bay ở đâu.", canDoEn: "I can ask where my boarding gate is.", level: "A1", sublevel: "A1.2", topics: ["travel.airport"], items: [W("gate"), W("airplane"), W("luggage"), W("depart"), W("arrive")] },
  { id: "hotel.room", titleVi: "Nhận phòng khách sạn", titleEn: "Hotel check-in basics", canDoVi: "Tôi có thể nói mình đã đặt phòng.", canDoEn: "I can say I have booked a room.", level: "A1", sublevel: "A1.2", topics: ["travel.hotel"], items: [W("hotel"), W("room"), W("reserve"), W("passport"), W("one-night")] },
  { id: "shopping.buy", titleVi: "Chọn và mua hàng", titleEn: "Choosing and buying", canDoVi: "Tôi có thể nói mình muốn mua một món đồ.", canDoEn: "I can say I want to buy an item.", level: "A1", sublevel: "A1.2", topics: ["shopping.buying"], items: [W("buy"), W("sell"), W("try"), W("this"), W("cheap"), W("expensive")] }
];

export const expansionConcepts: Concept[] = conceptSpecs.map((spec) => ({
  id: spec.id,
  language: "zh-CN",
  title: text(spec.titleVi, spec.titleEn),
  canDo: text(spec.canDoVi, spec.canDoEn),
  level: spec.level,
  sublevel: spec.sublevel,
  topics: spec.topics,
  skills: ["listeningRecognition", "meaningRecognition", "speaking", "pronunciation"],
  requires: [],
  unlocks: [],
  relatedConcepts: [],
  lexicalItemIds: spec.items,
  patternIds: [],
  masteryThresholds: { listeningRecognition: 0.7, meaningRecognition: 0.7, speaking: 0.65 },
  provenance: provenance()
}));

/* ------------------------------------------------------------------ */
/* Lessons                                                             */
/* ------------------------------------------------------------------ */

interface LessonSpec {
  id: string;
  unitId: string;
  conceptId: string;
  titleVi: string;
  titleEn: string;
  canDoVi: string;
  canDoEn: string;
  contextVi: string;
  contextEn: string;
  sentenceId: string;
  itemIds: string[];
  level: LingozaLevel;
  sublevel: string;
  topics: string[];
  meaningVi: string;
  meaningEn: string;
  decoysVi: [string, string];
  decoysEn: [string, string];
  pronunciation?: boolean;
}

function lesson(spec: LessonSpec): Lesson {
  const activities: Activity[] = [
    {
      id: `${spec.id}.listen`,
      kind: "LISTEN_UNDERSTAND",
      instruction: text("Nghe và chọn nghĩa đúng.", "Listen and choose the correct meaning."),
      conceptIds: [spec.conceptId],
      sentenceId: spec.sentenceId,
      choices: [
        text(spec.meaningVi, spec.meaningEn),
        text(spec.decoysVi[0], spec.decoysEn[0]),
        text(spec.decoysVi[1], spec.decoysEn[1])
      ],
      correctChoiceIndex: 0
    },
    {
      id: `${spec.id}.repeat`,
      kind: "LISTEN_REPEAT",
      instruction: text("Nghe rồi nói lại cả câu.", "Listen, then repeat the whole sentence."),
      conceptIds: [spec.conceptId],
      targetId: spec.sentenceId,
      targetType: "sentence",
      slowFirst: spec.level === "A0"
    },
    ...(spec.pronunciation
      ? [
          {
            id: `${spec.id}.tone`,
            kind: "PRONUNCIATION_DRILL" as const,
            instruction: text("Nghe kỹ thanh điệu rồi nói lại từng từ.", "Listen to the tones and repeat each word."),
            conceptIds: [spec.conceptId],
            targetIds: spec.itemIds,
            targetType: "lexicalItem" as const,
            focus: "tone" as const
          }
        ]
      : []),
    {
      id: `${spec.id}.review`,
      kind: "VOCABULARY_REVIEW",
      instruction: text("Ôn nhanh các từ vừa gặp.", "Quickly review the words you just met."),
      conceptIds: [spec.conceptId],
      itemIds: spec.itemIds
    }
  ];

  return {
    id: spec.id,
    unitId: spec.unitId,
    title: text(spec.titleVi, spec.titleEn),
    canDo: text(spec.canDoVi, spec.canDoEn),
    level: spec.level,
    sublevel: spec.sublevel,
    topics: spec.topics,
    conceptIds: [spec.conceptId],
    estimatedMinutes: spec.pronunciation ? 8 : 6,
    context: text(spec.contextVi, spec.contextEn),
    activities,
    provenance: provenance()
  };
}

const lessonSpecs: LessonSpec[] = [
  // Core A0 extension
  { id: "zh.lesson.a0.family", unitId: "zh.unit.a0.life-basics", conceptId: "family.basic", titleVi: "Đây là mẹ tôi", titleEn: "This is my mother", canDoVi: "Tôi có thể giới thiệu một người thân.", canDoEn: "I can introduce a family member.", contextVi: "Bạn đang cho một người bạn xem ảnh gia đình.", contextEn: "You are showing a friend a family photo.", sentenceId: S("family-mother"), itemIds: [W("mother"), W("father"), W("family"), W("this-is")], level: "A0", sublevel: "A0.2", topics: ["people.family"], meaningVi: "Đây là mẹ tôi.", meaningEn: "This is my mother.", decoysVi: ["Đây là bạn tôi.", "Tôi muốn về nhà."], decoysEn: ["This is my friend.", "I want to go home."] },
  { id: "zh.lesson.a0.time", unitId: "zh.unit.a0.life-basics", conceptId: "time.clock", titleVi: "Bây giờ mấy giờ?", titleEn: "What time is it?", canDoVi: "Tôi có thể hỏi giờ hiện tại.", canDoEn: "I can ask the current time.", contextVi: "Bạn cần biết giờ để không trễ hẹn.", contextEn: "You need the time so you are not late.", sentenceId: S("time-now"), itemIds: [W("now"), W("how-many"), W("oclock"), W("today")], level: "A0", sublevel: "A0.2", topics: ["daily-life.time"], meaningVi: "Bây giờ là mấy giờ?", meaningEn: "What time is it now?", decoysVi: ["Hôm nay là ngày nào?", "Bạn đi đâu?"], decoysEn: ["What day is today?", "Where are you going?"] },

  // Core A1 extension
  { id: "zh.lesson.a1.food", unitId: "zh.unit.a1.everyday", conceptId: "restaurant.food", titleVi: "Một bát mì", titleEn: "A bowl of noodles", canDoVi: "Tôi có thể gọi một món ăn đơn giản.", canDoEn: "I can order a simple dish.", contextVi: "Bạn đang chọn món tại một quán ăn.", contextEn: "You are choosing food at a restaurant.", sentenceId: S("food-noodles"), itemIds: [W("dish"), W("rice"), W("noodles"), W("bowl")], level: "A1", sublevel: "A1.1", topics: ["food.restaurant.ordering"], meaningVi: "Tôi muốn một bát mì.", meaningEn: "I'd like a bowl of noodles.", decoysVi: ["Tôi muốn một cốc trà.", "Tôi không ăn mì."], decoysEn: ["I'd like a cup of tea.", "I don't eat noodles."] },
  { id: "zh.lesson.a1.routine", unitId: "zh.unit.a1.everyday", conceptId: "routine.home", titleVi: "Buổi tối về nhà", titleEn: "Going home in the evening", canDoVi: "Tôi có thể nói một hoạt động trong ngày.", canDoEn: "I can describe one daily activity.", contextVi: "Bạn kể ngắn về lịch sinh hoạt của mình.", contextEn: "You briefly describe your routine.", sentenceId: S("routine-home"), itemIds: [W("early-morning"), W("evening"), W("work"), W("study"), W("return-home")], level: "A1", sublevel: "A1.1", topics: ["daily-life.routine"], meaningVi: "Buổi tối tôi về nhà.", meaningEn: "I go home in the evening.", decoysVi: ["Buổi sáng tôi đi làm.", "Ngày mai tôi đi sân bay."], decoysEn: ["I go to work in the morning.", "I go to the airport tomorrow."] },

  // Travel Chinese
  { id: "zh.lesson.travel.transport", unitId: "zh.unit.travel.city", conceptId: "transport.city", titleVi: "Đi tàu điện đến sân bay", titleEn: "Taking the metro to the airport", canDoVi: "Tôi có thể nói phương tiện và điểm đến.", canDoEn: "I can state my transport and destination.", contextVi: "Bạn nói cách mình sẽ đến sân bay.", contextEn: "You say how you will get to the airport.", sentenceId: S("transport-airport"), itemIds: [W("metro"), W("taxi"), W("bus"), W("take-ride"), W("go"), W("airport")], level: "A1", sublevel: "A1.1", topics: ["travel.transport"], meaningVi: "Tôi đi tàu điện ngầm đến sân bay.", meaningEn: "I take the metro to the airport.", decoysVi: ["Tôi đi taxi về nhà.", "Sân bay ở bên phải."], decoysEn: ["I take a taxi home.", "The airport is on the right."] },
  { id: "zh.lesson.travel.directions", unitId: "zh.unit.travel.city", conceptId: "directions.where", titleVi: "Ga tàu ở đâu?", titleEn: "Where is the metro station?", canDoVi: "Tôi có thể hỏi vị trí một nhà ga.", canDoEn: "I can ask where a station is.", contextVi: "Bạn đang ở một khu phố lạ và cần tìm ga tàu.", contextEn: "You are in an unfamiliar area and need the metro.", sentenceId: S("directions-metro"), itemIds: [W("where"), W("where-is"), W("metro-station"), W("left"), W("right")], level: "A1", sublevel: "A1.1", topics: ["travel.directions"], meaningVi: "Ga tàu điện ngầm ở đâu?", meaningEn: "Where is the metro station?", decoysVi: ["Sân bay ở đâu?", "Nhà vệ sinh ở bên trái."], decoysEn: ["Where is the airport?", "The restroom is on the left."] },
  { id: "zh.lesson.travel.airport", unitId: "zh.unit.travel.trip", conceptId: "airport.gate", titleVi: "Tìm cửa ra máy bay", titleEn: "Finding the boarding gate", canDoVi: "Tôi có thể hỏi cửa ra máy bay ở đâu.", canDoEn: "I can ask where the boarding gate is.", contextVi: "Bạn đã qua an ninh nhưng chưa tìm thấy cổng lên máy bay.", contextEn: "You passed security but cannot find your gate.", sentenceId: S("airport-gate"), itemIds: [W("gate"), W("airplane"), W("luggage"), W("depart"), W("arrive")], level: "A1", sublevel: "A1.2", topics: ["travel.airport"], meaningVi: "Cửa ra máy bay ở đâu?", meaningEn: "Where is the boarding gate?", decoysVi: ["Hành lý của tôi ở đâu?", "Máy bay khởi hành lúc mấy giờ?"], decoysEn: ["Where is my luggage?", "What time does the plane depart?"] },
  { id: "zh.lesson.travel.hotel", unitId: "zh.unit.travel.trip", conceptId: "hotel.room", titleVi: "Tôi đã đặt phòng", titleEn: "I booked a room", canDoVi: "Tôi có thể nói mình đã đặt phòng.", canDoEn: "I can say I booked a room.", contextVi: "Bạn đang làm thủ tục nhận phòng tại khách sạn.", contextEn: "You are checking in at a hotel.", sentenceId: S("hotel-room"), itemIds: [W("hotel"), W("room"), W("reserve"), W("passport"), W("one-night")], level: "A1", sublevel: "A1.2", topics: ["travel.hotel"], meaningVi: "Tôi đã đặt một phòng.", meaningEn: "I booked a room.", decoysVi: ["Tôi cần hộ chiếu.", "Tôi ở một đêm."], decoysEn: ["I need a passport.", "I am staying one night."] },

  // Restaurant Chinese
  { id: "zh.lesson.restaurant.food", unitId: "zh.unit.restaurant.practical", conceptId: "restaurant.food", titleVi: "Gọi món chính", titleEn: "Ordering a main dish", canDoVi: "Tôi có thể gọi mì, cơm hoặc món thịt.", canDoEn: "I can order noodles, rice or a meat dish.", contextVi: "Bạn đã có đồ uống và đang gọi món ăn.", contextEn: "You already have a drink and are ordering food.", sentenceId: S("food-noodles"), itemIds: [W("rice"), W("noodles"), W("chicken"), W("beef"), W("bowl")], level: "A1", sublevel: "A1.1", topics: ["food.restaurant.ordering"], meaningVi: "Tôi muốn một bát mì.", meaningEn: "I'd like a bowl of noodles.", decoysVi: ["Tôi muốn một cốc nước.", "Tôi không muốn ăn."], decoysEn: ["I'd like a cup of water.", "I don't want to eat."] },
  { id: "zh.lesson.restaurant.preference", unitId: "zh.unit.restaurant.practical", conceptId: "restaurant.preference", titleVi: "Không cay", titleEn: "Not spicy", canDoVi: "Tôi có thể yêu cầu món không cay.", canDoEn: "I can ask for non-spicy food.", contextVi: "Bạn muốn điều chỉnh món ăn cho hợp khẩu vị.", contextEn: "You want the dish adjusted to your taste.", sentenceId: S("preference-not-spicy"), itemIds: [W("spicy"), W("not-spicy"), W("do-not-want"), W("less"), W("can")], level: "A1", sublevel: "A1.2", topics: ["food.restaurant.preferences"], meaningVi: "Tôi không muốn món cay.", meaningEn: "I don't want anything spicy.", decoysVi: ["Tôi muốn món rất cay.", "Tôi muốn thêm một bát mì."], decoysEn: ["I want it very spicy.", "I want another bowl of noodles."] },

  // Shopping Chinese
  { id: "zh.lesson.shopping.price", unitId: "zh.unit.shopping.market", conceptId: "shopping.price", titleVi: "Cái này bao nhiêu tiền?", titleEn: "How much is this?", canDoVi: "Tôi có thể hỏi giá.", canDoEn: "I can ask the price.", contextVi: "Bạn thấy một món đồ mình thích ở cửa hàng.", contextEn: "You see something you like in a shop.", sentenceId: S("price-this"), itemIds: [W("this"), W("how-much"), W("money"), W("expensive"), W("cheap")], level: "A1", sublevel: "A1.1", topics: ["shopping.prices"], meaningVi: "Cái này bao nhiêu tiền?", meaningEn: "How much is this?", decoysVi: ["Cái này ở đâu?", "Cái này có cay không?"], decoysEn: ["Where is this?", "Is this spicy?"] },
  { id: "zh.lesson.shopping.buy", unitId: "zh.unit.shopping.market", conceptId: "shopping.buy", titleVi: "Tôi muốn mua cái này", titleEn: "I want to buy this", canDoVi: "Tôi có thể nói mình muốn mua món đồ nào.", canDoEn: "I can say which item I want to buy.", contextVi: "Bạn đã hỏi giá và quyết định mua.", contextEn: "You asked the price and decided to buy.", sentenceId: S("shopping-buy"), itemIds: [W("buy"), W("sell"), W("try"), W("this"), W("cheap"), W("expensive")], level: "A1", sublevel: "A1.2", topics: ["shopping.buying"], meaningVi: "Tôi muốn mua cái này.", meaningEn: "I want to buy this.", decoysVi: ["Tôi muốn bán cái này.", "Tôi muốn thử món này."], decoysEn: ["I want to sell this.", "I want to try this."] },

  // Workplace Chinese
  { id: "zh.lesson.workplace.office", unitId: "zh.unit.workplace.office", conceptId: "work.office", titleVi: "Tôi làm việc ở công ty", titleEn: "I work at a company", canDoVi: "Tôi có thể nói nơi mình làm việc.", canDoEn: "I can say where I work.", contextVi: "Bạn đang tự giới thiệu với một đồng nghiệp mới.", contextEn: "You are introducing yourself to a new colleague.", sentenceId: S("office-work"), itemIds: [W("company"), W("colleague"), W("manager"), W("office"), W("work")], level: "A1", sublevel: "A1.1", topics: ["work.office"], meaningVi: "Tôi làm việc ở công ty.", meaningEn: "I work at a company.", decoysVi: ["Tôi học ở trường.", "Tôi về nhà buổi tối."], decoysEn: ["I study at school.", "I go home in the evening."] },
  { id: "zh.lesson.workplace.meeting", unitId: "zh.unit.workplace.office", conceptId: "work.meeting", titleVi: "Họp chiều mai", titleEn: "Meeting tomorrow afternoon", canDoVi: "Tôi có thể hiểu thời gian một cuộc họp đơn giản.", canDoEn: "I can understand a simple meeting time.", contextVi: "Đồng nghiệp vừa báo thời gian cuộc họp kế tiếp.", contextEn: "A colleague tells you the next meeting time.", sentenceId: S("meeting-tomorrow"), itemIds: [W("meeting"), W("meeting-noun"), W("tomorrow"), W("morning"), W("afternoon")], level: "A1", sublevel: "A1.2", topics: ["work.meetings", "daily-life.time"], meaningVi: "Chiều mai có cuộc họp.", meaningEn: "There's a meeting tomorrow afternoon.", decoysVi: ["Sáng nay có cuộc họp.", "Chiều mai tôi về nhà."], decoysEn: ["There's a meeting this morning.", "I go home tomorrow afternoon."] },

  // Survival Chinese
  { id: "zh.lesson.survival.health", unitId: "zh.unit.survival.essentials", conceptId: "health.unwell", titleVi: "Tôi không khoẻ", titleEn: "I feel unwell", canDoVi: "Tôi có thể nói mình không khoẻ và cần bệnh viện.", canDoEn: "I can say I feel unwell and need a hospital.", contextVi: "Bạn đang không khoẻ khi ở một nơi xa lạ.", contextEn: "You feel unwell while away from home.", sentenceId: S("health-unwell"), itemIds: [W("hospital"), W("doctor"), W("unwell"), W("headache"), W("medicine")], level: "A1", sublevel: "A1.2", topics: ["health.basic"], meaningVi: "Tôi không khoẻ, muốn đi bệnh viện.", meaningEn: "I feel unwell and want to go to the hospital.", decoysVi: ["Tôi muốn đi khách sạn.", "Tôi đang làm việc ở bệnh viện."], decoysEn: ["I want to go to the hotel.", "I work at the hospital."] },
  { id: "zh.lesson.survival.toilet", unitId: "zh.unit.survival.essentials", conceptId: "services.restroom", titleVi: "Nhà vệ sinh ở đâu?", titleEn: "Where is the restroom?", canDoVi: "Tôi có thể lịch sự hỏi nhà vệ sinh ở đâu.", canDoEn: "I can politely ask where the restroom is.", contextVi: "Bạn đang ở trung tâm thương mại và cần hỏi nhân viên.", contextEn: "You are at a shopping centre and need to ask staff.", sentenceId: S("toilet-where"), itemIds: [W("excuse-me"), W("restroom"), W("toilet"), W("where-is")], level: "A1", sublevel: "A1.1", topics: ["services.toilet", "services.help"], meaningVi: "Xin hỏi, nhà vệ sinh ở đâu?", meaningEn: "Excuse me, where is the restroom?", decoysVi: ["Xin hỏi, sân bay ở đâu?", "Nhà vệ sinh ở bên phải."], decoysEn: ["Excuse me, where is the airport?", "The restroom is on the right."] },
  { id: "zh.lesson.survival.help", unitId: "zh.unit.survival.essentials", conceptId: "services.help", titleVi: "Bạn có thể giúp tôi không?", titleEn: "Can you help me?", canDoVi: "Tôi có thể nhờ giúp đỡ lịch sự.", canDoEn: "I can politely ask for help.", contextVi: "Bạn gặp một tình huống mình không tự xử lý được.", contextEn: "You face a situation you cannot handle alone.", sentenceId: S("help-me"), itemIds: [W("can"), W("help"), W("trouble-you")], level: "A1", sublevel: "A1.2", topics: ["services.help"], meaningVi: "Bạn có thể giúp tôi không?", meaningEn: "Can you help me?", decoysVi: ["Bạn có thể mua cái này không?", "Bạn làm việc ở đâu?"], decoysEn: ["Can you buy this?", "Where do you work?"] },

  // Daily conversation track (shared mastery, fresh practice contexts)
  { id: "zh.lesson.daily.family", unitId: "zh.unit.daily.conversation", conceptId: "family.basic", titleVi: "Nói về gia đình", titleEn: "Talking about family", canDoVi: "Tôi có thể giới thiệu mẹ hoặc bố.", canDoEn: "I can introduce my mother or father.", contextVi: "Một người mới quen hỏi về ảnh gia đình của bạn.", contextEn: "A new acquaintance asks about your family photo.", sentenceId: S("family-mother"), itemIds: [W("mother"), W("father"), W("family"), W("this-is")], level: "A0", sublevel: "A0.2", topics: ["people.family"], meaningVi: "Đây là mẹ tôi.", meaningEn: "This is my mother.", decoysVi: ["Đây là bố tôi.", "Đây là công ty tôi."], decoysEn: ["This is my father.", "This is my company."] },
  { id: "zh.lesson.daily.routine", unitId: "zh.unit.daily.conversation", conceptId: "routine.home", titleVi: "Kể lịch hằng ngày", titleEn: "Talking about your routine", canDoVi: "Tôi có thể nói mình làm gì vào buổi tối.", canDoEn: "I can say what I do in the evening.", contextVi: "Bạn trò chuyện ngắn về một ngày bình thường.", contextEn: "You chat briefly about a normal day.", sentenceId: S("routine-home"), itemIds: [W("early-morning"), W("evening"), W("work"), W("study"), W("return-home")], level: "A1", sublevel: "A1.1", topics: ["daily-life.routine"], meaningVi: "Buổi tối tôi về nhà.", meaningEn: "I go home in the evening.", decoysVi: ["Buổi tối tôi đi họp.", "Buổi sáng tôi đi sân bay."], decoysEn: ["I have a meeting in the evening.", "I go to the airport in the morning."] },
  { id: "zh.lesson.daily.help", unitId: "zh.unit.daily.conversation", conceptId: "services.help", titleVi: "Nhờ người khác một việc", titleEn: "Asking someone for help", canDoVi: "Tôi có thể mở lời nhờ giúp đỡ.", canDoEn: "I can start a request for help.", contextVi: "Bạn cần một người gần đó giúp mình.", contextEn: "You need someone nearby to help you.", sentenceId: S("help-me"), itemIds: [W("can"), W("help"), W("trouble-you")], level: "A1", sublevel: "A1.2", topics: ["services.help"], meaningVi: "Bạn có thể giúp tôi không?", meaningEn: "Can you help me?", decoysVi: ["Bạn có thể đi không?", "Bạn muốn uống gì?"], decoysEn: ["Can you go?", "What would you like to drink?"] },

  // Pronunciation booster reuses mastered concepts instead of cloning mastery
  { id: "zh.lesson.pronunciation.greeting", unitId: "zh.unit.pronunciation.core", conceptId: "greeting.basic", titleVi: "Thanh điệu trong lời chào", titleEn: "Tones in greetings", canDoVi: "Tôi có thể lặp lại lời chào với hướng thanh điệu rõ hơn.", canDoEn: "I can repeat greetings with clearer tone movement.", contextVi: "Tập trung vào đường cao độ thay vì học thêm nghĩa mới.", contextEn: "Focus on pitch movement instead of learning new meanings.", sentenceId: "zh.s.hello-and-thanks", itemIds: ["zh.w.hello", "zh.w.thanks", "zh.w.sorry"], level: "A0", sublevel: "A0.1", topics: ["daily-life.greetings"], meaningVi: "Xin chào, cảm ơn bạn!", meaningEn: "Hello, thank you!", decoysVi: ["Xin lỗi.", "Tạm biệt."], decoysEn: ["Sorry.", "Goodbye."], pronunciation: true },
  { id: "zh.lesson.pronunciation.drinks", unitId: "zh.unit.pronunciation.core", conceptId: "beverage.basic", titleVi: "Thanh điệu của đồ uống", titleEn: "Drink-word tones", canDoVi: "Tôi có thể phân biệt và nói rõ thanh điệu của từ đồ uống.", canDoEn: "I can distinguish and produce the tones in drink words.", contextVi: "Nghe và bắt chước cao độ của các từ rất quen thuộc.", contextEn: "Listen to and imitate the pitch of familiar drink words.", sentenceId: "zh.s.want-coffee", itemIds: ["zh.w.coffee", "zh.w.tea", "zh.w.water"], level: "A1", sublevel: "A1.1", topics: ["food.drinks"], meaningVi: "Tôi muốn uống cà phê.", meaningEn: "I want to drink coffee.", decoysVi: ["Tôi muốn uống trà.", "Tôi muốn uống nước."], decoysEn: ["I want to drink tea.", "I want to drink water."], pronunciation: true }
];

export const expansionLessons: Lesson[] = lessonSpecs.map(lesson);

/* ------------------------------------------------------------------ */
/* Units & courses                                                     */
/* ------------------------------------------------------------------ */

function unit(
  id: string,
  courseId: string,
  vi: string,
  en: string,
  icon: string,
  topics: string[],
  lessonIds: string[],
  conceptIds: string[],
  objectives: Array<[string, string]>
): Unit {
  return {
    id,
    courseId,
    title: text(vi, en),
    canDoObjectives: objectives.map(([viText, enText]) => text(viText, enText)),
    topics,
    lessonIds,
    conceptIds,
    icon,
    provenance: provenance()
  };
}

export const expansionUnits: Unit[] = [
  unit("zh.unit.a0.life-basics", "zh.course.a0", "Gia đình & thời gian", "Family & time", "🏠", ["people.family", "daily-life.time"], ["zh.lesson.a0.family", "zh.lesson.a0.time"], ["family.basic", "time.clock"], [["Giới thiệu người thân.", "Introduce a family member."], ["Hỏi giờ hiện tại.", "Ask the current time."]]),
  unit("zh.unit.a1.everyday", "zh.course.a1", "Ăn uống & sinh hoạt", "Food & routine", "🌤️", ["food.restaurant.ordering", "daily-life.routine"], ["zh.lesson.a1.food", "zh.lesson.a1.routine"], ["restaurant.food", "routine.home"], [["Gọi một món ăn đơn giản.", "Order a simple dish."], ["Nói một hoạt động hằng ngày.", "Describe a daily activity."]]),

  unit("zh.unit.travel.city", "zh.course.track.travel", "Đi lại trong thành phố", "Getting around", "🚌", ["travel.transport", "travel.directions"], ["zh.lesson.travel.transport", "zh.lesson.travel.directions"], ["transport.city", "directions.where"], [["Nói phương tiện mình dùng.", "Say which transport you use."], ["Hỏi một địa điểm ở đâu.", "Ask where a place is."]]),
  unit("zh.unit.travel.trip", "zh.course.track.travel", "Sân bay & khách sạn", "Airport & hotel", "✈️", ["travel.airport", "travel.hotel"], ["zh.lesson.travel.airport", "zh.lesson.travel.hotel"], ["airport.gate", "hotel.room"], [["Tìm cửa ra máy bay.", "Find a boarding gate."], ["Nói mình đã đặt phòng.", "Say you booked a room."]]),

  unit("zh.unit.restaurant.practical", "zh.course.track.restaurant", "Ăn tại nhà hàng", "Eating at a restaurant", "🍜", ["food.restaurant.ordering", "food.restaurant.preferences"], ["zh.lesson.restaurant.food", "zh.lesson.restaurant.preference"], ["restaurant.food", "restaurant.preference"], [["Gọi món ăn.", "Order food."], ["Điều chỉnh độ cay.", "Adjust spiciness."]]),
  unit("zh.unit.shopping.market", "zh.course.track.shopping", "Mua sắm thực tế", "Practical shopping", "🛍️", ["shopping.prices", "shopping.buying"], ["zh.lesson.shopping.price", "zh.lesson.shopping.buy"], ["shopping.price", "shopping.buy"], [["Hỏi giá.", "Ask the price."], ["Nói món mình muốn mua.", "Say what you want to buy."]]),
  unit("zh.unit.workplace.office", "zh.course.track.workplace", "Văn phòng & cuộc họp", "Office & meetings", "💼", ["work.office", "work.meetings"], ["zh.lesson.workplace.office", "zh.lesson.workplace.meeting"], ["work.office", "work.meeting"], [["Nói nơi mình làm việc.", "Say where you work."], ["Hiểu thời gian họp.", "Understand a meeting time."]]),
  unit("zh.unit.survival.essentials", "zh.course.track.survival", "Tình huống thiết yếu", "Essential situations", "🆘", ["health.basic", "services.toilet", "services.help"], ["zh.lesson.survival.health", "zh.lesson.survival.toilet", "zh.lesson.survival.help"], ["health.unwell", "services.restroom", "services.help"], [["Nói mình không khoẻ.", "Say you feel unwell."], ["Tìm nhà vệ sinh.", "Find a restroom."], ["Nhờ giúp đỡ.", "Ask for help."]]),
  unit("zh.unit.daily.conversation", "zh.course.track.daily", "Hội thoại hằng ngày", "Daily conversation", "🗣️", ["people.family", "daily-life.routine", "services.help"], ["zh.lesson.daily.family", "zh.lesson.daily.routine", "zh.lesson.daily.help"], ["family.basic", "routine.home", "services.help"], [["Nói về gia đình.", "Talk about family."], ["Nói về sinh hoạt.", "Talk about your routine."], ["Nhờ người khác một việc.", "Ask someone for help."]]),
  unit("zh.unit.pronunciation.core", "zh.course.track.pronunciation", "Thanh điệu nền tảng", "Core tones", "🎵", ["daily-life.greetings", "food.drinks"], ["zh.lesson.pronunciation.greeting", "zh.lesson.pronunciation.drinks"], ["greeting.basic", "beverage.basic"], [["Luyện hướng thanh điệu bằng từ đã biết.", "Practise tone movement using known words."], ["Nói lại từ quen với cao độ rõ hơn.", "Repeat familiar words with clearer pitch."]])
];

export const expansionCourses: Course[] = [
  {
    id: "zh.course.track.travel",
    language: "zh-CN",
    level: "A1",
    title: text("✈️ Tiếng Trung du lịch", "✈️ Travel Chinese"),
    description: text("Đi lại, hỏi đường, sân bay và khách sạn — ưu tiên câu có thể dùng ngay.", "Transport, directions, airport and hotel language you can use immediately."),
    unitIds: ["zh.unit.travel.city", "zh.unit.travel.trip"],
    provenance: provenance()
  },
  {
    id: "zh.course.track.restaurant",
    language: "zh-CN",
    level: "A1",
    title: text("🍜 Tiếng Trung nhà hàng", "🍜 Restaurant Chinese"),
    description: text("Gọi món, đồ ăn và điều chỉnh khẩu vị trong tình huống thật.", "Order food and adjust preferences in real restaurant situations."),
    unitIds: ["zh.unit.restaurant.practical"],
    provenance: provenance()
  },
  {
    id: "zh.course.track.shopping",
    language: "zh-CN",
    level: "A1",
    title: text("🛍️ Tiếng Trung mua sắm", "🛍️ Shopping Chinese"),
    description: text("Hỏi giá, đánh giá đắt/rẻ và nói món bạn muốn mua.", "Ask prices, judge value and say what you want to buy."),
    unitIds: ["zh.unit.shopping.market"],
    provenance: provenance()
  },
  {
    id: "zh.course.track.workplace",
    language: "zh-CN",
    level: "A1",
    title: text("💼 Tiếng Trung công sở", "💼 Workplace Chinese"),
    description: text("Từ vựng văn phòng, đồng nghiệp và thời gian cuộc họp.", "Office vocabulary, colleagues and simple meeting times."),
    unitIds: ["zh.unit.workplace.office"],
    provenance: provenance()
  },
  {
    id: "zh.course.track.survival",
    language: "zh-CN",
    level: "A1",
    title: text("🆘 Tiếng Trung sinh tồn", "🆘 Survival Chinese"),
    description: text("Sức khoẻ, nhà vệ sinh và nhờ giúp đỡ khi bạn cần xử lý nhanh.", "Health, restrooms and asking for help when you need to act quickly."),
    unitIds: ["zh.unit.survival.essentials"],
    provenance: provenance()
  },
  {
    id: "zh.course.track.daily",
    language: "zh-CN",
    level: "A1",
    title: text("🗣️ Hội thoại hằng ngày", "🗣️ Daily Conversation"),
    description: text("Luyện lại kiến thức đã học trong những ngữ cảnh giao tiếp ngắn và gần gũi.", "Reuse learned knowledge in short, familiar conversation contexts."),
    unitIds: ["zh.unit.daily.conversation"],
    provenance: provenance()
  },
  {
    id: "zh.course.track.pronunciation",
    language: "zh-CN",
    level: "A1",
    title: text("🎵 Mandarin Pronunciation Booster", "🎵 Mandarin Pronunciation Booster"),
    description: text("Luyện thanh điệu bằng những từ đã biết để tập trung vào âm thanh thay vì ghi nhớ nghĩa mới.", "Practise tones with familiar words so attention stays on sound rather than new meanings."),
    unitIds: ["zh.unit.pronunciation.core"],
    provenance: provenance()
  }
];

/** Unit ids appended to the two linear foundation courses. */
export const coreCourseUnitExtensions: Readonly<Record<string, readonly string[]>> = {
  "zh.course.a0": ["zh.unit.a0.life-basics"],
  "zh.course.a1": ["zh.unit.a1.everyday"]
};
