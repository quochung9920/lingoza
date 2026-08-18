import type { LearningProgram, LocalizedText, ProgramBand } from "../../../packages/content-schema/src/index.js";

const text = (vi: string, en: string): LocalizedText => ({ "vi-VN": vi, "en-US": en });

export const GF0025_REFERENCE = {
  label: "Chinese Proficiency Grading Standards for International Chinese Language Education",
  reference: "GF0025-2021",
  note: "Reference alignment only. Lingoza does not claim HSK certification or official endorsement."
} as const;

function band(
  ordinal: number,
  stage: ProgramBand["stage"],
  status: ProgramBand["status"],
  viDescription: string,
  enDescription: string,
  objectives: Array<[string, string]>,
  courseIds: string[] = []
): ProgramBand {
  return {
    id: `zh.program.hsk.${ordinal}`,
    ordinal,
    label: text(`HSK ${ordinal}`, `HSK ${ordinal}`),
    stage,
    status,
    description: text(viDescription, enDescription),
    courseIds,
    canDoObjectives: objectives.map(([vi, en]) => text(vi, en))
  };
}

/**
 * Lingoza's product roadmap for the GF0025-2021 three-stage, nine-band model.
 *
 * Only HSK 1 is marked `building`: the current foundation content contributes
 * to it, but coverage is deliberately not called complete until the official
 * reference catalog, native review and production audio gates are satisfied.
 * Higher bands are visible to learners as the long-term path without pretending
 * that placeholder courses already exist.
 */
