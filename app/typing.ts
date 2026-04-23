export type Updater<T> = (updater: (value: T) => void) => void;

export const ROLES = ["system", "user", "assistant"] as const;
export type MessageRole = (typeof ROLES)[number];

export interface RequestMessage {
  role: MessageRole;
  content: string;
}

export type DalleSize = "1024x1024" | "1792x1024" | "1024x1792";
export type DalleQuality =
  | "standard"
  | "hd"
  | "auto"
  | "low"
  | "medium"
  | "high";
export type DalleStyle = "vivid" | "natural";

export type ModelSize =
  | "1024x1024"
  | "1792x1024" // DALL-E 3 landscape
  | "1024x1792" // DALL-E 3 portrait
  | "1024x1536" // gpt-image portrait
  | "1536x1024" // gpt-image landscape
  | "auto" // gpt-image auto
  | "768x1344"
  | "864x1152"
  | "1344x768"
  | "1152x864"
  | "1440x720"
  | "720x1440";

export type ReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";
export type Verbosity = "low" | "medium" | "high";
export type ResponseFormatType = "text" | "json_object" | "json_schema";
