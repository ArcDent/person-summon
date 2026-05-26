// ====== Provider & Model ======
export interface ModelInfo {
  id: string;
  displayName: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: "openai" | "anthropic";
  endpoint: string;
  apiKey: string;
  models: ModelInfo[];
  createdAt: string;
}

export type ProviderConfigPublic = Omit<ProviderConfig, "apiKey">;

// ====== Generate Request ======
export interface GenerateRequest {
  providerId: string;
  modelId: string;
  sourceText: string;
  targetScene: "group" | "private" | "both";
  language: string;
  extraRequirements: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

// ====== Parsed Result (compatible with MaiMai) ======
export interface ChatPrompt {
  platform: string;
  item_id: string;
  rule_type: "group" | "private";
  prompt: string;
}

export interface ParsedResult {
  personality: string;
  reply_style: string;
  multiple_reply_style: string[];
  group_chat_prompt: string;
  private_chat_prompts: string;
  chat_prompts: ChatPrompt[];
  notes: string[];
}

// ====== Config Block ======
export interface ConfigBlock {
  id: string;
  section: string;
  field: string;
  title: string;
  description: string;
  value: string | string[] | ChatPrompt[];
  toml: string;
}

// ====== Generate Response ======
export interface GenerateResponse {
  id: string;
  parsed: ParsedResult;
  blocks: ConfigBlock[];
  toml: string;
  rawResponse: string;
  createdAt: string;
}

// ====== History ======
export interface HistoryItem {
  id: string;
  providerId: string | null;
  modelId: string | null;
  requestJson: GenerateRequest;
  resultJson: GenerateResponse;
  createdAt: string;
}

// ====== API Wrappers ======
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

// ====== Prompt Template ======
export interface PromptTemplate {
  language: string;
  template: string;
  updatedAt: string;
}
