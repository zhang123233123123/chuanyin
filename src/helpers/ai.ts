import { getAiSettings } from './api-key';

const OPENAI_CHAT_COMPLETIONS = 'https://api.openai.com/v1/chat/completions';

// 定义经历项类型
export type ExperienceItem = {
  type: 'workExp' | 'project';
  company_name?: string;
  department_name?: string;
  work_time?: [string, string];
  work_desc?: string;
  project_name?: string;
  project_role?: string;
  project_time?: string;
  project_desc?: string;
  project_content?: string;
  tags?: string[];
  summary?: string;
};

const EXPERIENCE_NESTED_KEYS = [
  'experiences',
  'experience',
  'items',
  'data',
  'result',
  'list',
  'workExpList',
  'projectList',
  'work_experiences',
  'project_experiences',
  'experienceList',
];

const toTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const toMultilineString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const lines = value
      .map(item =>
        toTrimmedString(typeof item === 'string' ? item : String(item))
      )
      .filter(Boolean) as string[];
    return lines.length ? lines.join('\n') : undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return undefined;
};

const normalizeWorkTime = (value: unknown): [string, string] | undefined => {
  if (Array.isArray(value)) {
    const [start, end] = value
      .map(item => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
    if (start && end) {
      return [start, end];
    }
  }
  if (typeof value === 'string') {
    const parts = value
      .split(/[-~–—至]/)
      .map(part => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return [parts[0], parts[1]];
    }
  }
  return undefined;
};

const looksLikeExperience = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    'type' in candidate ||
    'company_name' in candidate ||
    'company' in candidate ||
    'companyOrOrg' in candidate ||
    'department_name' in candidate ||
    'project_name' in candidate ||
    'project' in candidate ||
    'title' in candidate ||
    'summary' in candidate ||
    'highlights' in candidate ||
    'work_desc' in candidate ||
    'responsibilities' in candidate ||
    'description' in candidate ||
    'project_desc' in candidate ||
    'project_content' in candidate ||
    'project_detail' in candidate ||
    'project_responsibilities' in candidate
  );
};

const normalizeTimeRangeField = (
  value: unknown
): [string, string] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value) || typeof value === 'string') {
    return normalizeWorkTime(value);
  }
  if (typeof value === 'object') {
    const start =
      toTrimmedString((value as Record<string, unknown>).start as string) ??
      toTrimmedString((value as Record<string, unknown>).from as string);
    const end =
      toTrimmedString((value as Record<string, unknown>).end as string) ??
      toTrimmedString((value as Record<string, unknown>).to as string);
    if (start && end) {
      return [start, end];
    }
  }
  return undefined;
};

