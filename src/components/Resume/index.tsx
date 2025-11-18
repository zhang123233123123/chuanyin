import React, { Suspense, lazy } from 'react';
import templates from '@/data/templates.json';

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
}, {});

const ResumeComponent = ({ template, ...props }) => {
  const Template = templateComponents[template] || templateComponents.template1;

  React.useEffect(() => {
    try {
      // Dynamically import the stylesheet for the selected template
      import(`./${template}/index.less`);
    } catch (error) {
      console.error('Error loading template stylesheet:', error);
    }
  }, [template]);

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
