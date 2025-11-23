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

const serverTemplateMap: Record<string, TemplateComponent> = {
  template1: require('./template1/index.tsx').default,
};

const loadServerTemplate = (template: string): TemplateComponent => {
  const key = template && serverTemplateMap[template] ? template : 'template1';
  return serverTemplateMap[key];
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
