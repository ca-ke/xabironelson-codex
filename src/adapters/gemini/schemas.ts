import { z } from "zod";

// Enums
const HarmCategory = z.enum([
  "HARM_CATEGORY_UNSPECIFIED",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
  "HARM_CATEGORY_HARASSMENT",
]);

const HarmBlockThreshold = z.enum([
  "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
  "BLOCK_LOW_AND_ABOVE",
  "BLOCK_MEDIUM_AND_ABOVE",
  "BLOCK_ONLY_HIGH",
  "BLOCK_NONE",
]);

const Role = z.enum(["user", "model", "function"]);

// Parts
const TextPart = z.object({
  text: z.string(),
});

const InlineDataPart = z.object({
  inlineData: z.object({
    mimeType: z.string(),
    data: z.string(),
  }),
});

const FileDataPart = z.object({
  fileData: z.object({
    mimeType: z.string().optional(),
    fileUri: z.string(),
  }),
});

const FunctionCallPart = z.object({
  functionCall: z.object({
    name: z.string(),
    args: z.record(z.any()).optional(),
  }),
});

const FunctionResponsePart = z.object({
  functionResponse: z.object({
    name: z.string(),
    response: z.record(z.any()),
  }),
});

const PartSchema = z.union([
  TextPart,
  InlineDataPart,
  FileDataPart,
  FunctionCallPart,
  FunctionResponsePart,
]);

const ContentSchema = z.object({
  role: Role.optional(),
  parts: z.array(PartSchema),
});

const SafetySettingSchema = z.object({
  category: HarmCategory,
  threshold: HarmBlockThreshold,
});

const GenerationConfigSchema = z.object({
  stopSequences: z.array(z.string()).optional(),
  responseMimeType: z.string().optional(),
  responseSchema: z.record(z.any()).optional(),
  candidateCount: z.number().int().optional(),
  maxOutputTokens: z.number().int().optional(),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  topK: z.number().int().optional(),
});

const ToolSchema = z.object({
  functionDeclarations: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        parameters: z.record(z.any()).optional(),
      }),
    )
    .optional(),
  googleSearchRetrieval: z
    .object({
      dynamicRetrievalConfig: z.object({
        mode: z.enum(["MODE_UNSPECIFIED", "MODE_DYNAMIC"]),
        dynamicThreshold: z.number().optional(),
      }),
    })
    .optional(),
  codeExecution: z.object({}).optional(),
});

const ToolConfigSchema = z.object({
  functionCallingConfig: z
    .object({
      mode: z.enum(["MODE_UNSPECIFIED", "AUTO", "ANY", "NONE"]),
      allowedFunctionNames: z.array(z.string()).optional(),
    })
    .optional(),
});

// Request Schema
export const GenerateContentBodySchema = z.object({
  contents: z
    .array(ContentSchema)
    .min(1, "At least one content (message) is required."),
  tools: z.array(ToolSchema).optional(),
  toolConfig: ToolConfigSchema.optional(),
  safetySettings: z.array(SafetySettingSchema).optional(),
  systemInstruction: ContentSchema.optional(),
  generationConfig: GenerationConfigSchema.optional(),
  cachedContent: z.string().optional(),
});

// Response Schemas
const SafetyRatingSchema = z.object({
  category: HarmCategory,
  probability: z.enum(["NEGLIGIBLE", "LOW", "MEDIUM", "HIGH"]),
  blocked: z.boolean().optional(),
});

const CandidateSchema = z.object({
  content: ContentSchema,
  finishReason: z
    .enum([
      "FINISH_REASON_UNSPECIFIED",
      "STOP",
      "MAX_TOKENS",
      "SAFETY",
      "RECITATION",
      "OTHER",
    ])
    .optional(),
  safetyRatings: z.array(SafetyRatingSchema).optional(),
  index: z.number().int().optional(),
});

const UsageMetadataSchema = z.object({
  promptTokenCount: z.number().int().optional(),
  candidatesTokenCount: z.number().int().optional(),
  totalTokenCount: z.number().int().optional(),
});

export const GeminiResponseSchema = z.object({
  candidates: z.array(CandidateSchema).optional(),
  usageMetadata: UsageMetadataSchema.optional(),
  modelVersion: z.string().optional(),
});

// Type exports
export type GenerateContentBody = z.infer<typeof GenerateContentBodySchema>;
export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;
export type GeminiContent = z.infer<typeof ContentSchema>;
export type GeminiPart = z.infer<typeof PartSchema>;
