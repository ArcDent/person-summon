import type { ParsedResult } from "@/types";

export function generateToml(parsed: ParsedResult): string {
  const lines: string[] = [];

  // [personality] section
  lines.push("[personality]");
  lines.push(`personality = ${escapeBasicString(parsed.personality)}`);
  lines.push(`reply_style = ${escapeBasicString(parsed.reply_style)}`);

  if (parsed.multiple_reply_style.length > 0) {
    lines.push("multiple_reply_style = [");
    for (const style of parsed.multiple_reply_style) {
      lines.push(`  ${escapeBasicString(style)},`);
    }
    lines.push("]");
  } else {
    lines.push("multiple_reply_style = []");
  }

  lines.push("");

  // [chat] section
  lines.push("[chat]");
  lines.push(`group_chat_prompt = ${escapeBasicString(parsed.group_chat_prompt)}`);
  lines.push(`private_chat_prompts = ${escapeBasicString(parsed.private_chat_prompts)}`);

  // [[chat.chat_prompts]] array of tables
  for (const cp of parsed.chat_prompts) {
    lines.push("");
    lines.push("[[chat.chat_prompts]]");
    lines.push(`platform = ${escapeBasicString(cp.platform)}`);
    lines.push(`item_id = ${escapeBasicString(cp.item_id)}`);
    lines.push(`rule_type = ${escapeBasicString(cp.rule_type)}`);
    lines.push(`prompt = ${escapeBasicString(cp.prompt)}`);
  }

  lines.push("");
  return lines.join("\n");
}

function escapeBasicString(s: string): string {
  return '"' + s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t") + '"';
}
