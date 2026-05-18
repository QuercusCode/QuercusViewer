import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as NGL from 'ngl';
import { logEvent } from '../../utils/analytics';
import { CookieBanner } from './CookieBanner';
import { LanguageSwitcher } from './LanguageSwitcher';

// ─── Design tokens (scoped to landing page) ──────────────────────────────────

const L = {
  bg0: '#030303', bg1: '#0a0a0a', bg2: '#111111', bg3: '#171717',
  bg4: '#1e1e1e', bg5: '#262626',
  b1: '#1a1a1a', b2: '#222222', b3: '#333333',
  t1: '#f5f5f5', t2: '#a3a3a3', t3: '#666666', t4: '#404040',
  accent: '#4ade80',
  accentHover: '#86efac',
  accentBg: 'rgba(74,222,128,0.06)',
  accentBgH: 'rgba(74,222,128,0.12)',
  accentBorder: 'rgba(74,222,128,0.15)',
  fontDisplay: "'Space Grotesk', system-ui, sans-serif",
  fontBody: "'DM Sans', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
};

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

function Icon({ size = 18, color = 'currentColor', children }: { size?: number; color?: string; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const SearchIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></Icon>;
const DownloadIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" /></Icon>;
const GridIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></Icon>;
const UsersIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><circle cx="9" cy="7" r="4" /><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></Icon>;
const CameraIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></Icon>;
const LayersIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></Icon>;
const LightningIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10" /></Icon>;
const GitHubIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" /></Icon>;
const ArrowRightIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><path d="M5 12h14M12 5l7 7-7 7" /></Icon>;
const CheckIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><path d="M20 6L9 17l-5-5" /></Icon>;
const XIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><path d="M18 6L6 18M6 6l12 12" /></Icon>;
const EyeIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></Icon>;
const ShareIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></Icon>;
const MailIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" /></Icon>;
const MenuIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => <Icon size={size} color={color}><path d="M3 12h18M3 6h18M3 18h18" /></Icon>;

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────

function useReveal(threshold = 0.15, sectionName?: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          setVisible(true);
          if (sectionName) logEvent('section_view', { section: sectionName });
          obs.unobserve(e.target);
        }
      }),
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, sectionName]);
  return [ref, visible] as const;
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimCounter({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useReveal(0.3);
  useEffect(() => {
    if (!visible) return;
    const dur = 1200;
    const start = performance.now();
    let id: number;
    const tick = (now: number) => {
      let t = Math.min((now - start) / dur, 1);
      t = 1 - Math.pow(1 - t, 3);
      setCount(Math.floor(t * to));
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [visible, to]);
  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

// ─── Molecular particle canvas ────────────────────────────────────────────────

function MolecularCanvas({ accentRgb }: { accentRgb: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    let id: number;
    let W: number, H: number;
    const resize = () => { W = c.width = c.offsetWidth * 2; H = c.height = c.offsetHeight * 2; };
    resize();
    window.addEventListener('resize', resize);
    const N = Math.min(90, Math.floor(window.innerWidth / 12));
    const BOND = 180;
    const colors = [
      `rgba(${accentRgb},0.5)`, 'rgba(45,212,191,0.4)',
      'rgba(96,165,250,0.35)', 'rgba(167,139,250,0.3)',
    ];
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * 2000, y: Math.random() * 2000,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 1, c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        const a = pts[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
        for (let j = i + 1; j < N; j++) {
          const b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < BOND) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${accentRgb},${0.08 * (1 - d / BOND)})`; ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
      pts.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.c; ctx.fill(); });
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize); };
  }, [accentRgb]);
  return (
    <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.45 }} />
  );
}

// ─── NGL 3D Hero Background ───────────────────────────────────────────────────

function NGL3DBackground({ protein, opacity }: { protein: string; opacity: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const stage = new NGL.Stage(containerRef.current, {
      backgroundColor: 'rgba(0,0,0,0)',
      quality: 'high',
      impostor: true,
    } as any);
    stageRef.current = stage;

    stage.loadFile(`rcsb://${protein}`).then((comp: any) => {
      comp.addRepresentation('cartoon', {
        color: 'chainid', opacity: 0.95, quality: 'high',
        colorScale: ['#4ade80', '#2dd4bf', '#60a5fa', '#a78bfa'],
      });
      comp.addRepresentation('cartoon', {
        color: 'chainid', opacity: 0.3, quality: 'high',
        wireframe: true,
        colorScale: ['#4ade80', '#2dd4bf', '#60a5fa', '#a78bfa'],
      });
      comp.autoView(800);
      (stage as any).toggleSpin();
      setReady(true);
    }).catch(() => setReady(true));

    const onResize = () => stage.handleResize();
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(() => stage.handleResize());
    ro.observe(containerRef.current!);

    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      stage.dispose();
    };
  }, [protein]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity: ready ? opacity : 0,
        transition: 'opacity 2.5s ease',
        pointerEvents: 'none', zIndex: 0,
        filter: 'saturate(1.2) brightness(1.05)',
      }}
    />
  );
}

// ─── Back to top ──────────────────────────────────────────────────────────────

