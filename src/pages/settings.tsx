import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { IntlProvider } from 'react-intl';
import { Button, Input, message, Typography, Tabs } from 'antd';
import Header from '@/layout/header';
import Footer from '@/layout/footer';
import { getLanguage, registerLocale, getLocale } from '@/i18n';
import EN_US_LOCALE from '@/i18n/locales/en-US.json';
import {
  getAiSettings,
  setAiSettings,
  clearAiSettings,
  AiSettings,
  ModelConfig,
} from '@/helpers/api-key';
import './settings.less';

registerLocale('en-US', EN_US_LOCALE);

const { Paragraph, Text } = Typography;
const { TabPane } = Tabs;

const AI_MODELS = ['Gemini', 'DeepSeek', 'Qwen'];

const DEFAULT_PROMPT =
  'You are an expert in HTML and CSS. Please refine the following HTML to be more professional. Use the provided CSS classes: section-title, section-header, section-detail, profile-list. Return only raw HTML. Base HTML to refine: --- {html} ---';

const getDefaultSettings = (): AiSettings => ({
  activeModel: AI_MODELS[0],
  models: AI_MODELS.reduce(
    (acc, model) => ({
      ...acc,
      [model]: { apiKey: '', prompt: DEFAULT_PROMPT },
    }),
    {} as { [modelName: string]: ModelConfig }
  ),
});

const SettingsPage: React.FC = () => {
  const lang = getLanguage();
  const [aiSettings, setAiSettingsValue] = useState<AiSettings>(
    getDefaultSettings()
  );
  const [isDirty, setDirty] = useState(false);

  useEffect(() => {
    const stored = getAiSettings();
    if (stored) {
      setAiSettingsValue(stored);
    }
  }, []);

  const handleSave = () => {
    setAiSettings(aiSettings);
    setDirty(false);
    message.success('AI 配置已保存（仅存储在本地浏览器）');
  };

  const handleClear = () => {
    clearAiSettings();
    setAiSettingsValue(getDefaultSettings());
    setDirty(false);
    message.success('已清除本地 AI 配置');
  };

  const handleModelConfigChange = (
    model: string,
    key: keyof ModelConfig,
    value: string
  ) => {
    setAiSettingsValue(prev => ({
      ...prev,
      models: {
        ...prev.models,
        [model]: {
          ...prev.models[model],
          [key]: value,
        },
      },
    }));
    setDirty(true);
  };

  const handleActiveModelChange = (model: string) => {
    setAiSettingsValue(prev => ({ ...prev, activeModel: model }));
    setDirty(true);
  };

  return (
    <IntlProvider locale={lang} messages={getLocale(lang)}>
      <div className="settings-page">
        <Helmet>
          <title>AI 设置</title>
        </Helmet>
        <Header />
        <main className="settings-content">
          <section className="settings-card">
            <header className="settings-card__header">
              <h1>AI 解析设置</h1>
              <Text className="subtitle">
                为不同的大语言模型配置独立的 API Key 和
                Prompt，以辅助解析简历模版。
              </Text>
            </header>

            <Tabs
              activeKey={aiSettings.activeModel}
              onChange={handleActiveModelChange}
            >
              {AI_MODELS.map(model => (
                <TabPane tab={model} key={model}>
                  <div className="settings-form">
                    <label htmlFor={`${model}-apikey-input`}>API Key</label>
                    <Input.Password
                      id={`${model}-apikey-input`}
                      value={aiSettings.models[model]?.apiKey}
                      placeholder={`请输入你的 ${model} API Key`}
                      onChange={e =>
                        handleModelConfigChange(model, 'apiKey', e.target.value)
                      }
                      visibilityToggle
                    />

                    <label htmlFor={`${model}-prompt-input`}>
                      Prompt (提示词)
                    </label>
                    <Input.TextArea
                      id={`${model}-prompt-input`}
                      value={aiSettings.models[model]?.prompt}
                      placeholder={`请输入用于 ${model} 的提示词`}
                      rows={10}
                      onChange={e =>
                        handleModelConfigChange(model, 'prompt', e.target.value)
                      }
                    />
                  </div>
                </TabPane>
              ))}
            </Tabs>

            <div className="settings-actions">
              <Button type="primary" onClick={handleSave} disabled={!isDirty}>
                保存
              </Button>
              <Button danger onClick={handleClear}>
                清除所有配置
              </Button>
            </div>

            <footer className="settings-card__footer">
              <Paragraph>
                <Text strong>安全提示：</Text>
                API Key 会以 Base64
                编码的形式保存在浏览器中，无法完全避免泄露风险。
              </Paragraph>
            </footer>
          </section>
        </main>
        <Footer />
      </div>
    </IntlProvider>
  );
};

export default SettingsPage;
