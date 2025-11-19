import React from 'react';
import { Link } from 'gatsby';
import { LangSwitcher } from '@/components/LangSwitcher';
import { getMode, useModeSwitcher } from '@/hooks/useModeSwitcher';
import { getSearchObj } from '@/helpers/location';
import { FormattedMessage } from 'react-intl';
import './header.less';

type HeaderProps = {
  showModeSwitcher?: boolean;
};

const NAV_ITEMS = [
  { path: '/', label: '星邻履历智造' },
  { path: '/resume', label: '简历模块化' },
  { path: '/profile', label: '个人信息' },
  { path: '/editor', label: '在线编辑' },
  { path: '/final', label: '最终简历' },
  { path: '/settings', label: 'API 设置' },
];

const Header: React.FC<HeaderProps> = ({ showModeSwitcher = false }) => {
  const mode = getMode();
  const [ModeSwitcher] = useModeSwitcher({});
  const currentPath =
    typeof window !== 'undefined' ? window.location.pathname : '/';

  const normalizePath = (path: string) =>
    path && path !== '/' && path.endsWith('/')
      ? path.slice(0, -1)
      : path || '/';

  const activePath = normalizePath(currentPath);

  function gotoOnlineVersion() {
    const query = getSearchObj();
    if (typeof window !== 'undefined') {
      window.open(`https://zhanghj.github.io/resume/?user=${query.user}`);
    }
  }

  return (
    <header>
      <nav className="nav">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={
              normalizePath(item.path) === activePath
                ? 'nav-link active'
                : 'nav-link'
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <span>
        {showModeSwitcher && ModeSwitcher}
        {mode === 'read' && (
          <span className={'action-link'} onClick={() => window.print()}>
            <FormattedMessage id="下载 PDF" />
          </span>
        )}
        <span className={'action-link'} onClick={gotoOnlineVersion}>
          在线版本
        </span>
        <LangSwitcher />
      </span>
    </header>
  );
};

export default Header;
