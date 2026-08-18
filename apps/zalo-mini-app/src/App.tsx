import { useMemo, useState } from "react";

import { evaluateAnswer } from "../../../packages/evaluation-engine/src/index";
import {
  concepts,
  orderDrinkFrame,
  restaurantDialogue,
  vocabulary
} from "../../../language-packs/zh-CN/src/index";

const sampleLessons = [
  { icon: "👋", title: "Chào hỏi", subtitle: "你好 · Nǐ hǎo", progress: 100 },
  { icon: "🙋", title: "Giới thiệu bản thân", subtitle: "我叫… · Wǒ jiào…", progress: 72 },
  { icon: "☕", title: "Gọi món & đồ uống", subtitle: "我要一杯咖啡", progress: 35 }
];

function App() {
  const [answer, setAnswer] = useState("我要一杯咖啡");
  const [evaluation, setEvaluation] = useState<ReturnType<typeof evaluateAnswer> | null>(null);

  const currentConcept = useMemo(
    () => concepts.find((concept) => concept.id === "restaurant.order"),
    []
  );

  const dialoguePrompt = useMemo(
    () => restaurantDialogue.states.find((state) => state.id === restaurantDialogue.initialState)?.prompt,
    []
  );

  const handleCheck = () => {
    setEvaluation(evaluateAnswer(answer, orderDrinkFrame));
  };

  return (
    <main className="lingoza-app">
      <section className="hero-card">
        <div className="top-row">
          <div className="brand-mark" aria-label="Lingoza logo">
            <span className="brand-letter">L</span>
            <span className="brand-language">学</span>
          </div>
          <div className="streak-pill">🔥 1 ngày</div>
        </div>

        <p className="eyebrow">LINGOZA · TIẾNG TRUNG</p>
        <h1>Chào buổi chiều 👋</h1>
        <p className="hero-copy">Mỗi ngày một chút, giao tiếp tự nhiên hơn mỗi ngày.</p>

        <div className="progress-panel">
          <div className="progress-copy">
            <span>Mục tiêu hôm nay</span>
            <strong>8 / 10 phút</strong>
          </div>
          <div className="progress-track" aria-label="Tiến độ hôm nay">
            <span style={{ width: "80%" }} />
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">TIẾP TỤC HỌC</p>
            <h2>Bài học hôm nay</h2>
          </div>
          <span className="level-badge">A1</span>
        </div>

        <div className="lesson-list">
          {sampleLessons.map((lesson) => (
            <article className="lesson-card" key={lesson.title}>
              <div className="lesson-icon">{lesson.icon}</div>
              <div className="lesson-body">
                <strong>{lesson.title}</strong>
                <span>{lesson.subtitle}</span>
                <div className="mini-progress">
                  <span style={{ width: `${lesson.progress}%` }} />
                </div>
              </div>
              <span className="lesson-percent">{lesson.progress}%</span>
            </article>
          ))}
        </div>
      </section>

      <section className="practice-card">
        <div className="practice-header">
          <div>
            <p className="eyebrow dark">LUYỆN PHẢN XẠ</p>
            <h2>{currentConcept?.title ?? "Order food and drinks"}</h2>
          </div>
          <span className="engine-badge">Không AI runtime</span>
        </div>

        <div className="dialogue-bubble">
          <span className="speaker-avatar">店</span>
          <div>
            <small>Nhân viên</small>
            <p>{dialoguePrompt ?? "你好，欢迎光临。请问您要喝什么？"}</p>
          </div>
        </div>

        <label className="answer-label" htmlFor="answer">
          Trả lời bằng tiếng Trung
        </label>
        <textarea
          id="answer"
          value={answer}
          onChange={(event) => {
            setAnswer(event.target.value);
            setEvaluation(null);
          }}
          placeholder="Ví dụ: 我要一杯咖啡"
          rows={2}
        />

        <button className="primary-button" type="button" onClick={handleCheck}>
          Kiểm tra câu trả lời
        </button>

        {evaluation && (
          <div className={`feedback-card ${evaluation.patternMatched ? "success" : "needs-work"}`}>
            <strong>
              {evaluation.patternMatched
                ? "Rất tốt! Câu này tự nhiên và đúng mẫu."
                : "Gần đúng rồi — thử chỉnh thêm một chút."}
            </strong>
            <span>Điểm phù hợp: {Math.round(evaluation.score * 100)}%</span>
            {evaluation.feedback.length > 0 && (
              <ul>
                {evaluation.feedback.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="section-block vocabulary-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">TỪ VỰNG ĐANG HỌC</p>
            <h2>Ghi nhớ nhanh</h2>
          </div>
        </div>

        <div className="vocabulary-grid">
          {vocabulary.slice(0, 2).map((word) => (
            <article className="word-card" key={word.id}>
              <span className="hanzi">{word.surface}</span>
              <strong>{word.reading}</strong>
              <span>{word.meanings.join(", ")}</span>
            </article>
          ))}
        </div>
      </section>

      <nav className="bottom-nav" aria-label="Điều hướng chính">
        <button type="button" className="active"><span>⌂</span>Học</button>
        <button type="button"><span>▣</span>Ôn tập</button>
        <button type="button"><span>◎</span>Tiến độ</button>
        <button type="button"><span>☺</span>Cá nhân</button>
      </nav>
    </main>
  );
}

export default App;
