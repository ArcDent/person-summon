import { describe, it, expect } from "vitest";
import { normalizeResult, buildConfigBlocks, CONFIG_BLOCK_WHITELIST } from "@/lib/normalizer";
import type { ParsedResult } from "@/types";

const sampleParsed: ParsedResult = {
  personality: "你是一个活泼的二次元爱好者",
  reply_style: "风格简短有趣",
  multiple_reply_style: ["用表情包回复", "用颜文字回复"],
  group_chat_prompt: "在群里活跃发言",
  private_chat_prompts: "私聊时温柔体贴",
  chat_prompts: [
    { platform: "qq", item_id: "", rule_type: "group", prompt: "QQ群专属规则" },
  ],
  notes: ["需要人工确认第一条"],
};

describe("CONFIG_BLOCK_WHITELIST", () => {
  it("contains all 6 expected fields", () => {
    expect(CONFIG_BLOCK_WHITELIST).toEqual([
      "personality.personality",
      "personality.reply_style",
      "personality.multiple_reply_style",
      "chat.group_chat_prompt",
      "chat.private_chat_prompts",
      "chat.chat_prompts",
    ]);
  });
});

describe("normalizeResult", () => {
  it("passes through valid data unchanged", () => {
    const result = normalizeResult(sampleParsed);
    expect(result).toEqual(sampleParsed);
  });

  it("ensures multiple_reply_style is array", () => {
    const raw = { ...sampleParsed, multiple_reply_style: "single string" };
    const result = normalizeResult(raw as any);
    expect(Array.isArray(result.multiple_reply_style)).toBe(true);
  });

  it("trims whitespace from string fields", () => {
    const raw = { ...sampleParsed, personality: "  带空格  " };
    const result = normalizeResult(raw as any);
    expect(result.personality).toBe("带空格");
  });

  it("caps multiple_reply_style to 5 items", () => {
    const raw = { ...sampleParsed, multiple_reply_style: ["1", "2", "3", "4", "5", "6", "7"] };
    const result = normalizeResult(raw as any);
    expect(result.multiple_reply_style).toHaveLength(5);
  });
});

describe("buildConfigBlocks", () => {
  it("builds 6 config blocks from valid parsed result", () => {
    const blocks = buildConfigBlocks(sampleParsed);
    expect(blocks).toHaveLength(6);
    const ids = blocks.map(b => b.id);
    expect(ids).toContain("personality.personality");
    expect(ids).toContain("chat.chat_prompts");
  });

  it("each block has non-empty title and toml", () => {
    const blocks = buildConfigBlocks(sampleParsed);
    for (const block of blocks) {
      expect(block.title).toBeTruthy();
      expect(block.toml).toBeTruthy();
      expect(block.section).toBeTruthy();
      expect(block.field).toBeTruthy();
    }
  });

  it("block ids match whitelist", () => {
    const blocks = buildConfigBlocks(sampleParsed);
    for (const block of blocks) {
      expect(CONFIG_BLOCK_WHITELIST).toContain(block.id);
    }
  });

  it("personality block has correct section and field", () => {
    const blocks = buildConfigBlocks(sampleParsed);
    const pb = blocks.find(b => b.id === "personality.personality");
    expect(pb).toBeDefined();
    expect(pb!.section).toBe("personality");
    expect(pb!.field).toBe("personality");
  });
});
