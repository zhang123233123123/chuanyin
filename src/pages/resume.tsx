import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { IntlProvider } from 'react-intl';
import {
  Button,
  Card,
  Checkbox,
  Input,
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

const ResumePage: React.FC = () => {
  const lang = getLanguage();
  const [variantName, setVariantName] = useState('通用版');
  const [resumeData, setResumeData] = useState<ResumeConfig>(RESUME_INFO);
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

  const moduleOptions = [
    { key: 'profile', label: '基础信息' },
    { key: 'educationList', label: '教育经历' },
    { key: 'workExpList', label: '工作经历' },
    { key: 'projectList', label: '项目经历' },
    { key: 'skillList', label: '技能' },
    { key: 'awardList', label: '奖项/更多' },
    { key: 'workList', label: '作品' },
    { key: 'aboutme', label: '自我介绍' },
  ] as const;

  const toggleModule = (key: keyof typeof visibleModules, checked: boolean) => {
    setVisibleModules(prev => ({ ...prev, [key]: checked }));
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
    setResumeData(RESUME_INFO);
    setVariantName('通用版');
    message.success('已重置为默认配置');
  };

  const handleAiRestore = () => {
    message.info('AI 还原简历：请在编辑器侧边栏使用“AI 还原简历”功能。');
  };

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
              <Button onClick={handleAiRestore}>AI 还原简历</Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </div>

          <div className="resume-page__layout">
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

            <div className="resume-page__preview">
              <Resume
                value={filteredResume}
                theme={DEFAULT_THEME}
                template="template1"
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
