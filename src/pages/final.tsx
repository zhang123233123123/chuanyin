import React from 'react';
import { Helmet } from 'react-helmet';
import { List, Button, Space, message, Empty } from 'antd';
import { IntlProvider } from 'react-intl';
import Header from '@/layout/header';
import Footer from '@/layout/footer';
import { Resume } from '@/components/Resume';
import './resume.less';
import { getLanguage, registerLocale, getLocale } from '@/i18n';
import EN_US_LOCALE from '@/i18n/locales/en-US.json';
import ZH_CN_LOCALE from '@/i18n/locales/zh-CN.json';

registerLocale('en-US', EN_US_LOCALE);
registerLocale('zh-CN', ZH_CN_LOCALE);

type FinalEntry = {
  id: string;
  name: string;
  data: any;
  savedAt: number;
};

const STORAGE_KEY = 'resume_final_saves';

const FinalPage: React.FC = () => {
  const lang = getLanguage();
  const [list, setList] = React.useState<FinalEntry[]>([]);
  const [active, setActive] = React.useState<FinalEntry | null>(null);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FinalEntry[];
        if (Array.isArray(parsed)) {
          setList(parsed);
          setActive(parsed[0] || null);
        }
      }
    } catch (err) {
      // ignore
    }
  }, []);

  const handleApply = (item: FinalEntry) => {
    setActive(item);
  };

  const handleDelete = (id: string) => {
    const next = list.filter(item => item.id !== id);
    setList(next);
    setActive(next[0] || null);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    message.success('已删除');
  };

  const handleDownload = (item: FinalEntry) => {
    const blob = new Blob([JSON.stringify(item.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <IntlProvider locale={lang} messages={getLocale(lang)}>
      <div className="resume-page">
        <Helmet>
          <title>最终简历</title>
        </Helmet>
        <Header />
        <main className="resume-page__body">
          <div className="resume-page__layout">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div
                className="resume-page__panel final-list"
                style={{ padding: 16 }}
              >
                <h3 className="final-list__title">最终简历列表</h3>
                <List
                  locale={{ emptyText: <Empty description="暂无最终简历" /> }}
                  dataSource={list}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Button size="small" onClick={() => handleApply(item)}>
                          预览
                        </Button>,
                        <Button
                          size="small"
                          onClick={() => handleDownload(item)}
                        >
                          导出
                        </Button>,
                        <Button
                          size="small"
                          danger
                          onClick={() => handleDelete(item.id)}
                        >
                          删除
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={item.name}
                        description={new Date(item.savedAt).toLocaleString(
                          'zh-CN',
                          {
                            hour12: false,
                          }
                        )}
                      />
                    </List.Item>
                  )}
                />
              </div>
            </Space>

            <div className="resume-page__preview">
              {active ? (
                <Resume
                  value={active.data}
                  theme={
                    (active.data as any)?.theme || {
                      color: '#2f5785',
                      tagColor: '#8bc34a',
                    }
                  }
                  template={(active.data as any)?.template || 'template1'}
                />
              ) : (
                <div style={{ color: '#fff' }}>暂无最终简历</div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </IntlProvider>
  );
};

export default FinalPage;
