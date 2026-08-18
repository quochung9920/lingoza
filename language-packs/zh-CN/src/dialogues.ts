import type { DialogueScenarioV2, LocalizedText } from "../../../packages/content-schema/src/index.js";
import { provenance } from "./provenance.js";

/**
 * Role-play scenarios.
 *
 * Each graph has an explicit recovery state, which is what lets the engine
 * handle a learner who cannot produce the target line without either accepting
 * a wrong answer or stranding them. The staff character asks them to repeat,
 * the conversation continues, and the run still completes -- a real cafe would
 * do the same thing.
 */

function text(vi: string, en: string): LocalizedText {
  return { "vi-VN": vi, "en-US": en };
}

export const scenarios: DialogueScenarioV2[] = [
  {
    id: "zh.dialogue.cafe-order",
    language: "zh-CN",
    title: text("Gọi đồ uống ở quán cà phê", "Ordering at the cafe"),
    setting: text(
      "Bạn đang đứng ở quầy của một quán cà phê nhỏ. Nhân viên chào bạn.",
      "You are at the counter of a small cafe. The barista greets you."
    ),
    level: "A1",
    topics: ["food.cafe", "food.restaurant.ordering"],
    roles: [
      { role: "staff", name: text("Nhân viên", "Barista"), avatar: "👩" },
      { role: "customer", name: text("Bạn", "You"), avatar: "🙂" }
    ],
    learnerRole: "customer",
    initialState: "greeting",
    maxFailuresBeforeRecovery: 2,
    conceptIds: ["restaurant.order", "beverage.basic", "classifier.cup"],
    states: [
      {
        id: "greeting",
        speakerRole: "staff",
        npcLineSentenceId: "zh.s.npc-what-drink",
        learnerTurn: true,
        acceptedIntents: [
          {
            intent: "restaurant.order.drink",
            label: text("Gọi một đồ uống", "Order a drink"),
            sentenceId: "zh.s.order-one-coffee",
            patternId: "zh.p.order-drink"
          }
        ],
        transitions: { "restaurant.order.drink": "confirm" },
        hints: [
          text("Bắt đầu bằng 我要…", "Start with 我要…"),
          text("我要 + số + 杯 + đồ uống", "我要 + number + 杯 + drink"),
          text("Ví dụ: 我要一杯咖啡。", "For example: 我要一杯咖啡。")
        ],
        recoveryStateId: "repeat",
        terminal: false
      },
      {
        id: "repeat",
        speakerRole: "staff",
        npcLineSentenceId: "zh.s.npc-sorry-again",
        learnerTurn: true,
        acceptedIntents: [
          {
            intent: "restaurant.order.drink",
            label: text("Gọi lại đồ uống", "Order the drink again"),
            sentenceId: "zh.s.order-one-coffee",
            patternId: "zh.p.order-drink"
          }
        ],
        transitions: { "restaurant.order.drink": "confirm" },
        hints: [text("Nghe mẫu rồi nhắc lại từng cụm.", "Listen to the model, then repeat it chunk by chunk.")],
        terminal: false
      },
      {
        id: "confirm",
        speakerRole: "staff",
        npcLineSentenceId: "zh.s.npc-anything-else",
        learnerTurn: true,
        acceptedIntents: [
          {
            intent: "restaurant.order.more",
            label: text("Gọi thêm một món nữa", "Order something else"),
            sentenceId: "zh.s.learner-more-water",
            patternId: "zh.p.order-drink"
          },
          {
            intent: "restaurant.finish",
            label: text("Thế thôi, cảm ơn", "That's all, thanks"),
            sentenceId: "zh.s.learner-thats-all"
          }
        ],
        transitions: {
          "restaurant.order.more": "confirm",
          "restaurant.finish": "end"
        },
        hints: [text("Nếu đủ rồi, nói 不用了，谢谢。", "If you have everything, say 不用了，谢谢。")],
        terminal: false
      },
      {
        id: "end",
        speakerRole: "staff",
        npcLineSentenceId: "zh.s.npc-thanks-end",
        learnerTurn: false,
        acceptedIntents: [],
        transitions: {},
        hints: [],
        terminal: true
      }
    ],
    provenance: provenance()
  },

  {
    id: "zh.dialogue.greeting-intro",
    language: "zh-CN",
    title: text("Làm quen lần đầu", "Meeting someone for the first time"),
    setting: text(
      "Một người bạn mới chào bạn ở lớp học.",
      "A new classmate greets you before class."
    ),
    level: "A0",
    topics: ["daily-life.greetings", "people.introductions"],
    roles: [
      { role: "classmate", name: text("Bạn cùng lớp", "Classmate"), avatar: "🧑" },
      { role: "learner", name: text("Bạn", "You"), avatar: "🙂" }
    ],
    learnerRole: "learner",
    initialState: "open",
    maxFailuresBeforeRecovery: 2,
    conceptIds: ["greeting.basic", "intro.name"],
    states: [
      {
        id: "open",
        speakerRole: "classmate",
        npcLineSentenceId: "zh.s.npc-greeting-intro",
        learnerTurn: true,
        acceptedIntents: [
          {
            intent: "introduction.state-name",
            label: text("Nói tên của bạn", "Say your name"),
            sentenceId: "zh.s.my-name",
            patternId: "zh.p.name-introduction"
          }
        ],
        transitions: { "introduction.state-name": "close" },
        hints: [
          text("Bắt đầu bằng 我叫…", "Start with 我叫…"),
          text("我叫 + tên của bạn", "我叫 + your name")
        ],
        recoveryStateId: "again",
        terminal: false
      },
      {
        id: "again",
        speakerRole: "classmate",
        npcLineSentenceId: "zh.s.npc-sorry-again",
        learnerTurn: true,
        acceptedIntents: [
          {
            intent: "introduction.state-name",
            label: text("Nói lại tên của bạn", "Say your name again"),
            sentenceId: "zh.s.my-name-lan",
            patternId: "zh.p.name-introduction"
          }
        ],
        transitions: { "introduction.state-name": "close" },
        hints: [text("Nghe mẫu một lần nữa rồi nhắc lại.", "Listen to the model once more, then repeat.")],
        terminal: false
      },
      {
        id: "close",
        speakerRole: "classmate",
        npcLineSentenceId: "zh.s.npc-nice-to-meet",
        learnerTurn: false,
        acceptedIntents: [],
        transitions: {},
        hints: [],
        terminal: true
      }
    ],
    provenance: provenance()
  }
];
