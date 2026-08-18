import type { Assessment, LocalizedText } from "../../../packages/content-schema/src/index.js";
import { provenance } from "./provenance.js";

/**
 * Unit checkpoints.
 *
 * Every item names the lesson activity it derives from, and none of them
 * reuses that activity's sentence. The clearest case is the cafe checkpoint:
 * the lesson drills 你想喝什么？and the checkpoint asks 请问，您要喝点什么？--
 * a different register, different vocabulary, same communicative intent. A
 * learner who memorised the lesson string cannot pass on recall alone, which
 * is the whole point of a checkpoint.
 */

function text(vi: string, en: string): LocalizedText {
  return { "vi-VN": vi, "en-US": en };
}

export const assessments: Assessment[] = [
  {
    id: "zh.assess.a0.greetings",
    language: "zh-CN",
    kind: "UNIT_CHECKPOINT",
    title: text("Kiểm tra: Những câu đầu tiên", "Checkpoint: Your first words"),
    level: "A0",
    scopeId: "zh.unit.a0.greetings",
    itemsPerSitting: 4,
    passThresholds: {
      listeningRecognition: 0.6,
      meaningRecognition: 0.6,
      activeRecall: 0.5
    },
    items: [
      {
        id: "zh.assess.a0.greetings.i1",
        conceptId: "greeting.basic",
        skill: "listeningRecognition",
        responseMode: "choose-meaning",
        promptSentenceId: "zh.s.hello-and-thanks",
        choices: [
          text("Xin chào, cảm ơn bạn!", "Hello, thank you!"),
          text("Xin lỗi, tôi không biết.", "Sorry, I don't know."),
          text("Tôi tên là Tiểu Nam.", "My name is Xiao Nan.")
        ],
        correctChoiceIndex: 0,
        // Lesson drilled 你好 alone; this is the same concept in a longer frame.
        derivedFromActivityId: "zh.act.a0.hello.listen"
      },
      {
        id: "zh.assess.a0.greetings.i2",
        conceptId: "greeting.basic",
        skill: "meaningRecognition",
        responseMode: "choose-meaning",
        promptSentenceId: "zh.s.yes-correct",
        choices: [
          text("Đúng rồi, là tôi.", "Right, that's me."),
          text("Không, không phải tôi.", "No, that's not me."),
          text("Cảm ơn nhiều.", "Thanks a lot.")
        ],
        correctChoiceIndex: 0
      },
      {
        id: "zh.assess.a0.greetings.i3",
        conceptId: "intro.name",
        skill: "activeRecall",
        responseMode: "speak",
        // Formal register the lesson never drilled: transfer, not recall.
        promptSentenceId: "zh.s.how-do-i-call-you",
        instruction: text("Trả lời bằng cách nói tên của bạn.", "Answer by saying your name."),
        expectedPatternId: "zh.p.name-introduction",
        derivedFromActivityId: "zh.act.a0.name.guided"
      },
      {
        id: "zh.assess.a0.greetings.i4",
        conceptId: "number.basic",
        skill: "listeningRecognition",
        responseMode: "choose-meaning",
        promptSentenceId: "zh.s.one-cup-please",
        choices: [
          text("Một cốc, cảm ơn.", "One cup, thank you."),
          text("Hai cốc, cảm ơn.", "Two cups, thank you."),
          text("Không cần, cảm ơn.", "No thanks.")
        ],
        correctChoiceIndex: 0,
        derivedFromActivityId: "zh.act.a0.numbers.listen2"
      }
    ],
    provenance: provenance()
  },

  {
    id: "zh.assess.a1.cafe",
    language: "zh-CN",
    kind: "UNIT_CHECKPOINT",
    title: text("Kiểm tra: Ở quán cà phê", "Checkpoint: At the cafe"),
    level: "A1",
    scopeId: "zh.unit.a1.cafe",
    itemsPerSitting: 5,
    passThresholds: {
      listeningRecognition: 0.7,
      meaningRecognition: 0.7,
      activeRecall: 0.6,
      speaking: 0.6
    },
    items: [
      {
        id: "zh.assess.a1.cafe.i1",
        conceptId: "restaurant.order",
        skill: "listeningRecognition",
        responseMode: "choose-meaning",
        // The polite variant. The lesson only ever drilled 你想喝什么？
        promptSentenceId: "zh.s.npc-polite-what-drink",
        choices: [
          text("Quý khách muốn dùng đồ uống gì?", "What would you like to drink?"),
          text("Quý khách tên là gì?", "What is your name?"),
          text("Quý khách muốn ngồi ở đâu?", "Where would you like to sit?")
        ],
        correctChoiceIndex: 0,
        derivedFromActivityId: "zh.act.a1.order.quick"
      },
      {
        id: "zh.assess.a1.cafe.i2",
        conceptId: "restaurant.order",
        skill: "speaking",
        responseMode: "speak",
        promptSentenceId: "zh.s.npc-polite-what-drink",
        instruction: text("Gọi một đồ uống bạn muốn.", "Order a drink of your choice."),
        expectedPatternId: "zh.p.order-drink",
        derivedFromActivityId: "zh.act.a1.order.shadow",
        weight: 2
      },
      {
        id: "zh.assess.a1.cafe.i3",
        conceptId: "beverage.basic",
        skill: "meaningRecognition",
        responseMode: "choose-meaning",
        promptSentenceId: "zh.s.learner-more-water",
        choices: [
          text("Tôi muốn thêm một cốc nước nữa.", "I'd also like a glass of water."),
          text("Tôi muốn thêm một cốc cà phê nữa.", "I'd also like another coffee."),
          text("Tôi không cần gì thêm.", "I don't need anything else.")
        ],
        correctChoiceIndex: 0
      },
      {
        id: "zh.assess.a1.cafe.i4",
        conceptId: "want.basic",
        skill: "activeRecall",
        responseMode: "speak",
        promptSentenceId: "zh.s.npc-what-drink",
        instruction: text("Nói rằng bạn muốn uống trà.", "Say that you want to drink tea."),
        expectedPatternId: "zh.p.want-action",
        derivedFromActivityId: "zh.act.a1.want.substitute"
      },
      {
        id: "zh.assess.a1.cafe.i5",
        conceptId: "classifier.cup",
        skill: "listeningRecognition",
        responseMode: "choose-meaning",
        promptSentenceId: "zh.s.order-two-tea",
        choices: [
          text("Tôi muốn hai cốc trà.", "I'd like two cups of tea."),
          text("Tôi muốn một cốc trà.", "I'd like one cup of tea."),
          text("Tôi muốn hai cốc cà phê.", "I'd like two cups of coffee.")
        ],
        correctChoiceIndex: 0
      }
    ],
    provenance: provenance()
  }
];
