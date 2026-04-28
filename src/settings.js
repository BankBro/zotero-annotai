var ZoteroAnnotAISettings = {
  prefRoot: "extensions.zoteroAnnotAI.",
  log: null,

  defaults: {
    type: "openai-compatible",
    name: "Default OpenAI-compatible",
    baseURL: "",
    model: "",
    apiKey: "",
    timeoutMs: 30000,
    enableStreaming: false,
    lastTestStatus: "",
  },

  init({ log } = {}) {
    this.log = log || ((message) => Zotero.debug(`[Zotero AnnotAI] ${message}`));
  },

  shutdown() {
    this.log = null;
  },

  getActiveProvider() {
    return this.normalizeProvider({
      type: this.getPref("provider.type", this.defaults.type),
      name: this.getPref("provider.name", this.defaults.name),
      baseURL: this.getPref("provider.baseURL", this.defaults.baseURL),
      model: this.getPref("provider.model", this.defaults.model),
      apiKey: this.getPref("provider.apiKey", this.defaults.apiKey),
      timeoutMs: this.getPref("provider.timeoutMs", this.defaults.timeoutMs),
      enableStreaming: this.getPref("provider.enableStreaming", this.defaults.enableStreaming),
      lastTestStatus: this.getPref("provider.lastTestStatus", this.defaults.lastTestStatus),
    });
  },

  saveActiveProvider(profile) {
    const provider = this.normalizeProvider(profile || {});
    this.validateProvider(provider, { requireReady: false });

    this.setPref("provider.type", "openai-compatible");
    this.setPref("provider.name", provider.name || this.defaults.name);
    this.setPref("provider.baseURL", provider.baseURL);
    this.setPref("provider.model", provider.model);
    this.setPref("provider.apiKey", provider.apiKey);
    this.setPref("provider.timeoutMs", provider.timeoutMs);
    this.setPref("provider.enableStreaming", provider.enableStreaming);
    this.log?.(`Provider settings saved ${JSON.stringify(this.redactProvider(provider))}`);
    return this.getActiveProvider();
  },

  setLastTestStatus(status) {
    this.setPref("provider.lastTestStatus", String(status || ""));
  },

  validateProvider(provider, { requireReady } = { requireReady: true }) {
    if (!provider || provider.type !== "openai-compatible") {
      throw this.createMissingConfigError("阶段四仅支持 OpenAI-compatible Provider");
    }

    if (!Number.isInteger(provider.timeoutMs) || provider.timeoutMs < 1000 || provider.timeoutMs > 300000) {
      throw this.createMissingConfigError("超时时间必须在 1000 到 300000 毫秒之间");
    }

    if (!requireReady) {
      return;
    }

    const missing = [];
    if (!provider.baseURL) {
      missing.push("base URL");
    }
    if (!provider.model) {
      missing.push("model");
    }

    if (missing.length) {
      throw this.createMissingConfigError(`Provider 配置不完整：缺少 ${missing.join("、")}`);
    }
  },

  normalizeProvider(profile) {
    const timeoutMs = Number(profile.timeoutMs);
    return {
      type: "openai-compatible",
      name: this.normalizeString(profile.name) || this.defaults.name,
      baseURL: this.normalizeString(profile.baseURL).replace(/\/+$/, ""),
      model: this.normalizeString(profile.model),
      apiKey: this.normalizeString(profile.apiKey),
      timeoutMs: Number.isFinite(timeoutMs) ? Math.round(timeoutMs) : this.defaults.timeoutMs,
      enableStreaming: Boolean(profile.enableStreaming),
      lastTestStatus: this.normalizeString(profile.lastTestStatus),
    };
  },

  normalizeString(value) {
    return typeof value === "string" ? value.trim() : "";
  },

  getPref(key, fallback) {
    try {
      const value = Zotero.Prefs.get(this.prefRoot + key);
      return value === undefined || value === null ? fallback : value;
    }
    catch (error) {
      this.log?.(`Unable to read preference ${key}: ${error.message}`);
      return fallback;
    }
  },

  setPref(key, value) {
    Zotero.Prefs.set(this.prefRoot + key, value);
  },

  createMissingConfigError(message) {
    if (typeof ZoteroAnnotAIProviderErrors !== "undefined") {
      return new ZoteroAnnotAIProviderErrors.MissingConfigError(message);
    }

    const error = new Error(message);
    error.name = "MissingConfigError";
    return error;
  },

  redactProvider(provider) {
    if (typeof ZoteroAnnotAIProviderErrors !== "undefined") {
      return ZoteroAnnotAIProviderErrors.redactProvider(provider);
    }

    return {
      type: provider?.type,
      name: provider?.name,
      baseURL: provider?.baseURL,
      model: provider?.model,
      timeoutMs: provider?.timeoutMs,
      enableStreaming: provider?.enableStreaming,
      hasApiKey: Boolean(provider?.apiKey),
    };
  },
};
