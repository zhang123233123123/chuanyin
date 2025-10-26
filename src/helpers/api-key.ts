const STORAGE_KEY = 'resume.aiSettings';

export type ModelConfig = {
  apiKey?: string;
  prompt?: string;
};

export type AiSettings = {
  activeModel: string;
  models: {
    [modelName: string]: ModelConfig;
  };
};

/**
 * 获取本地保存的 AI 配置
 */
export function getAiSettings(): AiSettings | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(window.atob(raw));
  } catch (err) {
    console.error('Failed to read AI settings from localStorage', err);
    return undefined;
  }
}

/**
 * 保存 AI 配置到本地。使用 base64 做简单遮盖，仍属于明文存储。
 */
export function setAiSettings(settings: AiSettings): void {
  if (typeof window === 'undefined') return;
  try {
    const value = JSON.stringify(settings);
    window.localStorage.setItem(STORAGE_KEY, window.btoa(value));
  } catch (err) {
    console.error('Failed to persist AI settings', err);
  }
}

export function clearAiSettings(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear AI settings', err);
  }
}
