import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  Button,
  Affix,
  Upload,
  Spin,
  message,
  Modal,
  Card,
  Space,
  Select,
  Input,
} from 'antd';
import type { RcFile } from 'antd/lib/upload';
import _ from 'lodash-es';
import jsonUrl from 'json-url';
import { FormattedMessage, useIntl } from 'react-intl';
import { getLanguage } from '@/i18n';
import { useModeSwitcher } from '@/hooks/useModeSwitcher';
import { getDefaultTitleNameMap } from '@/data/constant';
import { getSearchObj } from '@/helpers/location';
import { customAssign } from '@/helpers/customAssign';
import { copyToClipboard } from '@/helpers/copy-to-board';
import { getDevice } from '@/helpers/detect-device';
import { exportDataToLocal } from '@/helpers/export-to-local';
import { getConfig, saveToLocalStorage } from '@/helpers/store-to-local';
import { getAiSettings } from '@/helpers/api-key';
import { streamAiResponse } from '@/helpers/ai';
import { Drawer } from './Drawer';
import { Resume } from './Resume';
import type { ResumeConfig, ThemeConfig } from './types';

import './index.less';

const codec = jsonUrl('lzma');

type TemplateItem = {
  id: string;
  name: string;
  data: ResumeConfig;
  updatedAt: number;
};