const normalizeExperienceItem = (raw: unknown): ExperienceItem | null => {
  if (!raw || typeof raw !== 'object') return null;

  const item = raw as Record<string, unknown>;

  const rawType = (typeof item.type === 'string'
    ? item.type
    : item.category) as string | undefined;
  const normalizedType = rawType?.toLowerCase();
  const hasProjectSignals = Boolean(
    normalizedType?.includes('project') ||
      normalizedType?.includes('practice') ||
      item.project_name ||
      item.project_role ||
      item.role ||
      item.project_desc ||
      item.project_content ||
      item.project_detail ||
      item.project_responsibilities ||
      item.category === 'leadership'
  );
  const hasWorkSignals = Boolean(
    normalizedType?.includes('work') ||
      normalizedType?.includes('intern') ||
      item.company_name ||
      item.company ||
      item.companyOrOrg ||
      item.department_name ||
      item.work_desc ||
      item.responsibilities ||
      item.description ||
      item.work_time
  );

  const type: ExperienceItem['type'] =
    normalizedType === 'project'
      ? 'project'
      : normalizedType === 'workexp' || normalizedType === 'work'
      ? 'workExp'
      : hasProjectSignals && !hasWorkSignals
      ? 'project'
      : hasWorkSignals
      ? 'workExp'
      : 'project';

  const experience: ExperienceItem = { type };
  let hasContent = false;

  const assign = <K extends keyof ExperienceItem>(
    key: K,
    value: ExperienceItem[K]
  ) => {
    if (value === undefined || value === null || value === '') return;
    experience[key] = value;
    hasContent = true;
  };

  assign(
    'company_name',
    toTrimmedString(item.company_name as string) ||
      toTrimmedString(item.company as string) ||
      toTrimmedString(item.companyOrOrg as string) ||
      toTrimmedString(item.organization as string) ||
      toTrimmedString(item.org as string)
  );
  assign('department_name', toTrimmedString(item.department_name as string));
  if (type === 'workExp' && !experience.department_name) {
    assign(
      'department_name',
      toTrimmedString((item.department_name as string) || (item.role as string))
    );
  }
  assign(
    'work_time',
    normalizeTimeRangeField(item.work_time) ??
      normalizeTimeRangeField(item.timeRange)
  );
  assign(
    'work_desc',
    toMultilineString(item.work_desc) ??
      toMultilineString(item.responsibilities) ??
      toMultilineString(item.description) ??
      toMultilineString(item.highlights) ??
      toTrimmedString(item.summary as string)
  );

  assign(
    'project_name',
    toTrimmedString(item.project_name as string) ||
      toTrimmedString(item.project as string) ||
      toTrimmedString(item.title as string) ||
      toTrimmedString(item.companyOrOrg as string)
  );
  assign(
    'project_role',
    toTrimmedString((item.project_role as string) || (item.role as string))
  );
  assign(
    'project_time',
    (() => {
      if (Array.isArray(item.project_time)) {
        const clean = item.project_time
          .map(entry => (typeof entry === 'string' ? entry.trim() : ''))
          .filter(Boolean);
        return clean.length ? clean.join(' - ') : undefined;
      }
      const normalized = normalizeTimeRangeField(item.timeRange);
      if (normalized) {
        return normalized.join(' - ');
      }
      return toTrimmedString(item.project_time as string);
    })()
  );
  assign(
    'project_desc',
    toTrimmedString(item.project_desc as string) ??
      toTrimmedString(item.summary as string)
  );
  assign(
    'project_content',
    toMultilineString(item.project_content) ??
      toMultilineString(item.project_detail) ??
      toMultilineString(item.project_responsibilities) ??
      toMultilineString(item.highlights)
  );

  if (Array.isArray(item.tags)) {
    const tags = item.tags
      .map(entry => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
    if (tags.length) {
      assign('tags', tags);
    }
  }

  if (!hasContent) {
    return null;
  }

  return experience;
};

const flattenExperienceContainers = (value: unknown): unknown[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    if (looksLikeExperience(value)) {
      return [value];
    }
    return Object.values(value).flatMap(child =>
      Array.isArray(child) || typeof child === 'object'
        ? flattenExperienceContainers(child)
        : []
    );
  }
  return [];
};

const extractExperiencesFrom = (
  value: unknown
): ExperienceItem[] | undefined => {
  if (!value) return undefined;

  const candidates = Array.isArray(value)
    ? value
    : Array.isArray((value as any)?.experiences)
    ? (value as any).experiences
    : flattenExperienceContainers(value);

  const normalized = candidates
    .map(entry =>
      looksLikeExperience(entry) ? normalizeExperienceItem(entry) : null
    )
    .filter((item): item is ExperienceItem => Boolean(item));

  return normalized.length ? normalized : undefined;
};

const CODE_BLOCK_REG = /```(?:json)?\s*([\s\S]*?)```/i;

const extractJsonCandidate = (raw: string): string => {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(CODE_BLOCK_REG);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }

  const firstCurly = trimmed.indexOf('{');
  const lastCurly = trimmed.lastIndexOf('}');
  if (firstCurly !== -1 && lastCurly > firstCurly) {
    return trimmed.slice(firstCurly, lastCurly + 1).trim();
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1).trim();
  }

  return trimmed;
};

const TRAILING_COMMA_REG = /,\s*([}\]])/g;
const ADJACENT_OBJECT_REG = /}\s*{/g;

const normalizeLooseJsonStructure = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const withoutTrailingCommas = trimmed.replace(TRAILING_COMMA_REG, '$1');
  const patchedAdjacent = withoutTrailingCommas.replace(
    ADJACENT_OBJECT_REG,
    '},{'
  );
  if (patchedAdjacent.startsWith('[')) {
    return patchedAdjacent;
  }
  if (patchedAdjacent.startsWith('{')) {
    return `[${patchedAdjacent}]`;
  }
  return patchedAdjacent;
};

