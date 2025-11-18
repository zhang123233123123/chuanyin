import React from 'react';
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
              <div key={`${idx}`}>{d}</div>
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
                    <span className="sub-info" style={{ float: 'right' }}>
                      {start}
                      {end ? ` ~ ${end}` : <FormattedMessage id=" 至今" />}
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
              const [start = null, end = null] =
                typeof work.work_time === 'string'
                  ? `${work.work_time || ''}`.split(',')
                  : work.work_time;
              return work ? (
                <div className="section-item" key={idx.toString()}>
                  <div className="section-info">
                    <b className="info-name">
                      {work.company_name}
                      <span className="sub-info">{work.department_name}</span>
                    </b>
                    <span className="info-time">
                      {start}
                      {end ? ` ~ ${end}` : <FormattedMessage id=" 至今" />}
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
                <React.Fragment key={`${idx}`}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                    }}
                    key={`${idx}`}
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
