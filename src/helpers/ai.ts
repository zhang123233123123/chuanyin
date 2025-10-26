import { getApiKey } from './api-key';

const OPENAI_CHAT_COMPLETIONS = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

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

export async function summarizeExperience(raw: string): Promise<string[]> {
  if (!raw || !raw.trim()) {
    throw new Error('没有可供总结的内容');
  }

  const key = getApiKey();
  if (!key) {
    throw new Error('缺少 API Key，请先前往“API 设置”页面配置密钥。');
  }

  const payload = {
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          '你是一名资深的职业规划顾问，擅长把实际经历提炼为要点列表。请针对输入文本提炼不超过 8 条的经历 bullet，每条 20 字以内，保留关键信息与行动成果。以 JSON 形式返回，例如 {"items": ["...", "..."]}。',
      },
      {
        role: 'user',
        content: `以下是候选人的个人经历，请根据要求输出：\n${raw}`,
      },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  };

  const response = await fetch(OPENAI_CHAT_COMPLETIONS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
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
      reason = text || reason;
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
