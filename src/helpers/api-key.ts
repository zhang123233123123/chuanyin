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
  // Optional proxy endpoint to offload AI calls from the browser.
  proxyEndpoint?: string;
  // Models that the user chose to hide to avoid re-populating defaults
  hiddenModels?: string[];
};

// --- 默认值定义 ---
export const AI_MODELS = ['deepseek-chat'];

export const DEFAULT_PROMPTS = {
  summarize:
    '你是一名资深的职业规划顾问，擅长把个人经历提炼为结构化的简历条目。请根据用户提供的原始经历文本，将其拆分为多个独立的工作经历或项目经历条目。每个条目应尽可能详细，并严格按照以下 JSON 格式输出一个数组：\n\n[\n  {\n    "type": "workExp", // 或 "project"\n    "company_name": "公司名称", // 仅限 workExp\n    "department_name": "部门名称", // 仅限 workExp\n    "work_time": ["开始时间", "结束时间"], // 仅限 workExp，例如 ["2018.03", "至今"]\n    "work_desc": "详细的工作职责和成就，使用Markdown格式的无序列表，每点不超过30字，突出STAR原则。", // 仅限 workExp\n\n    "project_name": "项目名称", // 仅限 project\n    "project_role": "担任角色", // 仅限 project\n    "project_time": "项目时间", // 仅限 project，例如 "2017.10 - 2017.12"\n    "project_desc": "项目简述，不超过50字。", // 仅限 project\n    "project_content": "详细的项目职责和成果，使用Markdown格式的无序列表，每点不超过30字，突出STAR原则。" // 仅限 project\n  },\n  // ... 更多条目\n]\n\n请确保输出是有效的 JSON 数组，并且每个条目都包含所有相关字段。如果某个字段没有信息，可以留空字符串。',
  match_jd:
    '你是一名顶尖的 HR，负责筛选简历。请根据给定的职位描述（JD），从候选人的完整经历中，挑选出最相关的几段经历，并说明为什么匹配。',
  optimize:
    '你是一名资深的业务主管，请根据我提供的经历描述，以 STAR 原则（Situation, Task, Action, Result）为基础，对其进行润色和优化，使其更具吸引力。',
  resume_optimize:
    '你是一名资深简历教练。输入包含：个人基础信息（profile）、已有简历 JSON、岗位描述（JD）。请在保留原有 JSON 结构、theme、template、titleNameMap 的前提下，生成一份更匹配 JD 的完整简历。仅输出纯 JSON，不要额外文本。字段包含 profile、educationList、workExpList、projectList、skillList、awardList、workList、aboutme 等，缺失字段可留空字符串或空数组。',
  resume_profile:
    '你是一名简历教练。仅更新简历 JSON 的 profile 字段（基础信息），使用给定的个人信息，其他字段保持不变。务必保留原始的 JSON 结构、theme、template、titleNameMap，输出纯 JSON。',
  resume_experience:
    '你是一名简历教练。根据岗位描述 JD 优化简历 JSON 中的经历相关模块（educationList, workExpList, projectList, skillList, awardList, workList, aboutme），profile 保持不变。每条工作经历或项目描述请遵循 STAR（Situation、Task、Action、Result）思路撰写 2-3 条精炼要点，但不要输出显式的“S/T/A/R”标签，直接用自然语言描述并尽量量化成果。保留原始 JSON 结构、theme、template、titleNameMap，输出纯 JSON。',
  resume_selection:
    '你是一名资深的 HR 助理。请根据候选人的完整简历和经历池（含后台解析的候选记录）以及岗位描述 JD，从中挑选最匹配的工作经历与项目经历供用户确认。要求：\n- 只返回严格的 JSON 对象：{ "workExpList": [...], "projectList": [...] }，不存在的模块使用空数组。\n- 每个条目结构：{ "item": <ResumeConfig 对应结构>, "reason": "匹配理由", "confidence": 0-1 的小数, "sourceId": "原始候选池 _id（若为新建议可留空）" }。\n- 当原始描述字数较少或缺乏细节时，请适度扩写，并按照 STAR 思路（Situation、Task、Action、Result）生成 2-3 条自然语言要点，不要显式写“S/T/A/R”标签，重点突出职责、行动和可量化成果。\n- 保持 ResumeConfig 字段命名（workExpList 需包含 company_name、department_name、work_time、work_desc；projectList 包含 project_name、project_role、project_time、project_desc 等），不要新增未知字段。\n- 若使用后台候选经历，请保留其 _id 作为 sourceId。\n- 输出纯 JSON，不要任何额外文本。',
};

export const getDefaultSettings = (): AiSettings => ({
  activeModel: 'deepseek-chat',
  models: AI_MODELS.reduce((acc, model) => {
    let endpoint = '';
    const lower = model.toLowerCase();
    if (lower.startsWith('gpt')) {
      endpoint = 'https://api.openai.com/v1/chat/completions';
    } else if (lower === 'deepseek-chat') {
      endpoint = 'https://api.deepseek.com/chat/completions';
    } else if (lower.startsWith('gemini')) {
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    } else if (lower === 'qwen') {
      endpoint =
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    }
    return {
      ...acc,
      [model]: { apiKey: '', endpoint },
    };
  }, {}),
  prompts: DEFAULT_PROMPTS,
  proxyEndpoint: '',
  hiddenModels: [],
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
    const hiddenModels: string[] = Array.from(
      new Set([...(stored.hiddenModels || [])])
    );
    const mergedModels = {
      ...defaults.models,
      ...(stored.models || {}),
    } as AiSettings['models'];
    hiddenModels.forEach(model => {
      if (model in mergedModels) delete mergedModels[model];
    });

    let activeModel = stored.activeModel || defaults.activeModel;
    if (!mergedModels[activeModel]) {
      activeModel = Object.keys(mergedModels)[0] || '';
    }

    // Deep merge stored settings with defaults to gracefully handle new features
    const mergedSettings: AiSettings = {
      ...defaults,
      ...stored,
      activeModel,
      models: mergedModels,
      prompts: {
        ...defaults.prompts,
        ...(stored.prompts || {}),
      },
      proxyEndpoint: stored.proxyEndpoint || defaults.proxyEndpoint,
      hiddenModels,
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
