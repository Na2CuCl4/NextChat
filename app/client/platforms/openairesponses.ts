"use client";
import {
  ApiPath,
  OPENAI_BASE_URL,
  OpenAIResponsesPath,
  REQUEST_TIMEOUT_MS,
} from "@/app/constant";
import { useAccessStore, useAppConfig, useChatStore } from "@/app/store";
import {
  preProcessImageContentForResponses,
  streamWithThink,
} from "@/app/utils/chat";
import { cloudflareAIGatewayUrl } from "@/app/utils/cloudflare";

import {
  ChatOptions,
  getHeaders,
  LLMApi,
  LLMModel,
  LLMUsage,
  SpeechOptions,
} from "../api";
import { getClientConfig } from "@/app/config/client";
import { getMessageTextContent, isVisionModel } from "@/app/utils";
import { fetch } from "@/app/utils/stream";

export interface ResponsesMultimodalContent {
  type: "input_text" | "input_image";
  text?: string;
  image_url?: string;
}

export interface ResponsesRequestPayload {
  model: string;
  input: {
    role: "developer" | "user" | "assistant";
    content: string | ResponsesMultimodalContent[];
  }[];
  stream?: boolean;
}

export class OpenAIResponsesApi implements LLMApi {
  path(path: string): string {
    const accessStore = useAccessStore.getState();

    let baseUrl = "";

    if (accessStore.useCustomConfig) {
      baseUrl = accessStore.openaiUrl;
    }

    if (baseUrl.length === 0) {
      const isApp = !!getClientConfig()?.isApp;
      baseUrl = isApp ? OPENAI_BASE_URL : ApiPath.OpenAIResponses;
    }

    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, baseUrl.length - 1);
    }
    if (
      !baseUrl.startsWith("http") &&
      !baseUrl.startsWith(ApiPath.OpenAIResponses)
    ) {
      baseUrl = "https://" + baseUrl;
    }

    console.log("[Proxy Endpoint] ", baseUrl, path);

    return cloudflareAIGatewayUrl([baseUrl, path].join("/"));
  }

  extractMessage(res: any) {
    if (res.error) {
      return "```\n" + JSON.stringify(res, null, 4) + "\n```";
    }
    return (
      res.output?.[0]?.content?.[0]?.text ??
      "```\n" + JSON.stringify(res, null, 4) + "\n```"
    );
  }

  async chat(options: ChatOptions) {
    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig,
      ...{
        model: options.config.model,
        providerName: options.config.providerName,
      },
    };

    const visionModel = isVisionModel(options.config.model);
    const messages: {
      role: "developer" | "user" | "assistant";
      content: string | ResponsesMultimodalContent[];
    }[] = [];
    for (const v of options.messages) {
      const content = visionModel
        ? await preProcessImageContentForResponses(v.content)
        : getMessageTextContent(v);
      messages.push({
        role: (v.role === "system" ? "developer" : v.role) as
          | "developer"
          | "user"
          | "assistant",
        content: content as string | ResponsesMultimodalContent[],
      });
    }

    const requestPayload: ResponsesRequestPayload = {
      model: modelConfig.model,
      input: messages,
      stream: options.config.stream,
    };

    console.log("[Request] openai responses payload: ", requestPayload);

    const chatPath = this.path(OpenAIResponsesPath.ChatPath);
    const shouldStream = !!options.config.stream;
    const controller = new AbortController();
    options.onController?.(controller);

    try {
      if (shouldStream) {
        streamWithThink(
          chatPath,
          requestPayload,
          getHeaders(),
          [],
          {},
          controller,
          // parseSSE
          (text: string) => {
            const json = JSON.parse(text);
            if (json.type === "response.output_text.delta") {
              return { isThinking: false, content: json.delta ?? "" };
            }
            return { isThinking: false, content: "" };
          },
          // processToolMessage (no-op for Responses API)
          () => {},
          options,
        );
      } else {
        const chatPayload = {
          method: "POST",
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
          headers: getHeaders(),
        };

        const requestTimeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS,
        );

        const res = await fetch(chatPath, chatPayload);
        clearTimeout(requestTimeoutId);

        const resJson = await res.json();
        const message = this.extractMessage(resJson);
        options.onFinish(message, res);
      }
    } catch (e) {
      console.log("[Request] failed to make a responses request", e);
      options.onError?.(e as Error);
    }
  }

  async speech(_options: SpeechOptions): Promise<ArrayBuffer> {
    throw new Error("Speech is not supported for OpenAI Responses API");
  }

  async usage(): Promise<LLMUsage> {
    return { used: 0, total: 0 };
  }

  async models(): Promise<LLMModel[]> {
    return [];
  }
}
