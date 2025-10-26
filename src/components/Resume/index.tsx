import React from 'react';
import { Template1 } from './Template1';

// Always render Template1, as it is the only one left.
export const Resume: React.FC<any> = props => {
  return <Template1 {...props} />;
};
