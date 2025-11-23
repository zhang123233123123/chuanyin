import React, { Suspense, lazy } from 'react';
import templates from '@/data/templates.json';

type TemplateComponent = React.ComponentType<any>;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error loading template:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong loading the template.</h1>;
    }

    return this.props.children;
  }
}

const templateComponents = templates.reduce((acc, templateName) => {
  acc[templateName] = lazy(() => import(`./${templateName}`));
  return acc;
}, {} as Record<string, React.LazyExoticComponent<TemplateComponent>>);

const serverTemplateCache: Record<string, TemplateComponent> = {};

const loadServerTemplate = (template: string): TemplateComponent => {
  if (serverTemplateCache[template]) {
    return serverTemplateCache[template];
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(`./${template}`).default as TemplateComponent;
    serverTemplateCache[template] = mod;
    return mod;
  } catch (err) {
    console.warn(
      `[resume] 模版 ${template} 加载失败，使用默认模版 template1`,
      err
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fallback = require('./template1').default as TemplateComponent;
    serverTemplateCache[template] = fallback;
    return fallback;
  }
};

const ResumeComponent = ({ template, ...props }) => {
  const isBrowser = typeof window !== 'undefined';
  const Template = isBrowser
    ? templateComponents[template] || templateComponents.template1
    : loadServerTemplate(template || 'template1');

  React.useEffect(() => {
    if (!isBrowser) return;
    import(`./${template}/index.less`).catch(error => {
      console.error('Error loading template stylesheet:', error);
    });
  }, [template, isBrowser]);

  if (!isBrowser) {
    const ServerTemplate = Template as TemplateComponent;
    return <ServerTemplate {...props} />;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Template {...props} />
    </Suspense>
  );
};

export const Resume: React.FC<any> = props => {
  return (
    <ErrorBoundary>
      <ResumeComponent {...props} />
    </ErrorBoundary>
  );
};