export const hskProgram: LearningProgram = {
  id: "zh.program.hsk",
  language: "zh-CN",
  title: text("Lộ trình HSK 1–9", "HSK 1–9 Path"),
  description: text(
    "Một lộ trình tiếng Trung dài hạn từ sơ cấp đến cao cấp, lấy GF0025-2021 làm chuẩn tham chiếu và giữ nghe–nói–hội thoại là trung tâm của Lingoza.",
    "A long-term Chinese path from elementary to advanced, aligned by reference to GF0025-2021 while keeping listening, speaking and conversation at the center of Lingoza."
  ),
  alignmentReference: GF0025_REFERENCE,
  bands: [
    band(
      1,
      "elementary",
      "building",
      "Nền tảng sinh tồn: phát âm, chào hỏi, giới thiệu, số, thời gian, gia đình, ăn uống, mua sắm và di chuyển cơ bản.",
      "Survival foundations: pronunciation, greetings, introductions, numbers, time, family, food, shopping and basic transport.",
      [
        ["Hiểu và phản hồi các câu giao tiếp rất quen thuộc.", "Understand and respond to very familiar everyday utterances."],
        ["Tự giới thiệu và xử lý các nhu cầu sinh hoạt cơ bản bằng câu ngắn.", "Introduce yourself and handle basic daily needs with short utterances."],
        ["Giữ được thanh điệu và nhịp câu ở các mẫu đã học.", "Maintain useful tone direction and rhythm on learned patterns."]
      ],
      ["zh.course.a0", "zh.course.a1"]
    ),
    band(
      2,
      "elementary",
      "planned",
      "Mở rộng đời sống hằng ngày: lịch trình, sức khỏe, học tập, công việc, thời tiết, sở thích và giao dịch thông dụng.",
      "Expanded daily life: schedules, health, study, work, weather, preferences and common transactions.",
      [
        ["Duy trì hội thoại ngắn trong các tình huống quen thuộc.", "Sustain short exchanges in familiar situations."],
        ["Mô tả nhu cầu, kế hoạch và trải nghiệm đơn giản.", "Describe simple needs, plans and experiences."],
        ["Hiểu ý chính của lời nói rõ ràng ở tốc độ vừa phải.", "Understand the main idea of clear speech at a moderate pace."]
      ]
    ),
    band(
      3,
      "elementary",
      "planned",
      "Hoàn thiện bậc sơ cấp: kể sự việc đơn giản, giải thích lựa chọn, so sánh, lập kế hoạch và xử lý tình huống đời sống rộng hơn.",
      "Complete the elementary stage: recount simple events, explain choices, compare, plan and handle a wider range of everyday situations.",
      [
        ["Nói thành đoạn ngắn có trình tự và mục đích rõ ràng.", "Produce short connected speech with a clear purpose."],
        ["Hiểu hội thoại đời sống dài hơn và ít phụ thuộc pinyin.", "Understand longer everyday conversations with less reliance on pinyin."],
        ["Xử lý các tình huống thường gặp mà không cần câu mẫu cố định.", "Handle common situations without relying on a fixed model sentence."]
      ]
    ),
    band(
      4,
      "intermediate",
      "planned",
      "Bước vào trung cấp: hội thoại dài hơn, kể chuyện, nêu nguyên nhân, giải thích quan điểm và nghe nội dung thực tế có cấu trúc.",
      "Enter intermediate Chinese: longer conversations, narration, reasons, viewpoints and structured real-world listening.",
      [
        ["Tham gia hội thoại nhiều lượt về các chủ đề quen thuộc và xã hội phổ biến.", "Take part in multi-turn conversations about familiar and common social topics."],
        ["Tóm tắt ý chính của một đoạn nghe vừa phải.", "Summarize the main idea of a moderate listening passage."],
        ["Diễn đạt lý do và quan điểm bằng nhiều mẫu câu hơn.", "Express reasons and viewpoints with a broader range of patterns."]
      ]
    ),
    band(
      5,
      "intermediate",
      "planned",
      "Tiếng Trung học tập và công việc: bài nói dài hơn, phỏng vấn, thông báo, nội dung xã hội và biểu đạt ý kiến có tổ chức.",
      "Chinese for study and work: longer speech, interviews, announcements, social topics and organized opinion.",
      [
        ["Hiểu nội dung nói tương đối dài và nhận ra quan điểm chính.", "Understand relatively long spoken content and identify the main viewpoint."],
        ["Trình bày và bảo vệ một ý kiến bằng lập luận đơn giản.", "Present and support an opinion with simple reasoning."],
        ["Sử dụng tiếng Trung hiệu quả hơn trong học tập và môi trường làm việc.", "Use Chinese more effectively in study and workplace contexts."]
      ]
    ),
    band(
      6,
      "intermediate",
      "planned",
      "Hoàn thiện trung cấp: hiểu hàm ý phổ biến, diễn đạt linh hoạt, xử lý chủ đề trừu tượng vừa phải và giao tiếp tự nhiên hơn.",
      "Complete the intermediate stage: common implied meaning, flexible expression, moderately abstract topics and more natural communication.",
      [
        ["Theo dõi lập luận dài hơn và phân biệt thông tin chính/phụ.", "Follow longer reasoning and distinguish main from supporting information."],
        ["Điều chỉnh cách nói theo ngữ cảnh và mức độ trang trọng.", "Adjust expression to context and register."],
        ["Duy trì thảo luận tương đối tự nhiên về nhiều chủ đề.", "Sustain relatively natural discussion across a broad range of topics."]
      ]
    ),
    band(
      7,
      "advanced",
      "planned",
      "Bắt đầu cao cấp: học thuật, chuyên môn, văn hóa–xã hội, phân tích nội dung dài và trình bày quan điểm có cấu trúc.",
      "Begin advanced Chinese: academic and professional topics, culture and society, long-form analysis and structured argument.",
      [
        ["Hiểu nội dung dài có mật độ thông tin cao trong lĩnh vực quen thuộc.", "Understand information-dense long-form content in familiar domains."],
        ["Tóm tắt, giải thích và phản biện một quan điểm bằng lời nói.", "Summarize, explain and respond critically to a viewpoint in speech."],
        ["Sử dụng từ vựng và cấu trúc trang trọng hơn trong bối cảnh chuyên môn.", "Use more formal vocabulary and structures in professional contexts."]
      ]
    ),
    band(
      8,
      "advanced",
      "planned",
      "Cao cấp chuyên sâu: lập luận phức tạp, phong cách diễn đạt, sắc thái, nội dung liên ngành và giao tiếp chuyên nghiệp ở mức cao.",
      "Deep advanced Chinese: complex argument, style, nuance, interdisciplinary content and high-level professional communication.",
      [
        ["Nhận ra thái độ, sắc thái và hàm ý trong nội dung phức tạp.", "Recognize stance, nuance and implication in complex content."],
        ["Trình bày một vấn đề nhiều chiều với cấu trúc rõ ràng.", "Present a multi-sided issue with clear organization."],
        ["Chuyển đổi linh hoạt giữa phong cách đời sống, chuyên môn và trang trọng.", "Shift flexibly between everyday, professional and formal registers."]
      ]
    ),
    band(
      9,
      "advanced",
      "planned",
      "Mức cao nhất của lộ trình: xử lý nội dung phức tạp, trừu tượng và chuyên sâu với độ chính xác, linh hoạt và tự nhiên rất cao.",
      "The highest band of the path: handle complex, abstract and specialized content with very high precision, flexibility and naturalness.",
      [
        ["Hiểu và tổng hợp nhiều nguồn thông tin nói phức tạp.", "Understand and synthesize multiple complex spoken sources."],
        ["Lập luận, thuyết trình và phản biện ở mức độ chuyên sâu.", "Argue, present and respond critically at an advanced level."],
        ["Sử dụng tiếng Trung linh hoạt trong bối cảnh học thuật, nghề nghiệp và xã hội phức tạp.", "Use Chinese flexibly in complex academic, professional and social contexts."]
      ]
    )
  ]
};
