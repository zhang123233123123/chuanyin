import React from 'react';
import { GithubFilled } from '@ant-design/icons';
import './footer.less';
import { getSearchObj } from '@/helpers/location';

const Footer: React.FC = () => {
  const user = getSearchObj().user || 'visiky';

  return (
    <footer>
      <div className="footer-content">
        <div className="footer-meta">
          <span className="tagline">Made with ❤️</span>
          <span className="author">
            by
            <span
              className="author-link"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.open(`https://github.com/${user}`);
                }
              }}
            >
              {user}
            </span>
          </span>
        </div>

        <a
          className="repo-link"
          href={'https://github.com/visiky/resume.git'}
          target="_blank"
        >
          <GithubFilled /> 项目代码
        </a>
      </div>
    </footer>
  );
};

export default Footer;
