import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';

interface ExperienceItem {
  id: string;
  category: 'work' | 'project' | 'leadership';
  companyOrOrg: string;
  role: string;
  timeRange: {
    start: string;
    end: string;
  };
  location?: string;
  tags: string[];
  summary: string;
  highlights: string[];
  rawText?: string;
}

const TAGS = [
  '量化研究',
  '交易执行',
  '数据工程',
  '行业/基本面研究',
  '工具开发',
  '领导力 / 组织',
  '风险与合规',
  '教研 & 竞赛',
];

const PROMPT_TEMPLATE = ({
  schema,
  context,
}: {
  schema: string;
  context: string;
}) =>
  `You are an assistant that extracts resume experiences.\n\n<schema>\n${schema}\n</schema>\n\n<context>\n${context}\n</context>\n\nRules:\n1. Detect time range in YYYY.MM format.\n2. Infer company/org and role, even if implicit.\n3. Rewrite highlights as action-oriented Chinese bullet sentences that contain action + tool + result.\n4. Assign 1-3 tags chosen from ${TAGS.join(
    ', '
  )}. Use TO_CONFIRM when nothing fits.\n5. Respond with a JSON array that matches the schema exactly.`;

async function convertDocxToParagraphs(docxPath: string) {
  const result = await mammoth.convertToMarkdown({ path: docxPath });
  return result.value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function chunkParagraphs(paragraphs: string[]): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  for (const line of paragraphs) {
    const isHeading = /^#{1,4}\s+/.test(line) || /^\d{4}[./-]\d{2}/.test(line);
    if (isHeading && current.length) {
      blocks.push(current.join('\n'));
      current = [];
    }
    current.push(line);
  }
  if (current.length) {
    blocks.push(current.join('\n'));
  }
  return blocks;
}

async function callDeepSeek(prompt: string): Promise<ExperienceItem[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const apiUrl =
    process.env.DEEPSEEK_API_URL ??
    'https://api.deepseek.com/v1/chat/completions';
  if (!apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek request failed: ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek returned empty content');
  }

  return JSON.parse(content) as ExperienceItem[];
}

function schemaString() {
  return JSON.stringify({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        category: { enum: ['work', 'project', 'leadership'] },
        companyOrOrg: { type: 'string' },
        role: { type: 'string' },
        timeRange: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
          },
          required: ['start', 'end'],
        },
        location: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
        highlights: { type: 'array', items: { type: 'string' } },
        rawText: { type: 'string' },
      },
      required: [
        'id',
        'category',
        'companyOrOrg',
        'role',
        'timeRange',
        'tags',
        'summary',
        'highlights',
      ],
    },
  });
}

async function processDocx(docxPath: string) {
  const paragraphs = await convertDocxToParagraphs(docxPath);
  const blocks = chunkParagraphs(paragraphs);
  const schema = schemaString();
  const results: ExperienceItem[] = [];

  for (const block of blocks) {
    const prompt = PROMPT_TEMPLATE({ schema, context: block });
    try {
      const parsed = await callDeepSeek(prompt);
      parsed.forEach(item => results.push({ ...item, rawText: block }));
    } catch (error) {
      console.error('[DeepSeek]', error);
      results.push({
        id: `FAILED-${Date.now()}`,
        category: 'work',
        companyOrOrg: 'UNKNOWN',
        role: 'UNKNOWN',
        timeRange: { start: 'TODO', end: 'TODO' },
        tags: ['TO_CONFIRM'],
        summary: '模型解析失败，需人工处理。',
        highlights: [],
        rawText: block,
      });
    }
  }

  return results;
}

async function main() {
  const inputPath = process.argv[2];
  const outputPath =
    process.argv[3] ?? path.resolve(process.cwd(), 'experience-output.json');

  if (!inputPath) {
    console.error(
      'Usage: ts-node scripts/docx-experience-parser.ts <input.docx> [output.json]'
    );
    process.exit(1);
  }

  const stats = await fs.stat(inputPath).catch(() => null);
  if (!stats) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const items = await processDocx(inputPath);
  await fs.writeFile(outputPath, JSON.stringify(items, null, 2), 'utf8');
  console.log(`Parsed ${items.length} experience items -> ${outputPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
