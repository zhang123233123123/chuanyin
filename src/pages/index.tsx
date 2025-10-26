import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/layout/header';
import Footer from '@/layout/footer';
import { RESUME_INFO } from '@/data/resume';
import type { ResumeConfig } from '@/components/types';
import EN_US_LOCALE from '@/i18n/locales/en-US.json';
import { getLanguage, registerLocale, getLocale } from '@/i18n';
import { IntlProvider } from 'react-intl';
import { AISummaryPanel } from '@/components/AISummaryPanel';
import { Button } from 'antd';
import './index.less';

const splitLines = (text?: string) =>
  (text || '')
    .split('\n')
    .map(item => item.replace(/^•\s*/, '').trim())
    .filter(Boolean);

const joinTimeline = (
  range?: [string | undefined, string | number | undefined]
) =>
  (range || [])
    .filter(Boolean)
    .map(item => String(item))
    .join(' - ');

registerLocale('en-US', EN_US_LOCALE);

const HomePage: React.FC = () => {
  const profile = RESUME_INFO.profile;
  const displayName = profile?.name ?? 'XXX';
  const aboutList = splitLines(RESUME_INFO.aboutme?.aboutme_desc);

  const aiGuideSteps = [
    {
      title: '上传个人经历文档',
      description:
        '将 Word/TXT/Markdown 简历拖拽或点击上传，页面会在本地读取内容。',
    },
    {
      title: '调用 AI 拆解项目',
      description:
        '点击“生成要点”，触发已在 API 设置页配置好的大模型，自动提炼项目亮点。',
    },
    {
      title: '同步至项目经历',
      description:
        '复制 AI 输出，粘贴到下方“社会实践/项目经历”模块或在线编辑器，完成结构化整理。',
    },
  ];

  type SkillItem = NonNullable<ResumeConfig['skillList']>[number];
  const skills = ((RESUME_INFO.skillList ?? []) as SkillItem[]).filter(item =>
    Boolean(item.skill_desc)
  );

  type WorkItem = NonNullable<ResumeConfig['workExpList']>[number];
  const workList = (RESUME_INFO.workExpList ?? []) as WorkItem[];

  type ProjectItem = NonNullable<ResumeConfig['projectList']>[number];
  const projectList = (RESUME_INFO.projectList ?? []) as ProjectItem[];

  type AwardItem = NonNullable<ResumeConfig['awardList']>[number];
  const awards = (RESUME_INFO.awardList ?? []) as AwardItem[];
  const lang = getLanguage();

  return (
    <IntlProvider locale={lang} messages={getLocale(lang)}>
      <div className="experience-page">
        <Helmet>
          <title>{`${profile?.name || '个人'}经历`}</title>
        </Helmet>
        <Header />
        <main className="experience-content">
          <section className="experience-hero">
            <div className="identity">{displayName}</div>
            <div className="meta">
              {profile?.positionTitle && <span>{profile.positionTitle}</span>}
              {profile?.workPlace && <span>现居：{profile.workPlace}</span>}
              {profile?.mobile && <span>手机：{profile.mobile}</span>}
              {profile?.email && <span>邮箱：{profile.email}</span>}
            </div>
          </section>

          <section className="experience-ai">
            <div className="experience-ai__intro">
              <p className="experience-ai__badge">AI 协作 · 项目拆分助手</p>
              <h2>上传本页内容，快速拆解项目经历</h2>
              <p className="experience-ai__description">
                按照下列指引把个人经历文档交给我们的
                AI，几秒钟即可生成项目要点，方便在本页或在线编辑器中继续润色。
              </p>
              <div className="experience-ai__steps">
                {aiGuideSteps.map(step => (
                  <article className="experience-ai__step" key={step.title}>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </article>
                ))}
              </div>
              <div className="experience-ai__cta">
                <Button
                  type="primary"
                  href="/editor?mode=edit"
                  target="_blank"
                  rel="noreferrer"
                >
                  打开在线编辑器
                </Button>
                <span>或直接在右侧上传文档体验 AI 拆解。</span>
              </div>
            </div>
            <div className="experience-ai__panel">
              <AISummaryPanel />
            </div>
          </section>

          <section className="experience-section">
            <h2>自我评价</h2>
            <ul>
              {aboutList.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {skills.length > 0 && (
            <section className="experience-section">
              <h2>技能与证书</h2>
              <ul>
                {skills.map(item => (
                  <li
                    key={item.skill_name}
                  >{`${item.skill_name}：${item.skill_desc}`}</li>
                ))}
              </ul>
            </section>
          )}

          {workList.length > 0 && (
            <section className="experience-section">
              <h2>实习经历</h2>
              {workList.map(item => (
                <article
                  key={`${item.company_name}-${joinTimeline(item.work_time)}`}
                  className="experience-card"
                >
                  <div className="title">{item.company_name}</div>
                  {item.department_name && (
                    <div className="subtitle">{item.department_name}</div>
                  )}
                  <div className="timeline">{joinTimeline(item.work_time)}</div>
                  <ul>
                    {splitLines(item.work_desc).map(desc => (
                      <li key={desc}>{desc}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>
          )}

          {projectList.length > 0 && (
            <section className="experience-section">
              <h2>社会实践</h2>
              {projectList.map(item => (
                <article
                  key={`${item.project_name}-${item.project_time}`}
                  className="experience-card"
                >
                  <div className="title">
                    {item.project_name}
                    {item.project_role ? ` ｜ ${item.project_role}` : ''}
                  </div>
                  {item.project_time && (
                    <div className="timeline">{item.project_time}</div>
                  )}
                  {item.project_desc && (
                    <div className="subtitle">{item.project_desc}</div>
                  )}
                  <ul>
                    {splitLines(item.project_content).map(content => (
                      <li key={content}>{content}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>
          )}

          {awards.length > 0 && (
            <section className="experience-section">
              <h2>荣誉奖励</h2>
              <ul>
                {awards.map(item => (
                  <li key={item.award_info}>{item.award_info}</li>
                ))}
              </ul>
            </section>
          )}
        </main>
        <Footer />
      </div>
    </IntlProvider>
  );
};

export default HomePage;
