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
} from 'antd';
import {
  DeleteFilled,
  InfoCircleFilled,
  EditOutlined,
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

const { Panel } = Collapse;
const { TextArea } = Input;

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

/**
 * @description 简历配置区
 */
export const Drawer: React.FC<Props> = props => {
  const intl = useIntl();

  const [visible, setVisible] = useState(false);
  const [childrenDrawer, setChildrenDrawer] = useState(null);
  const [currentContent, updateCurrentContent] = useState(null);

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
        visible={!!childrenDrawer}
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
          </>
        }
        width={480}
        closable={false}
        onClose={() => setVisible(false)}
        visible={visible}
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
