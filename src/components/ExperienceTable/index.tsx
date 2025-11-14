import React from 'react';
import { Table, Typography } from 'antd';
import {
  CalendarOutlined,
  BankOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ExperienceItem } from '@/helpers/ai';
import './index.less';

type ExperienceTableProps = {
  experiences: ExperienceItem[];
};

const { Title, Paragraph, Text } = Typography;

export const ExperienceTable: React.FC<ExperienceTableProps> = ({
  experiences,
}) => {
  if (!experiences || experiences.length === 0) {
    return (
      <div className="experience-table-empty">
        <Paragraph>上传您的个人经历文档，AI 将帮您生成专业的经历表格</Paragraph>
      </div>
    );
  }

  // 分离工作经历和项目经历
  const workExperiences = experiences.filter(exp => exp.type === 'workExp');
  const projectExperiences = experiences.filter(exp => exp.type === 'project');
  const totalCount = experiences.length;

  return (
    <div className="experience-table">
      <div className="experience-table__intro">
        <div>
          <Title level={3}>解析后的工作内容</Title>
          <Paragraph type="secondary">
            AI 已整理 {totalCount} 条要点，按工作 /
            项目自动分组，可直接复制到简历
          </Paragraph>
        </div>
      </div>

      {workExperiences.length > 0 && (
        <div className="experience-section">
          <Title level={4} className="section-title">
            工作经历
          </Title>
          {workExperiences.map((exp, index) => (
            <div key={`work-${index}`} className="experience-item">
              <div className="experience-header">
                <div className="experience-title">
                  <BankOutlined className="icon" />
                  <Text strong>{exp.company_name}</Text>
                  {exp.department_name && (
                    <Text type="secondary"> - {exp.department_name}</Text>
                  )}
                </div>
                {exp.work_time && (
                  <div className="experience-time">
                    <CalendarOutlined className="icon" />
                    <Text>{`${exp.work_time[0]} - ${exp.work_time[1]}`}</Text>
                  </div>
                )}
              </div>
              {exp.work_desc && (
                <div className="experience-content">
                  {exp.work_desc.split('\n').map((line, i) => (
                    <Paragraph key={`work-desc-${index}-${i}`}>
                      {line}
                    </Paragraph>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {projectExperiences.length > 0 && (
        <div className="experience-section">
          <Title level={4} className="section-title">
            项目经历
          </Title>
          {projectExperiences.map((exp, index) => (
            <div key={`project-${index}`} className="experience-item">
              <div className="experience-header">
                <div className="experience-title">
                  <TeamOutlined className="icon" />
                  <Text strong>{exp.project_name}</Text>
                  {exp.project_role && (
                    <Text type="secondary"> - {exp.project_role}</Text>
                  )}
                </div>
                {exp.project_time && (
                  <div className="experience-time">
                    <CalendarOutlined className="icon" />
                    <Text>{exp.project_time}</Text>
                  </div>
                )}
              </div>
              {exp.project_desc && (
                <div className="experience-brief">
                  <Paragraph>{exp.project_desc}</Paragraph>
                </div>
              )}
              {exp.project_content && (
                <div className="experience-content">
                  {exp.project_content.split('\n').map((line, i) => (
                    <Paragraph key={`project-content-${index}-${i}`}>
                      {line}
                    </Paragraph>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
