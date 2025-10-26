import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/layout/header';
import Footer from '@/layout/footer';
import { getLanguage, registerLocale, getLocale } from '@/i18n';
import EN_US_LOCALE from '@/i18n/locales/en-US.json';
import { IntlProvider } from 'react-intl';
import { AISummaryPanel } from '@/components/AISummaryPanel';
import './index.less';

registerLocale('en-US', EN_US_LOCALE);

const HomePage: React.FC = () => {
  const lang = getLanguage();

  return (
    <IntlProvider locale={lang} messages={getLocale(lang)}>
      <div className="experience-page">
        <Helmet>
          <title>个人经历规划器</title>
        </Helmet>
        <Header />
        <main className="experience-content">
          <section className="experience-ai">
            <div className="experience-ai__intro">
              <p className="experience-ai__badge">AI 驱动</p>
              <h2>个人经历规划器</h2>
              <p className="experience-ai__description">
                上传您的简历或个人经历文档，使用 AI
                工具将其转化为结构化的要点，为撰写简历和面试做准备。
              </p>
            </div>
            <div className="experience-ai__panel">
              <AISummaryPanel />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </IntlProvider>
  );
};

export default HomePage;