export const Page: React.FC = () => {
  const lang = getLanguage();
  const intl = useIntl();
  const user = getSearchObj().user || 'zhanghj';

  const [, mode, changeMode] = useModeSwitcher({});

  const originalConfig = useRef<ResumeConfig>();
  const query = getSearchObj();
  const [config, setConfig] = useState<ResumeConfig>();
  const [loading, updateLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<ThemeConfig>({
    color: '#2f5785',
    tagColor: '#8bc34a',
  });
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>();
  const [jobDesc, setJobDesc] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [finalName, setFinalName] = useState('最终简历');
  const STORAGE_EDITOR_JOBDESC = 'resume_editor_jobdesc';
  const STORAGE_EDITOR_ACTIVE_TEMPLATE = 'resume_editor_active_template';
  const [aiLoading, setAiLoading] = useState<null | 'profile' | 'exp' | 'full'>(
    null
  );
  const [initialLoaded, setInitialLoaded] = useState(false);

  const changeConfig = (v: Partial<ResumeConfig>) => {
    setConfig(
      _.assign({}, { titleNameMap: getDefaultTitleNameMap({ intl }) }, v)
    );
  };

  useEffect(() => {
    const user = (query.user || '') as string;
    const branch = (query.branch || 'master') as string;

    function store(data) {
      originalConfig.current = data;
      const normalized = _.omit(
        customAssign({}, data, _.get(data, ['locales', lang])),
        ['locales']
      );
      changeConfig(normalized);

      if ((data as any)?.theme) {
        setTheme((data as any).theme);
      }

      updateLoading(false);
    }

    if (query.data) {
      codec.decompress(query.data).then(data => {
        store(JSON.parse(data));
      });
    } else {
      getConfig(lang, branch, user).then(data => {
        store(data);
      });
    }
  }, [lang, query.user, query.branch, query.data]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem('resume_modular_templates');
      const active = window.localStorage.getItem(
        'resume_modular_active_template'
      );
      const savedJobDesc = window.localStorage.getItem(STORAGE_EDITOR_JOBDESC);
      if (savedJobDesc) setJobDesc(savedJobDesc);
      if (saved) {
        const parsed = JSON.parse(saved) as TemplateItem[];
        if (Array.isArray(parsed) && parsed.length) {
          setTemplates(parsed);
          setActiveTemplateId(active || parsed[0].id);
        }
      }
    } catch (err) {
      // ignore
    }
    fetchSavedResume();
  }, []);

  const onConfigChange = useCallback(
    (v: Partial<ResumeConfig>) => {
      const newC = _.assign({}, config, v);
      changeConfig(newC);
      saveToLocalStorage(query.user as string, newC);
    },
    [config, lang]
  );

  useEffect(() => {
    if (!config) return;
    const snapshot = { ...config, theme } as ResumeConfig;
    saveToLocalStorage(query.user as string, snapshot, { silent: true });
  }, [config, theme, query.user]);

  const onThemeChange = useCallback(
    (v: Partial<ThemeConfig>) => {
      setTheme(_.assign({}, theme, v));
    },
    [theme]
  );

  const exportCurrent = () => {
    if (!config) return;
    const json = JSON.stringify({ ...config, theme }, null, 2);
    exportDataToLocal(json, `${query.user || 'resume'}-config`);
  };

  useEffect(() => {
    if (!config) return;
    const timer = setTimeout(() => {
      try {
        fetch('http://localhost:4000/api/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume: { ...config, theme } }),
        }).catch(() => {});
      } catch (err) {
        // ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [config, theme]);

  const saveFinalResume = () => {
    if (!config) {
      message.warning('没有可保存的简历');
      return;
    }
    const name = finalName?.trim() || '最终简历';
    const entry = {
      id: `final-${Date.now()}`,
      name,
      data: { ...config, theme },
      savedAt: Date.now(),
    };
    try {
      const key = 'resume_final_saves';
      const existing =
        typeof window !== 'undefined'
          ? JSON.parse(window.localStorage.getItem(key) || '[]')
          : [];
      const next = [entry, ...existing];
      window.localStorage.setItem(key, JSON.stringify(next));
      message.success('已保存到“最终简历”列表');
      setSaveModalOpen(false);
    } catch (err) {
      message.error('保存失败');
    }
  };

  const getPersonalProfile = () => {
    if (typeof window === 'undefined') return undefined;
    try {
      const saved = window.localStorage.getItem('resume_personal_profile');
      if (saved) return JSON.parse(saved);
    } catch (err) {}
    return undefined;
  };

  const fetchSavedResume = async () => {
    try {
      const resp = await fetch('http://localhost:4000/api/resume');
      if (!resp.ok) return;
      const json = await resp.json();
      if (json?.resume) {
        changeConfig(json.resume as ResumeConfig);
        if ((json.resume as any)?.theme) setTheme((json.resume as any).theme);
      }
    } catch (err) {
      // ignore
    } finally {
      setInitialLoaded(true);
    }
  };

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
        // ignore
      }
    });
    if (chunks.length) return chunks.join('');
    return raw;
  };

  const applyTemplate = (id?: string) => {
    const target = templates.find(item => item.id === id) || templates[0];
    if (!target) {
      message.warning('未找到可用模版');
      return;
    }
    const profile = getPersonalProfile();
    const merged: ResumeConfig = {
      ...target.data,
      profile: profile || target.data.profile,
    };
    changeConfig(merged);
    if ((target.data as any)?.theme) {
      setTheme((target.data as any).theme);
    }
    setActiveTemplateId(target.id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_EDITOR_ACTIVE_TEMPLATE, target.id);
    }
  };

  const runAi = async (
    prompt: string,
    successMsg: string,
    featureKey: string,
    loadingKey: 'profile' | 'exp' | 'full'
  ) => {
    try {
      setAiLoading(loadingKey);
      const settings = getAiSettings();
      const model = settings?.activeModel;
      if (!model) {
        throw new Error('请先在“API 设置”中配置模型');
      }
      const response = await streamAiResponse(prompt, featureKey, model);
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
      const parsed = JSON.parse(cleanText) as ResumeConfig;
      changeConfig(parsed);
      if ((parsed as any)?.theme) setTheme((parsed as any).theme);
      message.success(successMsg);
    } catch (err: any) {
      message.error(err?.message || '生成失败');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiProfile = async () => {
    if (!config) {
      message.warning('请先选择模版');
      return;
    }
    const profile = getPersonalProfile();
    if (!profile) {
      message.warning('请先在“个人信息”页面填写并保存');
      return;
    }
    const payload = {
      ...config,
      profile,
    };
    const prompt = `You are a resume optimizer. Update ONLY the profile/basic info section using the provided personal profile, keep other sections unchanged. Preserve JSON structure, theme, template, titleNameMap. Return pure JSON.\nPersonal profile: ${JSON.stringify(
      profile
    )}\nCurrent resume: ${JSON.stringify(payload)}`;
    await runAi(prompt, '已更新个人信息', 'resume_profile', 'profile');
  };

  const handleAiExperience = async () => {
    if (!config) {
      message.warning('请先选择模版');
      return;
    }
    if (!jobDesc) {
      message.warning('请输入岗位描述/JD');
      return;
    }
    const profile = getPersonalProfile();
    const payload = {
      ...config,
      profile: profile || config.profile,
    };
    const prompt = `You are a resume optimizer. Using the job description and existing resume experience data, rewrite ONLY the experience-related sections (educationList, workExpList, projectList, skillList, awardList, workList, aboutme) to better match the JD. Keep profile as-is, keep JSON structure, theme, template, titleNameMap. Return pure JSON.\nJob description: ${jobDesc}\nCurrent resume JSON: ${JSON.stringify(
      payload
    )}`;
    await runAi(prompt, '已更新经历模块', 'resume_experience', 'exp');
  };

  const handleAiFull = async () => {
    if (!config) {
      message.warning('请先选择模版');
      return;
    }
    if (!jobDesc) {
      message.warning('请输入岗位描述/JD');
      return;
    }
    const profile = getPersonalProfile();
    const payload = {
      ...config,
      profile: profile || config.profile,
    };
    const prompt = `You are a resume optimizer. Using the personal profile (if provided), job description, and base resume JSON, generate a fully optimized resume matching the JD while preserving JSON structure, theme, template, titleNameMap. Return pure JSON.\nPersonal profile: ${JSON.stringify(
      profile || {}
    )}\nJob description: ${jobDesc}\nBase resume JSON: ${JSON.stringify(
      payload
    )}`;
    await runAi(prompt, '已生成完整简历', 'resume_optimize', 'full');
  };

  useEffect(() => {
    if (getDevice() === 'mobile') {
      message.info(
        intl.formatMessage({ id: '移动端只提供查看功能，在线制作请前往 PC 端' })
      );
    }
  }, []);

  const [box, setBox] = useState({ width: 0, height: 0, left: 0 });

  useEffect(() => {
    const targetNode = document.querySelector('.resume-content');
    if (!targetNode) return;

    const observer = new MutationObserver(() => {
      setBox(targetNode.getBoundingClientRect());
    });
    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // 再加一个定时器，监控下变化
    const interval = setInterval(() => {
      setBox(targetNode.getBoundingClientRect());
    }, 1000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!config) return;
    setTemplates(prev => {
      if (prev && prev.length) return prev;
      const now = Date.now();
      return [
        {
          id: 'current-config',
          name: '当前简历',
          data: config,
          updatedAt: now,
        },
      ];
    });
    if (!activeTemplateId) setActiveTemplateId('current-config');
  }, [config]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_EDITOR_JOBDESC, jobDesc || '');
    } catch (err) {
      // ignore
    }
  }, [jobDesc]);

  const importConfig = (file: RcFile) => {
    if (window.FileReader) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          if (reader.result) {
            // @ts-ignore
            const newConfig: ConfigProps = JSON.parse(reader.result);
            onThemeChange(newConfig.theme);
            onConfigChange(_.omit(newConfig, 'theme'));
          }
          message.success(intl.formatMessage({ id: '上传配置已应用' }));
        } catch (err) {
          message.error(intl.formatMessage({ id: '上传文件有误，请重新上传' }));
        }
      };
      reader.readAsText(file);
    } else {
      message.error(
        intl.formatMessage({
          id: '您当前浏览器不支持 FileReader，建议使用谷歌浏览器',
        })
      );
    }
    return false;
  };

  function getConfigJson() {
    let fullConfig = config;
    if (lang !== 'zh-CN') {
      fullConfig = customAssign({}, originalConfig?.current, {
        locales: { [lang]: config },
      });
    }
    return JSON.stringify({ ...fullConfig, theme });
  }

  const copyConfig = () => {
    copyToClipboard(getConfigJson());
  };

  const exportConfig = () => {
    exportDataToLocal(getConfigJson(), `${user}'s resume info`);
  };

  const handleSharing = () => {
    const fullConfig = getConfigJson();
    codec.compress(fullConfig).then(data => {
      const url = new URL(window.location.href);
      url.searchParams.set('data', data);

      console.log('sharing url', url.toString());
      copyToClipboard(url.toString());
    });
  };

  return (
    <React.Fragment>
      <Spin spinning={loading}>
        <div className="page">
          {config && (
            <Resume
              value={config}
              theme={theme}
              template={query.template || 'template1'}
            />
          )}
          {mode === 'edit' && (
            <>
              <div className="page-sidebar">
                <Card
                  size="small"
                  title="岗位定制与模版"
                  className="editor-side-card"
                >
                  <Space
                    direction="vertical"
                    size={12}
                    style={{ width: '100%' }}
                  >
                    <div>
                      <div className="field-label">选择模版</div>
                      <Select
                        value={activeTemplateId}
                        style={{ width: '100%' }}
                        placeholder="选择模版"
                        options={templates.map(item => ({
                          label: item.name,
                          value: item.id,
                        }))}
                        onChange={value => applyTemplate(value)}
                      />
                    </div>
                    <div>
                      <div className="field-label">岗位描述 / JD</div>
                      <Input.TextArea
                        value={jobDesc}
                        rows={4}
                        onChange={e => setJobDesc(e.target.value)}
                        placeholder="贴入岗位要求，AI 将结合已解析的个人经历生成匹配简历"
                      />
                    </div>
                    <Space
                      direction="vertical"
                      size={10}
                      style={{ width: '100%' }}
                    >
                      <Space>
                        <Button
                          type="primary"
                          onClick={handleAiFull}
                          loading={aiLoading === 'full'}
                        >
                          一键生成
                        </Button>
                        <Button
                          onClick={handleAiProfile}
                          loading={aiLoading === 'profile'}
                        >
                          个人信息填充
                        </Button>
                      </Space>
                      <Space>
                        <Button
                          onClick={handleAiExperience}
                          loading={aiLoading === 'exp'}
                        >
                          经历填充
                        </Button>
                      </Space>
                    </Space>
                  </Space>
                </Card>
                <Affix offsetTop={0}>
                  <Space direction="vertical" className="action-buttons">
                    <Button type="primary" onClick={() => setVisible(true)}>
                      编辑
                    </Button>
                    <Button onClick={exportCurrent}>导出 JSON</Button>
                    <Button onClick={() => setSaveModalOpen(true)}>
                      保存到最终简历
                    </Button>
                  </Space>
                </Affix>
              </div>
              <div
                className="box-size-info"
                style={{
                  top: `${box.height + 4}px`,
                  left: `${box.width + box.left}px`,
                }}
              >
                ({box.width}, {box.height})
              </div>
            </>
          )}
        </div>
      </Spin>

      <Modal
        open={saveModalOpen}
        title="保存到最终简历"
        onCancel={() => setSaveModalOpen(false)}
        onOk={saveFinalResume}
      >
        <Input
          value={finalName}
          onChange={e => setFinalName(e.target.value)}
          placeholder="请输入保存名称"
        />
      </Modal>
    </React.Fragment>
  );
};

export default Page;
