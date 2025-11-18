import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { IntlProvider } from 'react-intl';
import {
  Button,
  Card,
  Checkbox,
  Input,
  Empty,
  Upload,
  Space,
  Tag,
  Tooltip,
  message,
} from 'antd';
import Header from '@/layout/header';
import Footer from '@/layout/footer';
import { RESUME_INFO } from '@/data/resume';
import { Resume } from '@/components/Resume';
import { getLanguage, registerLocale, getLocale } from '@/i18n';
import { buildResumeRestorePrompt, streamAiResponse } from '@/helpers/ai';
import { getAiSettings } from '@/helpers/api-key';
import EN_US_LOCALE from '@/i18n/locales/en-US.json';
import ZH_CN_LOCALE from '@/i18n/locales/zh-CN.json';
import type { ResumeConfig, ThemeConfig } from '@/components/types';
import './resume.less';

registerLocale('en-US', EN_US_LOCALE);
registerLocale('zh-CN', ZH_CN_LOCALE);

const DEFAULT_THEME: ThemeConfig = {
  color: '#2f5785',
  tagColor: '#8bc34a',
};

type TemplateItem = {
  id: string;
  name: string;
  data: ResumeConfig;
  updatedAt: number;
};

const buildDefaultTemplate = (): TemplateItem => ({
  id: 'default-template',
  name: '系统默认模版',
  data: normalizeResumeData(RESUME_INFO),
  updatedAt: Date.now(),
});

/**
 * 将 AI 返回的通用结构或用户自定义 JSON 映射为组件需要的 ResumeConfig 结构
 */
const normalizeResumeData = (data: any): ResumeConfig => {
  const parseTimeRange = (value: any): [string, string] => {
    const text = `${value || ''}`;
    if (!text) return ['', ''] as [string, string];
    const parts = text
      .split(/-|~|—|–|to/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) return [parts[0], parts[1]] as [string, string];
    if (parts.length === 1) return [parts[0], ''] as [string, string];
    return ['', ''] as [string, string];
  };

  const joinDesc = (desc: any, links?: any) => {
    const list: string[] = [];
    if (Array.isArray(desc))
      list.push(...desc.map(d => `${d}`.trim()).filter(Boolean));
    else if (desc) list.push(`${desc}`.trim());
    if (Array.isArray(links) && links.length) {
      list.push(`链接：${links.map((l: any) => `${l}`.trim()).join(' / ')}`);
    }
    return list.join('\n');
  };

  const source = data || {};

  const theme = source.theme || {
    color: source.theme?.color || DEFAULT_THEME.color,
    tagColor: source.theme?.tagColor || DEFAULT_THEME.tagColor,
  };

  const titleNameMap =
    source.titleNameMap && Object.keys(source.titleNameMap || {}).length
      ? source.titleNameMap
      : RESUME_INFO.titleNameMap;

  const normalized: ResumeConfig = {
    avatar: source.avatar || { hidden: true },
    profile: {
      name:
        source.profile?.name || source.profile?.fullName || source.name || '',
      mobile: source.profile?.phone || source.profile?.mobile || '',
      email: source.profile?.email || '',
      github: source.profile?.github,
      zhihu: source.profile?.zhihu,
      workPlace:
        source.profile?.workPlace ||
        source.profile?.city ||
        source.profile?.location ||
        '',
      positionTitle:
        source.profile?.title || source.profile?.positionTitle || '',
      workExpYear: source.profile?.workExpYear,
    },
    titleNameMap,
    aboutme: {
      aboutme_desc:
        source.aboutme?.aboutme_desc ||
        joinDesc(source.aboutme?.description || source.aboutme?.summary),
    },
    educationList: Array.isArray(source.educationList)
      ? source.educationList.map((item: any) => ({
          edu_time: parseTimeRange(item.timeRange || item.edu_time),
          school: item.school || item.name || '',
          major: item.major || item.title || '',
          academic_degree: item.academic_degree || item.degree || '',
        }))
      : [],
    workExpList: Array.isArray(source.workExpList)
      ? source.workExpList.map((item: any) => ({
          company_name: item.company_name || item.name || '',
          department_name: item.department_name || item.title || '',
          work_time: parseTimeRange(item.timeRange || item.work_time),
          work_desc:
            joinDesc(item.description, item.links) || item.work_desc || '',
        }))
      : [],
    projectList: Array.isArray(source.projectList)
      ? source.projectList.map((item: any) => ({
          project_name: item.project_name || item.name || '',
          project_role: item.project_role || item.title || '',
          project_time: item.project_time || item.timeRange || '',
          project_desc:
            joinDesc(item.description, item.links) || item.project_desc || '',
        }))
      : [],
    skillList: Array.isArray(source.skillList)
      ? source.skillList.map((item: any) => ({
          skill_name: item.skill_name || item.name || item.title || '',
          skill_desc:
            item.skill_desc ||
            joinDesc(item.description) ||
            (item.tags || []).join(' / '),
        }))
      : [],
    awardList: Array.isArray(source.awardList)
      ? source.awardList.map((item: any) => ({
          award_info: item.award_info || item.name || item.title || '',
          award_time: item.award_time || item.timeRange || '',
        }))
      : [],
    workList: Array.isArray(source.workList)
      ? source.workList.map((item: any) => ({
          work_name: item.work_name || item.name || '',
          work_desc:
            joinDesc(item.description, item.links) || item.work_desc || '',
          visit_link:
            item.visit_link || (Array.isArray(item.links) ? item.links[0] : ''),
        }))
      : [],
  };

  // 将可能的主题与模版信息透传给后续渲染
  (normalized as any).theme = theme;
  (normalized as any).template = source.template || 'template1';

  return normalized;
};