const parseSummary = (content: string): string[] | ExperienceItem[] => {
  if (!content) return [];
  const trimmed = content.trim();
  try {
    const candidate = extractJsonCandidate(trimmed);
    const normalizedJson = normalizeLooseJsonStructure(candidate);
    const parsed = JSON.parse(normalizedJson);

    if (parsed && typeof parsed === 'object') {
      let potentialStar: unknown = null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        potentialStar = parsed[0];
      } else if (!Array.isArray(parsed)) {
        potentialStar = parsed;
      }

      if (potentialStar && typeof potentialStar === 'object') {
        const star = potentialStar as {
          Action?: string;
          Result?: string;
          action?: string;
          result?: string;
        };
        const action = star.Action || star.action;
        const result = star.Result || star.result;
        if (action && result) {
          return [`${action} ${result}`];
        }
      }

      const directExperiences = extractExperiencesFrom(parsed);
      if (directExperiences) {
        return directExperiences;
      }

      for (const key of EXPERIENCE_NESTED_KEYS) {
        const experiences = extractExperiencesFrom((parsed as any)[key]);
        if (experiences) {
          return experiences;
        }
      }

      return [JSON.stringify(parsed, null, 2)];
    }

    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item)).filter(Boolean);
    }
  } catch (err) {
    console.warn('JSON解析失败，尝试解析文本格式', err);
  }

  const normalized = trimmed.replace(/-\s+/g, '\n- ');
  return normalized
    .split(/\r?\n/)
    .map(line => line.replace(/^[\s•\-*\d.]+/, '').trim())
    .filter(Boolean);
};

const isExperienceArray = (value: unknown): value is ExperienceItem[] =>
  Array.isArray(value) && value.every(item => looksLikeExperience(item));

export function parseExperienceDraft(raw: string): ExperienceItem[] {
  if (!raw || !raw.trim()) return [];
  try {
    const candidate = extractJsonCandidate(raw);
    const normalizedJson = normalizeLooseJsonStructure(candidate);
    const parsed = JSON.parse(normalizedJson);
    const normalized = extractExperiencesFrom(parsed);
    if (normalized) return normalized;
  } catch (err) {
    // ignore, fallback to parseSummary
  }

  const fallback = parseSummary(raw);
  if (isExperienceArray(fallback)) {
    return fallback;
  }
  return [];
}

export async function summarizeExperience(
  raw: string,
  feature: string,
  model: string // Add model as a parameter
): Promise<string[] | ExperienceItem[]> {
  if (!raw || !raw.trim()) {
    throw new Error('没有可供总结的内容');
  }

  const settings = getAiSettings();

  const tryProxy = async () => {
    const envProxy =
      typeof process !== 'undefined'
        ? (process as any).env?.GATSBY_AI_PROXY
        : undefined;
    const proxyEndpoint = settings.proxyEndpoint || envProxy;
    if (!proxyEndpoint) return null;
    try {
      const resp = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw, feature, model, settings }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || resp.statusText);
      }

      const data = await resp.json();
      const content =
        data?.content || data?.data?.content || data?.result || data?.text;
      if (!content || typeof content !== 'string') {
        throw new Error('代理未返回有效内容');
      }
      return parseSummary(content);
    } catch (err) {
      console.warn('[AI] proxy 调用失败，降级为直接调用', err);
      return null;
    }
  };

  if (!settings || !settings.models) {
    throw new Error('AI 配置不完整，请先前往“API 设置”页面');
  }

  // Use the model passed as a parameter to get the config
  const modelConfig = settings.models[model];
  if (!modelConfig || !modelConfig.apiKey) {
    throw new Error(`模型“${model}”缺少 API Key，请前往“API 设置”页面配置`);
  }

  const systemPrompt = settings.prompts?.[feature];
  if (!systemPrompt) {
    throw new Error(`缺少“${feature}”功能的 Prompt，请前往“API 设置”页面配置`);
  }

  const proxyResult = await tryProxy();
  if (proxyResult) return proxyResult;

  const endpoint = modelConfig.endpoint || OPENAI_CHAT_COMPLETIONS;
  const lowerEndpoint = (endpoint || '').toLowerCase();
  const isGemini = lowerEndpoint.includes('generativelanguage.googleapis.com');
  const requestBody = isGemini
    ? {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `以下是候选人的个人经历，请根据要求输出：\n${raw}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }
    : {
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `以下是候选人的个人经历，请根据要求输出：\n${raw}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      };

  let fetchUrl = endpoint;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (isGemini) {
    const separator = endpoint.includes('?') ? '&' : '?';
    fetchUrl = `${endpoint}${separator}key=${modelConfig.apiKey}`;
  } else {
    headers.Authorization = `Bearer ${modelConfig.apiKey}`;
  }

  try {
    console.info('[AI] invoking model', model, 'via', fetchUrl);
  } catch (err) {
    // console might not exist in some environments; fail silently
  }

  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    let reason = response.statusText;
    try {
      const parsed = JSON.parse(text);
      reason = parsed?.error?.message || parsed?.message || reason;
    } catch (err) {
      // ignore
    }
    throw new Error(`生成失败：${reason}`);
  }

  const data = await response.json();
  let content: string | undefined;

  if (isGemini) {
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (Array.isArray(parts)) {
      content = parts
        .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
        .filter(Boolean)
        .join('\n');
    }
    if (!content && typeof candidate?.content === 'string') {
      content = candidate.content;
    }
  } else {
    content = data?.choices?.[0]?.message?.content;
  }

  if (!content) {
    throw new Error('模型未返回任何结果');
  }

  const items = parseSummary(content);
  if (!items.length) {
    throw new Error('未能解析模型返回的内容，请重试或手动整理');
  }
  return items;
}
// 请将此函数添加到 ai.ts 文件的末尾

