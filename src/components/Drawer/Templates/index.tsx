import React, { useState, useEffect } from 'react';
import { ReactSVG } from 'react-svg';
import cx from 'classnames';
import { useIntl } from 'react-intl';
import './index.less';

type Props = {
  template: string;
  onChange: (v: string) => void;
};

const defaultTemplates = [
  {
    url: 'https://gw.alipayobjects.com/zos/antfincdn/GLDkiGBSPl/moban1.svg',
    id: 'template1',
    description: '默认模板(适用于单页)',
  },
  {
    url: 'https://gw.alipayobjects.com/zos/antfincdn/RGxVcJ2O3q/moban2.svg',
    id: 'template2',
    description: '简易模板',
  },
  {
    url: 'https://gw.alipayobjects.com/zos/antfincdn/Kn2jUKcBme/moban2.svg',
    id: 'template3',
    description: '简易模板(适用于多页)',
    disabled: false,
  },
];

export const Templates: React.FC<Props> = props => {
  const intl = useIntl();
  const [templates, setTemplates] = useState(defaultTemplates);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/templates');
        if (response.ok) {
          const data = await response.json();
          const userTemplates = data.templates
            .filter(t => !defaultTemplates.some(dt => dt.id === t))
            .map(t => ({
              url:
                'https://gw.alipayobjects.com/zos/antfincdn/GLDkiGBSPl/moban1.svg', // Placeholder
              id: t,
              description: t,
            }));
          setTemplates([...defaultTemplates, ...userTemplates]);
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      }
    };

    fetchTemplates();
  }, []);

  return (
    <div className="templates">
      {templates.map(item => {
        return (
          <div
            className={cx('template-item', {
              selected: item.id === props.template,
              disabled: item.disabled,
            })}
            key={`${item.id}`}
            onClick={() => !item.disabled && props.onChange(item.id)}
          >
            <ReactSVG
              src={item.url}
              beforeInjection={svg => {
                svg.setAttribute('class', 'template');
              }}
            />
            <span className="template-id">{item.id}</span>
            <span className="template-description">{item.description}</span>
          </div>
        );
      })}
    </div>
  );
};
