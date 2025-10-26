import { getAiSettings } from './api-key';

const OPENAI_CHAT_COMPLETIONS = 'https://api.openai.com/v1/chat/completions';

type SummaryResponse = {
  items: string[];
};

const parseSummary = (content: string): string[] => {
  if (!content) return [];
  const trimmed = content.trim();
  try {
    const parsed = JSON.parse(trimmed) as SummaryResponse | string[];
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item)).filter(Boolean);
    }
    if (Array.isArray(parsed.items)) {
      return parsed.items.map(item => String(item)).filter(Boolean);
    }
  } catch (err) {
    // fallthrough, try to parse bullet text
  }

  return trimmed
    .split(/\n|\r/) // split to lines
    .map(line => line.replace(/^[\s•\-*\d.]+/, '').trim())
    .filter(Boolean);
};

export async function summarizeExperience(
  raw: string,
  feature: string,
  model: string // Add model as a parameter
): Promise<string[]> {
  if (!raw || !raw.trim()) {
    throw new Error('没有可供总结的内容');
  }

  const settings = getAiSettings();

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

  const payload = {
    model: model, // Use the model from the parameter
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

  const endpoint = modelConfig.endpoint || OPENAI_CHAT_COMPLETIONS;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${modelConfig.apiKey}`,
    },
    body: JSON.stringify(payload),
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
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('模型未返回任何结果');
  }

  const items = parseSummary(content);
  if (!items.length) {
    throw new Error('未能解析模型返回的内容，请重试或手动整理');
  }
  return items;
}
