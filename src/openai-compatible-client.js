var ZoteroAnnotAIOpenAICompatibleClient = {
  async chatCompletions({ provider, messages, signal, stream = false }) {
    const Errors = this.getErrors();
    const url = this.getChatCompletionsURL(provider);
    const headers = {
      "Content-Type": "application/json",
    };

    if (provider.apiKey) {
      headers.Authorization = `Bearer ${provider.apiKey}`;
    }

    const body = JSON.stringify({
      model: provider.model,
      messages,
      stream: Boolean(stream),
      temperature: 0,
    });

    let response;
    let responseText = "";

    try {
      response = await this.getFetch()(
        url,
        {
        method: "POST",
        headers,
        body,
        signal,
        }
      );
      responseText = await response.text();
    }
    catch (error) {
      if (error?.name === "AbortError") {
        throw error;
      }
      throw new Errors.NetworkError("Provider network request failed", {
        causeName: error?.name,
        causeMessage: Errors.sanitizeMessage(error?.message),
      });
    }

    if (!response.ok) {
      throw this.createHTTPError(response, responseText);
    }

    let payload;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    }
    catch {
      throw new Errors.InvalidResponseError("Provider response is not valid JSON");
    }

    const content = this.extractAssistantContent(payload);
    if (!content) {
      throw new Errors.InvalidResponseError("Provider response does not contain assistant content");
    }

    return {
      id: payload.id || null,
      model: payload.model || provider.model,
      content,
      usage: payload.usage || null,
      finishReason: payload.choices?.[0]?.finish_reason || null,
    };
  },

  getChatCompletionsURL(provider) {
    const baseURL = String(provider?.baseURL || "").replace(/\/+$/, "");
    return `${baseURL}/chat/completions`;
  },

  createHTTPError(response, responseText) {
    const Errors = this.getErrors();
    const details = this.parseErrorBody(responseText);
    const message = details.message || `Provider returned HTTP ${response.status}`;
    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      providerCode: details.code,
      providerType: details.type,
    };

    if (response.status === 401 || response.status === 403) {
      return new Errors.AuthError(message, errorDetails);
    }

    if (response.status === 429) {
      return new Errors.RateLimitError(message, errorDetails);
    }

    if (details.code && String(details.code).toLowerCase().includes("model")) {
      return new Errors.ModelNotFoundError(message, errorDetails);
    }

    return new Errors.ProviderHTTPError(message, errorDetails);
  },

  parseErrorBody(responseText) {
    const Errors = this.getErrors();
    if (!responseText) {
      return {};
    }

    try {
      const payload = JSON.parse(responseText);
      const error = payload.error || payload;
      return {
        message: Errors.sanitizeMessage(error.message || payload.message),
        code: error.code || payload.code || "",
        type: error.type || payload.type || "",
      };
    }
    catch {
      return {
        message: Errors.sanitizeMessage(responseText),
      };
    }
  },

  extractAssistantContent(payload) {
    const message = payload?.choices?.[0]?.message;
    const content = message?.content;

    if (typeof content === "string") {
      return content.trim();
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => typeof part?.text === "string" ? part.text : "")
        .join("")
        .trim();
    }

    return "";
  },

  getFetch() {
    if (typeof fetch === "function") {
      return fetch.bind(globalThis);
    }

    const mainWindow = typeof Zotero !== "undefined" && Zotero.getMainWindow?.();
    if (mainWindow?.fetch) {
      return mainWindow.fetch.bind(mainWindow);
    }

    const hiddenWindow = typeof Services !== "undefined" && Services.appShell?.hiddenDOMWindow;
    if (hiddenWindow?.fetch) {
      return hiddenWindow.fetch.bind(hiddenWindow);
    }

    const Errors = this.getErrors();
    throw new Errors.NetworkError("Fetch API is not available");
  },

  getErrors() {
    if (typeof ZoteroAnnotAIProviderErrors !== "undefined") {
      return ZoteroAnnotAIProviderErrors;
    }

    throw new Error("Zotero AnnotAI provider error module is unavailable");
  },
};
