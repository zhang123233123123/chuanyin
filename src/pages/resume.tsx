import React from 'react';
import { Helmet } from 'react-helmet';
import { IntlProvider } from 'react-intl';
import Header from '@/layout/header';
import Footer from '@/layout/footer';
import { RESUME_INFO } from '@/data/resume';
import { Resume } from '@/components/Resume';
import { getLanguage, registerLocale, getLocale } from '@/i18n';
import EN_US_LOCALE from '@/i18n/locales/en-US.json';
import type { ThemeConfig } from '@/components/types';
import './resume.less';

registerLocale('en-US', EN_US_LOCALE);

const DEFAULT_THEME: ThemeConfig = {
  color: '#2f5785',
  tagColor: '#8bc34a',
};

const ResumePage: React.FC = () => {
  const lang = getLanguage();

  return (
    <IntlProvider locale={lang} messages={getLocale(lang)}>
      <div className="resume-page">
        <Helmet>
          <title>简历模块化展示</title>
        </Helmet>
        <Header />
        <main className="resume-page__body">
          <div className="resume-page__toolbar">
            <h1>简历模块化展示</h1>
          </div>
          <div className="resume-page__preview">
            <Resume
              value={RESUME_INFO}
              theme={DEFAULT_THEME}
              template="template1"
            />
          </div>
        </main>
        <Footer />
      </div>
    </IntlProvider>
  );
};

export default ResumePage;
