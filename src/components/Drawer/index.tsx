import React, { useState, useRef, useMemo } from 'react';
import {
  Drawer as AntdDrawer,
  Button,
  Collapse,
  Modal,
  Radio,
  Popover,
  Input,
  List,
  Form,
  Upload,
  Spin,
  Alert,
  message,
} from 'antd';
import {
  DeleteFilled,
  InfoCircleFilled,
  EditOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import _ from 'lodash-es';
import arrayMove from 'array-move';
import { FormCreator } from '../FormCreator';
import { getDefaultTitleNameMap } from '@/data/constant';
import { FormattedMessage, useIntl } from 'react-intl';
import { MODULES, CONTENT_OF_MODULE } from '@/helpers/contant';
import type { ResumeConfig, ThemeConfig } from '../types';
import { ConfigTheme } from './ConfigTheme';
import { Templates } from './Templates';
import './index.less';
import useThrottle from '@/hooks/useThrottle';
import { getAiSettings } from '@/helpers/api-key';

const { Panel } = Collapse;
const { TextArea } = Input;

const exampleLess = `
/*
  Final styles for the single-column, white-background resume.
*/

// Base container for the entire resume page
.template1-resume {
  width: 794px;
  min-height: 1122px; // A4 aspect ratio
  margin: 30px auto;
  padding: 50px;
  background: #fff;
  color: #333;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.15);
  font-family: sans-serif;
}

// Avatar (Personal Photo) - positioned to the right, but within the document flow
.avatar {
  width: 100px;
  height: 120px;
  border: 1px solid #ddd;
  object-fit: cover;
  float: right; // Use float to position it to the right
  margin: 0 0 15px 15px;
}

// Main content area
.content-area {
  // No margin-top needed now
}

// General Section Styling
section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  line-height: 1.5;
  margin-bottom: 15px;
  color: #8C438D; // Purple color
  border-bottom: 2px solid #8C438D; // Purple underline
  padding-bottom: 5px;
  font-weight: bold;
  text-transform: none;
  clear: both; // Clear float for section titles
}

.section-info {
  font-size: 14px;
  line-height: 1.7;
  color: #555;
  margin-bottom: 8px;
}

// Profile Name
.profile .name {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #000;
}

// List of profile details (phone, email, etc.)
.profile .profile-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  margin-bottom: 20px;
  color: #333;

  .anticon {
    margin-right: 8px;
    color: #8C438D;
  }
}

// Experience item styling
.section-item {
  margin-bottom: 15px;
}

.work-description,
.project-content {
  white-space: pre-wrap;
  color: #555;
  padding-left: 15px;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.7;
}

// --- Print and Responsive Styles ---
 @media print {
  @page {
    size: A4;
    margin: 0;
  }
  .template1-resume {
    width: 100%;
    min-height: initial;
    margin: 0;
    padding: 40px;
    box-shadow: none;
  }
}

 @media (max-width: 794px) {
  .template1-resume {
    width: 100%;
    margin: 0;
    padding: 20px;
  }
  .avatar {
    float: none;
    display: block;
    margin: 0 auto 20px;
  }
}
`;

type Props = {
  value: ResumeConfig;
  onValueChange: (v: Partial<ResumeConfig>) => void;
  theme: ThemeConfig;
  onThemeChange: (v: Partial<ThemeConfig>) => void;
  template: string;
  onTemplateChange: (v: string) => void;

  style?: object;
};

const type = 'DragableBodyRow';

const DragableRow = ({ index, moveRow, ...restProps }) => {
  const ref = useRef();
  const [{ isOver, dropClassName }, drop] = useDrop({
    accept: type,
    collect: monitor => {
      // @ts-ignore
      const { index: dragIndex } = monitor.getItem() || {};
      if (dragIndex === index) {
        return {};
      }
      return {
        isOver: monitor.isOver(),
        dropClassName:
          dragIndex < index ? ' drop-over-downward' : ' drop-over-upward',
      };
    },
    drop: item => {
      // @ts-ignore
      moveRow(item.index, index);
    },
  });
  const [, drag] = useDrag({
    type,
    item: { index },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });
  drop(drag(ref));

  return (
    <div
      ref={ref}
      className={`${isOver ? dropClassName : ''}`}
      style={{ cursor: 'move' }}
      {...restProps}
    />
  );
};

const UploadTemplateModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    const templateName = prompt(
      'Please enter a name for your new template (e.g., MyTemplate):'
    );
    if (!templateName) {
      return false;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async e => {
      const exampleTsx = `import React from 'react';
import { Rate, Tag } from 'antd';
import {
  MobileFilled,
  MailFilled,
  GithubFilled,
  ZhihuCircleFilled,
  TrophyFilled,
  CheckCircleFilled,
  ScheduleFilled,
  CrownFilled,
  EnvironmentFilled,
  HeartFilled,
} from '@ant-design/icons';
import _ from 'lodash-es';
import { FormattedMessage, useIntl } from 'react-intl';
import { getDefaultTitleNameMap } from '@/data/constant';
import { Avatar } from '../../Avatar';
import type { ResumeConfig, ThemeConfig } from '../../types';
import './index.less';
import { buildResumeRestorePrompt, streamAiResponse } from '@/helpers/ai';

type Props = {
  value: ResumeConfig;
  theme: ThemeConfig;
};

/**
 * @description 简历内容区
 */
const Template1: React.FC<Props> = props => {
  const intl = useIntl();
  const { value, theme } = props;

  /** 个人基础信息 */
  const profile = _.get(value, 'profile');

  const titleNameMap = _.get(
    value,
    'titleNameMap',
    getDefaultTitleNameMap({ intl })
  );

  /** 教育背景 */
  const educationList = _.get(value, 'educationList');

  /** 工作经历 */
  const workExpList = _.get(value, 'workExpList');

  /** 项目经验 */
  const projectList = _.get(value, 'projectList');

  /** 个人技能 */
  const skillList = _.get(value, 'skillList');

  /** 更多信息 */
  const awardList = _.get(value, 'awardList');

  /** 作品 */
  const workList = _.get(value, 'workList');

  /** 自我介绍 */
  const aboutme = _.split(_.get(value, ['aboutme', 'aboutme_desc']), '\n');

  return (
    <div className="template1-resume resume-content">
      {/* Avatar */}
      {!value?.avatar?.hidden && (
        <Avatar
          avatarSrc={value?.avatar?.src}
          className="avatar"
          shape={value?.avatar?.shape}
          size={value?.avatar?.size}
        />
      )}

      {/* All content is now in a single column */}
      <div className="content-area">
        {/* 个人信息 */}
        <div className="profile">
          {profile?.name && <div className="name">{profile.name}</div>}
          <div className="profile-list">
            {profile?.mobile && (
              <div className="email">
                <MobileFilled style={{ color: theme.color, opacity: 0.85 }} />
                {profile.mobile}
              </div>
            )}
            {profile?.email && (
              <div className="email">
                <MailFilled style={{ color: theme.color, opacity: 0.85 }} />
                {profile.email}
              </div>
            )}
            {profile?.github && (
              <div className="github">
                <GithubFilled style={{ color: theme.color, opacity: 0.85 }} />
                <span
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    window.open(profile.github);
                  }}
                >
                  {profile.github}
                </span>
              </div>
            )}
            {profile?.zhihu && (
              <div className="github">
                <ZhihuCircleFilled
                  style={{ color: theme.color, opacity: 0.85 }}
                />
                <span
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    window.open(profile.zhihu);
                  }}
                >
                  {profile.zhihu}
                </span>
              </div>
            )}
            {profile?.workExpYear && (
              <div className="work-exp-year">
                <ScheduleFilled style={{ color: theme.color, opacity: 0.85 }} />
                <span>
                  <FormattedMessage id="工作经验" />: {profile.workExpYear}
                </span>
              </div>
            )}
            {profile?.workPlace && (
              <div className="work-place">
                <EnvironmentFilled
                  style={{ color: theme.color, opacity: 0.85 }}
                />
                <span>
                  <FormattedMessage id="期望工作地" />: {profile.workPlace}
                </span>
              </div>
            )}
            {profile?.positionTitle && (
              <div className="expect-job">
                <HeartFilled style={{ color: theme.color, opacity: 0.85 }} />
                <span>
                  <FormattedMessage id="职位" />: {profile.positionTitle}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 自我介绍 */}
        {!!_.trim(_.join(aboutme, '')) && (
          <section className="section section-aboutme">
            <div className="section-title" style={{ color: theme.color }}>
              {titleNameMap?.aboutme}
            </div>
            {aboutme.map((d, idx) => (
              <div key={idx}>{d}</div>
            ))}
          </section>
        )}

        {/* 教育背景 */}
        {educationList?.length ? (
          <section className="section section-education">
            <div className="section-title" style={{ color: theme.color }}>
              {titleNameMap?.educationList}
            </div>
            {educationList.map((education, idx) => {
              const [start, end] = education.edu_time;
              return (
                <div key={idx.toString()} className="education-item">
                  <div>
                    <b>{education.school}</b>
                    <span className="info-time">
                      {start}
                      {end ? (
                        <>
                          {' ~ '}
                          {end}
                        </>
                      ) : (
                        <FormattedMessage id=" 至今" />
                      )}
                    </span>
                  </div>
                  <div>
                    {education.major && <span>{education.major}</span>}
                    {education.academic_degree && (
                      <span className="sub-info" style={{ marginLeft: '4px' }}>
                        ({education.academic_degree})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        ) : null}

        {/* 工作经历 */}
        {workExpList?.length ? (
          <section className="section section-work-exp">
            <div className="section-title" style={{ color: theme.color }}>
              {titleNameMap?.workExpList}
            </div>
            {_.map(workExpList, (work, idx) => {
              if (!work) return null;

              let start: string | null = null;
              let end: string | null = null;

              if (typeof work.work_time === 'string') {
                const times = (work.work_time || '').split(',');
                [start, end] = [times[0] || null, times[1] || null];
              } else if (Array.isArray(work.work_time)) {
                [start, end] = work.work_time;
              }

              return (
                <div className="section-item" key={idx.toString()}>
                  <div className="section-info">
                    <b className="info-name">
                      {work.company_name}
                      <span className="sub-info">{work.department_name}</span>
                    </b>
                    <span className="info-time">
                      {start}
                      {end ? (
                        <>
                          {' ~ '}
                          {end}
                        </>
                      ) : (
                        <FormattedMessage id=" 至今" />
                      )}
                    </span>
                  </div>
                  <div className="work-description">{work.work_desc}</div>
                </div>
              ) : null;
            })}
          </section>
        ) : null}

        {/* 项目经验 */}
        {projectList?.length ? (
          <section className="section section-project">
            <div className="section-title" style={{ color: theme.color }}>
              {titleNameMap?.projectList}
            </div>
            {_.map(projectList, (project, idx) =>
              project ? (
                <div className="section-item" key={idx.toString()}>
                  <div className="section-info">
                    <b className="info-name">
                      {project.project_name}
                      <span className="info-time">{project.project_time}</span>
                    </b>
                    {project.project_role && (
                      <Tag color={theme.tagColor}>{project.project_role}</Tag>
                    )}
                  </div>
                  <div className="project-content">{project.project_desc}</div>
                </div>
              ) : null
            )}
          </section>
        ) : null}

        {/* 个人作品 */}
        {workList?.length ? (
          <section className="section section-work">
            <div className="section-title" style={{ color: theme.color }}>
              {titleNameMap?.workList}
            </div>
            {workList.map((work, idx) => {
              return (
                <div key={idx.toString()}>
                  <div>
                    <CrownFilled
                      style={{ color: '#ffc107', marginRight: '8px' }}
                    />
                    <b className="info-name">{work.work_name}</b>
                    <a className="sub-info" href={work.visit_link}>
                      <FormattedMessage id="访问链接" />
                    </a>
                  </div>
                  {work.work_desc && <div>{work.work_desc}</div>}
                </div>
              );
            })}
          </section>
        ) : null}

        {/* 专业技能 */}
        {skillList?.length ? (
          <section className="section section-skill">
            <div className="section-title" style={{ color: theme.color }}>
              {titleNameMap?.skillList}
            </div>
            {skillList.map((skill, idx) => {
              return skill ? (
                <React.Fragment key={idx}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                    }}
                    key={idx}
                  >
                    <b className="info-name">{skill.skill_name}</b>
                    {skill.skill_desc}
                  </div>
                </React.Fragment>
              ) : null;
            })}
          </section>
        ) : null}

        {/* 荣誉奖励 */}
        {awardList?.length ? (
          <section className="section section-award">
            <div className="section-title" style={{ color: theme.color }}>
              {titleNameMap?.awardList}
            </div>
            {awardList.map((award, idx) => {
              return (
                <div key={idx.toString()}>
                  <TrophyFilled
                    style={{ color: '#ffc107', marginRight: '8px' }}
                  />
                  <b className="info-name">{award.award_info}</b>
                  {award.award_time && (
                    <span className="sub-info award-time">
                      ({award.award_time})
                    </span>
                  )}
                </div>
              );
            })}
          </section>
        ) : null}
      </div>
    </div>
  );
};
export default Template1;
`;
      const exampleLess = `/*
  Final styles for the single-column, white-background resume.
*/

// Base container for the entire resume page
.template1-resume {
  width: 794px;
  min-height: 1122px; // A4 aspect ratio
  margin: 30px auto;
  padding: 50px;
  background: #fff;
  color: #333;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.15);
  font-family: sans-serif;
}

// Avatar (Personal Photo) - positioned to the right, but within the document flow
.avatar {
  width: 100px;
  height: 120px;
  border: 1px solid #ddd;
  object-fit: cover;
  float: right; // Use float to position it to the right
  margin: 0 0 15px 15px;
}

// Main content area
.content-area {
  // No margin-top needed now
}

// General Section Styling
section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  line-height: 1.5;
  margin-bottom: 15px;
  color: #8C438D; // Purple color
  border-bottom: 2px solid #8C438D; // Purple underline
  padding-bottom: 5px;
  font-weight: bold;
  text-transform: none;
  clear: both; // Clear float for section titles
}

.section-info {
  font-size: 14px;
  line-height: 1.7;
  color: #555;
  margin-bottom: 8px;
}

// Profile Name
.profile .name {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #000;
}

// List of profile details (phone, email, etc.)
.profile .profile-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  margin-bottom: 20px;
  color: #333;

  .anticon {
    margin-right: 8px;
    color: #8C438D;
  }
}

// Experience item styling
.section-item {
  margin-bottom: 15px;
}

.work-description,
.project-content {
  white-space: pre-wrap;
  color: #555;
  padding-left: 15px;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.7;
}

// --- Print and Responsive Styles ---
 @media print {
  @page {
    size: A4;
    margin: 0;
  }
  .template1-resume {
    width: 100%;
    min-height: initial;
    margin: 0;
    padding: 40px;
    box-shadow: none;
  }
}

@media (max-width: 794px) {
  .template1-resume {
    width: 100%;
    margin: 0;
    padding: 20px;
  }
  .avatar {
    float: none;
    display: block;
    margin: 0 auto 20px;
  }
}
`;

      const prompt = `
You are an expert in React and Less. I will provide you with the content of a resume (it could be text or an image data URL). Your task is to generate a React component (\`index.tsx\`) and a Less file (\`index.less\`) that represent this resume.

The generated code should be a single-column layout.

Here is an example of a \`template1/index.tsx\` file:
\`\`\`tsx
${exampleTsx}
\`\`\`

Here is an example of a \`template1/index.less\` file:
\`\`\`less
${exampleLess}
\`\`\`

Now, here is the new resume content:
---
${resumeContent}
---

Please generate the corresponding \`index.tsx\` and \`index.less\` files. The response should be a JSON object with two keys: "tsx" and "less". For example:
{
  "tsx": "...",
  "less": "..."
}
      `;

      try {
        const aiSettings = getAiSettings();
        const stream = streamAiResponse(prompt, aiSettings.activeModel);
        let responseJson = '';
        for await (const chunk of stream) {
          responseJson += chunk;
        }

        const { tsx, less } = JSON.parse(responseJson);

        const response = await fetch(
          'http://localhost:4000/api/save-template',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              templateName,
              tsxContent: tsx,
              lessContent: less,
            }),
          }
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to save template files.');
        }

        message.success(`Template ${templateName} saved successfully.`);
        onClose(); // Close modal on success
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setLoading(false);
      setError('Failed to read the file.');
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
    return false; // Prevent antd from uploading the file automatically
  };

  return (
    <Modal
      title="AI 生成模板"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Upload
          beforeUpload={handleUpload}
          showUploadList={false}
          accept=".tsx,.pdf,.png,.jpg,.jpeg,.doc,.docx"
        >
          <Button icon={<UploadOutlined />}>Click to Upload</Button>
        </Upload>
      </Spin>
      {error && (
        <Alert message={error} type="error" style={{ marginTop: '16px' }} />
      )}
    </Modal>
  );
};