function BackToTop({ scrollRoot }: { scrollRoot: React.RefObject<HTMLDivElement | null> }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollRoot.current;
    if (!el) return;
    const onScroll = () => setVisible(el.scrollTop > 400);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRoot]);

  const scrollToTop = () => {
    scrollRoot.current?.scrollTo({ top: 0, behavior: 'smooth' });
    logEvent('back_to_top_click');
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 300,
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(10,10,10,0.9)', border: '1px solid #222',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#a3a3a3',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.85)',
        pointerEvents: visible ? 'all' : 'none',
        transition: 'opacity .3s ease, transform .3s ease, color .2s, border-color .2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.color = '#4ade80';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(74,222,128,0.3)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.color = '#a3a3a3';
        (e.currentTarget as HTMLElement).style.borderColor = '#222';
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ scrollRoot }: { scrollRoot: React.RefObject<HTMLDivElement | null> }) {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const NAV_LINKS = [
    { label: t('nav.features'), id: 'features' },
    { label: t('nav.workflow'), id: 'workflow' },
    { label: t('nav.faq'),      id: 'faq' },
  ];

  useEffect(() => {
    const el = scrollRoot.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 40);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRoot]);

  // Close on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      scrollRoot.current && (scrollRoot.current.style.overflow = 'hidden');
    } else {
      scrollRoot.current && (scrollRoot.current.style.overflow = 'auto');
    }
  }, [mobileOpen, scrollRoot]);

  const scrollTo = (id: string) => {
    logEvent('nav_scroll_click', { section: id });
    setMobileOpen(false);
    setTimeout(() => {
      scrollRoot.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, mobileOpen ? 300 : 0);
  };

  const navLinkStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, color: L.t3,
    padding: '6px 12px', borderRadius: 8,
    transition: 'all .2s', fontFamily: L.fontBody,
  };

  return (
    <>
      {/* ── Nav bar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        padding: scrolled ? '12px 24px' : '20px 24px',
        background: scrolled || mobileOpen ? 'rgba(3,3,3,0.95)' : 'transparent',
        backdropFilter: scrolled || mobileOpen ? 'blur(20px) saturate(140%)' : 'none',
        WebkitBackdropFilter: scrolled || mobileOpen ? 'blur(20px) saturate(140%)' : 'none',
        borderBottom: scrolled ? `1px solid ${L.b1}` : '1px solid transparent',
        transition: 'padding .4s cubic-bezier(.4,0,.2,1), background .4s cubic-bezier(.4,0,.2,1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 1400, margin: '0 auto',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: L.accentBg, border: `1px solid ${L.accentBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={L.accent} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke={L.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".6" />
              <path d="M2 12l10 5 10-5" stroke={L.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".3" />
            </svg>
          </div>
          <span style={{ fontFamily: L.fontDisplay, fontSize: 18, fontWeight: 700, letterSpacing: '-.01em' }}>
            <span style={{ color: L.accent }}>Quercus</span><span style={{ color: L.t2 }}>Viewer</span>
          </span>
        </div>

        {/* Desktop centre links */}
        <div className="qv-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {NAV_LINKS.map(link => (
            <button key={link.id} onClick={() => scrollTo(link.id)} style={navLinkStyle}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = L.t1; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = L.t3; (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >{link.label}</button>
          ))}
        </div>

        {/* Desktop right */}
        <div className="qv-nav-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href="https://github.com/QuercusCode/QuercusViewer" target="_blank" rel="noopener"
            onClick={() => logEvent('github_link_click', { location: 'nav' })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: L.t3, textDecoration: 'none', padding: '6px 12px', borderRadius: 8, transition: 'all .2s', fontFamily: L.fontBody }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = L.t1; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = L.t3; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          ><GitHubIcon size={15} /> {t('nav.github')}</a>
          <LanguageSwitcher />
          <button onClick={() => { logEvent('cta_click', { cta: 'nav_launch' }); navigate('/app'); }}
            style={{ fontFamily: L.fontDisplay, fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 8, border: 'none', background: L.accent, color: '#050505', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >{t('nav.launch')} <ArrowRightIcon size={14} color="#050505" /></button>
        </div>

        {/* Hamburger (mobile only) */}
        <button className="qv-hamburger" onClick={() => setMobileOpen(o => !o)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: L.t1, padding: 6, borderRadius: 8, transition: 'background .2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
        </button>
      </nav>

      {/* ── Mobile menu overlay ── */}
      <div className="qv-mobile-menu" style={{
        position: 'fixed', inset: 0, zIndex: 199,
        background: 'rgba(3,3,3,0.98)', backdropFilter: 'blur(24px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8,
        opacity: mobileOpen ? 1 : 0,
        pointerEvents: mobileOpen ? 'all' : 'none',
        transition: 'opacity .25s ease',
      }}>
        {NAV_LINKS.map((link, i) => (
          <button key={link.id} onClick={() => scrollTo(link.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 28, fontWeight: 600, fontFamily: L.fontDisplay,
              color: L.t2, padding: '12px 32px', borderRadius: 12,
              transition: 'color .15s, background .15s',
              opacity: mobileOpen ? 1 : 0,
              transform: mobileOpen ? 'translateY(0)' : 'translateY(12px)',
              transitionDelay: `${i * 50 + 80}ms`,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = L.t1; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = L.t2; (e.currentTarget as HTMLElement).style.background = 'none'; }}
          >{link.label}</button>
        ))}
        <div style={{ width: '100%', height: 1, background: L.b2, maxWidth: 200, margin: '16px 0' }} />
        <a href="https://github.com/QuercusCode/QuercusViewer" target="_blank" rel="noopener"
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 500, color: L.t3, textDecoration: 'none', padding: '10px 24px', borderRadius: 10, transition: 'color .15s', opacity: mobileOpen ? 1 : 0, transitionDelay: '280ms' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = L.t1; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = L.t3; }}
        ><GitHubIcon size={18} /> {t('nav.github')}</a>
        {/* Language switcher in mobile menu */}
        <div style={{ opacity: mobileOpen ? 1 : 0, transitionDelay: '310ms', transition: 'opacity .25s ease' }}>
          <LanguageSwitcher compact />
        </div>
        <button onClick={() => { navigate('/app'); setMobileOpen(false); }}
          style={{
            fontFamily: L.fontDisplay, fontSize: 16, fontWeight: 600,
            padding: '14px 40px', borderRadius: 10, border: 'none',
            background: L.accent, color: '#050505', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
            opacity: mobileOpen ? 1 : 0, transitionDelay: '330ms', transition: 'opacity .25s ease, filter .2s, transform .2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
        >{t('nav.launch')} <ArrowRightIcon size={16} color="#050505" /></button>
      </div>
    </>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection({ protein }: { protein: string }) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { requestAnimationFrame(() => setReady(true)); }, []);
  const anim = (delay: string, dur = '.8s') =>
    ready ? { animation: `qvLandFadeUp ${dur} ${delay} both` } : { opacity: 0 };

  return (
    <section style={{
      position: 'relative', minHeight: '100vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '100px 24px 80px', textAlign: 'center', overflow: 'hidden',
      fontFamily: L.fontBody,
    }}>
      <NGL3DBackground protein={protein} opacity={0.5} />
      <MolecularCanvas accentRgb="74,222,128" />
      {/* Dot grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, opacity: .04, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle, ${L.t3} 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }} />
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: `radial-gradient(ellipse 90% 70% at 50% 45%, rgba(3,3,3,0.15) 0%, rgba(3,3,3,0.5) 40%, ${L.bg0} 75%), linear-gradient(to bottom, transparent 0%, rgba(3,3,3,0.2) 60%, ${L.bg0} 92%)`,
        pointerEvents: 'none',
      }} />
      {/* Accent glow */}
      <div style={{
        position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'clamp(300px,50vw,600px)', height: 'clamp(200px,30vh,400px)',
        background: `radial-gradient(ellipse at center, ${L.accentBgH} 0%, transparent 70%)`,
        filter: 'blur(40px)', pointerEvents: 'none', zIndex: 1, opacity: .8,
      }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 720 }}>
        {/* Badge */}
        <div style={{
          ...anim('.2s', '.6s'),
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontFamily: L.fontMono, fontSize: 11, fontWeight: 500,
          padding: '6px 16px', borderRadius: 20, letterSpacing: '.05em',
          background: L.accentBg, border: `1px solid ${L.accentBorder}`,
          color: L.accent, marginBottom: 32,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: L.accent,
            display: 'inline-block', animation: 'qvLandPulse 2s ease infinite',
          }} />
          {t('hero.badge')}
        </div>

        <h1 style={{
          ...anim('.3s'),
          fontFamily: L.fontDisplay, fontSize: 'clamp(44px,7.5vw,88px)',
          fontWeight: 700, lineHeight: 1.0, letterSpacing: '-0.035em', marginBottom: 20,
        }}>
          <span style={{ color: L.accent }}>Quercus</span><br />
          <span style={{ color: L.t1 }}>Viewer</span>
        </h1>

        <p style={{
          ...anim('.45s', '.7s'),
          fontFamily: L.fontDisplay, fontSize: 'clamp(16px,2.2vw,21px)',
          fontWeight: 400, color: L.t2, marginBottom: 12, letterSpacing: '.005em',
        }}>
          {t('hero.subtitle')}
        </p>
        <p style={{
          ...anim('.55s', '.6s'),
          fontSize: 'clamp(13px,1.4vw,15px)', lineHeight: 1.75, color: L.t3,
          maxWidth: 480, margin: '0 auto 36px',
        }}>
          {t('hero.description')}
        </p>

        {/* CTAs */}
        <div style={{
          ...anim('.65s', '.6s'),
          display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap',
        }}>
          <button
            onClick={() => { logEvent('cta_click', { cta: 'hero_launch' }); navigate('/app'); }}
            style={{
              fontFamily: L.fontDisplay, fontSize: 15, fontWeight: 600,
              padding: '14px 32px', borderRadius: 10, border: 'none',
              background: L.accent, color: '#050505', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all .25s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(74,222,128,0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            {t('hero.cta_launch')} <ArrowRightIcon size={16} color="#050505" />
          </button>
          <a
            href="https://github.com/QuercusCode/QuercusViewer" target="_blank" rel="noopener"
            onClick={() => logEvent('github_link_click', { location: 'hero' })}
            style={{
              fontFamily: L.fontDisplay, fontSize: 14, fontWeight: 500,
              padding: '13px 24px', borderRadius: 10,
              border: `1px solid ${L.b3}`, background: 'rgba(255,255,255,0.03)',
              color: L.t2, cursor: 'pointer', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all .25s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = L.t3; (e.currentTarget as HTMLElement).style.color = L.t1; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = L.b3; (e.currentTarget as HTMLElement).style.color = L.t2; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
          >
            <GitHubIcon size={16} /> {t('hero.cta_source')}
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        ...anim('.9s', '.7s'),
        position: 'relative', zIndex: 2, marginTop: 64,
        display: 'flex', gap: 0, flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {([
          { n: 1000, suffix: '+', label: t('hero.stat_molecules') },
          { n: 4, suffix: '', label: t('hero.stat_views') },
          { n: 0, suffix: '', label: t('hero.stat_install') },
        ] as const).map((st, i) => (
          <div key={i} style={{
            padding: '16px 32px', textAlign: 'center',
            borderRight: i < 2 ? `1px solid ${L.b2}` : 'none',
          }}>
            <div style={{
              fontFamily: L.fontDisplay, fontSize: 28, fontWeight: 700,
              color: L.t1, letterSpacing: '-.02em', lineHeight: 1,
            }}>
              <AnimCounter to={st.n} suffix={st.suffix} />
            </div>
            <div style={{
              fontFamily: L.fontMono, fontSize: 10, color: L.t4,
              textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 6,
            }}>{st.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHead({ label, title, desc }: { label: string; title: string; desc?: string }) {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref} style={{
      textAlign: 'center', marginBottom: 56,
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(24px)',
      transition: 'all .8s cubic-bezier(.4,0,.2,1)',
    }}>
      <span style={{
        fontFamily: L.fontMono, fontSize: 11, fontWeight: 500,
        color: L.accent, letterSpacing: '.1em', textTransform: 'uppercase',
        display: 'block', marginBottom: 10,
      }}>{label}</span>
      <h2 style={{
        fontFamily: L.fontDisplay, fontSize: 'clamp(26px,4vw,36px)', fontWeight: 600,
        color: L.t1, letterSpacing: '-.02em', lineHeight: 1.2,
      }}>{title}</h2>
      {desc && <p style={{
        fontSize: 15, color: L.t3, marginTop: 12,
        maxWidth: 520, margin: '12px auto 0', lineHeight: 1.65,
      }}>{desc}</p>}
    </div>
  );
}

// ─── Features Section ─────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc, idx }: { icon: React.ReactNode; title: string; desc: string; idx: number }) {
  const [ref, vis] = useReveal(0.1);
  const [hov, setHov] = useState(false);
  return (
    <div
      ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? (hov ? 'translateY(-3px)' : 'translateY(0)') : 'translateY(30px)',
        transition: 'all .7s cubic-bezier(.4,0,.2,1)',
        transitionDelay: vis ? `${idx * 80}ms` : '0ms',
        background: hov ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
        border: `1px solid ${hov ? L.accentBorder : L.b2}`,
        borderRadius: 12, padding: '28px 24px', cursor: 'default',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 8,
        background: L.accentBg, border: `1px solid ${L.accentBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: L.accent, marginBottom: 16,
      }}>{icon}</div>
      <h3 style={{ fontFamily: L.fontDisplay, fontSize: 16, fontWeight: 600, marginBottom: 6, color: L.t1 }}>{title}</h3>
      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: L.t2 }}>{desc}</p>
    </div>
  );
}

function FeaturesSection() {
  const { t } = useTranslation();
  const FEATURES = [
    { icon: <DownloadIcon />, title: t('features.import_title'),    desc: t('features.import_desc') },
    { icon: <GridIcon />,     title: t('features.multiview_title'), desc: t('features.multiview_desc') },
    { icon: <UsersIcon />,    title: t('features.collab_title'),    desc: t('features.collab_desc') },
    { icon: <CameraIcon />,   title: t('features.studio_title'),    desc: t('features.studio_desc') },
    { icon: <LayersIcon />,   title: t('features.styling_title'),   desc: t('features.styling_desc') },
    { icon: <LightningIcon />,title: t('features.access_title'),    desc: t('features.access_desc') },
  ];
  return (
    <section id="features" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <SectionHead
        label={t('features.label')}
        title={t('features.title')}
        desc={t('features.desc')}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
        {FEATURES.map((f, i) => <FeatureCard key={i} idx={i} icon={f.icon} title={f.title} desc={f.desc} />)}
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const { t } = useTranslation();
  const STEPS = [
    { num: '01', title: t('workflow.s1_title'), desc: t('workflow.s1_desc'), icon: <SearchIcon size={24} /> },
    { num: '02', title: t('workflow.s2_title'), desc: t('workflow.s2_desc'), icon: <EyeIcon size={24} /> },
    { num: '03', title: t('workflow.s3_title'), desc: t('workflow.s3_desc'), icon: <ShareIcon size={24} /> },
  ];
  return (
    <section id="workflow" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <SectionHead label={t('workflow.label')} title={t('workflow.title')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24, position: 'relative' }}>
        {STEPS.map((st, i) => {
          const [ref, vis] = useReveal(0.15);
          return (
            <div ref={ref} key={i} style={{
              opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(30px)',
              transition: 'all .7s cubic-bezier(.4,0,.2,1)', transitionDelay: `${i * 150}ms`,
              textAlign: 'center', padding: '40px 24px', position: 'relative',
              background: 'rgba(255,255,255,0.015)', border: `1px solid ${L.b2}`, borderRadius: 14,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, margin: '0 auto 20px',
                background: L.accentBg, border: `1px solid ${L.accentBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: L.accent,
              }}>{st.icon}</div>
              <div style={{ fontFamily: L.fontMono, fontSize: 10, color: L.accent, letterSpacing: '.1em', marginBottom: 8, opacity: .7 }}>
                STEP {st.num}
              </div>
              <h3 style={{ fontFamily: L.fontDisplay, fontSize: 18, fontWeight: 600, color: L.t1, marginBottom: 8 }}>{st.title}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: L.t3 }}>{st.desc}</p>
              {i < 2 && (
                <div style={{
                  position: 'absolute', top: '50%', right: -13, width: 26, height: 2, zIndex: 2,
                  background: `linear-gradient(to right, ${L.accentBorder}, ${L.b3})`,
                  borderRadius: 1,
                }} className="qv-step-connector" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Demo Showcase ────────────────────────────────────────────────────────────

const DEMO_CARDS = [
  { title: '3D Structure Viewer', desc: 'Interactive WebGL viewport with real-time rotation, zoom, and atom-level hover information.', gradient: 'linear-gradient(135deg,rgba(74,222,128,0.12),rgba(45,212,191,0.05))', lineColor: '#4ade80', icon: <EyeIcon size={24} color="#4ade80" />, badge: 'Viewer', filename: 'hemoglobin.pdb' },
  { title: 'Multi-View Analysis', desc: 'Compare up to four structures simultaneously with synchronized camera controls and overlays.', gradient: 'linear-gradient(135deg,rgba(96,165,250,0.12),rgba(167,139,250,0.05))', lineColor: '#60a5fa', icon: <GridIcon size={24} color="#60a5fa" />, badge: 'Analytics', filename: 'compare.session' },
  { title: 'Studio Mode', desc: 'Create keyframe animations, adjust lighting, and export publication-quality renders and reports.', gradient: 'linear-gradient(135deg,rgba(167,139,250,0.12),rgba(251,191,36,0.05))', lineColor: '#a78bfa', icon: <CameraIcon size={24} color="#a78bfa" />, badge: 'Export', filename: 'render_4k.png' },
];

function DemoShowcase() {
  return (
    <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <SectionHead label="Preview" title="See it in action" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
        {DEMO_CARDS.map((card, i) => {
          const [ref, vis] = useReveal(0.1);
          const [hov, setHov] = useState(false);
          return (
            <div ref={ref} key={i}
              onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
              style={{
                opacity: vis ? 1 : 0, transform: vis ? (hov ? 'translateY(-4px)' : 'translateY(0)') : 'translateY(30px)',
                transition: 'all .7s cubic-bezier(.4,0,.2,1)', transitionDelay: `${i * 100}ms`,
                borderRadius: 12, border: `1px solid ${hov ? L.accentBorder : L.b2}`,
                overflow: 'hidden', cursor: 'default',
                boxShadow: hov ? `0 16px 48px rgba(0,0,0,0.3), 0 0 0 1px ${L.accentBorder}` : 'none',
              }}>
              <div style={{
                height: 200, background: card.gradient, position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: `1px solid ${L.b2}`, overflow: 'hidden',
              }}>
                <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: .15 }}>
                  <line x1="10%" y1="20%" x2="45%" y2="50%" stroke={card.lineColor} strokeWidth="1" />
                  <line x1="45%" y1="50%" x2="80%" y2="30%" stroke={card.lineColor} strokeWidth="1" />
                  <line x1="80%" y1="30%" x2="60%" y2="80%" stroke={card.lineColor} strokeWidth="1" />
                  <line x1="20%" y1="70%" x2="45%" y2="50%" stroke={card.lineColor} strokeWidth="1" />
                  <circle cx="10%" cy="20%" r="4" fill={card.lineColor} opacity=".5" />
                  <circle cx="45%" cy="50%" r="5" fill={card.lineColor} opacity=".6" />
                  <circle cx="80%" cy="30%" r="3" fill={card.lineColor} opacity=".4" />
                  <circle cx="60%" cy="80%" r="4" fill={card.lineColor} opacity=".5" />
                  <circle cx="20%" cy="70%" r="3" fill={card.lineColor} opacity=".4" />
                </svg>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{card.icon}</div>
                  <span style={{ fontFamily: L.fontMono, fontSize: 10, color: L.t3, letterSpacing: '.06em', textTransform: 'uppercase' }}>{card.badge}</span>
                </div>
                {/* Fake toolbar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 32,
                  background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', padding: '0 12px', gap: 5,
                }}>
                  {[0, 1, 2].map(j => <div key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />)}
                  <div style={{ flex: 1 }} />
                  <span style={{ fontFamily: L.fontMono, fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '.04em' }}>{card.filename}</span>
                </div>
              </div>
              <div style={{ padding: '20px 22px', background: 'rgba(255,255,255,0.015)' }}>
                <h3 style={{ fontFamily: L.fontDisplay, fontSize: 15, fontWeight: 600, color: L.t1, marginBottom: 6 }}>{card.title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: L.t3 }}>{card.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Comparison Table (hidden until monetization is live) ─────────────────────

const COMPARISON_TOOLS = ['QuercusViewer', 'PyMOL', 'UCSF Chimera', 'Jmol'];
const COMPARISON_ROWS = [
  { feature: 'Browser-Based', vals: [true, false, false, true] },
  { feature: 'Free & Open Source', vals: [true, false, true, true] },
  { feature: 'No Installation', vals: [true, false, false, false] },
  { feature: 'Real-time Collaboration', vals: [true, false, false, false] },
  { feature: 'Multi-View Compare', vals: [true, true, true, false] },
  { feature: 'Keyframe Animation', vals: [true, true, true, false] },
  { feature: 'Publication Export', vals: [true, true, true, true] },
  { feature: 'Accessibility Features', vals: [true, false, false, false] },
  { feature: 'PDB/PubChem Import', vals: [true, true, true, true] },
];

function ComparisonSection() {
  const [ref, vis] = useReveal(0.1, 'compare');
  return (
    <section id="compare" style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
      <SectionHead
        label="Compare"
        title="How QuercusViewer stacks up"
        desc="See how QuercusViewer compares to established molecular visualization tools."
      />
      <div ref={ref} style={{
        opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all .8s cubic-bezier(.4,0,.2,1)',
        overflowX: 'auto', borderRadius: 12, border: `1px solid ${L.b2}`,
        background: 'rgba(255,255,255,0.012)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: L.fontBody, minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${L.b2}` }}>
              <th style={{ textAlign: 'left', padding: '14px 18px', fontFamily: L.fontMono, fontSize: 10, color: L.t4, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600, width: '28%' }}>Feature</th>
              {COMPARISON_TOOLS.map((t, i) => (
                <th key={i} style={{ textAlign: 'center', padding: '14px 12px', fontFamily: L.fontDisplay, fontSize: 13, fontWeight: 600, color: i === 0 ? L.accent : L.t2, whiteSpace: 'nowrap' }}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: ri < COMPARISON_ROWS.length - 1 ? `1px solid ${L.b1}` : 'none', background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)' }}>
                <td style={{ padding: '11px 18px', color: L.t2, fontWeight: 500 }}>{row.feature}</td>
                {row.vals.map((v, vi) => (
                  <td key={vi} style={{ textAlign: 'center', padding: '11px 12px' }}>
                    {v
                      ? <CheckIcon size={16} color={vi === 0 ? L.accent : L.t3} />
                      : <span style={{ opacity: .4 }}><XIcon size={14} color={L.t4} /></span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Pricing Section (hidden until monetization is live) ──────────────────────

const PLANS = [
  {
    name: 'Free', price: '$0', period: 'forever', accent: false,
    desc: 'For individual researchers and students exploring molecular structures.',
    cta: 'Get Started',
    features: ['Unlimited structure viewing', 'PDB & PubChem import', 'Drag-and-drop local files', 'Basic representations', 'Screenshot export', 'Community support'],
  },
  {
    name: 'Pro', price: '$12', period: '/month', accent: true, badge: 'Most Popular',
    desc: 'For professionals who need advanced analysis and collaboration tools.',
    cta: 'Start Free Trial',
    features: ['Everything in Free', 'Multi-view compare (4 panels)', 'Advanced color schemes', 'Studio mode & animations', 'High-res publication export', 'PDF report generation', 'Priority support'],
  },
  {
    name: 'Team', price: '$29', period: '/month per seat', accent: false,
    desc: 'For research labs and teams who need real-time collaboration.',
    cta: 'Contact Sales',
    features: ['Everything in Pro', 'Real-time live collaboration', 'Shared session management', 'Team structure library', 'Custom branding', 'Admin dashboard', 'Dedicated support & SLA'],
  },
];

function PricingSection() {
  const navigate = useNavigate();
  return (
    <section id="pricing" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <SectionHead label="Pricing" title="Simple, transparent pricing" desc="Start free and scale as your research grows. No hidden fees." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, alignItems: 'start' }}>
        {PLANS.map((plan, i) => {
          const [ref, vis] = useReveal(0.1);
          const [hov, setHov] = useState(false);
          return (
            <div ref={ref} key={i}
              onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
              style={{
                opacity: vis ? 1 : 0, transform: vis ? (hov ? 'translateY(-3px)' : 'translateY(0)') : 'translateY(30px)',
                transition: 'all .7s cubic-bezier(.4,0,.2,1)', transitionDelay: `${i * 100}ms`,
                borderRadius: 14, overflow: 'hidden', position: 'relative',
                border: `1px solid ${plan.accent ? L.accentBorder : L.b2}`,
                background: plan.accent ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.012)',
                boxShadow: plan.accent ? `0 0 40px ${L.accentBg}, 0 0 0 1px ${L.accentBorder}` : 'none',
              }}>
              {'badge' in plan && plan.badge && (
                <div style={{
                  position: 'absolute', top: 14, right: 14,
                  fontFamily: L.fontMono, fontSize: 9, fontWeight: 600,
                  padding: '3px 10px', borderRadius: 10, letterSpacing: '.06em', textTransform: 'uppercase',
                  background: L.accent, color: '#050505',
                }}>{plan.badge}</div>
              )}
              <div style={{ padding: '32px 28px 24px' }}>
                <div style={{
                  fontFamily: L.fontDisplay, fontSize: 14, fontWeight: 600,
                  color: plan.accent ? L.accent : L.t2, marginBottom: 12,
                  textTransform: 'uppercase', letterSpacing: '.04em',
                }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontFamily: L.fontDisplay, fontSize: 40, fontWeight: 700, color: L.t1, letterSpacing: '-.03em', lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontFamily: L.fontMono, fontSize: 12, color: L.t4 }}>{plan.period}</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: L.t3, marginBottom: 24, minHeight: 40 }}>{plan.desc}</p>
                <button
                  onClick={() => navigate('/app')}
                  style={{
                    display: 'block', width: '100%', textAlign: 'center',
                    fontFamily: L.fontDisplay, fontSize: 13, fontWeight: 600,
                    padding: '11px 20px', borderRadius: 8, cursor: 'pointer',
                    transition: 'all .2s', marginBottom: 24,
                    background: plan.accent ? L.accent : 'transparent',
                    color: plan.accent ? '#050505' : L.t2,
                    border: plan.accent ? 'none' : `1px solid ${L.b3}`,
                  }}
                  onMouseEnter={e => {
                    if (!plan.accent) { (e.currentTarget as HTMLElement).style.borderColor = L.t3; (e.currentTarget as HTMLElement).style.color = L.t1; }
                    else { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }
                  }}
                  onMouseLeave={e => {
                    if (!plan.accent) { (e.currentTarget as HTMLElement).style.borderColor = L.b3; (e.currentTarget as HTMLElement).style.color = L.t2; }
                    else { (e.currentTarget as HTMLElement).style.filter = 'none'; }
                  }}
                >{plan.cta}</button>
                <div style={{ borderTop: `1px solid ${L.b2}`, paddingTop: 20 }}>
                  <div style={{ fontFamily: L.fontMono, fontSize: 9, color: L.t4, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 }}>Includes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {plan.features.map((f, fi) => (
                      <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckIcon size={14} color={plan.accent ? L.accent : L.t3} />
                        <span style={{ fontSize: 13, color: L.t2 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Tech Bar ─────────────────────────────────────────────────────────────────

function TechBar() {
  const [ref, vis] = useReveal(0.15, 'tech_bar');
  const techs = ['React 18', 'TypeScript', 'NGL Viewer', 'Tailwind CSS', 'Vite', 'Supabase'];
  return (
    <section ref={ref} style={{
      padding: '32px 24px 56px', textAlign: 'center',
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all .8s cubic-bezier(.4,0,.2,1)',
    }}>
      <p style={{ fontFamily: L.fontMono, fontSize: 10, color: L.t4, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>Built with</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {techs.map(t => (
          <span key={t} style={{
            fontFamily: L.fontMono, fontSize: 11, fontWeight: 500,
            padding: '5px 12px', borderRadius: 16,
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${L.b2}`,
            color: L.t3, letterSpacing: '.02em',
          }}>{t}</span>
        ))}
      </div>
    </section>
  );
}

// ─── FAQ Section ─────────────────────────────────────────────────────────────

function FAQItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(false);
  const [ref, vis] = useReveal(0.1);
  return (
    <div ref={ref} style={{
      borderBottom: `1px solid ${L.b2}`,
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(16px)',
      transition: `opacity .6s ${idx * 60}ms cubic-bezier(.4,0,.2,1), transform .6s ${idx * 60}ms cubic-bezier(.4,0,.2,1)`,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, padding: '20px 0', textAlign: 'left',
          fontFamily: L.fontDisplay, fontSize: 15.5, fontWeight: 600,
          color: open ? L.t1 : L.t2,
          transition: 'color .2s',
        }}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span style={{
          flexShrink: 0, width: 22, height: 22, borderRadius: 6,
          background: open ? L.accentBg : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? L.accentBorder : L.b3}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? L.accent : L.t4,
          transition: 'all .25s',
          fontSize: 14, lineHeight: 1,
        }}>
          {open ? '−' : '+'}
        </span>
      </button>
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? 300 : 0,
        transition: 'max-height .35s cubic-bezier(.4,0,.2,1)',
      }}>
        <p style={{
          margin: 0, paddingBottom: 20,
          fontSize: 14, lineHeight: 1.75, color: L.t3,
          fontFamily: L.fontBody,
        }}>{a}</p>
      </div>
    </div>
  );
}

function FAQSection() {
  const { t } = useTranslation();
  const FAQ_ITEMS = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') },
  ];
  return (
    <section id="faq" style={{ padding: '80px 24px', maxWidth: 720, margin: '0 auto' }}>
      <SectionHead
        label={t('faq.label')}
        title={t('faq.title')}
        desc={t('faq.desc')}
      />
      <div>
        {FAQ_ITEMS.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} idx={i} />
        ))}
      </div>
    </section>
  );
}

// ─── Newsletter Section ───────────────────────────────────────────────────────

function NewsletterSection() {
  const { t } = useTranslation();
  const [ref, vis] = useReveal(0.15, 'newsletter');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  return (
    <section ref={ref} style={{
      padding: '80px 24px', maxWidth: 560, margin: '0 auto', textAlign: 'center',
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(24px)',
      transition: 'all .8s cubic-bezier(.4,0,.2,1)',
    }}>
      <div style={{ padding: '48px 36px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: `1px solid ${L.b2}` }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, margin: '0 auto 20px',
          background: L.accentBg, border: `1px solid ${L.accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MailIcon size={22} color={L.accent} />
        </div>
        <h2 style={{ fontFamily: L.fontDisplay, fontSize: 24, fontWeight: 600, color: L.t1, marginBottom: 8 }}>{t('newsletter.title')}</h2>
        <p style={{ fontSize: 14, color: L.t3, marginBottom: 24, lineHeight: 1.6 }}>{t('newsletter.desc')}</p>
        {!submitted ? (
          <div style={{ display: 'flex', gap: 8, maxWidth: 400, margin: '0 auto' }}>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('newsletter.placeholder')}
              type="email"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: L.bg3, border: `1px solid ${L.b3}`,
                color: L.t1, fontFamily: L.fontBody, minWidth: 0, outline: 'none',
                transition: 'border-color .2s',
              }}
              onKeyDown={e => { if (e.key === 'Enter' && email.includes('@')) { setSubmitted(true); logEvent('newsletter_subscribe'); } }}
            />
            <button
              onClick={() => { if (email.includes('@')) { setSubmitted(true); logEvent('newsletter_subscribe'); } }}
              style={{
                fontFamily: L.fontDisplay, fontSize: 13, fontWeight: 600,
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: L.accent, color: '#050505', cursor: 'pointer',
                transition: 'all .2s', whiteSpace: 'nowrap', flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
            >{t('newsletter.button')}</button>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 8,
            background: L.accentBg, border: `1px solid ${L.accentBorder}`,
            color: L.accent, fontSize: 14, fontWeight: 500,
          }}>
            <CheckIcon size={16} /> {t('newsletter.success')}
          </div>
        )}
        <p style={{ fontSize: 11, color: L.t4, marginTop: 14 }}>{t('newsletter.fine_print')}</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function FooterSection() {
  const { t } = useTranslation();
  return (
    <footer style={{
      padding: '32px 24px', borderTop: `1px solid ${L.b1}`,
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, maxWidth: 1100, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: L.fontDisplay, fontSize: 14, fontWeight: 700 }}>
          <span style={{ color: L.accent }}>Q</span><span style={{ color: L.t4 }}>uercus</span>
        </span>
        <span style={{ fontSize: 11, color: L.t4, fontFamily: L.fontMono }}>· {t('footer.license')}</span>
      </div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {[
          { label: 'GitHub', href: 'https://github.com/QuercusCode/QuercusViewer' },
          { label: 'RCSB PDB', href: 'https://www.rcsb.org' },
          { label: 'PubChem', href: 'https://pubchem.ncbi.nlm.nih.gov' },
        ].map(l => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener"
            style={{ fontSize: 12, color: L.t4, textDecoration: 'none', fontFamily: L.fontMono, transition: 'color .2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = L.t2; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = L.t4; }}
          >{l.label}</a>
        ))}
      </div>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: L.fontMono }}>{t('footer.engine')}</div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState(0);
  useEffect(() => { forceUpdate(1); }, []);
  useEffect(() => {
    document.title = 'Quercus Viewer — Professional 3D Molecular Structure Analysis';
  }, []);

  return (
    <>
      <style>{`
        @keyframes qvLandFadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes qvLandFadeDown { from { opacity:0; transform:translateY(-14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes qvLandPulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        .qv-step-connector { display: none; }
        @media (min-width: 860px) { .qv-step-connector { display: block !important; } }
        .qv-landing-scroll::-webkit-scrollbar { width: 5px; }
        .qv-landing-scroll::-webkit-scrollbar-track { background: transparent; }
        .qv-landing-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::selection { background: rgba(74,222,128,0.3); color: #fff; }
        /* Nav responsive */
        @media (max-width: 767px) {
          .qv-nav-links { display: none !important; }
          .qv-nav-right  { display: none !important; }
          .qv-hamburger  { display: flex !important; align-items: center; justify-content: center; }
          .qv-mobile-menu { display: flex !important; }
        }
        @media (min-width: 768px) {
          .qv-mobile-menu { display: none !important; }
        }
      `}</style>
      <div
        ref={scrollRootRef}
        className="qv-landing-scroll"
        style={{
          width: '100%', height: '100%', overflow: 'auto',
          background: L.bg0, scrollBehavior: 'smooth',
          fontFamily: L.fontBody, color: L.t1,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <Nav scrollRoot={scrollRootRef} />
        <HeroSection protein="4HHB" />
        <FeaturesSection />
        <HowItWorksSection />
        <DemoShowcase />
        {/* ComparisonSection and PricingSection hidden until monetization is ready —
            re-add the lines below and restore NAV_LINKS entries to re-enable:
            <ComparisonSection />
            <PricingSection />
        */}
        {(false as boolean) && <><ComparisonSection /><PricingSection /></>}
        <TechBar />
        <FAQSection />
        <NewsletterSection />
        <FooterSection />
      </div>
      <BackToTop scrollRoot={scrollRootRef} />
      <CookieBanner />
    </>
  );
}
