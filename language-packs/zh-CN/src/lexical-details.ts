import type { LexicalItem, LexicalSense, LocalizedText } from "../../../packages/content-schema/src/index.js";

const text = (vi: string, en: string): LocalizedText => ({ "vi-VN": vi, "en-US": en });

interface DetailSpec {
  glossVi: string;
  glossEn: string;
  definitionVi: string;
  definitionEn: string;
  usageVi?: string;
  usageEn?: string;
}

const details: Readonly<Record<string, DetailSpec>> = {
  "zh.w.hello": {
    glossVi: "xin chào",
    glossEn: "hello",
    definitionVi: "Lời chào phổ biến, trung tính, dùng khi gặp một người trong hầu hết tình huống thường ngày.",
    definitionEn: "A common neutral greeting used when meeting someone in most everyday situations.",
    usageVi: "你好 có thể dùng với bạn bè, người mới gặp và nhân viên dịch vụ. Với người lớn tuổi hoặc cần lịch sự hơn, dùng 您好.",
    usageEn: "你好 works with friends, new acquaintances and service staff. Use 您好 for greater politeness."
  },
  "zh.w.hello-polite": {
    glossVi: "xin chào (lịch sự)",
    glossEn: "hello (polite)",
    definitionVi: "Dạng chào lịch sự dùng đại từ 您, phù hợp khi nói với khách hàng, người lớn tuổi hoặc người cần thể hiện sự tôn trọng.",
    definitionEn: "A polite greeting using 您, suitable for customers, older people or respectful situations."
  },
  "zh.w.thanks": {
    glossVi: "cảm ơn",
    glossEn: "thank you",
    definitionVi: "Cách cảm ơn thông dụng nhất. Có thể đứng một mình hoặc thêm đối tượng như 谢谢你.",
    definitionEn: "The most common way to say thank you. It can stand alone or include the person, as in 谢谢你."
  },
  "zh.w.sorry": {
    glossVi: "xin lỗi",
    glossEn: "sorry",
    definitionVi: "Lời xin lỗi trực tiếp khi bạn đã làm điều gì gây bất tiện hoặc mắc lỗi.",
    definitionEn: "A direct apology used after causing inconvenience or making a mistake."
  },
  "zh.w.correct": {
    glossVi: "đúng; phải",
    glossEn: "correct; right",
    definitionVi: "Dùng để xác nhận một thông tin là đúng hoặc đồng ý ngắn gọn với điều vừa được nói.",
    definitionEn: "Used to confirm that information is correct or to give a short agreement."
  },
  "zh.w.not": {
    glossVi: "không",
    glossEn: "not; no",
    definitionVi: "Phó từ phủ định rất phổ biến, thường đứng trước động từ hoặc tính từ để tạo nghĩa phủ định.",
    definitionEn: "A very common negator placed before verbs or adjectives.",
    usageVi: "Trước âm tiết thanh 4, 不 thường biến điệu thành bú trong lời nói, ví dụ 不是 = bú shì.",
    usageEn: "Before a fourth-tone syllable, 不 commonly changes to second tone in speech, e.g. 不是 = bú shì."
  },
  "zh.w.i": {
    glossVi: "tôi; mình",
    glossEn: "I; me",
    definitionVi: "Đại từ ngôi thứ nhất số ít, dùng cho cả chủ ngữ và tân ngữ.",
    definitionEn: "First-person singular pronoun used as both subject and object."
  },
  "zh.w.you": {
    glossVi: "bạn; cậu; anh/chị",
    glossEn: "you",
    definitionVi: "Đại từ ngôi thứ hai thông dụng trong giao tiếp trung tính và thân mật.",
    definitionEn: "Common second-person pronoun for neutral and familiar conversation.",
    usageVi: "Khi cần lịch sự hơn, đặc biệt với khách hàng hoặc người lớn tuổi, dùng 您.",
    usageEn: "For greater politeness, especially with customers or older people, use 您."
  },
  "zh.w.call": {
    glossVi: "gọi là; tên là",
    glossEn: "be called; be named",
    definitionVi: "Trong giới thiệu bản thân, 叫 nối người với tên: 我叫小南 = Tôi tên là Tiểu Nam.",
    definitionEn: "In introductions, 叫 links a person to a name: 我叫小南 = My name is Xiao Nan."
  },
  "zh.w.name": {
    glossVi: "tên",
    glossEn: "name",
    definitionVi: "Danh từ chỉ tên của người hoặc vật. Trong câu hỏi thường gặp 你叫什么名字？.",
    definitionEn: "Noun for a person's or thing's name; commonly heard in 你叫什么名字？."
  },
  "zh.w.what": {
    glossVi: "gì; cái gì",
    glossEn: "what",
    definitionVi: "Đại từ nghi vấn hỏi về đồ vật, nội dung hoặc lựa chọn chưa biết.",
    definitionEn: "Interrogative pronoun asking about an unknown thing, content or choice."
  },
  "zh.w.one": {
    glossVi: "một",
    glossEn: "one",
    definitionVi: "Số đếm một. Khi đứng trước một số lượng từ, cách đọc trong lời nói có thể thay đổi theo thanh điệu âm tiết sau.",
    definitionEn: "The number one. Its spoken tone can change before certain following tones.",
    usageVi: "Trong 一杯, 一 thường được đọc yì vì 杯 mang thanh 1.",
    usageEn: "In 一杯, 一 is commonly pronounced yì because 杯 has first tone."
  },
  "zh.w.two": {
    glossVi: "hai (trước lượng từ)",
    glossEn: "two (before a measure word)",
    definitionVi: "Dạng số hai thường dùng trước lượng từ, ví dụ 两杯茶 = hai cốc trà.",
    definitionEn: "The form of 'two' commonly used before measure words, e.g. 两杯茶.",
    usageVi: "Khi đọc số, số điện thoại hoặc phép đếm thuần tuý thường gặp 二; trước lượng từ thường ưu tiên 两.",
    usageEn: "二 is common in counting and numbers; 两 is preferred before measure words."
  },
  "zh.w.cup": {
    glossVi: "cốc; ly; lượng từ cho đồ uống",
    glossEn: "cup; glass; measure word",
    definitionVi: "Danh từ chỉ cốc/ly và cũng là lượng từ rất thường dùng với trà, cà phê, nước và đồ uống khác.",
    definitionEn: "A cup/glass and a common measure word for tea, coffee, water and other drinks."
  },
  "zh.w.coffee": {
    glossVi: "cà phê",
    glossEn: "coffee",
    definitionVi: "Đồ uống cà phê. Trong giao tiếp gọi món thường kết hợp với 喝, 杯 và 要/想.",
    definitionEn: "Coffee as a drink; commonly combines with 喝, 杯 and 要/想 when ordering.",
    usageVi: "Một cốc cà phê thường nói 一杯咖啡.",
    usageEn: "A cup of coffee is commonly 一杯咖啡."
  },
  "zh.w.tea": {
    glossVi: "trà",
    glossEn: "tea",
    definitionVi: "Danh từ chung chỉ trà. Có thể kết hợp trực tiếp với 喝 hoặc với lượng từ 杯.",
    definitionEn: "General noun for tea; combines directly with 喝 or the measure word 杯."
  },
  "zh.w.water": {
    glossVi: "nước",
    glossEn: "water",
    definitionVi: "Nước uống hoặc nước nói chung. Trong nhà hàng, 一杯水 là một cốc nước.",
    definitionEn: "Water in general or drinking water; 一杯水 means a cup of water."
  },
  "zh.w.drink": {
    glossVi: "uống",
    glossEn: "drink",
    definitionVi: "Động từ dùng với đồ uống: 喝水, 喝茶, 喝咖啡.",
    definitionEn: "Verb used with beverages: 喝水, 喝茶, 喝咖啡."
  },
  "zh.w.eat": {
    glossVi: "ăn",
    glossEn: "eat",
    definitionVi: "Động từ ăn. 吃饭 có thể mang nghĩa ăn cơm hoặc rộng hơn là ăn một bữa.",
    definitionEn: "Verb 'eat'. 吃饭 can mean eat rice or more generally have a meal."
  },
  "zh.w.meal": {
    glossVi: "cơm; bữa ăn",
    glossEn: "rice; meal",
    definitionVi: "Trong 吃饭, 饭 thường mang nghĩa bữa ăn nói chung; ở ngữ cảnh khác có thể liên quan cơm đã nấu.",
    definitionEn: "In 吃饭, 饭 often means a meal generally; elsewhere it can relate to cooked rice."
  },
  "zh.w.want": {
    glossVi: "muốn; muốn làm",
    glossEn: "want to; would like to",
    definitionVi: "Động từ/modal thường đứng trước một hành động để nói mong muốn: 我想喝茶 = Tôi muốn uống trà.",
    definitionEn: "A verb/modal often placed before an action to express desire: 我想喝茶.",
    usageVi: "想 thường mềm hơn khi nói mong muốn; 要 có thể trực tiếp hơn và rất phổ biến khi gọi món.",
    usageEn: "想 often sounds softer for desires; 要 can be more direct and is very common when ordering."
  },
  "zh.w.request": {
    glossVi: "muốn; cần; lấy",
    glossEn: "want; need; order",
    definitionVi: "Từ đa dụng. Trong gọi món, 我要… là cách trực tiếp và tự nhiên để nói món bạn muốn lấy.",
    definitionEn: "A versatile word. In ordering, 我要… is a direct natural way to state what you want.",
    usageVi: "Ngoài nghĩa muốn/cần, 要 còn có nhiều cách dùng khác ở trình độ cao hơn; ở A1 ưu tiên ngữ cảnh gọi món.",
    usageEn: "要 has additional uses at higher levels; at A1, focus on wanting/needing and ordering."
  },
  "zh.c.drink-coffee": {
    glossVi: "uống cà phê",
    glossEn: "drink coffee",
    definitionVi: "Cụm động từ gồm 喝 + 咖啡, dùng trực tiếp trong câu nói về sở thích hoặc mong muốn.",
    definitionEn: "Verb-object collocation 喝 + 咖啡 used for habits, preferences and desires."
  },
  "zh.c.one-cup-coffee": {
    glossVi: "một cốc cà phê",
    glossEn: "a cup of coffee",
    definitionVi: "Cụm số lượng gồm 一 + 杯 + 咖啡, mẫu rất hữu ích khi gọi đồ uống.",
    definitionEn: "Quantity phrase 一 + 杯 + 咖啡, useful when ordering drinks."
  },
  "zh.c.drink-tea": {
    glossVi: "uống trà",
    glossEn: "drink tea",
    definitionVi: "Cụm động từ 喝 + 茶, dùng để nói hành động uống trà.",
    definitionEn: "Verb-object collocation 喝 + 茶 for drinking tea."
  },
  "zh.c.eat-meal": {
    glossVi: "ăn cơm; ăn một bữa",
    glossEn: "eat; have a meal",
    definitionVi: "Cụm rất thông dụng mang nghĩa ăn cơm hoặc đơn giản là ăn một bữa.",
    definitionEn: "Very common phrase meaning eat rice or simply have a meal."
  }
};

function senseFor(item: LexicalItem, spec: DetailSpec): LexicalSense {
  return {
    id: `${item.id}.sense.primary`,
    gloss: text(spec.glossVi, spec.glossEn),
    definition: text(spec.definitionVi, spec.definitionEn),
    usageNote: spec.usageVi && spec.usageEn ? text(spec.usageVi, spec.usageEn) : undefined,
    exampleSentenceIds: item.exampleSentenceIds
  };
}

/** Adds learner-facing dictionary detail without changing stable lexical ids. */
export function enrichCoreLexicalItem(item: LexicalItem): LexicalItem {
  const spec = details[item.id];
  if (!spec) return item;
  return {
    ...item,
    senses: [senseFor(item, spec)],
    usageNote: spec.usageVi && spec.usageEn ? text(spec.usageVi, spec.usageEn) : item.usageNote
  };
}
