import type { Concept, DialogueScenario, GrammarFrame, VocabularyEntry } from "../../../packages/content-schema/src/index.js";

export const concepts: Concept[] = [
  {
    id: "greeting.basic",
    title: "Basic greetings",
    topic: "everyday.greetings",
    level: "pre-a1",
    prerequisites: [],
    skills: ["recognition", "listening", "production", "conversation"]
  },
  {
    id: "restaurant.order",
    title: "Order food and drinks",
    topic: "food.restaurant",
    level: "a1",
    prerequisites: ["greeting.basic"],
    skills: ["meaning", "listening", "production", "grammar", "conversation"]
  }
];

export const vocabulary: VocabularyEntry[] = [
  {
    id: "zh.n.coffee",
    language: "zh-CN",
    surface: "咖啡",
    reading: "kāfēi",
    partOfSpeech: "noun",
    meanings: ["coffee"],
    topics: ["food.restaurant", "food.cafe"],
    collocations: ["喝咖啡", "一杯咖啡"],
    metadata: { simplified: "咖啡", traditional: "咖啡", classifier: "杯" }
  },
  {
    id: "zh.n.tea",
    language: "zh-CN",
    surface: "茶",
    reading: "chá",
    partOfSpeech: "noun",
    meanings: ["tea"],
    topics: ["food.restaurant", "food.cafe"],
    collocations: ["喝茶", "一杯茶"],
    metadata: { simplified: "茶", traditional: "茶", classifier: "杯" }
  }
];

export const orderDrinkFrame: GrammarFrame = {
  id: "zh.restaurant.order.drink",
  language: "zh-CN",
  intent: "restaurant.order.drink",
  patterns: [
    "我要{quantity}{classifier}{item}",
    "我想要{quantity}{classifier}{item}",
    "我想喝{quantity}{classifier}{item}"
  ],
  slots: {
    quantity: ["一"],
    classifier: ["杯"],
    item: ["咖啡", "茶"]
  },
  feedback: {
    quantity: "Add a quantity such as 一 (one).",
    classifier: "Use the drink classifier 杯 for a cup/glass.",
    item: "Use an accepted drink from this lesson."
  }
};

export const restaurantDialogue: DialogueScenario = {
  id: "zh.restaurant.basic-order",
  topic: "food.restaurant",
  initialState: "greeting",
  states: [
    {
      id: "greeting",
      prompt: "你好，欢迎光临。请问您要喝什么？",
      acceptedIntents: ["restaurant.order.drink"],
      transitions: { "restaurant.order.drink": "confirm" }
    },
    {
      id: "confirm",
      prompt: "好的。还需要别的吗？",
      acceptedIntents: ["restaurant.finish", "restaurant.order.more"],
      transitions: {
        "restaurant.finish": "end",
        "restaurant.order.more": "confirm"
      }
    },
    {
      id: "end",
      prompt: "好的，谢谢！",
      acceptedIntents: [],
      transitions: {},
      terminal: true
    }
  ]
};
