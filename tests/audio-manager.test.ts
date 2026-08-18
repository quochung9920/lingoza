import { describe, expect, it } from "vitest";

import { AudioManager } from "../apps/zalo-mini-app/src/audio/audio-manager.js";
import type { AudioTrack } from "../packages/content-schema/src/index.js";

const track = (src: string): AudioTrack => ({
  src,
  speed: "normal",
  speakerId: "test-speaker",
  accent: "standard-mandarin",
  durationMs: 1000
});

describe("AudioManager URL resolution", () => {
  it("resolves a relative asset below the language pack path", () => {
    const manager = new AudioManager({
      baseUrl: "https://cdn.example.com/audio/",
      basePath: "/zh-CN/"
    });

    expect(manager.resolve(track("items/zh.w.hello.mp3"))).toBe(
      "https://cdn.example.com/audio/zh-CN/items/zh.w.hello.mp3"
    );
  });

  it("does not rewrite an absolute recording URL", () => {
    const manager = new AudioManager({
      baseUrl: "https://cdn.example.com/audio",
      basePath: "zh-CN"
    });

    expect(manager.resolve(track("https://media.example.com/hello.mp3"))).toBe(
      "https://media.example.com/hello.mp3"
    );
  });
});
