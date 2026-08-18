import { useCallback, useState } from "react";

import type { ContentId } from "../../../packages/content-schema/src/index";
import { AudioProvider } from "./app/audio-provider";
import { ContentProvider } from "./app/content-provider";
import { LearnerProvider } from "./app/learner-provider";
import { ErrorState, LoadingState } from "./components/primitives";
import { AppShell, BottomNav, MiniAppSafeHeader, type TabId } from "./components/shell";
import { ct } from "./lib/i18n";
import { HomeScreen } from "./screens/HomeScreen";
import { LessonPlayer } from "./screens/LessonPlayer";
import { ConversationScreen, PracticeScreen, ProgressScreen } from "./screens/PracticeScreens";
import { CourseMapScreen, UnitScreen } from "./screens/UnitScreen";

/**
 * Root component and navigation.
 *
 * Navigation is a small explicit stack rather than a router. A Mini App has no
 * URL bar and no browser Back, so the only thing a router would buy is a
 * dependency; what actually matters is that Back always pops one level, which
 * a stack gives directly.
 */

type Route =
  | { name: "tab"; tab: TabId }
  | { name: "course" }
  | { name: "unit"; unitId: ContentId }
  | { name: "lesson"; lessonId: ContentId }
  | { name: "topic"; topicId: ContentId };

function AppContent() {
  const [stack, setStack] = useState<Route[]>([{ name: "tab", tab: "learn" }]);
  const route = stack[stack.length - 1];

  const push = useCallback((next: Route) => setStack((previous) => [...previous, next]), []);
  const pop = useCallback(
    () => setStack((previous) => (previous.length > 1 ? previous.slice(0, -1) : previous)),
    []
  );
  const selectTab = useCallback((tab: TabId) => setStack([{ name: "tab", tab }]), []);

  /* The lesson player owns the whole viewport: no shell, no bottom nav. */
  if (route.name === "lesson") {
    return <LessonPlayer lessonId={route.lessonId} onExit={pop} />;
  }

  const nav = <BottomNav active={route.name === "tab" ? route.tab : "learn"} onChange={selectTab} />;

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

  if (route.name === "course" || route.name === "topic") {
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
          <ProgressScreen onPractice={() => selectTab("speak")} />
        </AppShell>
      );
    case "learn":
    default:
      return (
        <AppShell header={<MiniAppSafeHeader title="Lingoza" />} nav={nav}>
          <HomeScreen
            onOpenLesson={(lessonId) => push({ name: "lesson", lessonId })}
            onOpenUnit={(unitId) => push({ name: "unit", unitId })}
            onOpenReview={() => selectTab("speak")}
            onOpenTopic={(topicId) => push({ name: "topic", topicId })}
          />
        </AppShell>
      );
  }
}

export default function App() {
  return (
    <LearnerProvider>
      <AudioProvider>
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
          <AppContent />
        </ContentProvider>
      </AudioProvider>
    </LearnerProvider>
  );
}
