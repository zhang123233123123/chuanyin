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
  Drawer as AntdDrawer,
  Checkbox,
  Empty,
  Tag,
  Divider,
  Alert,
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
import type { ExperienceItem } from '@/helpers/ai';
import {
  loadExperiencesFromServer,
  saveExperiencesToServer,
} from '@/helpers/experience-api';
import { Resume } from './Resume';
import { Drawer as ConfigDrawer } from './Drawer';
import type { ResumeConfig, ThemeConfig } from './types';

import './index.less';

const codec = jsonUrl('lzma');
const RESUME_API_URL =
  process.env.GATSBY_RESUME_API || 'http://localhost:4000/api/resume';

type TemplateItem = {
  id: string;
  name: string;
  data: ResumeConfig;
  updatedAt: number;
};

type CandidateModule = 'workExpList' | 'projectList';

type SelectionCandidate = {
  id: string;
  module: CandidateModule;
  item: any;
  reason?: string;
  confidence?: number;
  sourceId?: string;
  isNew?: boolean;
};

type SelectionResult = Partial<Record<CandidateModule, SelectionCandidate[]>>;

type ExperienceWithId = ExperienceItem & { _id: string };

const candidateModuleOptions: { key: CandidateModule; label: string }[] = [
  { key: 'workExpList', label: '实习 / 工作经历' },
  { key: 'projectList', label: '项目经历' },
];

const PROFILE_DEFAULTS = {
  name: '',
  mobile: '',
  email: '',
  github: '',
  zhihu: '',
  workExpYear: '',
  workPlace: '',
  positionTitle: '',
};

