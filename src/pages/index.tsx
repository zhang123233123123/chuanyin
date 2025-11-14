import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { IntlProvider, useIntl } from 'react-intl';
import Header from '../layout/header';
import Footer from '../layout/footer';
import { AISummaryPanel } from '../components/AISummaryPanel';
import { ExperienceTable } from '../components/ExperienceTable';
import { ExperienceItem } from '../helpers/ai';
import EN_US_LOCALE from '@/i18n/locales/en-US.json';
import ZH_CN_LOCALE from '@/i18n/locales/zh-CN.json';
import { getLanguage, registerLocale, getLocale } from '@/i18n';
import './index.less';

registerLocale('en-US', EN_US_LOCALE);
registerLocale('zh-CN', ZH_CN_LOCALE);

const HomePageContent = () => {
  const intl = useIntl();
  const [experiences, setExperiences] = useState<ExperienceItem[]>([]);

  // 处理AI生成的经历数据
  const handleExperiencesGenerated = (items: ExperienceItem[]) => {
    setExperiences(items);
  };

  return (
    <div className="experience-page">
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'experience.title',
            defaultMessage: '个人经历规划器',
          })}
        </title>
      </Helmet>
      <Header />
      <main className="experience-content">
        <div className="experience-layout">
          <div className="experience-layout__table">
            <ExperienceTable experiences={experiences} />
          </div>
          <div className="experience-layout__ai">
            <AISummaryPanel
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
