# AI Experience Parsing Pipeline

## Target Tags / Categories
| Tag | Description | Typical Keywords |
| --- | --- | --- |
| 量化研究 | Alpha/因子研究、策略回测、建模 | 回测、因子、Alpha、Lasso、机器学习、Smart Beta |
| 交易执行 | 指令下达、订单管理、交易系统维护 | 交易系统、下单、撮合、成交、申购、风控 |
| 数据工程 | 数据接口、ETL、API 开发 | 数据接口、API、聚宽、米筐、对接、清洗 |
| 行业/基本面研究 | 行业调研、深度报告、估值分析 | 调研、行业、估值、财务、研究报告 |
| 工具开发 | 自研工具、自动化脚本、效率提升 | VBA、Python 工具、自动化、脚本、平台 |
| 领导力 / 组织 | 组织管理、社团、跨部门协调 | 组织、协调、带队、社团、主席 |
| 风险与合规 | 风控、合规审查、内控流程 | 风险、合规、审查、内控 |
| 教研 & 竞赛 | 学术项目、竞赛成果、发表 | 论文、竞赛、发表、科研 |

> 允许单条经历带多个 tag；解析失败时，使用 `TO_CONFIRM` 占位。

## 统一输出 Schema
```ts
interface ExperienceItem {
  id: string;               // 以时间+公司 hash 生成
  category: 'work' | 'project' | 'leadership';
  companyOrOrg: string;
  role: string;
  timeRange: {
    start: string;          // YYYY.MM
    end: string;            // YYYY.MM 或 '至今'
  };
  location?: string;
  tags: string[];           // 以上表定义的标签
  summary: string;          // 一句话概述背景与成果
  highlights: string[];     // 2-4 条要点，句首用动词 + 量化结果
  rawText?: string;         // 原始段落，便于回溯
}
```

解析完后将 `category === 'work'` 的 map 成 `workExpList` 条目，`project` -> `projectList`，`leadership` -> 视图层决定是否展示。

## DeepSeek Prompt 模板
```
You are an assistant extracting resume experiences.\
Follow the JSON schema strictly.\

<schema>
...ExperienceItem schema JSON...
</schema>

<context>
{{原始文本}}
</context>

Instructions:
1. Detect time range (YYYY.MM). If missing, output null and add TODO in summary.
2. Infer company/org and role from first sentence or heading.
3. Rewrite highlights as action-oriented bullet sentences, each containing an action + tool + quantified result if available.
4. Assign 1-3 tags from the tag list. If nothing fits, use TO_CONFIRM.
5. Return **only** valid JSON (array of ExperienceItem).
```
> 实际调用时用模板引擎插入 `schema` 与 `context`，并在系统提示里再次强调“仅返回 JSON”。

## 解析流程
1. **Docx 预处理**：用 `mammoth` 或 `python-docx` 读取段落，区分标题 (style starts with `Heading`) 与正文，将每个标题 + 随后段落聚合为一个原始经历块。
2. **字段初提取**：正则匹配 `\d{4}[./-]\d{2}` 捕获时间；在疑似公司/岗位行保留原文以供模型参考。
3. **LLM 调用**：逐条把原始块送入 DeepSeek，附带 schema 与标签表，设置 temperature=0.2。若 docx 很长，可分批并发调用。
4. **后处理校验**：
   - 校验 JSON 可解析且 `tags` 非空。
   - 时间缺失则标记该条并写入 `issues` 列表。
   - 去重：使用 `companyOrOrg + timeRange.start` 做 key。
5. **写回数据源**：
   - 把 `category` 映射回 `src/data/resume.ts` 的相应 list。
   - 未通过校验的条目保存到临时 JSON（如 `data/experience-draft.json`）供人工确认。
6. **人工确认 UI（可选）**：在设置页展示模型输出与原文，允许手动编辑后再提交。

## 补充建议
- 把 tag 列表和 schema 常量写到共享文件（如 `src/data/constant.ts`），供前后端共用。
- 解析脚本中记录 LLM 原始响应，方便调试。
- 文案多语种时，可在 prompt 加 `language: zh`，确保输出中文。