/**
 * 处理 AI SSE 流式返回：提取 data: 行里的 delta.content 拼成完整文本
 */
const extractSseContent = (raw: string): string => {
  const lines = `${raw || ''}`.split(/\r?\n/);
  const chunks: string[] = [];
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    try {
      const parsed = JSON.parse(payload);
      const delta = parsed?.choices?.[0]?.delta;
      if (delta?.content) chunks.push(`${delta.content}`);
    } catch (err) {
      // 非 JSON 时忽略
    }
  });
  if (chunks.length) return chunks.join('');
  return raw;
};

const ResumePage: React.FC = () => {
  const lang = getLanguage();
  const [variantName, setVariantName] = useState('通用版');
  const [resumeData, setResumeData] = useState<ResumeConfig>(
    normalizeResumeData(RESUME_INFO)
  );
  const [templates, setTemplates] = useState<TemplateItem[]>([
    buildDefaultTemplate(),
  ]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    'default-template'
  );
  const [visibleModules, setVisibleModules] = useState({
    profile: true,
    educationList: true,
    workExpList: true,
    projectList: true,
    skillList: true,
    awardList: true,
    workList: true,
    aboutme: true,
  });
  const [restoring, setRestoring] = useState(false);

  const baseModuleOptions = [
    { key: 'profile', label: '基础信息' },
    { key: 'educationList', label: '教育经历' },
    { key: 'workExpList', label: '工作经历' },
    { key: 'projectList', label: '项目经历' },
    { key: 'skillList', label: '技能' },
    { key: 'awardList', label: '奖项/更多' },
    { key: 'workList', label: '作品' },
    { key: 'aboutme', label: '自我介绍' },
  ] as const;

  const hasModuleData = (key: typeof baseModuleOptions[number]['key']) => {
    const data = resumeData as any;
    switch (key) {
      case 'profile': {
        const profile = data.profile || {};
        return Boolean(
          profile.name ||
            profile.mobile ||
            profile.email ||
            profile.github ||
            profile.zhihu ||
            profile.positionTitle ||
            profile.workPlace
        );
      }
      case 'aboutme': {
        const desc = data.aboutme?.aboutme_desc;
        return Boolean(desc && desc.trim());
      }
      default: {
        const list = data[key];
        return Array.isArray(list) && list.length > 0;
      }
    }
  };

  const moduleOptions = useMemo(
    () => baseModuleOptions.filter(item => hasModuleData(item.key)),
    [resumeData]
  );

  React.useEffect(() => {
    setVisibleModules(prev => {
      const next = { ...prev } as any;
      let changed = false;
      moduleOptions.forEach(opt => {
        if (typeof next[opt.key] === 'undefined') {
          next[opt.key] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [moduleOptions]);

  const filteredResume = useMemo<ResumeConfig>(() => {
    const next: ResumeConfig = { ...resumeData } as ResumeConfig;
    if (!visibleModules.profile) next.profile = undefined;
    if (!visibleModules.educationList) next.educationList = [] as any;
    if (!visibleModules.workExpList) next.workExpList = [] as any;
    if (!visibleModules.projectList) next.projectList = [] as any;
    if (!visibleModules.skillList) next.skillList = [] as any;
    if (!visibleModules.awardList) next.awardList = [] as any;
    if (!visibleModules.workList) next.workList = [] as any;
    if (!visibleModules.aboutme)
      next.aboutme = { ...next.aboutme, aboutme_desc: '' } as any;
    return next;
  }, [resumeData, visibleModules]);

  const toggleModule = (key: keyof typeof visibleModules, checked: boolean) => {
    setVisibleModules(prev => ({ ...prev, [key]: checked }));
  };

  const storageAvailable =
    typeof window !== 'undefined' && !!window.localStorage;
  const STORAGE_KEY_DATA = 'resume_modular_data';
  const STORAGE_KEY_MODULES = 'resume_modular_modules';
  const STORAGE_KEY_VARIANT = 'resume_modular_variant';
  const STORAGE_KEY_TEMPLATES = 'resume_modular_templates';
  const STORAGE_KEY_ACTIVE_TEMPLATE = 'resume_modular_active_template';

  React.useEffect(() => {
    if (!storageAvailable) return;
    try {
      const savedTemplates = window.localStorage.getItem(STORAGE_KEY_TEMPLATES);
      const savedActive = window.localStorage.getItem(
        STORAGE_KEY_ACTIVE_TEMPLATE
      );
      const savedData = window.localStorage.getItem(STORAGE_KEY_DATA);
      const savedModules = window.localStorage.getItem(STORAGE_KEY_MODULES);
      const savedVariant = window.localStorage.getItem(STORAGE_KEY_VARIANT);

      if (savedModules) setVisibleModules(JSON.parse(savedModules));
      if (savedVariant) setVariantName(savedVariant);

      if (savedTemplates) {
        const raw = JSON.parse(savedTemplates) as TemplateItem[];
        const parsed = Array.isArray(raw)
          ? raw.map(item => ({ ...item, data: normalizeResumeData(item.data) }))
          : [];
        if (Array.isArray(parsed) && parsed.length) {
          setTemplates(parsed);
          const active =
            parsed.find(item => item.id === savedActive) || parsed[0];
          setActiveTemplateId(active.id);
          setResumeData(active.data);
          setVariantName(active.name);
          return;
        }
      }

      if (savedData) setResumeData(normalizeResumeData(JSON.parse(savedData)));
    } catch (err) {
      // ignore
    }
  }, [storageAvailable]);

  const applyTemplate = (id: string) => {
    const target = templates.find(item => item.id === id);
    if (!target) return;
    setResumeData(normalizeResumeData(target.data));
    setVariantName(target.name);
    setActiveTemplateId(id);
    if (storageAvailable) {
      window.localStorage.setItem(STORAGE_KEY_ACTIVE_TEMPLATE, id);
    }
    message.success(`已应用模版「${target.name}」`);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => {
      if (prev.length <= 1) {
        message.warning('至少保留一个模版');
        return prev;
      }
      const next = prev.filter(item => item.id !== id);
      const nextActive =
        id === activeTemplateId
          ? next[0]
          : prev.find(t => t.id === activeTemplateId) || next[0];
      setActiveTemplateId(nextActive.id);
      setResumeData(normalizeResumeData(nextActive.data));
      setVariantName(nextActive.name);
      if (storageAvailable) {
        window.localStorage.setItem(
          STORAGE_KEY_TEMPLATES,
          JSON.stringify(next)
        );
        window.localStorage.setItem(STORAGE_KEY_ACTIVE_TEMPLATE, nextActive.id);
      }
      message.success('已删除模版');
      return next;
    });
  };

  const upsertTemplate = (name: string, data: ResumeConfig) => {
    const finalName = name?.trim() || '未命名模版';
    const now = Date.now();
    setTemplates(prev => {
      const existIdx = prev.findIndex(t => t.name === finalName);
      let next: TemplateItem[];
      if (existIdx > -1) {
        const cloned = [...prev];
        cloned[existIdx] = {
          ...cloned[existIdx],
          name: finalName,
          data,
          updatedAt: now,
        };
        next = [cloned[existIdx], ...cloned.filter((_, i) => i !== existIdx)];
      } else {
        const id = `tpl-${now}`;
        next = [
          {
            id,
            name: finalName,
            data,
            updatedAt: now,
          },
          ...prev,
        ];
      }
      const activeId = next[0].id;
      if (storageAvailable) {
        window.localStorage.setItem(
          STORAGE_KEY_TEMPLATES,
          JSON.stringify(next)
        );
        window.localStorage.setItem(STORAGE_KEY_ACTIVE_TEMPLATE, activeId);
      }
      setActiveTemplateId(activeId);
      return next;
    });
    setVariantName(finalName);
  };

  const handleReset = () => {
    setVisibleModules({
      profile: true,
      educationList: true,
      workExpList: true,
      projectList: true,
      skillList: true,
      awardList: true,
      workList: true,
      aboutme: true,
    });
    setResumeData(normalizeResumeData(RESUME_INFO));
    setActiveTemplateId('default-template');
    setVariantName('通用版');
    message.success('已重置为默认配置');
  };

  const handleSave = () => {
    if (!storageAvailable) {
      message.warning('当前环境不支持本地保存');
      return;
    }
    const normalized = normalizeResumeData(resumeData);
    window.localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(normalized));
    window.localStorage.setItem(
      STORAGE_KEY_MODULES,
      JSON.stringify(visibleModules)
    );
    window.localStorage.setItem(STORAGE_KEY_VARIANT, variantName);
    // 同步到模版仓库：以当前名称为 key 更新或新增
    upsertTemplate(variantName, normalized);
    message.success('已保存到本地');
  };

  const handleUpload = async (file: File) => {
    const name = file.name.toLowerCase();
    const baseName = file.name.replace(/\.[^/.]+$/, '') || '未命名模版';
    setVariantName(baseName);
    const isJson = name.endsWith('.json');
    const isTxt = name.endsWith('.txt');
    const isDocx = name.endsWith('.docx');
    const isPdf = name.endsWith('.pdf');

    try {
      if (isJson) {
        const text = await file.text();
        const parsed = normalizeResumeData(JSON.parse(text));
        setResumeData(parsed);
        upsertTemplate(baseName, parsed);
        message.success('已载入简历模版');
        return false;
      }

      let content = '';
      if (isTxt) {
        content = await file.text();
      } else if (isDocx) {
        const buffer = await file.arrayBuffer();
        const mammoth = await import('mammoth/mammoth.browser');
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        content = result.value || '';
      } else if (isPdf) {
        message.error('暂不支持直接解析 PDF，请先导出为 DOCX/文本后再上传');
        return false;
      } else {
        message.error('不支持的文件类型，请上传 JSON/TXT/DOCX');
        return false;
      }

      if (!content.trim()) {
        message.error('文件内容为空或无法读取');
        return false;
      }

      setRestoring(true);
      const settings = getAiSettings();
      const model = settings?.activeModel;
      if (!model) {
        throw new Error('请先在“API 设置”中配置模型');
      }

      const prompt = buildResumeRestorePrompt(content.slice(0, 8000));
      const response = await streamAiResponse(prompt, 'resume-restore', model);

      let fullText = '';
      if ((response as any)?.body?.getReader) {
        const reader = (response as any).body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) fullText += decoder.decode(value, { stream: true });
        }
        fullText += decoder.decode();
      } else {
        fullText = await (response as any).text();
      }

      const cleanText = extractSseContent(fullText);
      const parsed = normalizeResumeData(JSON.parse(cleanText));
      setResumeData(parsed);
      upsertTemplate(baseName, parsed);
      message.success('AI 已生成并应用简历模版');
    } catch (err: any) {
      message.error(err?.message || '处理失败，请重试');
    } finally {
      setRestoring(false);
    }

    return false;
  };

  const handleAiRestore = () => {
    message.info('AI 还原简历：请在编辑器侧边栏使用“AI 还原简历”功能。');
  };

  const formatTime = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
    } catch (err) {
      return '';
    }
  };

  const activeTheme: ThemeConfig = (resumeData as any).theme || DEFAULT_THEME;
  const activeTemplate: string = (resumeData as any).template || 'template1';

  return (
    <IntlProvider locale={lang} messages={getLocale(lang)}>
      <div className="resume-page">
        <Helmet>
          <title>简历模块化展示</title>
        </Helmet>
        <Header />
        <main className="resume-page__body">
          <div className="resume-page__toolbar">
            <div className="toolbar__title">
              <h1>简历模块化</h1>
              <Tag color="blue">快速切换岗位版本</Tag>
            </div>
            <Space size={12} wrap>
              <Tooltip title="修改后自动更新右侧预览">
                <Input
                  value={variantName}
                  onChange={e => setVariantName(e.target.value)}
                  style={{ width: 180 }}
                  placeholder="版本名称"
                />
              </Tooltip>
              <Upload
                beforeUpload={handleUpload}
                showUploadList={false}
                accept=".json,.txt,.docx,.pdf"
              >
                <Button loading={restoring}>上传简历模版</Button>
              </Upload>
              <Button type="primary" onClick={handleSave}>
                保存配置
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </div>

          <div className="resume-page__layout">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card
                title="模版仓库"
                className="resume-page__panel"
                size="small"
              >
                <div className="template-list">
                  {templates.length ? (
                    templates.map(item => (
                      <div
                        key={item.id}
                        className={`template-item ${
                          item.id === activeTemplateId ? 'active' : ''
                        }`}
                      >
                        <div className="template-item__meta">
                          <div className="template-item__name">{item.name}</div>
                          <div className="template-item__time">
                            {formatTime(item.updatedAt)}
                          </div>
                        </div>
                        <Space size={8}>
                          <Button
                            size="small"
                            type={
                              item.id === activeTemplateId
                                ? 'primary'
                                : 'default'
                            }
                            onClick={() => applyTemplate(item.id)}
                          >
                            应用
                          </Button>
                          <Button
                            size="small"
                            danger
                            onClick={() => deleteTemplate(item.id)}
                          >
                            删除
                          </Button>
                        </Space>
                      </div>
                    ))
                  ) : (
                    <Empty
                      description="暂无模版"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </div>
              </Card>

              <Card title="模块开关" className="resume-page__panel">
                <Space direction="vertical">
                  {moduleOptions.map(item => (
                    <Checkbox
                      key={item.key}
                      checked={visibleModules[item.key]}
                      onChange={e => toggleModule(item.key, e.target.checked)}
                    >
                      {item.label}
                    </Checkbox>
                  ))}
                </Space>
              </Card>
            </Space>

            <div className="resume-page__preview">
              <Resume
                value={filteredResume}
                theme={activeTheme}
                template={activeTemplate}
              />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </IntlProvider>
  );
};

export default ResumePage;
