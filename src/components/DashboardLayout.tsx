import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutGrid, 
  Tag, 
  Utensils as UtensilsIcon, 
  Menu as MenuIcon, 
  Users, 
  Star,
  ChevronDown, 
  ChevronRight,
  ChevronLeft,
  LogOut,
  Home,
  Settings,
  BarChart3,
  Receipt,
  Database,
  Image as ImageIcon,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

// ─── Design tokens ───────────────────────────────────────────────────────────
const T = {
  ink850:   '#141414',
  ink800:   '#181816',
  ink700:   '#1C1C1C',
  ink600:   '#262524',
  ink500:   '#3A3734',
  gold500:  '#D49F3D',
  gold400:  '#E3B860',
  teal500:  '#1DA0A8',
  teal400:  '#34B2BA',
  cream50:  '#F6F1E6',
  cream100: '#E9E0CE',
  muted:    '#A39A8C',
  faint:    '#7E766A',
  border:   'rgba(246,241,230,0.12)',
  borderStrong: 'rgba(246,241,230,0.28)',
};

// ─── Role helpers ─────────────────────────────────────────────────────────────
// super_admin / admin / manager: see everything
// marketing: menu, images, profile
// cashier: staff portal only
function canSeeMenu(role: string) {
  return ['super_admin','admin','manager','marketing'].includes(role);
}
function canSeeFinance(role: string) {
  return ['super_admin','admin','manager'].includes(role);
}
function canSeeLoyalty(role: string) {
  return ['super_admin','admin','manager'].includes(role);
}
function canSeeUsers(role: string) {
  return ['super_admin','admin','manager'].includes(role);
}
function canSeeImages(role: string) {
  return ['super_admin','admin','manager','marketing'].includes(role);
}
function canSeeLogs(role: string) {
  return ['super_admin','admin','manager'].includes(role);
}
function canSeeProfile(role: string) {
  return ['super_admin','admin','manager','marketing'].includes(role);
}
function canSeeStaffPortal(role: string) {
  return ['super_admin','admin','manager','marketing','cashier'].includes(role);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  to?: string;
  isActive?: boolean;
  hasSubmenu?: boolean;
  isOpen?: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  to,
  isActive,
  hasSubmenu,
  isOpen,
  isCollapsed,
  onClick,
  children,
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: isCollapsed ? 'center' : 'space-between',
    padding: isCollapsed ? '10px 0' : '10px 16px',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    fontFamily: "'Oswald', sans-serif",
    fontWeight: 500,
    fontSize: 13,
    letterSpacing: '0.08em',
    color: isActive ? T.cream50 : T.muted,
    background: isActive ? T.ink600 : 'transparent',
    borderLeft: isActive ? `3px solid ${T.gold500}` : '3px solid transparent',
    marginBottom: 2,
    position: 'relative',
  };

  const iconColor = isActive ? T.gold400 : T.faint;

  const content = (
    <div
      style={baseStyle}
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.background = T.ink600;
          (e.currentTarget as HTMLDivElement).style.color = T.cream100;
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
          (e.currentTarget as HTMLDivElement).style.color = T.muted;
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: iconColor, display: 'flex', alignItems: 'center', flexShrink: 0, width: 18, height: 18 }}>
          {icon}
        </span>
        {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
      </div>
      {hasSubmenu && !isCollapsed && (
        <span style={{ color: T.faint }}>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      )}
    </div>
  );

  return (
    <div style={{ marginBottom: 1 }}>
      {to && !hasSubmenu ? <Link to={to} style={{ textDecoration: 'none' }}>{content}</Link> : content}
      <AnimatePresence>
        {isOpen && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', marginLeft: 16, marginTop: 2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SidebarSubItem: React.FC<{ label: string; to: string; isActive: boolean }> = ({ label, to, isActive }) => (
  <Link
    to={to}
    style={{
      display: 'block',
      padding: '7px 14px',
      borderRadius: 2,
      fontSize: 12,
      fontFamily: "'Oswald', sans-serif",
      fontWeight: 400,
      letterSpacing: '0.06em',
      color: isActive ? T.gold500 : T.muted,
      background: isActive ? `${T.ink600}` : 'transparent',
      textDecoration: 'none',
      marginBottom: 1,
      borderLeft: isActive ? `2px solid ${T.gold500}` : '2px solid transparent',
      transition: 'background 0.15s, color 0.15s',
    }}
  >
    {label}
  </Link>
);

const GroupLabel: React.FC<{ children: React.ReactNode; collapsed?: boolean }> = ({ children, collapsed }) => {
  if (collapsed) return null;
  return (
    <div style={{
      fontFamily: "'Barlow', sans-serif",
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: T.faint,
      padding: '0 16px',
      marginBottom: 6,
      marginTop: 4,
    }}>
      {children}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardLayout({ user }: { user: any }) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const role: string = user?.role || '';

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const isSubActive = (path: string) => location.pathname.startsWith(path);

  const sidebarWidth = isCollapsed ? 72 : 240;

  const sidebarStyle: React.CSSProperties = {
    width: sidebarWidth,
    minWidth: sidebarWidth,
    background: T.ink800,
    borderRight: `1px solid ${T.border}`,
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    zIndex: 20,
    transition: 'width 0.25s ease',
    overflowX: 'hidden',
  };

  const userInitial = (user?.displayName?.[0] || user?.email?.[0] || 'H').toUpperCase();
  const userDisplayName = user?.displayName || user?.email || 'User';
  const userRole = user?.role || 'Staff';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fb' }}>
      {/* ── Sidebar ── */}
      <aside style={sidebarStyle}>

        {/* Logo area */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          padding: isCollapsed ? '20px 0' : '20px 16px',
          minHeight: 72,
          flexShrink: 0,
        }}>
          {isCollapsed ? (
            /* Gold monogram */
            <button
              onClick={() => setIsCollapsed(false)}
              title="Expand sidebar"
              style={{
                width: 40,
                height: 40,
                background: T.ink600,
                border: `1px solid ${T.border}`,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: T.gold500,
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: 0,
              }}
            >
              H
            </button>
          ) : (
            <>
              <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
                <img
                  src="/assets/logo/hemingways-logo-white.png"
                  alt="Hemingways"
                  style={{ height: 36, objectFit: 'contain', display: 'block' }}
                />
              </Link>
              {/* Collapse chevron */}
              <button
                onClick={() => setIsCollapsed(true)}
                title="Collapse sidebar"
                style={{
                  background: 'none',
                  border: `1px solid ${T.border}`,
                  borderRadius: 2,
                  padding: '3px 5px',
                  cursor: 'pointer',
                  color: T.gold500,
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = T.ink600)}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <ChevronLeft size={14} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          <GroupLabel collapsed={isCollapsed}>Main Navigation</GroupLabel>

          {/* Menu */}
          {canSeeMenu(role) && (
            <SidebarItem
              icon={<LayoutGrid size={18} />}
              label="Menu"
              hasSubmenu
              isOpen={isMenuOpen}
              isCollapsed={isCollapsed}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              isActive={isSubActive('/dashboard/menu') || isActive('/dashboard') || isActive('/dashboard/categories') || isActive('/dashboard/specials') || isActive('/dashboard/drinks')}
            >
              {!isCollapsed && (
                <>
                  <SidebarSubItem label="Main Menu" to="/dashboard" isActive={isActive('/dashboard')} />
                  <SidebarSubItem label="Categories" to="/dashboard/categories" isActive={isActive('/dashboard/categories')} />
                  <SidebarSubItem label="Specials" to="/dashboard/specials" isActive={isActive('/dashboard/specials')} />
                  <SidebarSubItem label="Drinks" to="/dashboard/drinks" isActive={isActive('/dashboard/drinks')} />
                </>
              )}
            </SidebarItem>
          )}

          {/* Finance */}
          {canSeeFinance(role) && (
            <SidebarItem
              icon={<span style={{ fontWeight: 700, fontSize: 18, lineHeight: 1, fontFamily: 'monospace' }}>฿</span>}
              label="Finance"
              to="/dashboard/finance"
              isCollapsed={isCollapsed}
              isActive={isSubActive('/dashboard/finance')}
            />
          )}

          {/* Loyalty */}
          {canSeeLoyalty(role) && (
            <SidebarItem
              icon={<Star size={18} />}
              label="Loyalty & Payments"
              to="/dashboard/loyalty"
              isCollapsed={isCollapsed}
              isActive={isActive('/dashboard/loyalty')}
            />
          )}

          {/* Users */}
          {canSeeUsers(role) && (
            <SidebarItem
              icon={<Users size={18} />}
              label="Users"
              to="/dashboard/users"
              isCollapsed={isCollapsed}
              isActive={isActive('/dashboard/users')}
            />
          )}

          {/* Images */}
          {canSeeImages(role) && (
            <SidebarItem
              icon={<ImageIcon size={18} />}
              label="Image Management"
              to="/dashboard/images"
              isCollapsed={isCollapsed}
              isActive={isActive('/dashboard/images')}
            />
          )}

          {/* System Logs */}
          {canSeeLogs(role) && (
            <SidebarItem
              icon={<Database size={18} />}
              label="System Logs"
              to="/dashboard/logs"
              isCollapsed={isCollapsed}
              isActive={isActive('/dashboard/logs')}
            />
          )}

          {/* System section divider */}
          <div style={{ borderTop: `1px solid ${T.border}`, margin: '16px 8px', paddingTop: 16 }}>
            <GroupLabel collapsed={isCollapsed}>System</GroupLabel>

            <SidebarItem
              icon={<Home size={18} />}
              label="Back to Site"
              to="/"
              isCollapsed={isCollapsed}
            />

            {canSeeProfile(role) && (
              <SidebarItem
                icon={<Building2 size={18} />}
                label="Company Profile"
                to="/dashboard/profile"
                isCollapsed={isCollapsed}
                isActive={isActive('/dashboard/profile')}
              />
            )}

            {canSeeStaffPortal(role) && (
              <SidebarItem
                icon={<Receipt size={18} />}
                label="Staff Portal"
                to="/expense"
                isCollapsed={isCollapsed}
              />
            )}

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              title={isCollapsed ? 'Sign Out' : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: 10,
                padding: isCollapsed ? '10px 0' : '10px 16px',
                background: 'none',
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                letterSpacing: '0.08em',
                color: T.faint,
                transition: 'color 0.15s, background 0.15s',
                marginBottom: 2,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = '#EF4444';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = T.faint;
                (e.currentTarget as HTMLButtonElement).style.background = 'none';
              }}
            >
              <LogOut size={18} />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </nav>

        {/* User card */}
        <div style={{
          margin: isCollapsed ? '8px 8px' : '8px 8px',
          padding: isCollapsed ? '10px 8px' : '10px 12px',
          background: T.ink700,
          border: `1px solid ${T.border}`,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          gap: isCollapsed ? 0 : 10,
          flexShrink: 0,
        }}>
          {/* Avatar */}
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: T.gold500,
            color: T.ink850,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}>
            {userInitial}
          </div>
          {!isCollapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                fontFamily: "'Barlow', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                color: T.cream50,
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {userDisplayName}
              </p>
              <p style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 400,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: T.gold400,
                margin: 0,
              }}>
                {userRole}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{
        flex: 1,
        marginLeft: sidebarWidth,
        minHeight: '100vh',
        background: '#f8f9fb',
        transition: 'margin-left 0.25s ease',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