export async function streamAiResponse(
  raw: string,
  feature: string,
  model: string
): Promise<Response> {
  if (!raw || !raw.trim()) {
    throw new Error('没有可供总结的内容');
    [cite_start]; // [cite: 1]
  }

  const settings = getAiSettings();
  [cite_start]; // [cite: 1]

  if (!settings || !settings.models) {
    throw new Error('AI 配置不完整，请先前往“API 设置”页面');
    [cite_start]; // [cite: 1]
  }

  const modelConfig = settings.models[model];
  [cite_start]; // [cite: 1]
  if (!modelConfig || !modelConfig.apiKey) {
    throw new Error(`模型“${model}”缺少 API Key，请前往“API 设置”页面配置`);
    [cite_start]; // [cite: 1]
  }

  const systemPrompt = settings.prompts?.[feature];
  [cite_start]; // [cite: 1]
  if (!systemPrompt) {
    throw new Error(`缺少“${feature}”功能的 Prompt，请前往“API 设置”页面配置`);
    [cite_start]; // [cite: 1]
  }

  // 注意：此处省略了 tryProxy 逻辑，因为流式传输的代理逻辑通常更复杂。

  const endpoint = modelConfig.endpoint || OPENAI_CHAT_COMPLETIONS;
  const lowerEndpoint = (endpoint || '').toLowerCase();
  const isGemini = lowerEndpoint.includes('generativelanguage.googleapis.com');

  // 关键区别：针对非 Gemini 模型（如 OpenAI）添加 stream: true
  const requestBody = isGemini
    ? {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            role: 'user',
            parts: [
              { text: `以下是候选人的个人经历，请根据要求输出：\n${raw}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }
    : {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `以下是候选人的个人经历，请根据要求输出：\n${raw}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
        stream: true, // <-- 启用流式传输的关键参数
      };

  let fetchUrl = endpoint;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (isGemini) {
    const separator = endpoint.includes('?') ? '&' : '?';
    fetchUrl = `${endpoint}${separator}key=${modelConfig.apiKey}`;
  } else {
    headers.Authorization = `Bearer ${modelConfig.apiKey}`;
  }

  try {
    console.info('[AI] invoking model (STREAMING)', model, 'via', fetchUrl);
  } catch (err) {
    // console might not exist in some environments; fail silently
  }

  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    let reason = response.statusText;
    try {
      const parsed = JSON.parse(text);
      reason = parsed?.error?.message || parsed?.message || reason;
    } catch (err) {
      // ignore
    }
    throw new Error(`流式生成失败：${reason}`);
  }

  return response; // <-- 返回原生的 Response 对象，供调用方进行流式读取
}
