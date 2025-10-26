const STORAGE_KEY = 'resume.aiSettings';

// --- 类型定义 ---
export type ModelConfig = {
  apiKey?: string;
  endpoint?: string;
};

export type AiSettings = {
  activeModel: string;
  models: {
    [modelName: string]: ModelConfig;
  };
  prompts: {
    [featureName: string]: string;
  };
};

// --- 默认值定义 ---
export const AI_MODELS = ['gpt-4o-mini', 'Gemini', 'deepseek-chat', 'Qwen'];

export const DEFAULT_PROMPTS = {
  summarize:
    '你是一名资深的职业规划顾问，擅长把实际经历提炼为要点列表。请针对输入文本提炼不超过 8 条的经历 bullet，每条 20 字以内，保留关键信息与行动成果。以 JSON 形式返回，例如 {"items": ["...", "..."]}。',
  match_jd:
    '你是一名顶尖的 HR，负责筛选简历。请根据给定的职位描述（JD），从候选人的完整经历中，挑选出最相关的几段经历，并说明为什么匹配。',
  optimize:
    '你是一名资深的业务主管，请根据我提供的经历描述，以 STAR 原则（Situation, Task, Action, Result）为基础，对其进行润色和优化，使其更具吸引力。',
};

export const getDefaultSettings = (): AiSettings => ({
  activeModel: AI_MODELS[0],
  models: AI_MODELS.reduce((acc, model) => {
    let endpoint = '';
    if (model.startsWith('gpt')) {
      endpoint = 'https://api.openai.com/v1/chat/completions';
    } else if (model === 'deepseek-chat') {
      endpoint = 'https://api.deepseek.com/chat/completions';
    }
    return { ...acc, [model]: { apiKey: '', endpoint } };
  }, {}),
  prompts: DEFAULT_PROMPTS,
});

// --- 本地存储读写 ---

/**
 * 获取本地保存的 AI 配置（已合并默认值，保证安全）
 */
export function getAiSettings(): AiSettings {
  const defaults = getDefaultSettings();
  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;

    const stored = JSON.parse(decodeURIComponent(escape(window.atob(raw))));

    // Deep merge stored settings with defaults to gracefully handle new features
    const mergedSettings: AiSettings = {
      ...defaults,
      ...stored,
      models: {
        ...defaults.models,
        ...(stored.models || {}),
      },
      prompts: {
        ...defaults.prompts,
        ...(stored.prompts || {}),
      },
    };
    return mergedSettings;
  } catch (err) {
    console.error('Failed to read AI settings from localStorage', err);
    return defaults; // Return defaults on error
  }
}

/**
 * 保存 AI 配置到本地。使用 base64 做简单遮盖，仍属于明文存储。
 */
export function setAiSettings(settings: AiSettings): void {
  if (typeof window === 'undefined') return;
  try {
    const value = window.btoa(
      unescape(encodeURIComponent(JSON.stringify(settings)))
    );
    window.localStorage.setItem(STORAGE_KEY, value);
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