type AiRestoreModalProps = {
  open: boolean;
  onClose: () => void;
  onApply: (data: Partial<ResumeConfig>) => void;
};

const AiRestoreModal: React.FC<AiRestoreModalProps> = ({
  open,
  onClose,
  onApply,
}) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Partial<ResumeConfig> | null>(null);

  const tryParseJson = (raw: string): Partial<ResumeConfig> | null => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Partial<ResumeConfig>;
      }
    } catch (err) {
      // ignore parse errors here
    }
    return null;
  };

  const readStreamToString = async (response: Response) => {
    if (!response.body?.getReader) {
      return response.text();
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        result += decoder.decode(value, { stream: true });
      }
    }
    result += decoder.decode();
    return result;
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      message.warning('请先输入或上传简历内容');
      return;
    }

    setLoading(true);
    setError(null);

    const parsed = tryParseJson(inputText.trim());
    if (parsed) {
      setPreview(parsed);
      setLoading(false);
      message.success('已将内容解析为结构化数据');
      return;
    }

    try {
      const aiSettings = getAiSettings();
      const model = aiSettings?.activeModel;
      if (!model) {
        throw new Error('请先在“API 设置”中配置模型');
      }

      const prompt = buildResumeRestorePrompt(inputText);
      const response = await streamAiResponse(prompt, 'resume-restore', model);
      const fullText = await readStreamToString(
        (response as unknown) as Response
      );
      const aiParsed = tryParseJson(fullText);
      if (!aiParsed) {
        throw new Error('AI 返回内容无法解析为 JSON，请重试或检查 Prompt');
      }

      setPreview(aiParsed);
      message.success('AI 已生成结构化简历预览');
    } catch (err: any) {
      setError(err?.message || '生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!preview) {
      message.warning('请先生成预览');
      return;
    }
    onApply(preview);
    onClose();
    setPreview(null);
    setInputText('');
  };

  const handleUpload: any = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      setInputText(text);
      message.success('已读取文件内容，点击“生成”开始处理');
    } catch (err) {
      setError('文件读取失败');
    }
    return false;
  };

  return (
    <Modal
      title={<FormattedMessage id="AI 还原简历" defaultMessage="AI 还原简历" />}
      open={open}
      onCancel={onClose}
      width={720}
      footer={null}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Input.TextArea
          rows={6}
          value={inputText}
          placeholder="粘贴简历文本或上传文件"
          onChange={e => setInputText(e.target.value)}
        />
        <div
          style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          <Button type="primary" onClick={handleGenerate}>
            开始生成
          </Button>
          <Button onClick={handleApply} disabled={!preview}>
            应用到简历
          </Button>
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            accept=".txt,.json"
          >
            <Button icon={<UploadOutlined />}>上传文本/JSON</Button>
          </Upload>
        </div>

        {error && (
          <Alert type="error" message={error} style={{ marginTop: 12 }} />
        )}

        {preview && (
          <div style={{ marginTop: 12 }}>
            <Alert
              type="info"
              message="生成预览（可直接应用或继续编辑）"
              showIcon
              style={{ marginBottom: 8 }}
            />
            <pre
              style={{
                maxHeight: 260,
                overflow: 'auto',
                background: '#f7f7f7',
                padding: 12,
                borderRadius: 4,
              }}
            >
              {JSON.stringify(preview, null, 2)}
            </pre>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

/**
 * @description 简历配置区
 */
export const Drawer: React.FC<Props> = props => {
  const intl = useIntl();

  const [visible, setVisible] = useState(false);
  const [childrenDrawer, setChildrenDrawer] = useState(null);
  const [currentContent, updateCurrentContent] = useState(null);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isAiRestoreModalVisible, setIsAiRestoreModalVisible] = useState(false);

  /**
   * 1. 更新currentContent State
   * 2. 调用 props.onValueChange 更新模板
   */
  const updateContent = useThrottle(
    v => {
      const newConfig = _.merge({}, currentContent, v);
      updateCurrentContent(newConfig);
      props.onValueChange({
        [childrenDrawer]: newConfig,
      });
    },
    [currentContent],
    800
  );

  const [type, setType] = useState('template');
  const [moduleModalVisible, setModuleModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [form] = Form.useForm();

  const throttledSwapItems = useThrottle(
    (moduleKey: string, oldIdx: number, newIdx: number) => {
      const newValues = _.clone(_.get(props.value, moduleKey, []));
      props.onValueChange({
        [moduleKey]: arrayMove(newValues, newIdx, oldIdx),
      });
    },
    [props.value],
    200
  );

  const deleteItem = (moduleKey: string, idx: number) => {
    const newValues = _.get(props.value, moduleKey, []);
    props.onValueChange({
      [moduleKey]: newValues.slice(0, idx).concat(newValues.slice(idx + 1)),
    });
  };

  const modules = useMemo(() => {
    const titleNameMap = props.value?.titleNameMap;
    return MODULES({ intl, titleNameMap });
  }, [intl, props.value?.titleNameMap]);

  const contentOfModule = useMemo(() => {
    return CONTENT_OF_MODULE({ intl });
  }, [intl]);

  const DEFAULT_TITLE_MAP = getDefaultTitleNameMap({ intl });
  const isList = _.endsWith(childrenDrawer, 'List');

  // #region 1 render: moduleContent

  // #region 1.1 render: ModuleList
  const renderModuleList = ({ icon, key, name }, idx, values) => {
    const header = (
      <>
        <span className="item-icon">{icon}</span>
        <span className="item-name">
          {DEFAULT_TITLE_MAP[key] ? (
            <Input
              placeholder={DEFAULT_TITLE_MAP[key]}
              bordered={false}
              defaultValue={name}
              onChange={e => {
                props.onValueChange({
                  titleNameMap: {
                    ...(props.value.titleNameMap || {}),
                    [key]: e.target.value,
                  },
                });
              }}
              style={{ padding: 0 }}
            />
          ) : (
            name
          )}
        </span>
      </>
    );

    const list = _.map(values, (value, idx: number) => (
      <DragableRow
        key={`${idx}`}
        index={idx}
        moveRow={(oldIdx, newIdx) => throttledSwapItems(key, oldIdx, newIdx)}
      >
        <div
          onClick={() => {
            setChildrenDrawer(key);
            updateCurrentContent({
              ...value,
              dataIndex: idx,
            });
          }}
        >
          {`${idx + 1}. ${Object.values(value || {}).join(' - ')}`}
        </div>
        <DeleteFilled
          onClick={() => {
            Modal.confirm({
              content: intl.formatMessage({ id: '确认删除' }),
              onOk: () => deleteItem(key, idx),
            });
          }}
        />
      </DragableRow>
    ));

    return (
      <div className="module-item" key={`${idx}`}>
        <Collapse defaultActiveKey={[]} ghost>
          <Panel header={header} key={`${idx}`}>
            <div className="list-value-item">
              {list}
              <div
                className="btn-append"
                onClick={() => {
                  setChildrenDrawer(key);
                  updateCurrentContent(null);
                }}
              >
                <FormattedMessage id="继续添加" />
              </div>
            </div>
          </Panel>
        </Collapse>
      </div>
    );
  };
  // #endregion

  // #region 1.2 render: ModuleListItem when !_.endsWith(module.key,'List')
  const renderModuleListItem = ({ icon, key, name }) => (
    <div className="module-item" key={key}>
      <Collapse
        defaultActiveKey={[]}
        ghost
        expandIcon={() => (
          <span style={{ display: 'inline-block', width: '12px' }} />
        )}
      >
        <Panel
          header={
            <span
              onClick={() => {
                updateCurrentContent(_.get(props.value, key));
                setChildrenDrawer(key);
              }}
            >
              <span className="item-icon">{icon}</span>
              <span className="item-name">{name}</span>
            </span>
          }
          className="no-content-panel"
          key="no-content-panel__renderModuleListItem"
        />
      </Collapse>
    </div>
  );
  // #endregion

  const moduleContent = (
    <DndProvider backend={HTML5Backend}>
      <div className="module-list">
        {modules.map((module, idx) => {
          if (!_.endsWith(module.key, 'List')) {
            return renderModuleListItem(module);
          }
          const values = _.get(props.value, module.key, []);
          return renderModuleList(module, idx, values);
        })}
      </div>
      <AntdDrawer
        title={modules.find(m => m.key === childrenDrawer)?.name}
        width={450}
        onClose={() => setChildrenDrawer(null)}
        open={!!childrenDrawer}
      >
        <FormCreator
          config={contentOfModule[childrenDrawer]}
          value={currentContent}
          isList={isList}
          onChange={v => {
            if (isList) {
              const newValue = _.get(props.value, childrenDrawer, []);
              if (currentContent) {
                newValue[currentContent.dataIndex] = _.merge(
                  {},
                  currentContent,
                  v
                );
              } else {
                newValue.push(v);
              }
              props.onValueChange({
                [childrenDrawer]: newValue,
              });
              // 关闭抽屉
              setChildrenDrawer(null);
              // 清空当前选中内容
              updateCurrentContent(null);
            } else {
              updateContent(v);
            }
          }}
        />
      </AntdDrawer>
    </DndProvider>
  );

  // #endregion

  return (
    <>
      <Button
        type="primary"
        onClick={() => setVisible(true)}
        style={props.style}
      >
        <FormattedMessage id="进行配置" />
        <Popover
          content={
            <FormattedMessage id="移动端模式下，只支持预览，不支持配置" />
          }
        >
          <InfoCircleFilled style={{ marginLeft: '4px' }} />
        </Popover>
      </Button>
      <AntdDrawer
        title={
          <>
            <Radio.Group value={type} onChange={e => setType(e.target.value)}>
              <Radio.Button value="template">
                <FormattedMessage id="选择模板" />
              </Radio.Button>
              <Radio.Button value="module">
                <FormattedMessage id="配置简历" />
              </Radio.Button>
            </Radio.Group>
            <Button
              onClick={() => setModuleModalVisible(true)}
              style={{ marginLeft: '16px' }}
            >
              <FormattedMessage id="管理模块" />
            </Button>
            <Button
              onClick={() => setIsAiRestoreModalVisible(true)}
              style={{ marginLeft: '16px' }}
            >
              AI 还原简历
            </Button>
            <Button
              onClick={() => setIsUploadModalVisible(true)}
              style={{ marginLeft: '16px' }}
            >
              AI 生成模板
            </Button>
          </>
        }
        width={480}
        closable={false}
        onClose={() => setVisible(false)}
        open={visible}
      >
        {type === 'module' ? (
          moduleContent
        ) : (
          // type === 'theme'
          <>
            <ConfigTheme
              {...props.theme}
              onChange={v => props.onThemeChange(v)}
            />
            <Templates
              template={props.template}
              onChange={v => props.onTemplateChange(v)}
            />
          </>
        )}
      </AntdDrawer>
      <AiRestoreModal
        open={isAiRestoreModalVisible}
        onClose={() => setIsAiRestoreModalVisible(false)}
        onApply={data => {
          props.onValueChange(data);
          message.success('AI 生成的内容已写入当前简历');
        }}
      />
      <UploadTemplateModal
        open={isUploadModalVisible}
        onClose={() => setIsUploadModalVisible(false)}
      />
      <Modal
        title={<FormattedMessage id="管理自定义模块" />}
        open={moduleModalVisible}
        onCancel={() => setModuleModalVisible(false)}
        footer={[
          <Button
            key="add"
            type="primary"
            onClick={() => {
              setEditingModule(null);
              form.resetFields();
              setIsEditModalVisible(true);
            }}
          >
            <FormattedMessage id="新增模块" />
          </Button>,
        ]}
      >
        <List
          dataSource={[
            { name: '工作经历', description: '过往的正式工作或实习经历' },
            { name: '项目经历', description: '在校或业余时间完成的项目' },
          ]}
          renderItem={(item: any) => (
            <List.Item
              actions={[
                <Button type="link" icon={<EditOutlined />} />,
                <Button type="link" danger icon={<DeleteFilled />} />,
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={item.description}
              />
            </List.Item>
          )}
        />
      </Modal>
      <Modal
        title={editingModule ? '编辑模块' : '新增模块'}
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={editingModule || {}}>
          <Form.Item
            name="name"
            label="模块名称"
            rules={[{ required: true, message: '请输入模块名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="模块说明">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
