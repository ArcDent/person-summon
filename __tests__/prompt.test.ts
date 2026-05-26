import { describe, it, expect } from "vitest";
import { getDefaultPrompt, buildPromptInstruction, DEFAULT_PROMPT_ZH } from "@/lib/prompt";

describe("DEFAULT_PROMPT_ZH", () => {
  it("includes key MaiMai-compatible sections", () => {
    const prompt = DEFAULT_PROMPT_ZH;
    expect(prompt).toContain("[personality]");
    expect(prompt).toContain("[chat]");
    expect(prompt).toContain("personality");
    expect(prompt).toContain("reply_style");
    expect(prompt).toContain("multiple_reply_style");
    expect(prompt).toContain("group_chat_prompt");
    expect(prompt).toContain("private_chat_prompts");
    expect(prompt).toContain("chat_prompts");
    expect(prompt).toContain("notes");
  });

  it("matches known MaiMai prompt structure (snapshot)", () => {
    expect(DEFAULT_PROMPT_ZH).toMatchSnapshot();
  });
});

describe("buildPromptInstruction", () => {
  it("injects targetScene into prompt", () => {
    const result = buildPromptInstruction("群聊和私聊", "简体中文", "无");
    expect(result).toContain("群聊和私聊");
  });

  it("injects language into prompt", () => {
    const result = buildPromptInstruction("群聊", "English", "无");
    expect(result).toContain("English");
  });

  it("injects extra requirements", () => {
    const result = buildPromptInstruction("群聊", "简体中文", "保持角色一致性");
    expect(result).toContain("保持角色一致性");
  });

  it("handles empty extra requirements", () => {
    const result = buildPromptInstruction("both", "简体中文", "");
    expect(result).toContain('额外要求：\n无');
  });
});
