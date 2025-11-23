import React, { Suspense, lazy } from 'react';
// @ts-ignore
import templates from '@/data/templates.json';

type TemplateComponent = React.ComponentType<any>;

// 定义 Props 接口
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Error loading template:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong loading the template.</h1>;
    }

    return this.props.children;
  }
}

// 动态导入组件 (客户端渲染使用)
const templateComponents = templates.reduce(
  (acc: any, templateName: string) => {
    // 注意：这里使用模板字符串动态导入，Webpack 需要能分析出目录结构
    acc[templateName] = lazy(() => import(`./${templateName}/index`));
    return acc;
  },
  {} as Record<string, React.LazyExoticComponent<TemplateComponent>>
);

// 服务器端渲染需要的静态映射
// 修改点：去掉了 .tsx 后缀，让解析器自动寻找 index.tsx 或 index.js
const serverTemplateMap: Record<string, TemplateComponent> = {
  template1: require('./template1/index').default,
};

const loadServerTemplate = (template: string): TemplateComponent => {
  const key = template && serverTemplateMap[template] ? template : 'template1';
  return serverTemplateMap[key];
};

const ResumeComponent = ({ template, ...props }: any) => {
  const isBrowser = typeof window !== 'undefined';
  const Template = isBrowser
    ? templateComponents[template] || templateComponents.template1
    : loadServerTemplate(template || 'template1');

  React.useEffect(() => {
    if (!isBrowser) return;
    // 同样去掉 .less 后缀尝试，或者保留视你的 webpack 配置而定。通常 .less 需要保留。
    import(`./${template}/index.less`).catch(error => {
      console.warn(
        'Error loading template stylesheet (might be loaded already):',
        error
      );
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
