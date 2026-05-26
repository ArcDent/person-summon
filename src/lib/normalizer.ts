import type { ParsedResult, ConfigBlock, ChatPrompt } from "@/types";

export const CONFIG_BLOCK_WHITELIST = [
  "personality.personality",
  "personality.reply_style",
  "personality.multiple_reply_style",
  "chat.group_chat_prompt",
  "chat.private_chat_prompts",
  "chat.chat_prompts",
];

const BLOCK_META: Record<string, { section: string; field: string; title: string; description: string }> = {
  "personality.personality": { section: "personality", field: "personality", title: "人格设定", description: "稳定人格与身份描述" },
  "personality.reply_style": { section: "personality", field: "reply_style", title: "表达风格", description: "说话方式、回复长度、语气" },
  "personality.multiple_reply_style": { section: "personality", field: "multiple_reply_style", title: "备用表达风格", description: "可选风格池，最多 5 项" },
  "chat.group_chat_prompt": { section: "chat", field: "group_chat_prompt", title: "群聊提示词", description: "群聊场景规则" },
  "chat.private_chat_prompts": { section: "chat", field: "private_chat_prompts", title: "私聊提示词", description: "私聊场景规则" },
  "chat.chat_prompts": { section: "chat", field: "chat_prompts", title: "额外聊天流 Prompt", description: "平台专属规则" },
};

export function normalizeResult(raw: Record<string, unknown>): ParsedResult {
  const personality = String(raw.personality ?? "").trim();
  const reply_style = String(raw.reply_style ?? "").trim();
  const multiple_reply_style = normalizeStringArray(raw.multiple_reply_style).slice(0, 5);
  const group_chat_prompt = String(raw.group_chat_prompt ?? "").trim();
  const private_chat_prompts = String(raw.private_chat_prompts ?? "").trim();
  const chat_prompts = normalizeChatPrompts(raw.chat_prompts);
  const notes = normalizeStringArray(raw.notes);

  return { personality, reply_style, multiple_reply_style, group_chat_prompt, private_chat_prompts, chat_prompts, notes };
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v: unknown) => String(v ?? "").trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function normalizeChatPrompts(value: unknown): ChatPrompt[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({
    platform: String(item.platform ?? ""),
    item_id: String(item.item_id ?? ""),
    rule_type: item.rule_type === "private" ? "private" : "group",
    prompt: String(item.prompt ?? "").trim(),
  }));
}

export function buildConfigBlocks(parsed: ParsedResult): ConfigBlock[] {
  const blocks: ConfigBlock[] = [];
  const values: Record<string, unknown> = {
    "personality.personality": parsed.personality,
    "personality.reply_style": parsed.reply_style,
    "personality.multiple_reply_style": parsed.multiple_reply_style,
    "chat.group_chat_prompt": parsed.group_chat_prompt,
    "chat.private_chat_prompts": parsed.private_chat_prompts,
    "chat.chat_prompts": parsed.chat_prompts,
  };

  for (const id of CONFIG_BLOCK_WHITELIST) {
    const meta = BLOCK_META[id];
    if (!meta) continue;
    const value = values[id];
    const toml = blockToToml(meta.section, meta.field, value);
    blocks.push({
      id, section: meta.section, field: meta.field,
      title: meta.title, description: meta.description,
      value: value as ConfigBlock["value"], toml,
    });
  }

  return blocks;
}

function blockToToml(section: string, field: string, value: unknown): string {
  return `[${section}]\n${field} = ${tomlValueString(value)}`;
}

function tomlValueString(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (typeof value[0] === "object" && value[0] !== null) {
      const items = (value as Record<string, unknown>[]).map(item =>
        `[[chat.chat_prompts]]\n${Object.entries(item)
          .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
          .join("\n")}`
      );
      return items.join("\n\n");
    }
    return "[\n  " + value.map(v => JSON.stringify(v)).join(",\n  ") + "\n]";
  }
  return JSON.stringify(value);
}
