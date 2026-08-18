import type { LocalizedText, UiLocale } from "../../../../packages/content-schema/src/index";

/**
 * Learner-language text resolution.
 *
 * Content ships `LocalizedText` maps rather than strings so that a pack can
 * serve a Vietnamese and an English learner from the same data. Resolution
 * falls back rather than throwing: a missing translation should degrade to
 * some readable text, never to a blank card in the middle of a lesson.
 */

export const DEFAULT_LOCALE: UiLocale = "vi-VN";
export const FALLBACK_LOCALE: UiLocale = "en-US";

export function t(text: LocalizedText | undefined, locale: UiLocale = DEFAULT_LOCALE): string {
  if (!text) return "";
  return text[locale] ?? text[FALLBACK_LOCALE] ?? Object.values(text)[0] ?? "";
}

const ui = {
  "vi-VN": {
    "nav.learn": "Học",
    "nav.speak": "Luyện nói",
    "nav.talk": "Hội thoại",
    "nav.progress": "Tiến độ",
    "home.greetingMorning": "Chào buổi sáng",
    "home.greetingAfternoon": "Chào buổi chiều",
    "home.greetingEvening": "Chào buổi tối",
    "home.nextLesson": "BÀI TIẾP THEO",
    "home.continue": "TIẾP TỤC HỌC",
    "home.today": "Hôm nay",
    "home.review": "Ôn tập hôm nay",
    "home.reviewEmpty": "Chưa có nội dung cần ôn. Học bài mới nhé!",
    "home.speakingPractice": "Luyện nói",
    "home.topics": "Chủ đề",
    "home.streak": "ngày liên tiếp",
    "home.allDone": "Bạn đã hoàn thành toàn bộ nội dung hiện có.",
    "common.minutes": "phút",
    "common.items": "nội dung",
    "common.continue": "Tiếp tục",
    "common.back": "Quay lại",
    "common.close": "Đóng",
    "common.retry": "Thử lại",
    "common.skip": "Bỏ qua",
    "common.done": "Hoàn thành",
    "common.locked": "Chưa mở",
    "common.completed": "Đã xong",
    "common.current": "Đang học",
    "common.loading": "Đang tải…",
    "audio.play": "Nghe",
    "audio.playSlow": "Nghe chậm",
    "audio.replay": "Nghe lại",
    "audio.unavailable": "Bản thu đang được chuẩn bị",
    "audio.slowLabel": "Chậm",
    "speak.tapToSpeak": "NHẤN ĐỂ NÓI",
    "speak.recording": "ĐANG GHI ÂM…",
    "speak.processing": "Đang xử lý…",
    "speak.again": "NÓI LẠI",
    "speak.native": "Mẫu",
    "speak.you": "Bạn",
    "speak.permissionTitle": "Cần quyền micro",
    "speak.permissionBody":
      "Lingoza cần micro để bạn luyện nói. Phân tích prosody cơ bản được xử lý cục bộ và bản ghi mặc định bị xoá sau lượt luyện. Nếu bạn bật kiểm tra đúng câu hoặc chấm phát âm nâng cao trong Cài đặt, phần tương ứng có thể được xử lý ngoài thiết bị.",
    "speak.permissionDenied":
      "Chưa có quyền micro. Bạn có thể bật lại trong cài đặt trình duyệt rồi thử lại.",
    "speak.unsupported": "Thiết bị này chưa hỗ trợ ghi âm. Bạn vẫn có thể nghe và nhắc lại.",
    "speak.contentMatched": "Bạn đã nói đúng câu mục tiêu",
    "speak.contentMismatch": "Câu được nhận dạng chưa khớp hoàn toàn",
    "speak.contentUnverified": "Chưa xác minh nội dung câu",
    "speak.recognizedAs": "Hệ thống nghe được",
    "speak.prosodyOnly": "Hiện đang chấm thanh điệu, nhịp, tốc độ và khoảng nghỉ. Chưa có bằng chứng phoneme nên không gọi đây là độ chính xác phát âm.",
    "speak.phonemeVerified": "Đã có bằng chứng phoneme/syllable từ bộ chấm phát âm chuyên dụng.",
    "speak.recognitionUnavailable": "Nhận dạng câu không khả dụng; Lingoza vẫn chấm prosody cục bộ.",
    "speak.advancedUnavailable": "Chấm phát âm nâng cao đang bật nhưng Speech Gateway chưa được cấu hình cho bản build này. Lingoza sẽ không gửi audio và vẫn chấm prosody cục bộ.",
    "metric.contentMatch": "Đúng nội dung câu",
    "metric.phonemeAccuracy": "Âm tiết / âm vị",
    "metric.toneContour": "Thanh điệu",
    "metric.rhythm": "Nhịp câu",
    "metric.pace": "Tốc độ",
    "metric.pausing": "Khoảng nghỉ",
    "metric.unavailable": "Chưa đo được",
    "band.needs-work": "Cần luyện thêm",
    "band.fair": "Tạm ổn",
    "band.good": "Tốt",
    "band.excellent": "Rất tốt",
    "hint.show": "Xem gợi ý",
    "hint.label": "Gợi ý",
    "lesson.complete": "Hoàn thành bài học",
    "lesson.completeBody": "Tiến độ của bạn đã được cập nhật.",
    "progress.level": "Cấp độ hiện tại",
    "progress.skills": "Kỹ năng",
    "progress.focus": "Điểm nên cải thiện",
    "progress.practice5": "LUYỆN 5 PHÚT",
    "progress.noData": "Hãy học một bài để Lingoza hiểu bạn hơn.",
    "skill.listeningRecognition": "Nghe hiểu",
    "skill.meaningRecognition": "Nhận nghĩa",
    "skill.activeRecall": "Chủ động nhớ",
    "skill.speaking": "Nói",
    "skill.pronunciation": "Phát âm",
    "skill.conversation": "Hội thoại",
    "skill.retention": "Ghi nhớ lâu",
    "conversation.yourTurn": "Đến lượt bạn",
    "conversation.chooseIntent": "Bạn muốn nói gì?",
    "conversation.finished": "Hoàn thành hội thoại",
    "conversation.replay": "Nghe lại đoạn hội thoại",
    "conversation.practiceAgain": "Luyện lại",
    "error.contentTitle": "Không tải được nội dung",
    "error.contentBody": "Kiểm tra kết nối rồi thử lại nhé.",
    "empty.speaking": "Chưa có nội dung luyện nói. Hoàn thành một bài học trước nhé.",
    "empty.conversation": "Chưa mở khoá hội thoại nào. Học tiếp để mở nhé."
  }
} as const;

type UiKey = keyof (typeof ui)["vi-VN"];

/** UI string lookup. Falls back to the key so a gap is visible, not silent. */
export function ct(key: UiKey, locale: UiLocale = DEFAULT_LOCALE): string {
  const table = ui[locale as keyof typeof ui] ?? ui["vi-VN"];
  return table[key] ?? key;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
