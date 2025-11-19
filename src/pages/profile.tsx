import React from 'react';
import { Helmet } from 'react-helmet';
import { IntlProvider } from 'react-intl';
import { Button, Input, message, Divider, Upload } from 'antd';
import Header from '@/layout/header';
import Footer from '@/layout/footer';
import { RESUME_INFO } from '@/data/resume';
import { getLanguage, registerLocale, getLocale } from '@/i18n';
import EN_US_LOCALE from '@/i18n/locales/en-US.json';
import ZH_CN_LOCALE from '@/i18n/locales/zh-CN.json';
import type { ResumeConfig } from '@/components/types';
import './profile.less';

registerLocale('en-US', EN_US_LOCALE);
registerLocale('zh-CN', ZH_CN_LOCALE);

const STORAGE_KEY_PROFILE = 'resume_personal_profile';

const defaultProfile: NonNullable<ResumeConfig['profile']> = {
  name: '',
  mobile: '',
  email: '',
  github: '',
  zhihu: '',
  workExpYear: '',
  workPlace: '',
  positionTitle: '',
  ...RESUME_INFO.profile,
};

const ProfilePage: React.FC = () => {
  const lang = getLanguage();
  const [profile, setProfile] = React.useState(defaultProfile);
  const [about, setAbout] = React.useState(
    RESUME_INFO.aboutme?.aboutme_desc || ''
  );
  const [skills, setSkills] = React.useState(
    RESUME_INFO.skillList?.map(s => s.skill_desc || s.skill_name || '') || []
  );
  const [awards, setAwards] = React.useState(
    RESUME_INFO.awardList?.map(a => a.award_info) || []
  );
  const [education, setEducation] = React.useState(
    (RESUME_INFO.educationList || []).map(e =>
      [
        e.school,
        e.major || '',
        (e.edu_time || []).join('-'),
        e.academic_degree || '',
      ]
        .join('｜')
        .trim()
    )
  );
  const [avatarUrl, setAvatarUrl] = React.useState(
    (RESUME_INFO.avatar && RESUME_INFO.avatar.src) || ''
  );

  const storageAvailable =
    typeof window !== 'undefined' && !!window.localStorage;

  React.useEffect(() => {
    if (!storageAvailable) return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_PROFILE);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProfile({ ...defaultProfile, ...(parsed.profile || parsed) });
        if (parsed.aboutme?.aboutme_desc) setAbout(parsed.aboutme.aboutme_desc);
        if (Array.isArray(parsed.skillList))
          setSkills(
            parsed.skillList.map((s: any) => s.skill_desc || s.skill_name || '')
          );
        if (Array.isArray(parsed.awardList))
          setAwards(parsed.awardList.map((a: any) => a.award_info || ''));
        if (Array.isArray(parsed.educationList))
          setEducation(
            parsed.educationList.map((e: any) =>
              [
                e.school,
                e.major || '',
                Array.isArray(e.edu_time)
                  ? e.edu_time.join('-')
                  : e.edu_time || '',
                e.academic_degree || '',
              ]
                .join('｜')
                .trim()
            )
          );
        if (parsed.avatar?.src) setAvatarUrl(parsed.avatar.src);
      }
    } catch (err) {
      // ignore
    }
  }, [storageAvailable]);

  const handleChange = (key: keyof typeof profile, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!storageAvailable) {
      message.warning('当前环境不支持本地保存');
      return;
    }
    const payload: ResumeConfig = {
      profile,
      aboutme: { aboutme_desc: about },
      skillList: skills
        .filter(s => s.trim())
        .map(s => ({ skill_name: s, skill_desc: s })),
      awardList: awards.filter(a => a.trim()).map(a => ({ award_info: a })),
      educationList: education
        .filter(e => e.trim())
        .map(item => {
          const [school = '', major = '', time = '', degree = ''] = item.split(
            '｜'
          );
          const times = time
            .split(/[-~–—至]/)
            .map(t => t.trim())
            .filter(Boolean);
          return {
            school: school.trim(),
            major: major.trim(),
            edu_time: (times.length ? times : [''])
              .concat([''])
              .slice(0, 2) as any,
            academic_degree: degree.trim(),
          };
        }),
      avatar: avatarUrl ? { src: avatarUrl, hidden: false } : undefined,
    };
    window.localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(payload));
    message.success('个人信息已保存');
  };

  const handleReset = () => {
    setProfile(defaultProfile);
    setAbout(RESUME_INFO.aboutme?.aboutme_desc || '');
    setSkills(
      RESUME_INFO.skillList?.map(s => s.skill_desc || s.skill_name || '') || []
    );
    setAwards(RESUME_INFO.awardList?.map(a => a.award_info) || []);
    setEducation(
      (RESUME_INFO.educationList || []).map(e =>
        [
          e.school,
          e.major || '',
          (e.edu_time || []).join('-'),
          e.academic_degree || '',
        ]
          .join('｜')
          .trim()
      )
    );
    setAvatarUrl((RESUME_INFO.avatar && RESUME_INFO.avatar.src) || '');
    if (storageAvailable) {
      window.localStorage.setItem(
        STORAGE_KEY_PROFILE,
        JSON.stringify({
          profile: defaultProfile,
          aboutme: RESUME_INFO.aboutme,
          skillList: RESUME_INFO.skillList,
          awardList: RESUME_INFO.awardList,
          educationList: RESUME_INFO.educationList,
          avatar: RESUME_INFO.avatar,
        })
      );
    }
    message.success('已恢复默认信息');
  };

  const handleCopy = async () => {
    try {
      const payload = {
        profile,
        aboutme: { aboutme_desc: about },
        skillList: skills
          .filter(s => s.trim())
          .map(s => ({ skill_name: s, skill_desc: s })),
        awardList: awards.filter(a => a.trim()).map(a => ({ award_info: a })),
        educationList: education
          .filter(e => e.trim())
          .map(item => {
            const [
              school = '',
              major = '',
              time = '',
              degree = '',
            ] = item.split('｜');
            const times = time
              .split(/[-~–—至]/)
              .map(t => t.trim())
              .filter(Boolean);
            return {
              school: school.trim(),
              major: major.trim(),
              edu_time: (times.length ? times : [''])
                .concat([''])
                .slice(0, 2) as any,
              academic_degree: degree.trim(),
            };
          }),
        avatar: avatarUrl ? { src: avatarUrl, hidden: false } : undefined,
      };
      const text = JSON.stringify(payload, null, 2);
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      message.success('已复制个人信息 JSON');
    } catch (err) {
      message.error('复制失败');
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const resp = await fetch('http://localhost:4000/api/avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: file.name, data: dataUrl }),
          });
          const json = await resp.json();
          if (!resp.ok || !json?.url) {
            throw new Error(json?.error || '上传失败');
          }
          setAvatarUrl(json.url);
          message.success('头像已上传并保存');
        } catch (err: any) {
          message.error(err?.message || '上传失败');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      message.error('读取文件失败');
    }
    return false;
  };

  return (
    <IntlProvider locale={lang} messages={getLocale(lang)}>
      <div className="profile-page">
        <Helmet>
          <title>个人信息</title>
        </Helmet>
        <Header />
        <main className="profile-page__body">
          <section className="profile-page__panel">
            <div className="profile-page__header">
              <div>
                <span className="profile-page__badge">Profile Config</span>
                <h1>个人信息</h1>
                <p>固定的基础信息保存在此处，这些字段不会随岗位定制变化。</p>
              </div>
              <div className="profile-page__quick-actions">
                <Button type="primary" ghost onClick={handleSave}>
                  保存
                </Button>
                <Button ghost onClick={handleCopy}>
                  复制 JSON
                </Button>
                <Button ghost onClick={handleReset}>
                  恢复默认
                </Button>
              </div>
            </div>
            <Divider />
            <div className="profile-page__form">
              <div className="profile-page__avatar">
                <label>头像</label>
                <div className="profile-page__avatar-preview">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" />
                  ) : (
                    <span>上传后自动保存到服务器</span>
                  )}
                </div>
                <Upload
                  accept=".png,.jpg,.jpeg"
                  showUploadList={false}
                  beforeUpload={handleAvatarUpload as any}
                >
                  <Button size="small" style={{ marginTop: 8 }}>
                    上传头像
                  </Button>
                </Upload>
              </div>

              <div>
                <label>姓名</label>
                <Input
                  value={profile.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="如：张三"
                />
              </div>
              <div>
                <label>手机号</label>
                <Input
                  value={profile.mobile}
                  onChange={e => handleChange('mobile', e.target.value)}
                  placeholder="138xxxxxx"
                />
              </div>
              <div>
                <label>邮箱</label>
                <Input
                  value={profile.email}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label>期望工作地</label>
                <Input
                  value={profile.workPlace}
                  onChange={e => handleChange('workPlace', e.target.value)}
                  placeholder="如：深圳"
                />
              </div>
              <div>
                <label>职位/头衔</label>
                <Input
                  value={profile.positionTitle}
                  onChange={e => handleChange('positionTitle', e.target.value)}
                  placeholder="如：后端工程师"
                />
              </div>
              <div>
                <label>工作年限</label>
                <Input
                  value={profile.workExpYear}
                  onChange={e => handleChange('workExpYear', e.target.value)}
                  placeholder="如：3 年 / 硕士"
                />
              </div>
              <div>
                <label>Github</label>
                <Input
                  value={profile.github}
                  onChange={e => handleChange('github', e.target.value)}
                  placeholder="https://github.com/xxx"
                />
              </div>
              <div>
                <label>知乎</label>
                <Input
                  value={profile.zhihu}
                  onChange={e => handleChange('zhihu', e.target.value)}
                  placeholder="https://www.zhihu.com/people/xxx"
                />
              </div>
            </div>

            <Divider />
            <div className="profile-page__form">
              <div style={{ gridColumn: '1 / -1' }}>
                <label>自我评价</label>
                <Input.TextArea
                  rows={4}
                  value={about}
                  onChange={e => setAbout(e.target.value)}
                  placeholder="简要描述个人优势、性格、亮点"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>技能/证书（每行一条）</label>
                <Input.TextArea
                  rows={4}
                  value={skills.join('\n')}
                  onChange={e => setSkills(e.target.value.split(/\r?\n/))}
                  placeholder="例如：CFA 一级\nPython / SQL\n英语 CET-6"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>荣誉/奖项（每行一条）</label>
                <Input.TextArea
                  rows={3}
                  value={awards.join('\n')}
                  onChange={e => setAwards(e.target.value.split(/\r?\n/))}
                  placeholder="例如：校一等奖学金\nXX 竞赛省赛一等奖"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>教育经历（每行：学校｜专业｜时间段｜学位）</label>
                <Input.TextArea
                  rows={4}
                  value={education.join('\n')}
                  onChange={e => setEducation(e.target.value.split(/\r?\n/))}
                  placeholder="如：XX 大学｜计算机科学｜2018.09-2022.06｜本科"
                />
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </IntlProvider>
  );
};

export default ProfilePage;
