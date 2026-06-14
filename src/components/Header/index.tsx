import { Link, useLocation } from 'react-router-dom';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import styles from './style.module.css';

const Header = () => {
  const { navLinks } = useSiteMetadata();
  const location = useLocation();

  return (
    <header className={styles.header}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link to="/" className="text-xl font-black tracking-tight">
          L<span className="text-accent">.RUN</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navLinks.map((n, i) => {
            const isActive = location.pathname === n.url || (n.url === '/' && location.pathname === '/');
            return (
              <Link
                key={i}
                to={n.url}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''} px-3 py-2`}
              >
                {n.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Header;
