import React, { useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Typography,
  message,
} from 'antd';
import {
  CalendarOutlined,
  BankOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ExperienceItem } from '@/helpers/ai';
import { summarizeExperience } from '@/helpers/ai';
import { getAiSettings } from '@/helpers/api-key';
import './index.less';

type ExperienceTableProps = {
  experiences: ExperienceItem[];
  onChange?: (experiences: ExperienceItem[]) => void;
};

const { Title, Paragraph, Text } = Typography;

export const ExperienceTable: React.FC<ExperienceTableProps> = ({
  experiences,
  onChange,
}) => {
  const [form] = Form.useForm();
  const [editorType, setEditorType] = useState<ExperienceItem['type']>(
    'workExp'
  );
  const [editorIndex, setEditorIndex] = useState<number | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [optimizingIndex, setOptimizingIndex] = useState<number | null>(null);
  const list = experiences ?? [];
  const hasExperiences = list.length > 0;

  // 分离工作经历和项目经历
  const workExperiences = useMemo(
    () =>
      list
        .map((exp, idx) => ({ exp, idx }))
        .filter(item => item.exp.type === 'workExp'),
    [experiences]
  );
  const projectExperiences = useMemo(
    () =>
      list
        .map((exp, idx) => ({ exp, idx }))
        .filter(item => item.exp.type === 'project'),
    [experiences]
  );
  const totalCount = list.length;

  const openEditor = (type: ExperienceItem['type'], index: number | null) => {
    form.resetFields();
    setEditorType(type);
    setEditorIndex(index);
    if (index != null) {
      const target = list[index];
      if (type === 'workExp') {
        form.setFieldsValue({
          company_name: target.company_name,
          department_name: target.department_name,
          work_time_start: target.work_time?.[0],
          work_time_end: target.work_time?.[1],
          work_desc: target.work_desc,
        });
      } else {
        form.setFieldsValue({
          project_name: target.project_name,
          project_role: target.project_role,
          project_time: target.project_time,
          project_desc: target.project_desc,
          project_content: target.project_content,
        });
      }
    } else {
      form.resetFields();
    }
    setEditorVisible(true);
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setEditorIndex(null);
    form.resetFields();
  };

  const handleDelete = (index: number) => {
    const next = list.filter((_, idx) => idx !== index);
    onChange?.(next);
  };

  // Only send the description block for refinements to avoid changing meta fields.
  const buildRawFromItem = (item: ExperienceItem): string => {
    if (item.type === 'workExp') {
      return item.work_desc || '';
    }
    return item.project_content || item.project_desc || '';
  };

  const updateItemInList = (index: number, nextItem: ExperienceItem) => {
    const next = [...list];
    next[index] = nextItem;
    onChange?.(next);
  };

  const handleOptimize = async (index: number, item: ExperienceItem) => {
    const settings = getAiSettings();
    const model =
      settings.activeModel || Object.keys(settings.models || {})[0] || '';
    if (!model) {
      message.warning('请先在“API 设置”里配置模型');
      return;
    }

    setOptimizingIndex(index);
    const raw = buildRawFromItem(item);
    if (!raw) {
      message.info('暂无可优化的内容');
      setOptimizingIndex(null);
      return;
    }

    const formatAiResponse = (value: unknown): string => {
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'object' && value !== null) {
        const star = value as {
          Action?: string;
          Result?: string;
          action?: string;
          result?: string;
        };
        const action = star.Action || star.action;
        const result = star.Result || star.result;

        if (action && result) {
          return `${action} ${result}`;
        }
      }
      return JSON.stringify(value, null, 2);
    };

    try {
      const result = await summarizeExperience(raw, 'optimize', model);
      let nextItem = { ...item } as ExperienceItem;

      if (
        Array.isArray(result) &&
        result.length &&
        typeof result[0] === 'object'
      ) {
        const refined = result[0] as ExperienceItem;

        if (item.type === 'workExp' && refined.work_desc) {
          nextItem.work_desc = formatAiResponse(refined.work_desc);
        }
        if (item.type === 'project') {
          if (refined.project_content) {
            nextItem.project_content = formatAiResponse(
              refined.project_content
            );
          } else if (refined.project_desc) {
            nextItem.project_desc = formatAiResponse(refined.project_desc);
          }
        }
      } else if (Array.isArray(result) && result.length) {
        const lines = (result as string[]).filter(Boolean).join('\n');
        if (item.type === 'workExp') {
          nextItem.work_desc = lines;
        } else {
          nextItem.project_content = lines;
        }
      }
      updateItemInList(index, nextItem);
      message.success('AI 已优化该条经历');
    } catch (err) {
      const reason = err instanceof Error ? err.message : '优化失败';
      message.error(reason);
    } finally {
      setOptimizingIndex(null);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      let nextItem: ExperienceItem;
      if (editorType === 'workExp') {
        nextItem = {
          type: 'workExp',
          company_name: values.company_name?.trim() || '未命名企业',
          department_name: values.department_name?.trim(),
          work_time: [
            values.work_time_start?.trim() || '',
            values.work_time_end?.trim() || '',
          ],
          work_desc: values.work_desc || '',
        };
      } else {
        nextItem = {
          type: 'project',
          project_name: values.project_name?.trim() || '未命名项目',
          project_role: values.project_role?.trim(),
          project_time: values.project_time?.trim() || '',
          project_desc: values.project_desc || '',
          project_content: values.project_content || '',
        };
      }
      const next = [...list];
      if (editorIndex == null) {
        next.push(nextItem);
      } else {
        next[editorIndex] = nextItem;
      }
      onChange?.(next);
      closeEditor();
    } catch (err) {
      // ant form already displays validation errors
    }
  };

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
        <Space className="experience-table__intro-actions">
          <Button size="small" onClick={() => openEditor('workExp', null)}>
            新增工作
          </Button>
          <Button size="small" onClick={() => openEditor('project', null)}>
            新增项目
          </Button>
        </Space>
      </div>

      {!hasExperiences && (
        <div className="experience-table-empty experience-table-empty--inline">
          <Paragraph>
            上传文档快速生成，或点击右上角按钮手动新增工作 / 项目经历
          </Paragraph>
        </div>
      )}

      {workExperiences.length > 0 && (
        <div className="experience-section">
          <Title level={4} className="section-title">
            工作经历
          </Title>
          {workExperiences.map(({ exp: item, idx }) => (
            <div key={`work-${idx}`} className="experience-item">
              <div className="experience-header">
                <div className="experience-title">
                  <BankOutlined className="icon" />
                  <Text strong>{item.company_name}</Text>
                  {item.department_name && (
                    <Text type="secondary"> - {item.department_name}</Text>
                  )}
                </div>
                {item.work_time && (
                  <div className="experience-time">
                    <CalendarOutlined className="icon" />
                    <Text>{`${item.work_time?.[0] || ''} - ${
                      item.work_time?.[1] || ''
                    }`}</Text>
                  </div>
                )}
                <Space className="experience-actions" size={8}>
                  <Button
                    size="small"
                    onClick={() => handleOptimize(idx, item)}
                    loading={optimizingIndex === idx}
                  >
                    AI优化
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      setTimeout(() => openEditor('workExp', idx), 0)
                    }
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确认删除这条经历？"
                    placement="left"
                    onConfirm={() => handleDelete(idx)}
                  >
                    <Button size="small" danger>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
              {item.work_desc && (
                <div className="experience-content">
                  {item.work_desc.split('\n').map((line, i) => (
                    <Paragraph key={`work-desc-${idx}-${i}`}>{line}</Paragraph>
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
          {projectExperiences.map(({ exp: item, idx }) => (
            <div key={`project-${idx}`} className="experience-item">
              <div className="experience-header">
                <div className="experience-title">
                  <TeamOutlined className="icon" />
                  <Text strong>{item.project_name}</Text>
                  {item.project_role && (
                    <Text type="secondary"> - {item.project_role}</Text>
                  )}
                </div>
                {item.project_time && (
                  <div className="experience-time">
                    <CalendarOutlined className="icon" />
                    <Text>{item.project_time}</Text>
                  </div>
                )}
                <Space className="experience-actions" size={8}>
                  <Button
                    size="small"
                    onClick={() => handleOptimize(idx, item)}
                    loading={optimizingIndex === idx}
                  >
                    AI优化
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      setTimeout(() => openEditor('project', idx), 0)
                    }
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确认删除这条经历？"
                    placement="left"
                    onConfirm={() => handleDelete(idx)}
                  >
                    <Button size="small" danger>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
              {item.project_desc && (
                <div className="experience-brief">
                  <Paragraph>{item.project_desc}</Paragraph>
                </div>
              )}
              {item.project_content && (
                <div className="experience-content">
                  {item.project_content.split('\n').map((line, i) => (
                    <Paragraph key={`project-content-${idx}-${i}`}>
                      {line}
                    </Paragraph>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal
        className="experience-modal"
        open={editorVisible}
        onCancel={closeEditor}
        onOk={handleSubmit}
        okText={editorIndex == null ? '新增' : '保存'}
        title={editorType === 'workExp' ? '工作经历' : '项目经历'}
        width={520}
      >
        <Form form={form} layout="vertical">
          {editorType === 'workExp' ? (
            <>
              <Form.Item
                label="公司 / 机构"
                name="company_name"
                rules={[{ required: true, message: '请输入公司名称' }]}
              >
                <Input placeholder="例如：XX 科技公司" />
              </Form.Item>
              <Form.Item label="部门 / 岗位" name="department_name">
                <Input placeholder="产品部 / 实习岗位" />
              </Form.Item>
              <Form.Item label="起止时间">
                <Input.Group compact>
                  <Form.Item name="work_time_start" noStyle>
                    <Input style={{ width: '50%' }} placeholder="2024.03" />
                  </Form.Item>
                  <Form.Item name="work_time_end" noStyle>
                    <Input style={{ width: '50%' }} placeholder="2024.06" />
                  </Form.Item>
                </Input.Group>
              </Form.Item>
              <Form.Item
                label="工作内容"
                name="work_desc"
                rules={[{ required: true, message: '请描述主要工作内容' }]}
              >
                <Input.TextArea rows={6} placeholder="每行一条要点" />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                label="项目名称"
                name="project_name"
                rules={[{ required: true, message: '请输入项目名称' }]}
              >
                <Input placeholder="毕业设计 / 竞赛项目" />
              </Form.Item>
              <Form.Item label="角色" name="project_role">
                <Input placeholder="产品负责人 / 开发" />
              </Form.Item>
              <Form.Item label="时间" name="project_time">
                <Input placeholder="2024.03 - 2024.06" />
              </Form.Item>
              <Form.Item label="项目概述" name="project_desc">
                <Input.TextArea rows={3} placeholder="一句话总结" />
              </Form.Item>
              <Form.Item
                label="项目内容"
                name="project_content"
                rules={[{ required: true, message: '请描述主要贡献' }]}
              >
                <Input.TextArea rows={6} placeholder="每行一条要点" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};
