import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type {
  ContentBundle,
  ContentId,
  ExampleSentence,
  LexicalItem,
  SyntaxPattern,
  Topic
} from "../../../../packages/content-schema/src/index";
import { buildTopicIndex } from "../../../../packages/content-schema/src/index";
import {
  buildCurriculumGraph,
  type CurriculumGraph
} from "../../../../packages/curriculum-engine/src/index";

/**
 * Loads the active language pack and exposes resolved views of it.
 *
 * The pack is imported dynamically so it lands in its own chunk: a language
 * pack is pure data and grows without bound, and there is no reason for a
 * learner opening the app to download Chinese A2 content before the first
 * screen paints.
 */

export interface ContentValue {
  bundle: ContentBundle;
  graph: CurriculumGraph;
  item(id: ContentId): LexicalItem | undefined;
  sentence(id: ContentId): ExampleSentence | undefined;
  pattern(id: ContentId): SyntaxPattern | undefined;
  topic(id: ContentId): Topic | undefined;
  scenario(id: ContentId): ContentBundle["scenarios"][number] | undefined;
  assessment(id: ContentId): ContentBundle["assessments"][number] | undefined;
  /** Root topics that the shipped content actually covers. */
  coveredTopics(): Topic[];
}

const ContentContext = createContext<ContentValue | null>(null);

export type ContentStatus = "loading" | "ready" | "error";

function buildValue(bundle: ContentBundle): ContentValue {
  const items = new Map(bundle.lexicalItems.map((entry) => [entry.id, entry]));
  const sentences = new Map(bundle.sentences.map((entry) => [entry.id, entry]));
  const patterns = new Map(bundle.patterns.map((entry) => [entry.id, entry]));
  const scenarios = new Map(bundle.scenarios.map((entry) => [entry.id, entry]));
  const assessments = new Map(bundle.assessments.map((entry) => [entry.id, entry]));
  const topicIndex = buildTopicIndex(bundle.topics);

  // Only surface topics some lesson actually teaches: a home screen full of
  // topics that lead nowhere is worse than a short one that does not.
  const usedTopicIds = new Set<ContentId>();
  for (const lesson of bundle.lessons) {
    for (const topicId of lesson.topics) {
      usedTopicIds.add(topicId);
      for (const ancestor of topicIndex.ancestorsOf(topicId)) usedTopicIds.add(ancestor.id);
    }
  }

  return {
    bundle,
    graph: buildCurriculumGraph(bundle),
    item: (id) => items.get(id),
    sentence: (id) => sentences.get(id),
    pattern: (id) => patterns.get(id),
    topic: (id) => topicIndex.byId.get(id),
    scenario: (id) => scenarios.get(id),
    assessment: (id) => assessments.get(id),
    coveredTopics: () =>
      topicIndex
        .roots()
        .filter((topic) => usedTopicIds.has(topic.id))
        .flatMap((root) => topicIndex.childrenOf(root.id).filter((child) => usedTopicIds.has(child.id)))
  };
}

export function ContentProvider({
  children,
  fallback,
  errorState
}: {
  children: ReactNode;
  fallback: ReactNode;
  errorState: (retry: () => void) => ReactNode;
}) {
  const [bundle, setBundle] = useState<ContentBundle | null>(null);
  const [status, setStatus] = useState<ContentStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    import("../../../../language-packs/zh-CN/src/index")
      .then((pack) => {
        if (cancelled) return;
        setBundle(pack.chineseBundle);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const value = useMemo(() => (bundle ? buildValue(bundle) : null), [bundle]);

  if (status === "error") return <>{errorState(() => setAttempt((n) => n + 1))}</>;
  if (!value) return <>{fallback}</>;

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentValue {
  const value = useContext(ContentContext);
  if (!value) throw new Error("useContent must be used inside <ContentProvider>");
  return value;
}
