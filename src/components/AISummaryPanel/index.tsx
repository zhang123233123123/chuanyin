import React, { useState, useEffect } from 'react';
import { Button, Upload, message, Spin, Empty, Typography, Select } from 'antd';
import type { UploadProps } from 'antd';
import {
  PaperClipOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { readExperienceFile } from '@/helpers/doc-reader';
import { summarizeExperience } from '@/helpers/ai';
import { copyToClipboard } from '@/helpers/copy-to-board';
import { getAiSettings, AI_MODELS } from '@/helpers/api-key';
import './index.less';

const { Paragraph } = Typography;

export const AISummaryPanel: React.FC = () => {
  const [fileName, setFileName] = useState<string>('');
  const [rawContent, setRawContent] = useState<string>('');
  const [summaries, setSummaries] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const [model, setModel] = useState<string>('');

  useEffect(() => {
    // Load the default active model on initial render
    const settings = getAiSettings();
    if (settings.activeModel) {
      setModel(settings.activeModel);
    }
  }, []);

  const resetState = () => {
    setSummaries([]);
    setError(undefined);
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
      const items = await summarizeExperience(rawContent, 'summarize', model);
      setSummaries(items);
      if (!items.length) {
        message.info('模型未返回内容，尝试调整文档或稍后重试');
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
    if (!summaries.length) return;
    const content = summaries.map(item => `- ${item}`).join('\n');
    copyToClipboard(content);
    message.success('已复制到剪贴板');
  };

  return (
    <div className="ai-summary-panel">
      <header className="ai-summary-panel__header">
        <h2>
          <FileTextOutlined /> AI 列表生成
        </h2>
        <Paragraph>上传个人经历文档，调用已配置的模型自动提炼要点。</Paragraph>
      </header>

      <Upload.Dragger
        accept=".docx,.txt,.md,.markdown"
        beforeUpload={handleFile}
        multiple={false}
        showUploadList={false}
        className="ai-summary-panel__uploader"
      >
        <p className="ant-upload-drag-icon">
          <CloudUploadOutlined />
        </p>
        <p className="ant-upload-text">拖拽或点击上传 .docx / .txt 文档</p>
        <p className="ant-upload-hint">
          文件不会上传到服务器，仅在浏览器内解析并调用外部 AI。
        </p>
      </Upload.Dragger>

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
          {AI_MODELS.map(m => (
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
          disabled={!summaries.length}
        >
          复制结果
        </Button>
      </div>

      <Spin spinning={loading} tip="正在生成 AI 摘要...">
        <div className="ai-summary-panel__result">
          {error && <div className="error-text">{error}</div>}
          {!error && !summaries.length && !loading && (
            <Empty description="等待生成结果" />
          )}
          {!error && summaries.length > 0 && (
            <ul>
              {summaries.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </Spin>
    </div>
  );
};
