import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { IntlProvider } from 'react-intl';
import { Button, Input, message, Typography, Tabs, Divider } from 'antd';
import Header from '@/layout/header';
import Footer from '@/layout/footer';
import { getLanguage, registerLocale, getLocale } from '@/i18n';
import EN_US_LOCALE from '@/i18n/locales/en-US.json';
import ZH_CN_LOCALE from '@/i18n/locales/zh-CN.json';
import {
  getAiSettings,
  setAiSettings,
  clearAiSettings,
  AiSettings,
  getDefaultSettings,
  AI_MODELS,
} from '@/helpers/api-key';
import './settings.less';

registerLocale('en-US', EN_US_LOCALE);
registerLocale('zh-CN', ZH_CN_LOCALE);

const { Paragraph, Text } = Typography;
const { TabPane } = Tabs;

// UI-specific mapping for prompt feature names
const PROMPT_FEATURES = {
  summarize: '总结个人经历',
  match_jd: '匹配职位描述 (JD)',
  optimize: '优化经历描述',
};

const SettingsPage: React.FC = () => {
  const lang = getLanguage();
  const [aiSettings, setAiSettingsValue] = useState<AiSettings>(
    getDefaultSettings()
  );
  const [isDirty, setDirty] = useState(false);

  useEffect(() => {
    // getAiSettings now returns a safe, merged object.
    setAiSettingsValue(getAiSettings());
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
        [model]: { ...prev.models[model], [key]: value },
      },
    }));
    setDirty(true);
  };

  const handlePromptChange = (feature: string, value: string) => {
    setAiSettingsValue(prev => ({
      ...prev,
      prompts: {
        ...prev.prompts,
        [feature]: value,
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
              <h1>AI 模型设置</h1>
              <Text className="subtitle">
                选择一个激活模型，并为其配置 API Key。
              </Text>
            </header>

            <Tabs
              activeKey={aiSettings.activeModel}
              onChange={handleActiveModelChange}
            >
              {AI_MODELS.map(model => (
                <TabPane tab={model} key={model}>
                  <div className="settings-form">
                    <label htmlFor={`${model}-endpoint-input`}>
                      Endpoint 地址
                    </label>
                    <Input
                      id={`${model}-endpoint-input`}
                      value={aiSettings.models[model]?.endpoint || ''}
                      placeholder="例如: https://api.deepseek.com/v1"
                      onChange={e =>
                        handleModelConfigChange(
                          model,
                          'endpoint',
                          e.target.value
                        )
                      }
                    />
                    <label htmlFor={`${model}-apikey-input`}>API Key</label>
                    <Input.Password
                      id={`${model}-apikey-input`}
                      value={aiSettings.models[model]?.apiKey || ''}
                      placeholder={`请输入你的 ${model} API Key`}
                      onChange={e =>
                        handleModelConfigChange(model, 'apiKey', e.target.value)
                      }
                      visibilityToggle
                    />
                  </div>
                </TabPane>
              ))}
            </Tabs>

            <Divider />

            <header className="settings-card__header">
              <h1>Prompt 管理</h1>
              <Text className="subtitle">
                为不同的 AI 功能配置独立的 Prompt (提示词)。
              </Text>
            </header>

            <div className="settings-form prompt-management">
              {Object.entries(PROMPT_FEATURES).map(([key, name]) => (
                <React.Fragment key={key}>
                  <label htmlFor={`${key}-prompt-input`}>{name}</label>
                  <Input.TextArea
                    id={`${key}-prompt-input`}
                    value={aiSettings.prompts[key] || ''}
                    placeholder={`请输入用于“${name}”功能的提示词`}
                    rows={8}
                    onChange={e => handlePromptChange(key, e.target.value)}
                  />
                </React.Fragment>
              ))}
            </div>

            <Divider />

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
