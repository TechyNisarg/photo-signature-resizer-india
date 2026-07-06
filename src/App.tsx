import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Scissors, ShieldCheck, Menu, X, ArrowLeft, HelpCircle, Info, FileText, Shield, Mail, Moon, Sun, ChevronDown, ChevronRight } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { CATEGORIES, PDF_TOOLS, IMAGE_TOOLS } from './config/tools';

const GlobalBackButton = () => {
  const location = useLocation();
  if (location.pathname === '/') return null;
  
  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%', padding: '1rem 1rem 0', display: 'flex' }}>
      <Link to="/" className="back-icon-btn" title="Back to All Tools">
         <ArrowLeft size={24} />
      </Link>
    </div>
  );
};
import { AnimatePresence, motion } from 'framer-motion';
import { Home } from './pages/Home';
import { About, Privacy, Terms, Contact, FAQ } from './pages/StaticPages';
import { PdfCompressor } from './pages/PdfCompressor';
import { PdfMerger } from './pages/PdfMerger';
import { PdfSecurity } from './pages/PdfSecurity';
import { ImageCompressor } from './pages/ImageCompressor';
import { HeicToJpg } from './pages/HeicToJpg';
import { ImageToPdf } from './pages/ImageToPdf';
import { BackgroundRemoval } from './pages/BackgroundRemoval';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
  >
    {children}
  </motion.div>
);

const AppRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
        <Route path="/privacy" element={<PageWrapper><Privacy /></PageWrapper>} />
        <Route path="/terms" element={<PageWrapper><Terms /></PageWrapper>} />
        <Route path="/contact" element={<PageWrapper><Contact /></PageWrapper>} />
        <Route path="/faq" element={<PageWrapper><FAQ /></PageWrapper>} />
        <Route path="/pdf-compressor" element={<PageWrapper><PdfCompressor /></PageWrapper>} />
        <Route path="/pdf-merger" element={<PageWrapper><PdfMerger /></PageWrapper>} />
        <Route path="/pdf-security" element={<PageWrapper><PdfSecurity /></PageWrapper>} />
        <Route path="/image-to-pdf" element={<PageWrapper><ImageToPdf /></PageWrapper>} />
        <Route path="/image-compressor" element={<PageWrapper><ImageCompressor /></PageWrapper>} />
        <Route path="/heic-to-jpg" element={<PageWrapper><HeicToJpg /></PageWrapper>} />
        <Route path="/remove-background" element={<PageWrapper><BackgroundRemoval /></PageWrapper>} />
        <Route path="/*" element={<PageWrapper><Home /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const handleOpenSidebar = () => setIsSidebarOpen(true);
    window.addEventListener('openSidebar', handleOpenSidebar);
    
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('openSidebar', handleOpenSidebar);
      window.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
    };
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  };

  const NavLinks = () => {
    const navigate = useNavigate();
    const [expandedSection, setExpandedSection] = useState<string | null>('resizers');
    
    const handleNav = (path: string) => {
      navigate(path);
      setIsSidebarOpen(false);
    };

    const toggleSection = (section: string) => {
      setExpandedSection(prev => prev === section ? null : section);
    };

    const SectionHeader = ({ id, title }: { id: string, title: string }) => (
      <button 
        onClick={() => toggleSection(id)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        {expandedSection === id ? <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />}
      </button>
    );

    return (
      <div style={{ overflowY: 'auto', flexGrow: 1, paddingBottom: '2rem' }}>
        
        <SectionHeader id="resizers" title="Photo Resizers" />
        <AnimatePresence initial={false}>
          {expandedSection === 'resizers' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button key={cat.id} onClick={() => handleNav(cat.path)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1.5rem', background: location.pathname === cat.path ? 'var(--surface-solid)' : 'none', border: 'none', width: '100%', textAlign: 'left', fontSize: '0.95rem', color: location.pathname === cat.path ? 'var(--primary)' : 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: location.pathname === cat.path ? 600 : 400 }}>
                    <Icon size={18} style={{ color: cat.color }} /> {cat.label}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <SectionHeader id="pdf" title="PDF Tools" />
        <AnimatePresence initial={false}>
          {expandedSection === 'pdf' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              {PDF_TOOLS.map(tool => (
                <button key={tool.id} onClick={() => handleNav(tool.path)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1.5rem', background: location.pathname === tool.path ? 'var(--surface-solid)' : 'none', border: 'none', width: '100%', textAlign: 'left', fontSize: '0.95rem', color: location.pathname === tool.path ? 'var(--primary)' : 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: location.pathname === tool.path ? 600 : 400 }}>
                  <tool.icon size={18} style={{ color: tool.color }} /> {tool.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <SectionHeader id="image" title="Image Tools" />
        <AnimatePresence initial={false}>
          {expandedSection === 'image' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              {IMAGE_TOOLS.map(tool => (
                <button key={tool.id} onClick={() => handleNav(tool.path)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1.5rem', background: location.pathname === tool.path ? 'var(--surface-solid)' : 'none', border: 'none', width: '100%', textAlign: 'left', fontSize: '0.95rem', color: location.pathname === tool.path ? 'var(--primary)' : 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: location.pathname === tool.path ? 600 : 400 }}>
                  <tool.icon size={18} style={{ color: tool.color }} /> {tool.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <>
      <Analytics />
      <div className="app-wrapper">
        <header className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '1rem 1.5rem', maxWidth: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <button 
                className="mobile-menu-btn" 
                onClick={() => setIsSidebarOpen(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                title="Open Menu (Alt+M / Option+M)"
                aria-label="Open Menu"
              >
                <Menu size={24} />
              </button>
              <Link to="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Scissors size={24} />
                <div><span className="logo-text">Resizer</span> India</div>
              </Link>
            </div>

            <nav className="nav-menu" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#059669', fontSize: '0.9rem', fontWeight: 500 }}>
                  <ShieldCheck size={18} style={{ position: 'relative', top: '1px' }} />
                  <span className="hide-on-mobile">100% Client Side. No Server Uploads.</span>
                </div>
              <button 
                onClick={toggleTheme} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }} 
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </nav>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', backgroundColor: 'var(--bg-color)', zIndex: 1000, boxShadow: '4px 0 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
                  <Link to="/" onClick={() => setIsSidebarOpen(false)} className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    <Scissors size={24} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.2rem' }}>Resizer India</span>
                  </Link>
                  <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={24} />
                  </button>
                </div>
                  <NavLinks />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="main-container">
          <GlobalBackButton />
          <AppRoutes />
        </main>

        <footer className="footer hide-on-mobile-if-sidebar">
          <div className="footer-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', opacity: 0.8, maxWidth: '800px', margin: '0 auto', lineHeight: '1.5' }}>
              <strong>Disclaimer:</strong> Resizer India is an independent, free utility tool designed to help users format their images. We are not affiliated with, endorsed by, or connected to any government agency, examination body, or private organization.
            </div>
            <div className="footer-links">
              <Link to="/about" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Info size={16} style={{ position: 'relative', top: '1px' }} /> <span>About Us</span></Link>
              <Link to="/terms" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} style={{ position: 'relative', top: '1px' }} /> <span>Terms of Service</span></Link>
              <Link to="/privacy" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={16} style={{ position: 'relative', top: '1px' }} /> <span>Privacy Policy</span></Link>
              <Link to="/contact" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={16} style={{ position: 'relative', top: '1px' }} /> <span>Contact</span></Link>
              <Link to="/faq" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HelpCircle size={16} style={{ position: 'relative', top: '1px' }} /> <span>FAQs</span></Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;
