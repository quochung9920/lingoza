import { useMemo, useState } from "react";

import type { LingozaLevel } from "../../../../packages/content-schema/src/index";
import type { LearningGoal } from "../../../../packages/persistence/src/index";
import type { OnboardingSelection } from "../app/learner-provider";
import { DEFAULT_LANGUAGE, supportedLanguages } from "../app/language-registry";
import { PrimaryButton, SecondaryButton } from "../components/primitives";
import { t } from "../lib/i18n";

const GOALS: ReadonlyArray<{
  id: LearningGoal;
  icon: string;
  title: string;
  description: string;
}> = [
  { id: "conversation", icon: "🗣️", title: "Giao tiếp", description: "Nghe và phản xạ tự nhiên trong đời sống." },
  { id: "travel", icon: "✈️", title: "Du lịch", description: "Tự tin ở sân bay, khách sạn, nhà hàng và đi lại." },
  { id: "work", icon: "💼", title: "Công việc", description: "Chuẩn bị nền tảng để giao tiếp trong môi trường làm việc." },
  { id: "study", icon: "🎓", title: "Học tập", description: "Xây nền tảng bài bản để học lên trình độ cao." },
  { id: "hsk", icon: "🏅", title: "HSK", description: "Ưu tiên nội dung hỗ trợ lộ trình thi HSK." }
];

const LEVELS: ReadonlyArray<{
  id: LingozaLevel;
  title: string;
  description: string;
}> = [
  { id: "A0", title: "Mới bắt đầu", description: "Tôi gần như chưa học tiếng Trung." },
  { id: "A1", title: "Đã có nền tảng", description: "Tôi biết một số từ và câu giao tiếp cơ bản." }
];

const DAILY_GOALS = [5, 10, 15, 20] as const;

export function OnboardingScreen({ onComplete }: { onComplete: (selection: OnboardingSelection) => void }) {
  const languages = useMemo(() => supportedLanguages(), []);
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [goal, setGoal] = useState<LearningGoal>("conversation");
  const [level, setLevel] = useState<LingozaLevel>("A0");
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(10);

  const canGoBack = step > 0;
  const finish = () => onComplete({ language, goal, level, dailyGoalMinutes });

  return (
    <main className="lz-onboarding">
      <div className="lz-onboarding__brand">
        <span className="lz-onboarding__mark" aria-hidden="true">L</span>
        <div>
          <p className="lz-eyebrow">LINGOZA</p>
          <h1>Học bằng tai. Phản xạ bằng lời nói.</h1>
        </div>
      </div>

      <div className="lz-onboarding__steps" aria-label="Tiến độ thiết lập">
        {[0, 1, 2].map((index) => (
          <span key={index} data-active={index <= step} />
        ))}
      </div>

      {step === 0 ? (
        <section className="lz-onboarding__panel">
          <div>
            <p className="lz-eyebrow">BƯỚC 1 / 3</p>
            <h2>Mục tiêu học của bạn là gì?</h2>
            <p className="lz-muted">Lingoza dùng mục tiêu này để ưu tiên chủ đề, nhưng vẫn giữ giáo trình nền tảng đầy đủ.</p>
          </div>

          <div className="lz-language-strip" aria-label="Ngôn ngữ đang học">
            {languages.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="lz-language-chip"
                data-selected={entry.id === language}
                onClick={() => setLanguage(entry.id)}
              >
                <span aria-hidden="true">{entry.flag}</span>
                <span>{t(entry.label)}</span>
                <small>{entry.endonym}</small>
              </button>
            ))}
          </div>

          <div className="lz-choice-grid lz-choice-grid--goals">
            {GOALS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="lz-choice-card"
                data-selected={goal === option.id}
                onClick={() => setGoal(option.id)}
              >
                <span className="lz-choice-card__icon" aria-hidden="true">{option.icon}</span>
                <span>
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
                <span className="lz-choice-card__check" aria-hidden="true">✓</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="lz-onboarding__panel">
          <div>
            <p className="lz-eyebrow">BƯỚC 2 / 3</p>
            <h2>Bạn đang ở đâu trên lộ trình?</h2>
            <p className="lz-muted">Bạn luôn có thể học lại phần nền tảng. Lingoza không bỏ qua prerequisite chỉ vì bạn chọn cấp cao hơn.</p>
          </div>

          <div className="lz-choice-grid">
            {LEVELS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="lz-level-choice"
                data-selected={level === option.id}
                onClick={() => setLevel(option.id)}
              >
                <span className="lz-level-choice__badge">{option.id}</span>
                <span>
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
                <span className="lz-choice-card__check" aria-hidden="true">✓</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="lz-onboarding__panel">
          <div>
            <p className="lz-eyebrow">BƯỚC 3 / 3</p>
            <h2>Bạn muốn luyện bao lâu mỗi ngày?</h2>
            <p className="lz-muted">Mục tiêu ngắn nhưng đều đặn sẽ được dùng để lắp session học và ôn tập hằng ngày.</p>
          </div>

          <div className="lz-minute-grid">
            {DAILY_GOALS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className="lz-minute-card"
                data-selected={dailyGoalMinutes === minutes}
                onClick={() => setDailyGoalMinutes(minutes)}
              >
                <strong>{minutes}</strong>
                <span>phút / ngày</span>
                {minutes === 10 ? <small>Khuyên dùng</small> : null}
              </button>
            ))}
          </div>

          <div className="lz-onboarding__promise">
            <span aria-hidden="true">🎧</span>
            <p><strong>Audio-first mặc định.</strong> Bạn sẽ nghe, nhắc lại, shadowing và hội thoại — không có bài viết bắt buộc.</p>
          </div>
        </section>
      ) : null}

      <div className="lz-onboarding__actions">
        {canGoBack ? <SecondaryButton onClick={() => setStep((value) => value - 1)}>Quay lại</SecondaryButton> : <span />}
        {step < 2 ? (
          <PrimaryButton block={false} onClick={() => setStep((value) => value + 1)}>Tiếp tục</PrimaryButton>
        ) : (
          <PrimaryButton block={false} onClick={finish}>Bắt đầu học</PrimaryButton>
        )}
      </div>
    </main>
  );
}
