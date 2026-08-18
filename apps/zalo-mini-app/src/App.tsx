import { useCallback, useState } from "react";

import type { ContentId } from "../../../packages/content-schema/src/index";
import { AudioProvider } from "./app/audio-provider";
import { ContentProvider } from "./app/content-provider";
import { LearnerProvider, useLearner } from "./app/learner-provider";
import { ErrorState, LoadingState } from "./components/primitives";
import { AppShell, BottomNav, MiniAppSafeHeader, type TabId } from "./components/shell";
import { ct } from "./lib/i18n";
import { HomeScreen } from "./screens/HomeScreen";
import { LessonPlayer } from "./screens/LessonPlayer";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { ConversationScreen, PracticeScreen, ProgressScreen } from "./screens/PracticeScreens";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TopicScreen } from "./screens/TopicScreen";
import { CourseMapScreen, UnitScreen } from "./screens/UnitScreen";

type Route =
  | { name: "tab"; tab: TabId }
  | { name: "course" }
  | { name: "unit"; unitId: ContentId }
  | { name: "lesson"; lessonId: ContentId }
  | { name: "topic"; topicId: ContentId }
  | { name: "scenario"; scenarioId: ContentId }
  | { name: "settings" };

function AppContent() {
  const [stack, setStack] = useState<Route[]>([{ name: "tab", tab: "learn" }]);
  const route = stack[stack.length - 1];

  const push = useCallback((next: Route) => setStack((previous) => [...previous, next]), []);
  const pop = useCallback(
    () => setStack((previous) => (previous.length > 1 ? previous.slice(0, -1) : previous)),
    []
  );
  const selectTab = useCallback((tab: TabId) => setStack([{ name: "tab", tab }]), []);

  if (route.name === "lesson") {
    return <LessonPlayer lessonId={route.lessonId} onExit={pop} />;
  }

  if (route.name === "scenario") {
    return (
      <AppShell header={<MiniAppSafeHeader title={ct("nav.talk")} />}>
        <ConversationScreen initialScenarioId={route.scenarioId} onExitScenario={pop} />
      </AppShell>
    );
  }

  const activeTab: TabId =
    route.name === "tab" ? route.tab : route.name === "settings" ? "progress" : "learn";
  const nav = <BottomNav active={activeTab} onChange={selectTab} />;

  if (route.name === "settings") {
    return (
      <AppShell header={<MiniAppSafeHeader title="Cài đặt học" onBack={pop} bordered />} nav={nav}>
        <SettingsScreen />
      </AppShell>
    );
  }

  if (route.name === "unit") {
    return (
      <AppShell
        header={<MiniAppSafeHeader title={ct("nav.learn")} onBack={pop} bordered />}
        nav={nav}
      >
        <UnitScreen
          unitId={route.unitId}
          onOpenLesson={(lessonId) => push({ name: "lesson", lessonId })}
        />
      </AppShell>
    );
  }

  if (route.name === "topic") {
    return (
      <AppShell header={<MiniAppSafeHeader title="Chủ đề" onBack={pop} bordered />} nav={nav}>
        <TopicScreen
          topicId={route.topicId}
          onOpenUnit={(unitId) => push({ name: "unit", unitId })}
          onOpenLesson={(lessonId) => push({ name: "lesson", lessonId })}
          onOpenScenario={(scenarioId) => push({ name: "scenario", scenarioId })}
        />
      </AppShell>
    );
  }

  if (route.name === "course") {
    return (
      <AppShell header={<MiniAppSafeHeader title="Lộ trình" onBack={pop} bordered />} nav={nav}>
        <CourseMapScreen onOpenUnit={(unitId) => push({ name: "unit", unitId })} />
      </AppShell>
    );
  }

  switch (route.tab) {
    case "speak":
      return (
        <AppShell header={<MiniAppSafeHeader title={ct("nav.speak")} />} nav={nav}>
          <PracticeScreen onGoLearn={() => selectTab("learn")} />
        </AppShell>
      );
    case "talk":
      return (
        <AppShell header={<MiniAppSafeHeader title={ct("nav.talk")} />} nav={nav}>
          <ConversationScreen />
        </AppShell>
      );
    case "progress":
      return (
        <AppShell header={<MiniAppSafeHeader title={ct("nav.progress")} />} nav={nav}>
          <div className="lz-stack">
            <button
              type="button"
              className="lz-btn lz-btn--secondary lz-btn--block"
              onClick={() => push({ name: "settings" })}
            >
              ⚙️ Cài đặt cách học
            </button>
            <ProgressScreen onPractice={() => selectTab("speak")} />
          </div>
        </AppShell>
      );
    case "learn":
    default:
      return (
        <AppShell header={<MiniAppSafeHeader title="Lingoza" />} nav={nav}>
          <HomeScreen
            onOpenLesson={(lessonId) => push({ name: "lesson", lessonId })}
            onOpenUnit={(unitId) => push({ name: "unit", unitId })}
            onOpenCourse={() => push({ name: "course" })}
            onOpenReview={() => selectTab("speak")}
            onOpenTopic={(topicId) => push({ name: "topic", topicId })}
          />
        </AppShell>
      );
  }
}

function LearnerApp() {
  const { snapshot, hydrated, completeOnboarding } = useLearner();

  if (!hydrated) {
    return (
      <AppShell header={<MiniAppSafeHeader title="Lingoza" />}>
        <LoadingState label="Đang khôi phục tiến độ học…" />
      </AppShell>
    );
  }

  if (!snapshot.profile.onboardingCompleted) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <ContentProvider
      fallback={
        <AppShell header={<MiniAppSafeHeader title="Lingoza" />}>
          <LoadingState />
        </AppShell>
      }
      errorState={(retry) => (
        <AppShell header={<MiniAppSafeHeader title="Lingoza" />}>
          <ErrorState
            title={ct("error.contentTitle")}
            body={ct("error.contentBody")}
            onRetry={retry}
          />
        </AppShell>
      )}
    >
      <AudioProvider>
        <AppContent />
      </AudioProvider>
    </ContentProvider>
  );
}

export default function App() {
  return (
    <LearnerProvider>
      <LearnerApp />
    </LearnerProvider>
  );
}
