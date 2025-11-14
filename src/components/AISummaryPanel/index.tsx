import React, { useState, useEffect } from 'react';
import {
  Button,
  Upload,
  message,
  Spin,
  Empty,
  Typography,
  Select,
  Input,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  PaperClipOutlined,
  FileTextOutlined,
  CopyOutlined,
  TableOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { readExperienceFile } from '@/helpers/doc-reader';
// 把上面那一行删掉，换成这两行：
import { summarizeExperience, parseExperienceDraft } from '@/helpers/ai';
import type { ExperienceItem } from '@/helpers/ai';
import { copyToClipboard } from '@/helpers/copy-to-board';
import { getAiSettings, AI_MODELS } from '@/helpers/api-key';
import {
  loadStoredExperiences,
  saveStoredExperiences,
  clearStoredExperiences,
} from '@/helpers/experience-storage';
import './index.less';

const { Paragraph } = Typography;

const PROJECT_KEYWORDS = /项目|大创|课题|竞赛|实践|活动|志愿|义工|研究|方案|推广|调研|营/;
const WORK_KEYWORDS = /实习|公司|企业|大使|助理|运营|推广|销售|数据|采集|校园|实训/;

const normalizeSummaryText = (text: string): string =>
  (text || '').replace(/^[\s•·\-–—]+/, '').trim();

const deriveTitleFromText = (text: string, index: number): string => {
  const separators = ['，', ',', '。', ';', '；', '：', ':', '、'];
  for (const sep of separators) {
    const idx = text.indexOf(sep);
    if (idx > 0) {
      return text.slice(0, idx).trim();
    }
  }
  return text.slice(0, 30) || `经历 ${index + 1}`;
};

const isGarbageLine = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (!/[\w\u4e00-\u9fa5]/.test(trimmed)) return true;
  if (/^[{}\[\],:"']+$/.test(trimmed)) return true;
  return false;
};

const buildFallbackExperiences = (items: string[]): ExperienceItem[] =>
  items
    .map((raw, index) => {
      const clean = normalizeSummaryText(raw);
      if (!clean || isGarbageLine(clean)) return null;
      const isProject =
        PROJECT_KEYWORDS.test(clean) && !WORK_KEYWORDS.test(clean);
      const title = deriveTitleFromText(clean, index);
      if (isProject) {
        return {
          type: 'project',
          project_name: title,
          project_desc: clean,
          project_content: clean,
        } as ExperienceItem;
      }
      return {
        type: 'workExp',
        company_name: title,
        work_desc: clean,
      } as ExperienceItem;
    })
    .filter((item): item is ExperienceItem => Boolean(item));

type AISummaryPanelProps = {
  onExperiencesGenerated?: (experiences: ExperienceItem[]) => void;
};

export const AISummaryPanel: React.FC<AISummaryPanelProps> = ({
  onExperiencesGenerated,
}) => {
  const [fileName, setFileName] = useState<string>('');
  const [rawContent, setRawContent] = useState<string>('');
  const [summaries, setSummaries] = useState<string[]>([]);
  const [experienceItems, setExperienceItems] = useState<ExperienceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const [model, setModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<string[]>(AI_MODELS);
  const [draftContent, setDraftContent] = useState<string>('');
  const [draftError, setDraftError] = useState<string | undefined>();

  useEffect(() => {
    // Load the default active model on initial render
    const settings = getAiSettings();
    if (settings.activeModel) {
      setModel(settings.activeModel);
    }
    const customModels = Object.keys(settings.models || {});
    const mergedModels = Array.from(new Set([...AI_MODELS, ...customModels]));
    setAvailableModels(mergedModels);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cached = loadStoredExperiences();
    if (!cached) return;
    setFileName(cached.fileName || '');
    setRawContent(cached.rawContent || '');
    if (Array.isArray(cached.experiences) && cached.experiences.length) {
      setExperienceItems(cached.experiences);
      onExperiencesGenerated?.(cached.experiences);
    }
  }, [onExperiencesGenerated]);

  useEffect(() => {
    if (!experienceItems.length) {
      setDraftContent('');
      return;
    }
    setDraftContent(JSON.stringify(experienceItems, null, 2));
  }, [experienceItems]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!fileName && !rawContent && !experienceItems.length) {
      clearStoredExperiences();
      return;
    }
    saveStoredExperiences({
      fileName,
      rawContent,
      experiences: experienceItems,
    });
  }, [fileName, rawContent, experienceItems]);

  const resetState = () => {
    setSummaries([]);
    setExperienceItems([]);
    setError(undefined);
    setDraftError(undefined);
    setDraftContent('');
    setFileName('');
    setRawContent('');
  };

  const handleFile: UploadProps['beforeUpload'] = async file => {
    resetState();
    try {
      const text = await readExperienceFile(file);
      if (!text) {
        message.warning('未解析到有效内容，请确认文档是否包含文本');
        return false;
      }
      setFileName(file.name);
      setRawContent(text);
      message.success('文档已解析，选择模型后即可生成要点');
    } catch (err) {
      const reason = err instanceof Error ? err.message : '文档解析失败';
      setRawContent('');
      message.error(reason);
    }
    return false; // 阻止 antd 自动上传
  };

  const handleSummarize = async () => {
    if (!rawContent) {
      message.warning('请先上传包含经历的文档');
      return;
    }
    if (!model) {
      message.warning('请选择一个 AI 模型');
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      // 尝试解析为结构化数据
      const result = await summarizeExperience(rawContent, 'summarize', model);

      // 检查返回的是否是结构化数据
      if (
        Array.isArray(result) &&
        result.length > 0 &&
        typeof result[0] === 'object'
      ) {
        // 是结构化数据
        const items = result as ExperienceItem[];
        setExperienceItems(items);
        setSummaries([]); // 清空文本摘要
        setDraftError(undefined);

        // 调用父组件的回调函数
        if (onExperiencesGenerated) {
          onExperiencesGenerated(items);
        }

        message.success('已生成结构化经历数据');
      } else {
        // 是文本摘要
        const items = result as string[];
        const reconstructed = parseExperienceDraft(items.join('\n'));
        if (reconstructed.length) {
          setSummaries([]);
          setExperienceItems(reconstructed);
          setDraftError(undefined);
          onExperiencesGenerated?.(reconstructed);
          message.success('识别到结构化 JSON 片段，已自动解析');
          return;
        }

        setSummaries(items);
        const fallbackExperiences = buildFallbackExperiences(items);
        setExperienceItems(fallbackExperiences);
        setDraftError(undefined);

        if (!items.length) {
          message.info('模型未返回内容，尝试调整文档或稍后重试');
        } else if (fallbackExperiences.length) {
          onExperiencesGenerated?.(fallbackExperiences);
          message.success('已根据文本结果，自动生成结构化经历');
        } else {
          message.warning(
            '模型输出疑似损坏的 JSON，请调整文档或 Prompt 后重试'
          );
        }
      }
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : '生成失败，请稍后重试';
      setError(reason);
      message.error(reason);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (summaries.length) {
      const content = summaries.map(item => `- ${item}`).join('\n');
      copyToClipboard(content);
      message.success('已复制到剪贴板');
    } else if (experienceItems.length) {
      const content = JSON.stringify(experienceItems, null, 2);
      copyToClipboard(content);
      message.success('已复制结构化数据到剪贴板');
    }
  };

  const handleDraftChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    setDraftError(undefined);
  };

  const handleApplyDraft = () => {
    if (!draftContent.trim()) {
      setExperienceItems([]);
      onExperiencesGenerated?.([]);
      message.info('已清空经历列表');
      return;
    }
    const parsed = parseExperienceDraft(draftContent);
    if (!parsed.length) {
      setDraftError('未识别到有效的结构化经历，请检查 JSON 格式或字段');
      message.error('应用失败，请检查草稿内容');
      return;
    }
    setExperienceItems(parsed);
    onExperiencesGenerated?.(parsed);
    setDraftError(undefined);
    message.success('已应用自定义内容');
  };

  const handleResetDraft = () => {
    if (!experienceItems.length) {
      setDraftContent('');
      return;
    }
    setDraftContent(JSON.stringify(experienceItems, null, 2));
    setDraftError(undefined);
  };

  const handleDeleteExperience = (index: number) => {
    setExperienceItems(prev => {
      const next = prev.filter((_, idx) => idx !== index);
      onExperiencesGenerated?.(next);
      return next;
    });
  };

  return (
    <div className="ai-summary-panel">
      <header className="ai-summary-panel__header">
        <h2>
          <FileTextOutlined /> AI 列表生成
        </h2>
        <Paragraph>上传个人经历文档，调用已配置的模型自动提炼要点。</Paragraph>
      </header>

      <div className="ai-summary-panel__upload">
        <Upload
          accept=".docx,.txt,.md,.markdown"
          beforeUpload={handleFile}
          multiple={false}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} size="small">
            选择文档
          </Button>
        </Upload>
        <div className="ai-summary-panel__upload-hint">
          <span>支持 .docx / .txt / .md</span>
          <small>仅在本地解析与调用 AI，保证隐私安全</small>
        </div>
      </div>

      {fileName && (
        <div className="ai-summary-panel__file-meta">
          <PaperClipOutlined />
          <span>{fileName}</span>
        </div>
      )}

      <div className="ai-summary-panel__actions">
        <Select
          value={model}
          onChange={setModel}
          style={{ width: 150 }}
          placeholder="选择模型"
        >
          {availableModels.map(m => (
            <Select.Option key={m} value={m}>
              {m}
            </Select.Option>
          ))}
        </Select>
        <Button
          type="primary"
          onClick={handleSummarize}
          loading={loading}
          disabled={!rawContent}
        >
          生成要点
        </Button>
        <Button
          icon={<CopyOutlined />}
          onClick={handleCopy}
          disabled={!summaries.length && !experienceItems.length}
        >
          复制结果
        </Button>
      </div>

      <Spin spinning={loading} tip="正在生成 AI 摘要...">
        <div className="ai-summary-panel__result">
          {error && <div className="error-text">{error}</div>}

          {!error && experienceItems.length > 0 && (
            <div className="ai-summary-panel__preview">
              <Paragraph className="ai-summary-panel__preview-title">
                <TableOutlined /> 已提炼 {experienceItems.length} 条核心经历
              </Paragraph>
              <div className="ai-summary-panel__preview-cards">
                {experienceItems.slice(0, 3).map((item, index) => {
                  const title =
                    item.type === 'workExp'
                      ? item.company_name
                      : item.project_name;
                  const role =
                    item.type === 'workExp'
                      ? item.department_name
                      : item.project_role;
                  const timeline =
                    item.type === 'workExp'
                      ? item.work_time?.join(' - ')
                      : item.project_time;
                  const lines = (
                    item.work_desc ||
                    item.project_content ||
                    item.project_desc ||
                    ''
                  )
                    .split('\n')
                    .filter(Boolean)
                    .slice(0, 3);

                  return (
                    <div
                      key={`${title || index}-${index}`}
                      className="preview-card"
                    >
                      <div className="preview-card__meta">
                        <span className="preview-card__tag">
                          {item.type === 'workExp' ? '工作' : '项目'}
                        </span>
                        {timeline && (
                          <span className="preview-card__time">{timeline}</span>
                        )}
                      </div>
                      <div className="preview-card__title">
                        {title || '未命名经历'}
                      </div>
                      {role && <div className="preview-card__role">{role}</div>}
                      {lines.length > 0 && (
                        <ul>
                          {lines.map((line, idx) => (
                            <li key={`${index}-${idx}`}>{line}</li>
                          ))}
                        </ul>
                      )}
                      <div className="preview-card__actions">
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteExperience(index)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {experienceItems.length > 3 && (
                <Paragraph
                  type="secondary"
                  className="ai-summary-panel__preview-tip"
                >
                  更多内容已同步到左侧“工作内容”表格
                </Paragraph>
              )}
              <div className="ai-summary-panel__editor">
                <Paragraph className="ai-summary-panel__preview-title">
                  可编辑 JSON（高级用户）
                </Paragraph>
                <Input.TextArea
                  autoSize={{ minRows: 6, maxRows: 12 }}
                  value={draftContent}
                  onChange={handleDraftChange}
                  placeholder="在此编辑或粘贴经历 JSON，点击应用后左侧会同步"
                />
                <div className="ai-summary-panel__editor-actions">
                  <Button onClick={handleResetDraft} size="small">
                    还原
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    onClick={handleApplyDraft}
                  >
                    应用修改
                  </Button>
                </div>
                {draftError && (
                  <div className="error-text error-text--inline">
                    {draftError}
                  </div>
                )}
              </div>
            </div>
          )}

          {!error &&
            !experienceItems.length &&
            !summaries.length &&
            !loading && <Empty description="等待生成结果" />}

          {!error && summaries.length > 0 && (
            <div className="ai-summary-panel__summary-text">
              <Paragraph className="ai-summary-panel__preview-title">
                文本摘要
              </Paragraph>
              <ul>
                {summaries.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Spin>
    </div>
  );
};
