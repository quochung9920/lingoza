import { useContent } from "../app/content-provider";
import { useLearner } from "../app/learner-provider";
import { isAdvancedPronunciationConfigured } from "../audio/pronunciation-assessment";
import { Card, SecondaryButton, SectionHeading } from "../components/primitives";
import { t } from "../lib/i18n";

function ToggleRow({
  title,
  body,
  checked,
  onChange
}: {
  title: string;
  body: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="lz-setting-row">
      <div>
        <strong>{title}</strong>
        <p className="lz-muted">{body}</p>
      </div>
      <button
        type="button"
        className="lz-switch"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        data-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

const GOAL_LABEL = {
  conversation: "Giao tiếp",
  travel: "Du lịch",
  work: "Công việc",
  study: "Học tập",
  hsk: "HSK"
} as const;

export function SettingsScreen() {
  const content = useContent();
  const { snapshot, updatePreferences, updatePrivacy, restartOnboarding } = useLearner();
  const preferences = snapshot.profile.preferences;
  const privacy = snapshot.profile.privacy;
  const advancedConfigured = isAdvancedPronunciationConfigured();

  const setSupportLayer = (key: string, enabled: boolean) => {
    const next = new Set(preferences.visibleSupportLayers);
    if (enabled) next.add(key);
    else next.delete(key);
    updatePreferences({ visibleSupportLayers: [...next] });
  };

  return (
    <div className="lz-stack">
      <section className="lz-settings-hero">
        <span aria-hidden="true">🎧</span>
        <div>
          <p className="lz-eyebrow lz-eyebrow--on-accent">TRẢI NGHIỆM HỌC</p>
          <h2>Tinh chỉnh cách Lingoza hỗ trợ bạn</h2>
          <p>Giữ audio làm trung tâm, đồng thời giảm dần lớp hỗ trợ đọc và nghĩa khi bạn đã tự tin hơn.</p>
        </div>
      </section>

      <Card>
        <SectionHeading title="Lộ trình cá nhân" />
        <div className="lz-setting-summary">
          <div>
            <span>Mục tiêu</span>
            <strong>{GOAL_LABEL[snapshot.profile.learningGoal]}</strong>
          </div>
          <div>
            <span>Cấp khởi điểm</span>
            <strong>{snapshot.profile.currentLevel}</strong>
          </div>
        </div>
        <SecondaryButton onClick={restartOnboarding}>Thay đổi mục tiêu / thiết lập ban đầu</SecondaryButton>
        <p className="lz-muted" style={{ margin: "8px 0 0" }}>
          Thao tác này không xoá bài đã học, mastery hay lịch ôn tập.
        </p>
      </Card>

      <Card>
        <SectionHeading title="Hiển thị khi học" />
        <div className="lz-settings-group">
          {content.bundle.profile.supportLayers.map((layer) => (
            <ToggleRow
              key={layer.key}
              title={layer.key === "pinyin" ? "Pinyin trong câu" : t(layer.label)}
              body={
                layer.key === "pinyin"
                  ? "Pinyin dưới từng từ vựng luôn được giữ để bạn đọc đúng. Công tắc này chỉ điều khiển lớp Pinyin hỗ trợ ở câu và ví dụ dài."
                  : "Bật khi cần hỗ trợ đọc; tắt dần để ưu tiên nghe và nhận diện ngôn ngữ tự nhiên."
              }
              checked={preferences.visibleSupportLayers.includes(layer.key)}
              onChange={(enabled) => setSupportLayer(layer.key, enabled)}
            />
          ))}
          <ToggleRow
            title="Hiện nghĩa tiếng Việt trong câu"
            body="Từ vựng không hiện nghĩa thường trực: chạm trực tiếp vào từ để mở nghĩa chi tiết, cách dùng, cụm từ và ví dụ. Công tắc này chỉ áp dụng cho câu."
            checked={preferences.showTranslation}
            onChange={(showTranslation) => updatePreferences({ showTranslation })}
          />
        </div>
      </Card>

      <Card>
        <SectionHeading title="Audio" />
        <div className="lz-settings-group">
          <ToggleRow
            title="Tự động phát audio"
            body="Cho phép lesson tự phát câu mẫu khi hoạt động hỗ trợ autoplay."
            checked={preferences.autoplayAudio}
            onChange={(autoplayAudio) => updatePreferences({ autoplayAudio })}
          />
          <ToggleRow
            title="Ưu tiên tốc độ chậm"
            body="Dùng bản chậm trước khi nghe tốc độ tự nhiên ở những hoạt động có hỗ trợ."
            checked={preferences.preferSlowAudio}
            onChange={(preferSlowAudio) => updatePreferences({ preferSlowAudio })}
          />
        </div>
      </Card>

      <Card>
        <SectionHeading title="Mục tiêu hằng ngày" />
        <div className="lz-setting-minutes" role="group" aria-label="Số phút học mỗi ngày">
          {[5, 10, 15, 20].map((minutes) => (
            <button
              key={minutes}
              type="button"
              data-selected={preferences.dailyGoalMinutes === minutes}
              onClick={() => updatePreferences({ dailyGoalMinutes: minutes })}
            >
              <strong>{minutes}</strong>
              <span>phút</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading title="Quyền riêng tư khi luyện nói" />
        <div className="lz-settings-group">
          <ToggleRow
            title="Chấm phát âm nâng cao"
            body="Khi bật, một bản WAV ngắn của lượt luyện sẽ được gửi đến Lingoza Speech Gateway và dịch vụ chấm phát âm được cấu hình để lấy bằng chứng âm vị. Bản ghi không được gửi khi công tắc này tắt."
            checked={privacy.advancedPronunciationOptIn}
            onChange={(advancedPronunciationOptIn) => updatePrivacy({ advancedPronunciationOptIn })}
          />
          <ToggleRow
            title="Kiểm tra tôi có nói đúng câu"
            body="Khi bật, Lingoza có thể dùng dịch vụ nhận dạng giọng nói do trình duyệt hoặc WebView cung cấp để đối chiếu câu bạn nói với câu mục tiêu. Tùy nền tảng, phần nhận dạng này có thể được xử lý ngoài thiết bị."
            checked={privacy.speechRecognitionOptIn}
            onChange={(speechRecognitionOptIn) => updatePrivacy({ speechRecognitionOptIn })}
          />
          <div className="lz-setting-note">
            <span aria-hidden="true">🔒</span>
            <p>
              Thanh điệu, nhịp, tốc độ và khoảng nghỉ vẫn có lớp chấm cục bộ. Chấm phát âm nâng cao là quyền riêng biệt và luôn mặc định tắt. {advancedConfigured
                ? "Speech Gateway đã được cấu hình cho bản build này."
                : "Bản build này chưa cấu hình Speech Gateway, nên bật tùy chọn nâng cao cũng không gửi audio ra ngoài."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
