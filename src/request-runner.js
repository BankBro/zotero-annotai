var ZoteroAnnotAIRequestRunner = {
  settings: null,
  client: null,
  errors: null,
  log: null,

  init({ settings, client, errors, log } = {}) {
    this.settings = settings || (typeof ZoteroAnnotAISettings !== "undefined" ? ZoteroAnnotAISettings : null);
    this.client = client || (typeof ZoteroAnnotAIOpenAICompatibleClient !== "undefined" ? ZoteroAnnotAIOpenAICompatibleClient : null);
    this.errors = errors || (typeof ZoteroAnnotAIProviderErrors !== "undefined" ? ZoteroAnnotAIProviderErrors : null);
    this.log = log || ((message) => Zotero.debug(`[Zotero AnnotAI] ${message}`));
    this.log("Provider request runner initialized");
  },

  shutdown() {
    this.settings = null;
    this.client = null;
    this.errors = null;
    this.log = null;
  },

  async testActiveProvider({ signal } = {}) {
    this.ensureInitialized();
    const provider = this.settings.getActiveProvider();
    const startedAt = Date.now();

    try {
      this.settings.validateProvider(provider, { requireReady: true });
      const result = await this.runChat({
        provider,
        messages: [
          {
            role: "system",
            content: "You are testing connectivity for Zotero AnnotAI. Reply with OK only.",
          },
          {
            role: "user",
            content: "Connection test. Reply with OK.",
          },
        ],
        timeoutMs: provider.timeoutMs,
        signal,
      });

      const elapsedMs = Date.now() - startedAt;
      const status = `连接测试成功：${result.model || provider.model}，${elapsedMs}ms`;
      this.settings.setLastTestStatus(status);
      this.log?.(`Provider connection test succeeded model=${result.model || provider.model} elapsedMs=${elapsedMs}`);
      return {
        ok: true,
        status,
        result,
        elapsedMs,
      };
    }
    catch (error) {
      const normalized = this.normalizeError(error, { timedOut: false, cancelled: false });
      const status = `连接测试失败：${this.errors.toUserMessage(normalized)}`;
      this.settings.setLastTestStatus(status);
      this.log?.(`Provider connection test failed error=${normalized.name} message=${this.errors.sanitizeMessage(normalized.message)}`);
      throw normalized;
    }
  },

  async runChat({ provider, messages, timeoutMs, signal } = {}) {
    this.ensureInitialized();
    const safeProvider = this.settings.normalizeProvider(provider || {});
    this.settings.validateProvider(safeProvider, { requireReady: true });
    this.validateMessages(messages);

    const timeout = Number.isInteger(timeoutMs) ? timeoutMs : safeProvider.timeoutMs;
    const controller = this.createAbortController();
    const startedAt = Date.now();
    let timedOut = false;
    let cancelled = false;

    const timeoutID = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);

    const abortFromExternalSignal = () => {
      cancelled = true;
      controller.abort();
    };

    if (signal) {
      if (signal.aborted) {
        abortFromExternalSignal();
      }
      else {
        signal.addEventListener("abort", abortFromExternalSignal, { once: true });
      }
    }

    try {
      this.log?.(`Provider request started ${JSON.stringify(this.errors.redactProvider(safeProvider))}`);
      const result = await this.client.chatCompletions({
        provider: safeProvider,
        messages,
        signal: controller.signal,
        stream: false,
      });
      this.log?.(`Provider request succeeded model=${result.model || safeProvider.model} elapsedMs=${Date.now() - startedAt}`);
      return result;
    }
    catch (error) {
      const normalized = this.normalizeError(error, { timedOut, cancelled });
      this.log?.(`Provider request failed error=${normalized.name} elapsedMs=${Date.now() - startedAt}`);
      throw normalized;
    }
    finally {
      clearTimeout(timeoutID);
      signal?.removeEventListener?.("abort", abortFromExternalSignal);
    }
  },

  validateMessages(messages) {
    if (!Array.isArray(messages) || !messages.length) {
      throw new this.errors.MissingConfigError("请求消息不能为空");
    }

    for (let message of messages) {
      if (!["system", "user", "assistant"].includes(message?.role) || typeof message?.content !== "string") {
        throw new this.errors.MissingConfigError("请求消息格式无效");
      }
    }
  },

  normalizeError(error, { timedOut, cancelled }) {
    if (error instanceof this.errors.ProviderError) {
      return error;
    }

    if (timedOut || error?.name === "TimeoutError") {
      return new this.errors.TimeoutError("Provider request timed out");
    }

    if (cancelled || error?.name === "AbortError") {
      return new this.errors.RequestCancelledError("Provider request was cancelled");
    }

    if (error?.name === "MissingConfigError") {
      return new this.errors.MissingConfigError(error.message);
    }

    return new this.errors.NetworkError("Provider request failed", {
      causeName: error?.name,
      causeMessage: this.errors.sanitizeMessage(error?.message),
    });
  },

  createAbortController() {
    if (typeof AbortController !== "undefined") {
      return new AbortController();
    }

    const mainWindow = typeof Zotero !== "undefined" && Zotero.getMainWindow?.();
    if (mainWindow?.AbortController) {
      return new mainWindow.AbortController();
    }

    const hiddenWindow = typeof Services !== "undefined" && Services.appShell?.hiddenDOMWindow;
    if (hiddenWindow?.AbortController) {
      return new hiddenWindow.AbortController();
    }

    throw new this.errors.NetworkError("AbortController is not available");
  },

  ensureInitialized() {
    if (!this.settings || !this.client || !this.errors) {
      throw new Error("Zotero AnnotAI request runner is not initialized");
    }
  },
};
