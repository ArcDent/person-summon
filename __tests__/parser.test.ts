import { describe, it, expect } from "vitest";
import { extractJsonObject } from "@/lib/parser";

describe("extractJsonObject", () => {
  it("parses plain JSON object", () => {
    const input = '{"personality":"test","notes":[]}';
    const result = extractJsonObject(input);
    expect(result).toEqual({ personality: "test", notes: [] });
  });

  it("strips markdown code block with json tag", () => {
    const input = '```json\n{"personality":"test","notes":[]}\n```';
    const result = extractJsonObject(input);
    expect(result).toEqual({ personality: "test", notes: [] });
  });

  it("strips markdown code block without language tag", () => {
    const input = '```\n{"personality":"test","notes":[]}\n```';
    const result = extractJsonObject(input);
    expect(result).toEqual({ personality: "test", notes: [] });
  });

  it("extracts JSON from text with surrounding content", () => {
    const input = 'Here is the result:\n{"personality":"test","notes":[]}\nDone.';
    const result = extractJsonObject(input);
    expect(result).toEqual({ personality: "test", notes: [] });
  });

  it("extracts first { to last } when direct parse fails", () => {
    const input = 'Prefix text {"personality":"test","notes":[]} suffix text';
    const result = extractJsonObject(input);
    expect(result).toEqual({ personality: "test", notes: [] });
  });

  it("handles nested objects and arrays", () => {
    const input = '{"personality":"test","chat_prompts":[{"platform":"qq","item_id":"","rule_type":"group","prompt":"hello"}],"notes":["note1"]}';
    const result = extractJsonObject(input);
    expect(result.personality).toBe("test");
    expect(result.chat_prompts).toHaveLength(1);
    expect(result.notes).toEqual(["note1"]);
  });

  it("throws on non-JSON input without braces", () => {
    const input = "This is just plain text with no JSON.";
    expect(() => extractJsonObject(input)).toThrow("模型没有返回可解析的 JSON 对象");
  });

  it("handles empty input", () => {
    expect(() => extractJsonObject("")).toThrow();
  });

  it("handles unicode characters in JSON", () => {
    const input = '{"personality":"你好世界","reply_style":"日本語テスト"}';
    const result = extractJsonObject(input);
    expect(result.personality).toBe("你好世界");
    expect(result.reply_style).toBe("日本語テスト");
  });
});
