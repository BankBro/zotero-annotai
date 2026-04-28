var ZoteroAnnotAIProviderErrors = (() => {
  class ProviderError extends Error {
    constructor(message, details = {}) {
      super(message);
      this.name = this.constructor.name;
      this.details = details;
    }
  }

  class MissingConfigError extends ProviderError {}
  class AuthError extends ProviderError {}
  class RateLimitError extends ProviderError {}
  class ModelNotFoundError extends ProviderError {}
  class TimeoutError extends ProviderError {}
  class NetworkError extends ProviderError {}
  class InvalidResponseError extends ProviderError {}
  class ProviderHTTPError extends ProviderError {}
  class RequestCancelledError extends ProviderError {}

  function sanitizeMessage(value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) {
      return "";
    }
    return text
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
      .replace(/sk-[A-Za-z0-9._-]+/g, "[redacted-api-key]")
      .slice(0, 300);
  }

  function toUserMessage(error) {
    const message = sanitizeMessage(error?.message);

    switch (error?.name) {
      case "MissingConfigError":
        return message || "Provider 配置不完整";
      case "AuthError":
        return "认证失败：请检查 API key 或 Provider 权限";
      case "RateLimitError":
        return "请求被限流：请稍后重试或检查额度";
      case "ModelNotFoundError":
        return "模型不可用：请检查模型 ID";
      case "TimeoutError":
        return "请求超时：请检查网络或调大超时时间";
      case "NetworkError":
        return "网络请求失败：请检查 base URL 和网络连接";
      case "InvalidResponseError":
        return "Provider 返回了无法识别的响应";
      case "RequestCancelledError":
        return "请求已取消";
      case "ProviderHTTPError":
        return message || "Provider 返回 HTTP 错误";
      default:
        return message || "Provider 请求失败";
    }
  }

  function redactProvider(provider) {
    if (!provider) {
      return null;
    }

    return {
      type: provider.type,
      name: provider.name,
      baseURL: provider.baseURL,
      model: provider.model,
      timeoutMs: provider.timeoutMs,
      enableStreaming: provider.enableStreaming,
      hasApiKey: Boolean(provider.apiKey),
    };
  }

  return {
    ProviderError,
    MissingConfigError,
    AuthError,
    RateLimitError,
    ModelNotFoundError,
    TimeoutError,
    NetworkError,
    InvalidResponseError,
    ProviderHTTPError,
    RequestCancelledError,
    sanitizeMessage,
    toUserMessage,
    redactProvider,
  };
})();
