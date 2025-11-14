import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import qs from 'query-string';
import { IntlProvider } from 'react-intl';
import Header from '@/layout/header';
import Footer from '@/layout/footer';
import Content from '@/components';
import EN_US_LOCALE from '@/i18n/locales/en-US.json';
import ZH_CN_LOCALE from '@/i18n/locales/zh-CN.json';
import { getLanguage, registerLocale, getLocale } from '@/i18n';
import './index.less';

registerLocale('en-US', EN_US_LOCALE);
registerLocale('zh-CN', ZH_CN_LOCALE);

const EditorPage: React.FC = () => {
  const lang = getLanguage();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const {
      pathname,
      hash: currentHash,
      search: currentSearch,
    } = window.location;
    const hash = currentHash === '#/' ? '' : currentHash;
    const query = qs.parse(currentSearch);
    if (query.mode !== 'edit') {
      const nextSearch = qs.stringify({
        ...query,
        mode: 'edit',
      });
      const nextUrl = `${pathname}?${nextSearch}${hash}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, []);

  return (
    <IntlProvider locale={lang} messages={getLocale(lang)}>
      <div className="experience-page">
        <Helmet>
          <title>在线编辑器</title>
        </Helmet>
        <Header showModeSwitcher />
        <Content />
        <Footer />
      </div>
    </IntlProvider>
  );
};

export default EditorPage;
