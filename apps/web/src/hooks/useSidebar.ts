import { useCallback, useEffect, useState } from 'react';
import { MOBILE_QUERY, useMediaQuery } from './useMediaQuery';

const STORAGE_KEY = 'sidebar-collapsed';

/**
 * Desktop: the sidebar can be collapsed, and the choice is remembered.
 * Mobile: it is a drawer, closed by default and closed again after each navigation.
 */
export function useSidebar() {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Switching layout (rotation, window resize) closes the drawer: adjusted during render,
  // as React recommends, rather than in an effect.
  const [layoutWasMobile, setLayoutWasMobile] = useState(isMobile);
  if (layoutWasMobile !== isMobile) {
    setLayoutWasMobile(isMobile);
    setDrawerOpen(false);
  }

  const isOpen = isMobile ? drawerOpen : !collapsed;

  const toggle = useCallback(() => {
    if (isMobile) setDrawerOpen((open) => !open);
    else setCollapsed((value) => !value);
  }, [isMobile]);

  /** After choosing a chat or a page: only the mobile drawer closes. */
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return { isMobile, isOpen, toggle, closeDrawer };
}
