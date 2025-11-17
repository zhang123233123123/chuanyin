import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { IntlProvider, useIntl } from 'react-intl';
import Header from '../layout/header';
import Footer from '../layout/footer';
import { AISummaryPanel } from '../components/AISummaryPanel';
import { ExperienceTable } from '../components/ExperienceTable';
import { ExperienceItem } from '../helpers/ai';
import {
  loadExperiencesFromServer,
  saveExperiencesToServer,
} from '../helpers/experience-api';
import EN_US_LOCALE from '@/i18n/locales/en-US.json';
import ZH_CN_LOCALE from '@/i18n/locales/zh-CN.json';
import { getLanguage, registerLocale, getLocale } from '@/i18n';
// 引入全局组件样式，提供 :root 颜色变量等全局主题
import '../components/index.less';
import './index.less';

registerLocale('en-US', EN_US_LOCALE);
registerLocale('zh-CN', ZH_CN_LOCALE);

const HomePageContent = () => {
  const intl = useIntl();
  const [experiences, setExperiences] = useState<ExperienceItem[]>([]);

  React.useEffect(() => {
    loadExperiencesFromServer()
      .then(data => {
        if (Array.isArray(data) && data.length) {
          setExperiences(data);
        }
      })
      .catch(err => {
        console.warn('[experience] load server data failed', err);
      });
  }, []);

  // 处理AI生成的经历数据
  const handleExperiencesGenerated = (items: ExperienceItem[]) => {
    setExperiences(items);
    saveExperiencesToServer(items).catch(err => {
      console.warn('[experience] save server data failed', err);
    });
  };

  return (
    <div className="experience-page">
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'experience.title',
            defaultMessage: '星邻履历智造（StarLink Resume Maker）',
          })}
        </title>
      </Helmet>
      <Header />
      <main className="experience-content">
        <div className="experience-layout">
          <div className="experience-layout__table">
            <ExperienceTable
              experiences={experiences}
              onChange={handleExperiencesGenerated}
            />
          </div>
          <div className="experience-layout__ai">
            <AISummaryPanel
              experiences={experiences}
              onExperiencesGenerated={handleExperiencesGenerated}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const HomePage = () => {
  const lang = getLanguage();
  return (
    <IntlProvider locale={lang} messages={getLocale(lang)}>
      <HomePageContent />
    </IntlProvider>
  );
};

export default HomePage;
