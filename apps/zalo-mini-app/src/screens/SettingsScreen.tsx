import { useLearner } from "../app/learner-provider";
import { Card, SectionHeading } from "../components/primitives";

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

export function SettingsScreen() {
  const { snapshot, updatePreferences, updatePrivacy } = useLearner();
  const preferences = snapshot.profile.preferences;
  const privacy = snapshot.profile.privacy;
  const showPinyin = preferences.visibleSupportLayers.includes("pinyin");

  const setPinyin = (enabled: boolean) => {
    const next = new Set(preferences.visibleSupportLayers);
    if (enabled) next.add("pinyin");
    else next.delete("pinyin");
    updatePreferences({ visibleSupportLayers: [...next] });
  };

  return (
    <div className="lz-stack">
      <section className="lz-settings-hero">
        <span aria-hidden="true">🎧</span>
        <div>
          <p className="lz-eyebrow lz-eyebrow--on-accent">TRẢI NGHIỆM HỌC</p>
          <h2>Tinh chỉnh cách Lingoza hỗ trợ bạn</h2>
          <p>Giữ audio làm trung tâm, đồng thời giảm dần phiên âm và nghĩa khi bạn đã tự tin hơn.</p>
        </div>
      </section>

      <Card>
        <SectionHeading title="Hiển thị khi học" />
        <div className="lz-settings-group">
          <ToggleRow
            title="Hiện Pinyin"
            body="Phiên âm hỗ trợ người mới. Có thể tắt để luyện nghe và nhận diện chữ tự nhiên hơn."
            checked={showPinyin}
            onChange={setPinyin}
          />
          <ToggleRow
            title="Hiện nghĩa tiếng Việt"
            body="Ẩn nghĩa khi bạn muốn buộc bản thân hiểu trực tiếp từ âm thanh và ngữ cảnh."
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
            title="Cho phép analytics học tập"
            body="Chỉ cho phép các sự kiện học tập không chứa bản ghi âm hay nội dung bạn nói."
            checked={privacy.analyticsOptIn}
            onChange={(analyticsOptIn) => updatePrivacy({ analyticsOptIn })}
          />
          <div className="lz-setting-note">
            <span aria-hidden="true">🔒</span>
            <p>
              Bản ghi luyện nói mặc định không được lưu lâu dài. Hiện tại Lingoza xử lý trên thiết bị và loại bỏ bản ghi sau lượt luyện.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
