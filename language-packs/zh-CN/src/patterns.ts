import type { LocalizedText, PatternSlot, SyntaxPattern } from "../../../packages/content-schema/src/index.js";
import { provenance } from "./provenance.js";

/**
 * Sentence patterns for the A0/A1 seed.
 *
 * Slots are authored against lexical item ids rather than raw strings, so a
 * word's surface form exists in exactly one place and `compilePatternToFrame`
 * resolves the two. Templates are ordered most-specific first, since the
 * matcher stops at the first template that matches.
 *
 * `explanation` is short on purpose. Patterns are meant to be learned by
 * hearing four or five instantiations and then producing one; the written note
 * is a reminder afterwards, not the lesson.
 */

function text(vi: string, en: string): LocalizedText {
  return { "vi-VN": vi, "en-US": en };
}

function slot(
  name: string,
  label: LocalizedText,
  hint: LocalizedText,
  acceptedItemIds: string[],
  acceptedSurfaces: string[] = [],
  optional = false
): PatternSlot {
  return { name, label, hint, acceptedItemIds, acceptedSurfaces, optional };
}

export const patterns: SyntaxPattern[] = [
  {
    id: "zh.p.name-introduction",
    language: "zh-CN",
    intent: "introduction.state-name",
    name: text("Giới thiệu tên", "Stating your name"),
    skeleton: "我 + 叫 + tên",
    templates: ["{subject}叫{name}"],
    slots: [
      slot(
        "subject",
        text("Chủ ngữ", "Subject"),
        text("Bắt đầu bằng 我 (tôi).", "Start with 我 (I)."),
        ["zh.w.i", "zh.w.you"]
      ),
      slot(
        "name",
        text("Tên", "Name"),
        text("Thêm tên của bạn sau 叫.", "Add your name after 叫."),
        [],
        ["小南", "兰兰", "小明", "阿英"]
      )
    ],
    level: "A0",
    topics: ["people.introductions"],
    register: "neutral",
    prerequisiteItemIds: ["zh.w.i", "zh.w.call"],
    exampleSentenceIds: ["zh.s.my-name", "zh.s.my-name-lan"],
    explanation: text(
      "叫 nghĩa là “tên là”. Nói 我叫 rồi thêm tên — không cần từ nào khác ở giữa.",
      "叫 means \"to be called\". Say 我叫 and then your name; nothing goes in between."
    ),
    usageNote: text(
      "Trong tình huống trang trọng, người ta thường hỏi 您怎么称呼？ thay vì 你叫什么名字？",
      "In formal settings people ask 您怎么称呼？rather than 你叫什么名字？"
    ),
    provenance: provenance()
  },

  {
    id: "zh.p.want-action",
    language: "zh-CN",
    intent: "desire.state-action",
    name: text("Nói điều mình muốn làm", "Saying what you want to do"),
    skeleton: "我想 + hành động",
    templates: ["{subject}想{verb}{object}"],
    slots: [
      slot(
        "subject",
        text("Chủ ngữ", "Subject"),
        text("Câu bắt đầu bằng 我 hoặc 你.", "Begin with 我 or 你."),
        ["zh.w.i", "zh.w.you"]
      ),
      slot(
        "verb",
        text("Động từ", "Verb"),
        text("Thêm một động từ như 喝 (uống) hoặc 吃 (ăn).", "Add a verb such as 喝 (drink) or 吃 (eat)."),
        ["zh.w.drink", "zh.w.eat"]
      ),
      slot(
        "object",
        text("Tân ngữ", "Object"),
        text("Thêm thứ bạn muốn: 咖啡, 茶, 水, 饭.", "Add what you want: 咖啡, 茶, 水, 饭."),
        ["zh.w.coffee", "zh.w.tea", "zh.w.water", "zh.w.meal"]
      )
    ],
    level: "A1",
    topics: ["food.cafe", "food.restaurant"],
    register: "neutral",
    prerequisiteItemIds: ["zh.w.i", "zh.w.want"],
    exampleSentenceIds: [
      "zh.s.want-coffee",
      "zh.s.want-tea",
      "zh.s.want-eat",
      "zh.s.want-water"
    ],
    explanation: text(
      "想 đứng trước động từ và có nghĩa “muốn làm gì đó”. Thứ tự luôn là: người + 想 + hành động.",
      "想 goes before the verb and means \"want to\". The order is always person + 想 + action."
    ),
    provenance: provenance()
  },

  {
    id: "zh.p.order-drink",
    language: "zh-CN",
    intent: "restaurant.order.drink",
    name: text("Gọi đồ uống", "Ordering a drink"),
    skeleton: "我要 + số + 杯 + đồ uống",
    // Most specific first: 想要 / 想喝 must be tried before the bare 要 form,
    // otherwise 我想要一杯茶 would fail every template.
    templates: [
      "{subject}想要{quantity}{classifier}{item}",
      "{subject}想喝{quantity}{classifier}{item}",
      "{subject}要{quantity}{classifier}{item}"
    ],
    slots: [
      slot(
        "subject",
        text("Chủ ngữ", "Subject"),
        text("Bắt đầu bằng 我 (tôi).", "Start with 我 (I)."),
        ["zh.w.i", "zh.w.you"]
      ),
      slot(
        "quantity",
        text("Số lượng", "Quantity"),
        text("Thêm số lượng, ví dụ 一 (một) hoặc 两 (hai).", "Add a quantity such as 一 (one) or 两 (two)."),
        ["zh.w.one", "zh.w.two"]
      ),
      slot(
        "classifier",
        text("Lượng từ", "Measure word"),
        text("Đồ uống dùng lượng từ 杯 (cốc).", "Drinks take the measure word 杯 (cup)."),
        ["zh.w.cup"]
      ),
      slot(
        "item",
        text("Đồ uống", "Drink"),
        text("Chọn một đồ uống đã học: 咖啡, 茶, 水.", "Choose a drink from this lesson: 咖啡, 茶, 水."),
        ["zh.w.coffee", "zh.w.tea", "zh.w.water"]
      )
    ],
    level: "A1",
    topics: ["food.restaurant.ordering", "food.cafe"],
    register: "neutral",
    prerequisiteItemIds: ["zh.w.i", "zh.w.request", "zh.w.cup", "zh.w.one"],
    exampleSentenceIds: ["zh.s.order-one-coffee", "zh.s.order-two-tea"],
    explanation: text(
      "Khi gọi món, tiếng Trung luôn cần lượng từ giữa số và danh từ: 一 + 杯 + 咖啡, không nói 一咖啡.",
      "When ordering, Chinese always needs a measure word between the number and the noun: 一 + 杯 + 咖啡, never 一咖啡."
    ),
    usageNote: text(
      "要 nghe trực tiếp và tự nhiên khi gọi món; 想喝 nhẹ hơn, giống “tôi muốn uống”.",
      "要 is direct and natural when ordering; 想喝 is softer, closer to \"I'd like to drink\"."
    ),
    provenance: provenance()
  }
];