const generateId = () =>
  `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const SELECTION_CACHE_KEY = 'resume_fine_selection_cache';

type SelectionCachePayload = {
  jobDesc: string;
  timestamp: number;
  candidates: SelectionResult;
  checked: Record<string, boolean>;
  baseResume?: ResumeConfig;
  experiencePool: ExperienceWithId[];
};

const attachExperienceIds = (items: ExperienceItem[]): ExperienceWithId[] =>
  items.map((item, index) => ({
    ...item,
    _id: (item as any)?._id || `${item.type || 'exp'}-${index}-${generateId()}`,
  }));

const resumeItemToExperience = (
  module: CandidateModule,
  item: any,
  id?: string
): ExperienceWithId => {
  if (module === 'workExpList') {
    return {
      _id: id || generateId(),
      type: 'workExp',
      company_name: item.company_name || '',
      department_name: item.department_name || '',
      work_time: Array.isArray(item.work_time)
        ? item.work_time
        : item.work_time
        ? [item.work_time, '']
        : ['', ''],
      work_desc: item.work_desc || '',
    } as ExperienceWithId;
  }
  return {
    _id: id || generateId(),
    type: 'project',
    project_name: item.project_name || '',
    project_role: item.project_role || '',
    project_time: item.project_time || '',
    project_desc: item.project_desc || '',
    project_content: item.project_content || '',
  } as ExperienceWithId;
};

const experienceToResumeItem = (
  experience: ExperienceWithId,
  module: CandidateModule
) => {
  if (module === 'workExpList') {
    const workTime = Array.isArray(experience.work_time)
      ? experience.work_time
      : experience.work_time
      ? [experience.work_time, '']
      : ['', ''];
    return {
      company_name: experience.company_name || '',
      department_name:
        experience.department_name || experience.project_role || '',
      work_time: workTime,
      work_desc: experience.work_desc || experience.project_content || '',
    };
  }
  return {
    project_name:
      experience.project_name || experience.company_name || '未命名项目',
    project_role: experience.project_role || experience.department_name || '',
    project_time: Array.isArray(experience.work_time)
      ? experience.work_time.filter(Boolean).join(' ~ ')
      : experience.project_time || '',
    project_desc: experience.project_desc || experience.work_desc || '',
    project_content: experience.project_content || '',
  };
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
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
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
  const [selectionDrawerOpen, setSelectionDrawerOpen] = useState(false);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [
    selectionCandidates,
    setSelectionCandidates,
  ] = useState<SelectionResult>({});
  const [selectionChecked, setSelectionChecked] = useState<
    Record<string, boolean>
  >({});
  const [
    selectionBaseResume,
    setSelectionBaseResume,
  ] = useState<ResumeConfig>();
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [selectionApplying, setSelectionApplying] = useState(false);
  const [experiencePoolState, setExperiencePoolState] = useState<
    ExperienceWithId[]
  >([]);
  const [experiencePoolDirty, setExperiencePoolDirty] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<{
    module: CandidateModule;
    candidate: SelectionCandidate;
  } | null>(null);
  const [editingFormData, setEditingFormData] = useState<any>({});
  const [newCandidateModule, setNewCandidateModule] = useState<CandidateModule>(
    'workExpList'
  );
  const [selectionSort, setSelectionSort] = useState<
    'confidence' | 'time' | 'custom'
  >('confidence');
  const [selectionShowOnly, setSelectionShowOnly] = useState<
    'all' | 'selected' | 'unselected'
  >('all');
  const [rewriteLoadingId, setRewriteLoadingId] = useState<string | null>(null);
  const fineModeTriggered = useRef(false);
  const [poolFilter, setPoolFilter] = useState('');

  const ensureResumeSections = (value: Partial<ResumeConfig>): ResumeConfig => {
    const next = {
      titleNameMap: getDefaultTitleNameMap({ intl }),
      ...value,
    } as ResumeConfig;
    next.profile = {
      ...PROFILE_DEFAULTS,
      ...(next.profile || {}),
    };
    next.aboutme = {
      aboutme_desc: '',
      ...(next.aboutme || {}),
    };
    next.avatar = next.avatar || {};
    const listKeys: (keyof ResumeConfig)[] = [
      'educationList',
      'workExpList',
      'projectList',
      'skillList',
      'awardList',
      'workList',
    ];
    listKeys.forEach(key => {
      if (!Array.isArray(next[key])) {
        (next as any)[key] = [];
      }
    });
    return next;
  };

  const changeConfig = (v: Partial<ResumeConfig>) => {
    const normalized = ensureResumeSections(v);
    setConfig(normalized);
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

  useEffect(() => {
    if (fineModeTriggered.current) return;
    if (mode !== 'edit') return;
    if (query?.fine !== '1') return;
    if (!jobDesc) {
      message.warning('请先填写岗位描述/JD 再使用细致模式');
      return;
    }
    fineModeTriggered.current = true;
    handleAiSelection();
  }, [mode, query?.fine, jobDesc]);

  const onThemeChange = useCallback(
    (v: Partial<ThemeConfig>) => {
      setTheme(_.assign({}, theme, v));
    },
    [theme]
  );

  const waitForNextFrame = () =>
    new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

  const exportPreviewToPdf = (fileName: string) => {
    const preview = resumePreviewRef.current;
    if (!preview) {
      message.error('未找到简历内容，无法导出');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('请允许浏览器弹窗以导出 PDF');
      return;
    }
    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    )
      .map(node => node.outerHTML)
      .join('');
    printWindow.document.write(
      `<!DOCTYPE html><html><head><title>${fileName}</title>${styles}</head><body class="resume-print">${preview.innerHTML}</body></html>`
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const exportCurrent = async () => {
    if (!config) {
      message.warning('没有可导出的简历');
      return;
    }
    await waitForNextFrame();
    exportPreviewToPdf(
      config?.profile?.name ? `${config.profile.name}-简历` : '在线简历'
    );
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

  useEffect(() => {
    if (selectionDrawerOpen) return;
    if (fineModeTriggered.current) return;
    if (!jobDesc) return;
    const cache = loadSelectionCache();
    if (
      cache &&
      cache.jobDesc === jobDesc &&
      candidateModuleOptions.some(
        option => cache.candidates?.[option.key]?.length
      )
    ) {
      setSelectionCandidates(cache.candidates);
      setSelectionChecked(cache.checked || {});
      setSelectionBaseResume(cache.baseResume);
      setExperiencePoolState(cache.experiencePool || []);
      setSelectionDrawerOpen(true);
      message.info('已恢复上次未完成的细致模式草稿');
      fineModeTriggered.current = true;
    }
  }, [jobDesc, selectionDrawerOpen]);

  useEffect(() => {
    if (!selectionDrawerOpen) return;
    const hasCandidates = candidateModuleOptions.some(
      option => selectionCandidates[option.key]?.length
    );
    if (!hasCandidates) return;
    saveSelectionCache({
      jobDesc,
      timestamp: Date.now(),
      candidates: selectionCandidates,
      checked: selectionChecked,
      baseResume: selectionBaseResume,
      experiencePool: experiencePoolState,
    });
  }, [
    selectionDrawerOpen,
    selectionCandidates,
    selectionChecked,
    selectionBaseResume,
    experiencePoolState,
    jobDesc,
  ]);

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
      if (!saved) return undefined;
      const parsed = JSON.parse(saved);
      // 兼容历史存储结构：可能是完整简历 JSON，也可能只有 profile
      return parsed?.profile || parsed || undefined;
    } catch (err) {}
    return undefined;
  };

  const fetchServerResume = useCallback(async () => {
    try {
      const resp = await fetch(RESUME_API_URL, { cache: 'no-store' });
      if (!resp.ok) return null;
      const data = await resp.json();
      return (data?.resume || null) as ResumeConfig | null;
    } catch (err) {
      console.warn('[resume] load server resume failed', err);
      return null;
    }
  }, []);

  const fetchExperiencePool = useCallback(async (): Promise<
    ExperienceWithId[]
  > => {
    try {
      const experiences = await loadExperiencesFromServer();
      return Array.isArray(experiences) ? attachExperienceIds(experiences) : [];
    } catch (err) {
      console.warn('[experience] load pool failed', err);
      return [];
    }
  }, []);

  const loadAiSourceData = useCallback(async (): Promise<{
    resumeData: ResumeConfig | undefined;
    experiencePool: ExperienceWithId[];
  }> => {
    const [serverResume, experiencePool] = await Promise.all([
      fetchServerResume(),
      fetchExperiencePool(),
    ]);
    const latestResume = serverResume || config;
    setExperiencePoolState(experiencePool);
    setExperiencePoolDirty(false);
    return {
      resumeData: latestResume,
      experiencePool,
    };
  }, [config, fetchExperiencePool, fetchServerResume]);

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

  const mergeResumeSections = (
    base: ResumeConfig | undefined,
    patch: ResumeConfig
  ): ResumeConfig => {
    if (!base) return patch;
    const merged = { ...base, ...patch } as ResumeConfig;
    const listKeys: (keyof ResumeConfig)[] = [
      'educationList',
      'workExpList',
      'projectList',
      'skillList',
      'awardList',
      'workList',
    ];
    listKeys.forEach(key => {
      const value = patch[key];
      if (!Array.isArray(value) || value.length === 0) {
        merged[key] = base[key];
      }
    });
    if (!patch.profile) merged.profile = base.profile;
    if (!patch.aboutme?.aboutme_desc) merged.aboutme = base.aboutme;
    if (!patch.titleNameMap) merged.titleNameMap = base.titleNameMap;
    if (!(patch as any)?.template && (base as any)?.template) {
      (merged as any).template = (base as any).template;
    }
    if (!(patch as any)?.theme && (base as any)?.theme) {
      (merged as any).theme = (base as any).theme;
    }
    return merged;
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
      profile: profile || config?.profile || target.data.profile,
    };
    if (!merged.profile) {
      merged.profile = config?.profile || {
        name: '',
        mobile: '',
        email: '',
        workPlace: '',
        positionTitle: '',
      };
    }
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
    loadingKey: 'profile' | 'exp' | 'full',
    baseResume?: ResumeConfig
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
      const merged = mergeResumeSections(baseResume || config, parsed);
      changeConfig(merged);
      const nextTheme = (parsed as any)?.theme || (merged as any)?.theme;
      if (nextTheme) setTheme(nextTheme);
      message.success(successMsg);
    } catch (err: any) {
      message.error(err?.message || '生成失败');
    } finally {
      setAiLoading(null);
    }
  };

  const requestAiSelection = async (prompt: string) => {
    const settings = getAiSettings();
    const model = settings?.activeModel;
    if (!model) {
      throw new Error('请先在“API 设置”中配置模型');
    }
    const response = await streamAiResponse(prompt, 'resume_selection', model);
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
    return JSON.parse(cleanText);
  };

  const normalizeSelectionResponse = (raw: any): SelectionResult => {
    const result: SelectionResult = {};
    candidateModuleOptions.forEach(option => {
      const list = Array.isArray(raw?.[option.key]) ? raw[option.key] : [];
      if (!list.length) return;
      const normalized = list
        .map((entry: any, idx: number) => {
          const rawItem = entry?.item || entry;
          if (!rawItem) return null;
          const item = { ...rawItem };
          if (item._id) delete item._id;
          const id =
            entry?.id ||
            rawItem?._id ||
            entry?.sourceId ||
            `${option.key}-${idx}-${generateId()}`;
          return {
            id,
            module: option.key,
            item,
            reason: entry?.reason || entry?.match_reason || entry?.note,
            confidence:
              typeof entry?.confidence === 'number'
                ? entry.confidence
                : typeof entry?.score === 'number'
                ? entry.score
                : undefined,
            sourceId:
              rawItem?._id || entry?.sourceId || entry?.source_id || undefined,
          } as SelectionCandidate;
        })
        .filter(Boolean) as SelectionCandidate[];
      if (normalized.length) {
        result[option.key] = normalized;
      }
    });
    return result;
  };

  const buildSelectionCheckedMap = (result: SelectionResult) => {
    const map: Record<string, boolean> = {};
    candidateModuleOptions.forEach(option => {
      result[option.key]?.forEach(entry => {
        map[entry.id] = true;
      });
    });
    return map;
  };

  const saveSelectionCache = (payload: SelectionCachePayload) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SELECTION_CACHE_KEY, JSON.stringify(payload));
    } catch (err) {
      // ignore
    }
  };

  const loadSelectionCache = (): SelectionCachePayload | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(SELECTION_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  };

  const clearSelectionCache = () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(SELECTION_CACHE_KEY);
    } catch (err) {
      // ignore
    }
  };

  const parseTimeToNumber = (value: string | undefined) => {
    if (!value) return 0;
    const normalized = value
      .replace(/[年|\.|\/]/g, '-')
      .replace(/--+/g, '-')
      .replace(/[^0-9-]/g, '');
    const date = new Date(normalized);
    const time = date.getTime();
    return Number.isNaN(time) ? 0 : time;
  };

  const getCandidateTimeValue = (entry: SelectionCandidate) => {
    if (entry.module === 'workExpList') {
      const [start = '', end = ''] = Array.isArray(entry.item?.work_time)
        ? entry.item.work_time
        : ['', ''];
      return parseTimeToNumber(end || start);
    }
    return parseTimeToNumber(entry.item?.project_time);
  };

  const filterCandidateVisible = (entry: SelectionCandidate) => {
    if (selectionShowOnly === 'all') return true;
    const checked = !!selectionChecked[entry.id];
    if (selectionShowOnly === 'selected') return checked;
    return !checked;
  };

  const sortCandidates = (entries: SelectionCandidate[]) => {
    if (!entries?.length) return entries;
    if (selectionSort === 'custom') return entries;
    const sorted = [...entries];
    if (selectionSort === 'confidence') {
      sorted.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    } else if (selectionSort === 'time') {
      sorted.sort(
        (a, b) => getCandidateTimeValue(b) - getCandidateTimeValue(a)
      );
    }
    return sorted;
  };

  const fillProfileWithAi = async () => {
    if (!config) {
      message.warning('请先选择模版');
      return false;
    }
    const { resumeData } = await loadAiSourceData();
    const baseResume = resumeData || config;
    if (!baseResume) {
      message.warning('暂无可用的简历数据');
      return false;
    }
    const storedProfile = getPersonalProfile();
    const baseProfile = baseResume.profile;
    if (!storedProfile && !baseProfile) {
      message.warning('请先在“个人信息”页面填写并保存');
      return false;
    }
    const finalProfile = storedProfile || baseProfile || {};
    const profileChanged =
      !baseProfile || !_.isEqual(baseProfile, finalProfile);
    if (!profileChanged) return true;
    const payload: ResumeConfig = {
      ...baseResume,
      profile: finalProfile,
    } as ResumeConfig;
    const prompt = `You are a resume optimizer. Update ONLY the profile/basic info section using the provided personal profile, keep other sections unchanged. Preserve JSON structure, theme, template, titleNameMap. Return pure JSON.\nPersonal profile: ${JSON.stringify(
      finalProfile
    )}\nCurrent resume: ${JSON.stringify(payload)}`;
    await runAi(prompt, '已更新个人信息', 'resume_profile', 'profile', payload);
    return true;
  };

  const handleAiProfile = async () => {
    await fillProfileWithAi();
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
    const { resumeData, experiencePool } = await loadAiSourceData();
    const baseResume = ensureResumeSections(resumeData || config);
    const personalProfile = getPersonalProfile();
    if (personalProfile) {
      baseResume.profile = {
        ...baseResume.profile,
        ...personalProfile,
      };
    }
    const poolText = experiencePool?.length
      ? `\nExperience pool (JSON array of candidates): ${JSON.stringify(
          experiencePool
        )}`
      : '';
    const prompt = `You are a resume optimizer. Using the personal profile (if provided), job description, base resume JSON, and experience pool, generate a fully optimized resume matching the JD. Update profile, educationList, workExpList, projectList, skillList, awardList, workList, aboutme even if they were empty before. Preserve JSON structure, theme, template, titleNameMap. Return pure JSON.\nPersonal profile data: ${JSON.stringify(
      personalProfile || baseResume.profile || {}
    )}\nJob description: ${jobDesc}${poolText}\nBase resume JSON: ${JSON.stringify(
      baseResume
    )}`;
    await runAi(
      prompt,
      '已生成完整简历',
      'resume_optimize',
      'full',
      baseResume
    );
  };

  const handleAiSelection = async () => {
    if (!config) {
      message.warning('请先选择模版');
      return;
    }
    if (!jobDesc) {
      message.warning('请输入岗位描述/JD');
      return;
    }
    const profileUpdated = await fillProfileWithAi();
    if (!profileUpdated) return;
    fineModeTriggered.current = true;
    setSelectionLoading(true);
    setSelectionError(null);
    setSelectionCandidates({});
    setSelectionChecked({});
    try {
      const { resumeData, experiencePool } = await loadAiSourceData();
      const baseResume = resumeData || config;
      if (!baseResume) {
        message.warning('暂无可用的简历数据');
        return;
      }
      setSelectionBaseResume(baseResume);
      const profile = getPersonalProfile() || baseResume.profile;
      const poolPayload = experiencePool.map(item => ({ ...item }));
      const prompt = `You are a resume assistant. Based on the job description and the candidate's full resume plus experience pool, select only the most relevant work and project experiences. Respond with JSON: { "workExpList": [ { "item": { ... }, "reason": "...", "confidence": 0.85, "sourceId": "_id" } ], "projectList": [...] }. Only include modules with matches. Keep \"_id\" when referencing existing pool items so we can update them.\nJob description: ${jobDesc}\nCurrent resume JSON: ${JSON.stringify(
        baseResume
      )}\nExperience pool with _id: ${JSON.stringify(poolPayload)}`;
      const rawResult = await requestAiSelection(prompt);
      const normalized = normalizeSelectionResponse(rawResult);
      const hasData = candidateModuleOptions.some(
        option => normalized[option.key]?.length
      );
      if (!hasData) {
        message.info('AI 暂无匹配建议，请调整 JD');
        return;
      }
      setSelectionCandidates(normalized);
      setSelectionChecked(buildSelectionCheckedMap(normalized));
      setSelectionDrawerOpen(true);
    } catch (err: any) {
      const msg = err?.message || 'AI 推荐失败';
      setSelectionError(msg);
      message.error(msg);
    } finally {
      setSelectionLoading(false);
    }
  };

  const closeSelectionDrawer = () => {
    setSelectionDrawerOpen(false);
    setEditingCandidate(null);
    setSelectionError(null);
  };

  const handleToggleCandidate = (id: string, checked: boolean) => {
    setSelectionChecked(prev => ({ ...prev, [id]: checked }));
  };

  const handleToggleModule = (module: CandidateModule, checked: boolean) => {
    setSelectionChecked(prev => {
      const next = { ...prev };
      selectionCandidates[module]?.forEach(entry => {
        next[entry.id] = checked;
      });
      return next;
    });
  };

  const selectedCount = Object.values(selectionChecked).filter(Boolean).length;

  const getCandidateTitle = (module: CandidateModule, item: any) => {
    if (module === 'workExpList') return item.company_name || '未命名公司';
    return item.project_name || '未命名项目';
  };

  const getCandidateSubtitle = (module: CandidateModule, item: any) => {
    if (module === 'workExpList')
      return item.department_name || item.positionTitle;
    return item.project_role;
  };

  const getCandidateTime = (module: CandidateModule, item: any) => {
    if (module === 'workExpList') {
      const [start = '', end = ''] = Array.isArray(item.work_time)
        ? item.work_time
        : ['', ''];
      return start || end ? `${start} ~ ${end || '至今'}` : '';
    }
    return item.project_time || '';
  };

  const openEditingModal = (entry: SelectionCandidate) => {
    const base = entry.item || {};
    const initial = {
      ...base,
      work_time_start: Array.isArray(base.work_time) ? base.work_time[0] : '',
      work_time_end: Array.isArray(base.work_time) ? base.work_time[1] : '',
    };
    setEditingCandidate({ module: entry.module, candidate: entry });
    setEditingFormData(initial);
  };

  const handleAddCandidate = () => {
    const newId = generateId();
    const defaultItem =
      newCandidateModule === 'workExpList'
        ? {
            company_name: '',
            department_name: '',
            work_time: ['', ''],
            work_desc: '',
          }
        : {
            project_name: '',
            project_role: '',
            project_time: '',
            project_desc: '',
          };
    const entry: SelectionCandidate = {
      id: newId,
      module: newCandidateModule,
      item: defaultItem,
      isNew: true,
      sourceId: newId,
    };
    openEditingModal(entry);
  };

  const normalizeEditingItem = (module: CandidateModule, data: any) => {
    if (module === 'workExpList') {
      const { work_time_start, work_time_end, ...rest } = data;
      return {
        ...rest,
        work_time: [work_time_start || '', work_time_end || ''],
      };
    }
    const clone = { ...data };
    return clone;
  };

  const saveEditingCandidate = () => {
    if (!editingCandidate) return;
    const module = editingCandidate.module;
    const candidate = editingCandidate.candidate;
    const normalizedItem = normalizeEditingItem(module, editingFormData);
    const sourceId = candidate.sourceId || candidate.id;
    const updatedEntry: SelectionCandidate = {
      ...candidate,
      item: normalizedItem,
      sourceId,
      isNew: false,
    };
    setSelectionCandidates(prev => {
      const current = prev[module] || [];
      const exists = current.some(item => item.id === candidate.id);
      const list = exists
        ? current.map(item => (item.id === candidate.id ? updatedEntry : item))
        : [...current, updatedEntry];
      return {
        ...prev,
        [module]: list,
      };
    });
    setSelectionChecked(prev => ({ ...prev, [candidate.id]: true }));
    setExperiencePoolState(prev => {
      const expItem = resumeItemToExperience(module, normalizedItem, sourceId);
      const index = prev.findIndex(item => item._id === sourceId);
      if (index > -1) {
        const clone = [...prev];
        clone[index] = { ...clone[index], ...expItem };
        return clone;
      }
      return [...prev, expItem];
    });
    setExperiencePoolDirty(true);
    setEditingCandidate(null);
  };

  const cancelEditingCandidate = () => {
    setEditingCandidate(null);
  };

  const handleEditingFieldChange = (field: string, value: string) => {
    setEditingFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddFromPool = (exp: ExperienceWithId) => {
    const module: CandidateModule =
      exp.type === 'project' ? 'projectList' : 'workExpList';
    const existing = selectionCandidates[module]?.find(
      entry => entry.sourceId === exp._id || entry.id === exp._id
    );
    if (existing) {
      message.info('该候选已在列表中');
      return;
    }
    const resumeItem = experienceToResumeItem(exp, module);
    const id = exp._id || generateId();
    const entry: SelectionCandidate = {
      id,
      module,
      item: resumeItem,
      reason: '来自候选库',
      confidence: undefined,
      sourceId: exp._id,
    };
    setSelectionCandidates(prev => ({
      ...prev,
      [module]: [...(prev[module] || []), entry],
    }));
    setSelectionChecked(prev => ({ ...prev, [id]: true }));
    message.success('已添加到细致模式列表');
  };

  const filteredExperiencePool = experiencePoolState.filter(item => {
    if (!poolFilter.trim()) return true;
    const keywords = poolFilter.trim().toLowerCase();
    const content = JSON.stringify(item).toLowerCase();
    return content.includes(keywords);
  });

  const confirmClearSelection = () => {
    Modal.confirm({
      title: '清空细致模式草稿？',
      content: '草稿清空后需要重新运行 AI 以生成候选列表。',
      okText: '清空',
      okButtonProps: { danger: true },
      onOk: () => {
        clearSelectionCache();
        setSelectionCandidates({});
        setSelectionChecked({});
        setSelectionBaseResume(undefined);
        setExperiencePoolState([]);
        setSelectionDrawerOpen(false);
        setSelectionError(null);
        message.success('已清空细致模式草稿');
      },
    });
  };

  const applySelectedCandidates = async () => {
    const patch: Partial<ResumeConfig> = {};
    candidateModuleOptions.forEach(option => {
      const entries = selectionCandidates[option.key];
      if (!entries?.length) return;
      const selectedItems = entries
        .filter(entry => selectionChecked[entry.id])
        .map(entry => entry.item);
      if (selectedItems.length) {
        (patch as any)[option.key] = selectedItems;
      }
    });
    if (Object.keys(patch).length === 0) {
      message.warning('请选择要应用的经历');
      return;
    }
    const base = selectionBaseResume || config;
    if (!base) {
      message.warning('暂无可用的简历数据');
      return;
    }
    setSelectionApplying(true);
    try {
      const merged = mergeResumeSections(
        base as ResumeConfig,
        patch as ResumeConfig
      );
      changeConfig(merged);
      const nextTheme = (merged as any)?.theme || theme;
      if (nextTheme) setTheme(nextTheme);
      if (experiencePoolDirty && experiencePoolState.length) {
        try {
          await saveExperiencesToServer(experiencePoolState);
          setExperiencePoolDirty(false);
        } catch (err) {
          message.error('经历池保存失败，请稍后重试');
        }
      }
      setSelectionDrawerOpen(false);
      clearSelectionCache();
      message.success('已应用选中的经历');
    } finally {
      setSelectionApplying(false);
    }
  };

  const handleRewriteCandidate = async (entry: SelectionCandidate) => {
    if (!jobDesc) {
      message.warning('请先填写岗位描述/JD');
      return;
    }
    setRewriteLoadingId(entry.id);
    try {
      const base = selectionBaseResume || config;
      const prompt = `You are a resume coach. Based on the job description and the following resume entry, rewrite it to better match the JD. Keep the JSON fields identical to the original structure. Return JSON: { \"item\": { ... } }.\nJob description: ${jobDesc}\nEntry JSON: ${JSON.stringify(
        entry.item
      )}`;
      const raw = await requestAiSelection(prompt);
      const updatedItem =
        raw?.item ||
        raw?.result?.item ||
        raw?.workExpList?.[0]?.item ||
        raw?.projectList?.[0]?.item;
      if (!updatedItem) {
        message.warning('AI 未返回有效内容');
        return;
      }
      setSelectionCandidates(prev => {
        const current = prev[entry.module] || [];
        const next = current.map(item =>
          item.id === entry.id ? { ...item, item: updatedItem } : item
        );
        return { ...prev, [entry.module]: next };
      });
      setExperiencePoolState(prev => {
        const sourceId = entry.sourceId || entry.id;
        const updated = resumeItemToExperience(
          entry.module,
          updatedItem,
          sourceId
        );
        const index = prev.findIndex(item => item._id === sourceId);
        if (index > -1) {
          const clone = [...prev];
          clone[index] = { ...clone[index], ...updated };
          return clone;
        }
        return [...prev, updated];
      });
      setExperiencePoolDirty(true);
      if (base && entry.module === 'workExpList') {
        message.success('该经历已依据 JD 重新润色');
      } else {
        message.success('AI 已更新该条经历');
      }
    } catch (err: any) {
      message.error(err?.message || 'AI 润色失败');
    } finally {
      setRewriteLoadingId(null);
    }
  };

  useEffect(() => {
    if (getDevice() === 'mobile') {
      message.info(
        intl.formatMessage({ id: '移动端只提供查看功能，在线制作请前往 PC 端' })
      );
    }
  }, []);

  const [box, setBox] = useState({ width: 0, height: 0, left: 0 });
  const resumePreviewRef = useRef<HTMLDivElement | null>(null);

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
          <div className="resume-preview" ref={resumePreviewRef}>
            {config && (
              <Resume
                value={config}
                theme={theme}
                template={query.template || 'template1'}
              />
            )}
          </div>
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
                      <Button
                        block
                        onClick={handleAiSelection}
                        loading={selectionLoading}
                      >
                        修改经历填充
                      </Button>
                    </Space>
                  </Space>
                </Card>
                <Affix offsetTop={0}>
                  <Space direction="vertical" className="action-buttons">
                    <Button
                      type="primary"
                      onClick={() => setConfigDrawerOpen(true)}
                      disabled={!config}
                    >
                      在线编辑
                    </Button>
                    <Button onClick={exportCurrent}>导出简历</Button>
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

      {config && (
        <ConfigDrawer
          value={config}
          onValueChange={onConfigChange}
          theme={theme}
          onThemeChange={onThemeChange}
          template={activeTemplateId || templates[0]?.id || 'current-config'}
          onTemplateChange={value => applyTemplate(value)}
          open={configDrawerOpen}
          onOpenChange={setConfigDrawerOpen}
          hideTriggerButton
          disableTemplateTab
          className="editor-config-drawer"
          nestedDrawerClassName="editor-config-drawer"
          modalClassName="editor-config-modal"
          hideHeaderActions
        />
      )}

      <AntdDrawer
        className="selection-drawer"
        title="AI 推荐的匹配经历"
        placement="right"
        width={520}
        open={selectionDrawerOpen}
        onClose={closeSelectionDrawer}
        destroyOnClose
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div className="selection-controls">
            <Space>
              <Select
                value={newCandidateModule}
                onChange={value =>
                  setNewCandidateModule(value as CandidateModule)
                }
                options={candidateModuleOptions.map(item => ({
                  label: item.label,
                  value: item.key,
                }))}
                style={{ width: 200 }}
              />
              <Button type="dashed" size="small" onClick={handleAddCandidate}>
                新增条目
              </Button>
            </Space>
            <Space>
              <Select
                value={selectionSort}
                onChange={value =>
                  setSelectionSort(value as 'confidence' | 'time' | 'custom')
                }
                style={{ width: 160 }}
                options={[
                  { label: '按匹配度排序', value: 'confidence' },
                  { label: '按时间排序', value: 'time' },
                  { label: '保持原顺序', value: 'custom' },
                ]}
              />
              <Select
                value={selectionShowOnly}
                onChange={value =>
                  setSelectionShowOnly(
                    value as 'all' | 'selected' | 'unselected'
                  )
                }
                style={{ width: 160 }}
                options={[
                  { label: '显示全部', value: 'all' },
                  { label: '仅查看已选', value: 'selected' },
                  { label: '仅查看未选', value: 'unselected' },
                ]}
              />
              <Button size="small" onClick={confirmClearSelection}>
                清空草稿
              </Button>
            </Space>
          </div>
          {selectionError && <Alert type="error" message={selectionError} />}

          {experiencePoolState.length > 0 && (
            <div className="selection-pool">
              <div className="selection-pool__header">
                <div>候选经历库（{experiencePoolState.length}）</div>
                <Input
                  allowClear
                  placeholder="搜索关键字"
                  value={poolFilter}
                  onChange={e => setPoolFilter(e.target.value)}
                  size="small"
                  style={{ width: 200 }}
                />
              </div>
              <div className="selection-pool__list">
                {filteredExperiencePool.slice(0, 50).map(item => (
                  <div key={item._id} className="selection-pool__item">
                    <div>
                      <div className="selection-pool__name">
                        {item.type === 'project'
                          ? item.project_name || '未命名项目'
                          : item.company_name || '未命名公司'}
                      </div>
                      <div className="selection-pool__desc">
                        {(item.project_desc || item.work_desc || '')
                          .split('\n')[0]
                          .slice(0, 80)}
                      </div>
                    </div>
                    <Button
                      size="small"
                      onClick={() => handleAddFromPool(item)}
                    >
                      加入
                    </Button>
                  </div>
                ))}
                {!filteredExperiencePool.length && (
                  <Empty
                    description="未找到匹配"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </div>
            </div>
          )}

          {candidateModuleOptions.map(option => {
            const entries = selectionCandidates[option.key];
            if (!entries?.length) return null;
            const visibleEntries = sortCandidates(entries).filter(entry =>
              filterCandidateVisible(entry)
            );
            if (!visibleEntries.length) return null;
            return (
              <div key={option.key} className="selection-module">
                <div className="selection-module__header">
                  <div>{option.label}</div>
                  <Space size={8}>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => handleToggleModule(option.key, true)}
                    >
                      全选
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => handleToggleModule(option.key, false)}
                    >
                      全不选
                    </Button>
                  </Space>
                </div>
                <div className="selection-module__list">
                  {visibleEntries.map(entry => {
                    const title = getCandidateTitle(entry.module, entry.item);
                    const subtitle = getCandidateSubtitle(
                      entry.module,
                      entry.item
                    );
                    const timeText = getCandidateTime(entry.module, entry.item);
                    return (
                      <div key={entry.id} className="selection-item">
                        <Checkbox
                          checked={!!selectionChecked[entry.id]}
                          onChange={e =>
                            handleToggleCandidate(entry.id, e.target.checked)
                          }
                        />
                        <div className="selection-item__body">
                          <div className="selection-item__title">
                            <span className="selection-item__name">
                              {title}
                            </span>
                            {subtitle && (
                              <span className="selection-item__sub">
                                {subtitle}
                              </span>
                            )}
                          </div>
                          {timeText && (
                            <div className="selection-item__time">
                              {timeText}
                            </div>
                          )}
                          {entry.item?.work_desc &&
                            entry.module === 'workExpList' && (
                              <div className="selection-item__desc">
                                {entry.item.work_desc}
                              </div>
                            )}
                          {entry.item?.project_desc &&
                            entry.module === 'projectList' && (
                              <div className="selection-item__desc">
                                {entry.item.project_desc}
                              </div>
                            )}
                          <div className="selection-item__meta">
                            {entry.reason && (
                              <div className="selection-item__reason">
                                推荐理由：{entry.reason}
                              </div>
                            )}
                            {typeof entry.confidence === 'number' && (
                              <Tag color="blue">
                                匹配度 {(entry.confidence * 100).toFixed(0)}%
                              </Tag>
                            )}
                          </div>
                        </div>
                        <Button
                          size="small"
                          onClick={() => openEditingModal(entry)}
                        >
                          编辑
                        </Button>
                        <Button
                          size="small"
                          type="link"
                          loading={rewriteLoadingId === entry.id}
                          onClick={() => handleRewriteCandidate(entry)}
                        >
                          AI 润色
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!candidateModuleOptions.some(
            option => selectionCandidates[option.key]?.length
          ) && <Empty description="暂无推荐" />}
          <Divider />
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={closeSelectionDrawer}>取消</Button>
            <Button
              type="primary"
              onClick={applySelectedCandidates}
              disabled={selectedCount === 0}
              loading={selectionApplying}
            >
              应用选中{selectedCount ? ` (${selectedCount})` : ''}
            </Button>
          </Space>
        </Space>
      </AntdDrawer>

      <Modal
        open={!!editingCandidate}
        title="编辑候选经历"
        onCancel={cancelEditingCandidate}
        onOk={saveEditingCandidate}
      >
        {editingCandidate && (
          <Space direction="vertical" style={{ width: '100%' }}>
            {editingCandidate.module === 'workExpList' ? (
              <>
                <Input
                  value={editingFormData.company_name || ''}
                  placeholder="公司名称"
                  onChange={e =>
                    handleEditingFieldChange('company_name', e.target.value)
                  }
                />
                <Input
                  value={editingFormData.department_name || ''}
                  placeholder="部门 / 职位"
                  onChange={e =>
                    handleEditingFieldChange('department_name', e.target.value)
                  }
                />
                <Space>
                  <Input
                    value={editingFormData.work_time_start || ''}
                    placeholder="开始时间"
                    onChange={e =>
                      handleEditingFieldChange(
                        'work_time_start',
                        e.target.value
                      )
                    }
                  />
                  <Input
                    value={editingFormData.work_time_end || ''}
                    placeholder="结束时间"
                    onChange={e =>
                      handleEditingFieldChange('work_time_end', e.target.value)
                    }
                  />
                </Space>
                <Input.TextArea
                  rows={4}
                  value={editingFormData.work_desc || ''}
                  placeholder="工作描述"
                  onChange={e =>
                    handleEditingFieldChange('work_desc', e.target.value)
                  }
                />
              </>
            ) : (
              <>
                <Input
                  value={editingFormData.project_name || ''}
                  placeholder="项目名称"
                  onChange={e =>
                    handleEditingFieldChange('project_name', e.target.value)
                  }
                />
                <Input
                  value={editingFormData.project_role || ''}
                  placeholder="担任角色"
                  onChange={e =>
                    handleEditingFieldChange('project_role', e.target.value)
                  }
                />
                <Input
                  value={editingFormData.project_time || ''}
                  placeholder="项目时间"
                  onChange={e =>
                    handleEditingFieldChange('project_time', e.target.value)
                  }
                />
                <Input.TextArea
                  rows={4}
                  value={editingFormData.project_desc || ''}
                  placeholder="项目描述"
                  onChange={e =>
                    handleEditingFieldChange('project_desc', e.target.value)
                  }
                />
              </>
            )}
          </Space>
        )}
      </Modal>
    </React.Fragment>
  );
};

export default Page;
