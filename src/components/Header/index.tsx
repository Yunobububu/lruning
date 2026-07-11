import { useRef, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import styles from './style.module.css';

const Header = () => {
  const { navLinks } = useSiteMetadata();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const active = navRef.current?.querySelector(`.${styles.navLinkActive}`) as HTMLElement;
    if (active) {
      const parentRect = navRef.current!.getBoundingClientRect();
      const rect = active.getBoundingClientRect();
      setIndicator({
        left: rect.left - parentRect.left,
        width: rect.width,
      });
    }
  }, []);

  return (
    <header
      className={styles.header}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link to="/" className="text-xl font-black tracking-tight">
          L<span className="text-accent">.RUN</span>
        </Link>
        <nav ref={navRef} className="relative flex items-center gap-1">
          {/* Animated active indicator */}
          <motion.div
            className="absolute bottom-0 h-[2px] rounded-full bg-accent"
            animate={{ left: indicator.left, width: indicator.width }}
            transition={{ type: 'spring', damping: 1.0, duration: 0.2 }}
            style={{ left: indicator.left, width: indicator.width }}
          />
          {navLinks.map((n, i) => {
            const isActive = location.pathname === n.url || (n.url === '/' && location.pathname === '/');
            return (
              <Link
                key={i}
                to={n.url}
                ref={(el) => {
                  // Set initial indicator position on first active
                  if (isActive && el && indicator.width === 0) {
                    const parentRect = navRef.current?.getBoundingClientRect();
                    const rect = el.getBoundingClientRect();
                    if (parentRect) {
                      setIndicator({ left: rect.left - parentRect.left, width: rect.width });
                    }
                  }
                }}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''} px-3 py-2`}
                onClick={updateIndicator}
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
