/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";
import {
  Users,
  LogOut,
  MapPin,
  Phone,
  Clock,
  Instagram,
  Facebook,
  Menu as MenuIcon,
  X,
  ChevronRight,
  Globe,
  Settings,
  ArrowLeft,
  Star,
  Quote,
  MessageCircle,
  Flame,
  Zap,
  Wheat,
  Droplets,
  Utensils as UtensilsIcon
} from "lucide-react";
import { useState, useEffect, useMemo, FormEvent } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  Navigate
} from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";
import { MenuItem, Category, Special, SportsEvent } from "./types";
import { handleFirestoreError } from "./utils/firestore";
import { normalizeImageUrl } from "./utils/images";
// Optimized Sub-components
import MenuItemCard from "./components/menu/MenuItemCard";
import { FirebaseImage } from "./components/ui/FirebaseImage";
import LanguageSwitcher from "./components/menu/LanguageSwitcher";
import MenuItemCardGrid from "./components/menu/MenuItemCardGrid";
import Dashboard from "./components/Dashboard";
import CategoriesDashboard from "./components/CategoriesDashboard";
import Auth from "./components/Auth";
import AdminLogin from "./components/auth/AdminLogin";
import BlogDashboard from "./components/BlogDashboard";
import CareersDashboard from "./components/careers/CareersDashboard";
import { CareersList, CareersJobPage } from "./components/Careers";
import { BlogList, BlogPostPage, LatestPosts } from "./components/Blog";
import BulkImport from "./components/BulkImport";
import DigitalMenu from "./components/DigitalMenu";
import DigitalMenuDisplay from "./components/DigitalMenuDisplay";
import FinanceDashboard from "./components/finance/FinanceDashboard";
import BulkFinanceImport from "./components/finance/BulkFinanceImport";
import ExpenseEntry from "./components/finance/ExpenseEntry";
import StaffPortal from "./components/StaffPortal";
import DashboardLayout from "./components/DashboardLayout";
import UserManagement from "./components/UserManagement";
import ImageManagement from "./components/ImageManagement";
import SystemLogs from "./components/SystemLogs";
import LoyaltyDashboard from "./components/LoyaltyDashboard";
import CompanyProfileDashboard from "./components/CompanyProfileDashboard";
import SpecialsDashboard from "./components/SpecialsDashboard";
import DrinksDashboard from "./components/DrinksDashboard";
import { fetchPlaceDetails, BusinessInfo } from "./services/googlePlaces";
import { Toaster, toast } from "sonner";
import { CompanyProfile } from "./types";

const PLACE_ID = "Hemingways Jomtien"; // Fallback to search query if ID not found

const Navbar = ({ canAccessDashboard, setUser, companyProfile }: { canAccessDashboard: boolean, companyProfile: CompanyProfile | null, setUser: (user: any) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname.startsWith("/dashboard") || location.pathname === "/import";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Food Menu", href: "menu" },
    { name: "Sports Schedule", href: "sports" },
    { name: "Daily Specials", href: "specials" },
    { name: "Location", href: "location" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact-us" },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsOpen(false);
    if (href.startsWith('/') && href !== '/') {
      e.preventDefault();
      navigate(href);
      window.scrollTo(0, 0);
      return;
    }
    if (href === '/') {
      if (location.pathname === '/') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const sectionId = href;
    if (location.pathname !== '/') {
      navigate('/#' + sectionId);
    } else {
      e.preventDefault();
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, [location.pathname, location.hash]);

  const navBg = isDashboard
    ? 'var(--ink-800)'
    : scrolled
      ? 'rgba(12,12,12,0.92)'
      : 'transparent';

  const navStyle: React.CSSProperties = {
    position: isDashboard ? 'sticky' : 'fixed',
    top: 0,
    width: '100%',
    zIndex: 50,
    background: navBg,
    backdropFilter: scrolled && !isDashboard ? 'blur(14px)' : undefined,
    WebkitBackdropFilter: scrolled && !isDashboard ? 'blur(14px)' : undefined,
    borderBottom: isDashboard ? `1px solid var(--border)` : scrolled ? `1px solid var(--border)` : 'none',
    transition: 'background 0.3s ease, border-color 0.3s ease',
    padding: scrolled ? '12px 0' : '20px 0',
  };

  const linkStyle: React.CSSProperties = {
    fontFamily: 'var(--font-condensed)',
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--cream-100)',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  };

  return (
    <nav style={navStyle}>
      {!isDashboard && !scrolled && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 90,
          background: 'linear-gradient(to bottom, rgba(8,8,8,0.75) 0%, rgba(8,8,8,0) 100%)',
          pointerEvents: 'none',
          zIndex: -1,
        }} />
      )}
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }} onClick={() => { setIsOpen(false); window.scrollTo(0, 0); }}>
          <img src="/assets/logo/hemingways-logo-white.png" height={42} alt="Hemingways Jomtien" style={{ height: 42, width: 'auto' }} />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 28 }}>
          {!isDashboard ? (
            <>
              {navLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href === '/' ? '#top' : item.href.startsWith('/') ? item.href : `#${item.href}`}
                  onClick={(e) => handleNavClick(e, item.href)}
                  style={linkStyle}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--cream-100)')}
                >
                  {item.name}
                </a>
              ))}
              {/* Phone */}
              <a
                href={`tel:${companyProfile?.phone || '+66646209225'}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold-400)', fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 13, letterSpacing: '0.08em', textDecoration: 'none' }}
              >
                <Phone size={14} />
                {companyProfile?.phone || '+6664 620 9225'}
              </a>
              <a
                href="#contact"
                onClick={(e) => handleNavClick(e, 'contact')}
                className="hw-btn-warm"
                style={{ padding: '10px 20px', fontSize: 13 }}
              >
                Reserve
              </a>
              {canAccessDashboard && (
                <Link
                  to="/dashboard"
                  style={{ ...linkStyle, display: 'flex', alignItems: 'center', gap: 6 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--cream-100)')}
                >
                  <Settings size={14} /> Dashboard
                </Link>
              )}
              <Auth onUserChange={setUser} />
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link to="/" className="hw-btn-outline" style={{ padding: '9px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeft size={14} /> Back to Site
              </Link>
              <Auth onUserChange={setUser} />
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden"
          onClick={() => setIsOpen(!isOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cream-50)', padding: 4 }}
        >
          {isOpen ? <X size={24} /> : <MenuIcon size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ background: 'var(--ink-800)', borderTop: `1px solid var(--border)`, overflow: 'hidden' }}
            className="lg:hidden"
          >
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {!isDashboard ? (
                <>
                  {navLinks.map((item) => (
                    <a
                      key={item.name}
                      href={item.href === '/' ? '#top' : item.href.startsWith('/') ? item.href : `#${item.href}`}
                      onClick={(e) => handleNavClick(e, item.href)}
                      style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 16, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cream-50)', textDecoration: 'none' }}
                    >
                      {item.name}
                    </a>
                  ))}
                  <div style={{ borderTop: `1px solid var(--border)`, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <a
                      href="#contact"
                      onClick={(e) => handleNavClick(e, 'contact')}
                      className="hw-btn-warm"
                      style={{ textAlign: 'center' }}
                    >
                      Reserve a Table
                    </a>
                    {canAccessDashboard && (
                      <Link
                        to="/dashboard"
                        onClick={() => setIsOpen(false)}
                        style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 15, color: 'var(--gold-400)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <Settings size={16} /> Dashboard
                      </Link>
                    )}
                    <Auth onUserChange={setUser} />
                  </div>
                </>
              ) : (
                <Link
                  to="/"
                  onClick={() => setIsOpen(false)}
                  style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 16, color: 'var(--gold-400)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <ArrowLeft size={18} /> Back to Site
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({ companyProfile }: { companyProfile: CompanyProfile | null }) => {
  return (
    <section
      style={{
        position: 'relative',
        height: '100vh',
        display: 'flex',
        alignItems: 'flex-end',
        overflow: 'hidden',
        marginTop: -90,
        background: 'var(--ink-900)',
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/assets/cajun-food.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
      />
      {/* Scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(8,8,8,0.95) 8%, rgba(8,8,8,0.45) 55%, rgba(8,8,8,0.75) 100%)',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 'var(--container)', margin: '0 auto', padding: '0 24px 72px' }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {/* Badge */}
          <div style={{ marginBottom: 20 }}>
            <span
              className="hw-badge hw-badge-dark"
              style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, letterSpacing: '0.14em' }}
            >
              ★ JOMTIEN · PATTAYA · SINCE 2018 ★
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(48px, 7vw, 88px)',
              lineHeight: 1.0,
              color: 'var(--cream-50)',
              textTransform: 'uppercase',
              margin: '0 0 20px',
              maxWidth: 820,
            }}
          >
            YOUR LOCAL FOR SPORT,{' '}
            <span style={{ color: 'var(--gold-500)' }}>FOOD & ATMOSPHERE</span>
          </h1>

          {/* Sub */}
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 19,
              color: 'var(--cream-100)',
              marginBottom: 36,
              maxWidth: 540,
              lineHeight: 1.6,
            }}
          >
            {companyProfile?.description || "Great food, cold drinks and every big match on the big screens. Open daily — pull up a stool."}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            <a
              href="#contact"
              onClick={(e) => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="hw-btn-warm"
            >
              Reserve a Table
            </a>
            <a
              href="#menu"
              onClick={(e) => { e.preventDefault(); document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="hw-btn-outline"
            >
              View the Menu
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const TriadStrip = () => (
  <div
    style={{
      background: 'var(--gold-500)',
      padding: '16px 28px',
      textAlign: 'center',
    }}
  >
    <span
      style={{
        fontFamily: 'var(--font-condensed)',
        fontWeight: 700,
        fontSize: 18,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--ink-900)',
      }}
    >
      ★ Great Food · Cold Drinks · Live Sport ★
    </span>
  </div>
);

const About = () => {
  const images = {
    pub: "/assets/roast-food.jpg",
    staff: "/assets/weekend-roasts.jpg"
  };

  return (
    <section id="about" style={{ background: 'var(--ink-800)', padding: '80px 24px', overflow: 'hidden' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }} className="grid md:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div style={{ marginBottom: 8 }}>
            <span className="hw-badge hw-badge-gold">Our Story</span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 4vw, 48px)',
              color: 'var(--cream-50)',
              textTransform: 'uppercase',
              margin: '12px 0 24px',
            }}
          >
            Welcome to Hemingways
          </h2>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--cream-100)', lineHeight: 1.75, marginBottom: 16 }}>
            Hemingways is Jomtien's biggest expat sports bar and restaurant. We pride ourselves on being a cornerstone of the local community, offering a warm and welcoming atmosphere for residents and visitors alike.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: 32 }}>
            With our British management and professional English speaking staff, we provide a familiar and friendly service that makes every visit special. Whether you're here to catch the big game on one of our 15 screens, enjoy quality draught beer, or indulge in our famous pub favorites — you'll always find a great spot at Hemingway's.
          </p>
          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: <UtensilsIcon size={20} />, title: 'Famous Pub Food', desc: 'Quality Western & Thai' },
              { icon: <Users size={20} />, title: 'Community Hub', desc: 'Expat Friendly Environment' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ background: 'var(--ink-600)', borderRadius: 'var(--radius-md)', padding: 10, color: 'var(--gold-500)', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 15, color: 'var(--cream-50)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.title}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, position: 'relative' }}>
          <motion.div whileHover={{ scale: 1.02 }} style={{ paddingTop: 48 }}>
            <FirebaseImage
              src={normalizeImageUrl(images.pub)}
              alt="Hemingways Pub"
              className="w-full"
              style={{ borderRadius: 'var(--radius-md)', aspectRatio: '4/5', objectFit: 'cover', boxShadow: 'var(--shadow-card)', border: `1px solid var(--border)` }}
            />
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }}>
            <FirebaseImage
              src={normalizeImageUrl(images.staff)}
              alt="Hemingways Staff"
              className="w-full"
              style={{ borderRadius: 'var(--radius-md)', aspectRatio: '4/5', objectFit: 'cover', boxShadow: 'var(--shadow-card)', border: `1px solid var(--border)` }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Features = () => {
  const features = [
    {
      icon: <Users size={22} />,
      title: "British Management",
      desc: "Friendly English speaking staff and management team ensuring top-quality service."
    },
    {
      icon: <UtensilsIcon size={22} />,
      title: "Famous Pub Food",
      desc: "Our quality western menu and traditional Thai food are local favorites."
    },
    {
      icon: <Zap size={22} />,
      title: "15 Screen TVs",
      desc: "Catch every sport from around the world on our crystal clear displays."
    },
    {
      icon: <Droplets size={22} />,
      title: "Draught Beers",
      desc: "Wide selection of your favorite draught beers and ciders served cold."
    }
  ];

  return (
    <section id="features" style={{ background: 'var(--ink-800)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        <div className="grid md:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="hw-card"
              style={{ padding: 28 }}
            >
              <div style={{ background: 'var(--ink-600)', borderRadius: 'var(--radius-md)', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, color: 'var(--gold-500)' }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 18, color: 'var(--cream-50)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {f.title}
              </h3>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

type Language = 'en' | 'zh' | 'ru' | 'th';

const Menu = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setCategoryList(cats);
    }, (err) => {
      console.warn("Categories listener error:", err.message);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "menu"),
      where("published", "==", true)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const menuItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MenuItem[];

      const sortedItems = menuItems.sort((a, b) => (a.order || 0) - (b.order || 0));

      setItems(sortedItems);
      if (sortedItems.length > 0 && !activeCategory) {
        const availableCats = categoryList.length > 0
          ? categoryList.filter(c => c.name !== "More Add Ons")
          : [];

        const firstCat = availableCats.length > 0
          ? availableCats.find(c => sortedItems.some(i => i.category === c.name))?.name || sortedItems.find(i => i.category !== "More Add Ons")?.category || sortedItems[0].category
          : sortedItems.find(i => i.category !== "More Add Ons")?.category || sortedItems[0].category;

        setActiveCategory(firstCat);
      }
    }, (err) => {
      console.warn("Menu listener error:", err.message);
    });
    return () => unsubscribe();
  }, [categoryList]);

  const categories = useMemo(() => {
    let cats: string[] = [];
    if (categoryList.length > 0) {
      cats = categoryList.map(c => c.name);
    } else {
      cats = Array.from(new Set<string>(items.map(item => item.category))).sort();
    }
    return cats.filter(cat => cat !== "More Add Ons");
  }, [items, categoryList]);

  const filteredItems = useMemo(() => {
    return items.filter(item => item.category === activeCategory);
  }, [items, activeCategory]);

  const getLocalizedName = (item: MenuItem) => {
    switch (language) {
      case 'zh': return item.name_chinese || item.name;
      case 'ru': return item.name_russian || item.name;
      case 'th': return item.name_thai || item.name;
      default: return item.name;
    }
  };

  const getLocalizedDesc = (item: MenuItem) => {
    switch (language) {
      case 'zh': return item.description_chinese || item.description || "";
      case 'ru': return item.description_russian || item.description || "";
      case 'th': return item.description_thai || item.description || "";
      default: return item.description || "";
    }
  };

  const renderPrice = (item: MenuItem) => {
    const extraPriceData = [
      { price: item.price2, label: item.price2Label },
      { price: item.price3, label: item.price3Label },
      { price: item.price4, label: item.price4Label }
    ].filter(p => p.price && p.price.trim() !== '');

    if (extraPriceData.length > 0) {
      const formattedOptions = extraPriceData.map((p) => {
        const labelText = p.label ? p.label.trim() : "";
        const cleanPrice = p.price!.trim().replace('฿', '');
        return `${labelText} ฿${cleanPrice}`.trim();
      });

      return (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid var(--border)`, fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16, color: 'var(--gold-400)' }}>
          {formattedOptions.join(' ')}
        </div>
      );
    }

    return null;
  };

  const langs = [
    { code: 'en', label: 'EN' },
    { code: 'zh', label: '中文' },
    { code: 'ru', label: 'RU' },
    { code: 'th', label: 'TH' },
  ];

  return (
    <section id="menu" style={{ background: 'var(--ink-850)', padding: '80px 24px', minHeight: '60vh' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, gap: 24 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: 8 }}>
              GOOD FOOD, SERVED ALL DAY
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(40px, 5vw, 64px)',
                color: 'var(--cream-50)',
                textTransform: 'uppercase',
                margin: 0,
                lineHeight: 1,
              }}
            >
              THE MENU
            </h2>
          </div>

          {/* Language switcher */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--ink-700)', padding: 4, borderRadius: 'var(--radius-md)', border: `1px solid var(--border)` }}>
            {langs.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code as Language)}
                style={{
                  padding: '8px 14px',
                  background: language === lang.code ? 'var(--gold-500)' : 'transparent',
                  color: language === lang.code ? 'var(--ink-900)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-condensed)',
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category tabs — sticky */}
        <div
          style={{
            position: 'sticky',
            top: 64,
            zIndex: 10,
            background: 'var(--ink-800)',
            borderBottom: `1px solid var(--border)`,
            marginBottom: 40,
            marginLeft: -24,
            marginRight: -24,
            padding: '0 24px',
          }}
        >
          <div style={{ display: 'flex', overflowX: 'auto', gap: 0 }} className="no-scrollbar">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '14px 20px',
                    background: 'transparent',
                    color: isActive ? 'var(--gold-400)' : 'var(--text-muted)',
                    border: 'none',
                    borderBottom: isActive ? `2px solid var(--gold-500)` : '2px solid transparent',
                    fontFamily: 'var(--font-condensed)',
                    fontWeight: 600,
                    fontSize: 13,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.15s ease, border-color 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu items */}
        <motion.div
          key={activeCategory + language}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-0"
        >
          {filteredItems.map((item, idx) => (
            <MenuItemCard
              key={item.id || idx}
              item={item}
              language={language}
              getLocalizedName={getLocalizedName}
              getLocalizedDesc={getLocalizedDesc}
              renderPrice={renderPrice}
            />
          ))}
        </motion.div>

        {filteredItems.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 24px',
              border: `2px dashed var(--border)`,
              borderRadius: 'var(--radius-md)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-muted)' }}>No items found in this category.</p>
          </div>
        )}
      </div>
    </section>
  );
};

const Location = ({ companyProfile }: { companyProfile: CompanyProfile | null }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <section id="location" style={{ background: 'var(--ink-900)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }} className="grid md:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 460, boxShadow: 'var(--shadow-card)', border: `1px solid var(--border)`, position: 'relative' }}
        >
          {companyProfile?.mapEmbedUrl ? (
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={companyProfile.mapEmbedUrl}
            />
          ) : apiKey && apiKey !== 'undefined' ? (
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=place_id:${companyProfile?.googlePlaceId || "ChIJ5_lFroqWAjER6HN3niniP9o"}`}
            />
          ) : (
            <iframe
              title="Hemingway's Jomtien location"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(companyProfile?.address || "Hemingway's Jomtien, Jomtien Sai 2 Rd, Pattaya City, Chon Buri 20150")}&output=embed`}
            />
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div style={{ marginBottom: 8 }}>
            <span className="hw-badge hw-badge-teal">Find Us</span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 4vw, 52px)',
              color: 'var(--cream-50)',
              textTransform: 'uppercase',
              margin: '12px 0 36px',
            }}
          >
            VISIT US
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {[
              { icon: <MapPin size={20} />, label: 'Address', value: companyProfile?.address || "Hemingway's Jomtien, Jomtien Sai 2 Rd, Pattaya City, Chon Buri 20150" },
              { icon: <Phone size={20} />, label: 'Phone', value: companyProfile?.phone || "+6664 620 9225" },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ background: 'var(--ink-700)', borderRadius: 'var(--radius-md)', padding: 10, color: 'var(--gold-500)', flexShrink: 0, border: `1px solid var(--border)` }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--cream-100)' }}>{item.value}</p>
                </div>
              </div>
            ))}

            {/* Hours */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ background: 'var(--ink-700)', borderRadius: 'var(--radius-md)', padding: 10, color: 'var(--gold-500)', flexShrink: 0, border: `1px solid var(--border)` }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Hours</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--cream-100)' }}>
                  <p>Open Daily · 9:30 AM – 12:00 AM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social */}
          <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
            <a
              href={companyProfile?.socialLinks?.facebook || "https://www.facebook.com/hemingwaysjomtien"}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: 'var(--ink-700)', border: `1px solid var(--border)`, borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-500)', transition: 'border-color 0.2s ease' }}
            >
              <Facebook size={20} />
            </a>
            <a
              href={companyProfile?.socialLinks?.instagram || "https://www.instagram.com/hemingwaysjomtien"}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: 'var(--ink-700)', border: `1px solid var(--border)`, borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-500)', transition: 'border-color 0.2s ease' }}
            >
              <Instagram size={20} />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Footer = ({ companyProfile }: { companyProfile: CompanyProfile | null }) => {
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Best-effort record in Firestore; the actual notification is the email below.
      addDoc(collection(db, 'contact_submissions'), {
        ...formState,
        createdAt: new Date().toISOString(),
        source: 'website_footer',
      }).catch(err => console.error("Error saving contact form to Firestore:", err));

      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      setSubmitted(true);
      toast.success("Thank you! We'll be in touch soon. — Hemingways Jomtien");
      setFormState({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Error sending contact form:", error instanceof Error ? error.message : 'Unknown error');
      toast.error("Failed to send message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-condensed)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <footer id="contact" style={{ background: 'var(--ink-900)' }}>
      {/* Top rule strip */}
      <div style={{ borderTop: `1px solid var(--border)`, borderBottom: `1px solid var(--border)`, padding: '14px 24px', textAlign: 'center' }}>
        <span style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--gold-500)' }}>★</span> Good Food · Cold Drinks · Great Times <span style={{ color: 'var(--gold-500)' }}>★</span>
        </span>
      </div>

      <div style={{ maxWidth: 'var(--container)', margin: '0 auto', padding: '64px 24px' }} className="grid md:grid-cols-3 gap-12">
        {/* Col 1: Logo + social */}
        <div>
          <img src="/assets/logo/hemingways-logo-white.png" height={40} alt="Hemingways Jomtien" style={{ height: 40, width: 'auto', marginBottom: 16 }} />
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24, maxWidth: 260 }}>
            {companyProfile?.description || "Jomtien's biggest expat sports bar and restaurant. Quality food, cold beer, and all your favourite sports on 15 screens."}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={companyProfile?.socialLinks?.facebook || "https://www.facebook.com/hemingwaysjomtien"}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: 'var(--ink-700)', border: `1px solid var(--border)`, borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-500)' }}
            >
              <Facebook size={18} />
            </a>
            <a
              href={companyProfile?.socialLinks?.instagram || "https://www.instagram.com/hemingwaysjomtien"}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: 'var(--ink-700)', border: `1px solid var(--border)`, borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-500)' }}
            >
              <Instagram size={18} />
            </a>
          </div>
        </div>

        {/* Col 2: Find Us */}
        <div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: 20 }}>
            Find Us
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <MapPin size={15} style={{ color: 'var(--gold-500)', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {companyProfile?.address || "Hemingway's Jomtien, Jomtien Sai 2 Rd, Pattaya City, Chon Buri 20150"}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Phone size={15} style={{ color: 'var(--gold-500)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>
                {companyProfile?.phone || "+6664 620 9225"}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={15} style={{ color: 'var(--gold-500)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>Open Daily · 9:30 AM – 12:00 AM</span>
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: 14 }}>
              Explore
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Home', id: null },
                { label: 'Food Menu', id: 'menu' },
                { label: 'Sports Schedule', id: 'sports' },
                { label: 'Daily Specials', id: 'specials' },
                { label: 'Location', id: 'location' },
              ].map((link) => (
                <a
                  key={link.label}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (link.id) document.getElementById(link.id)?.scrollIntoView({ behavior: 'smooth' });
                    else window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  {link.label}
                </a>
              ))}
              <Link
                to="/menu"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Digital Menu
              </Link>
              <Link
                to="/blog"
                onClick={() => window.scrollTo(0, 0)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Blog
              </Link>
              <Link
                to="/contact-us"
                onClick={() => window.scrollTo(0, 0)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Contact Us
              </Link>
              <Link
                to="/careers"
                onClick={() => window.scrollTo(0, 0)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Careers
              </Link>
            </div>
          </div>
        </div>

        {/* Col 3: Contact form */}
        <div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: 20 }}>
            Get in Touch
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Reservations, group bookings, or just a quick question — drop us a message.
          </p>
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input
                className="hw-input"
                type="text"
                placeholder="Your name"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                className="hw-input"
                type="email"
                placeholder="your@email.com"
                value={formState.email}
                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Message</label>
              <textarea
                className="hw-input"
                placeholder="Your message..."
                rows={3}
                value={formState.message}
                onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                style={{ resize: 'vertical' }}
              />
            </div>
            <button
              type="submit"
              className="hw-btn-warm"
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: `1px solid var(--border)`, padding: '16px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-faint)' }}>
          © {new Date().getFullYear()} Hemingways Jomtien · Restaurant & Bar · Also now on Grab Food
        </p>
      </div>
    </footer>
  );
};

const SportsSchedule = () => {
  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "sports_schedule"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sportsEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SportsEvent[];
      setEvents(sportsEvents);
      setLoading(false);
    }, (err) => {
      console.warn("Sports schedule listener error:", err.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return null;
  if (events.length === 0) return null;

  return (
    <section id="sports" style={{ background: 'var(--ink-900)', padding: '80px 24px', overflow: 'hidden' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        {/* Heading */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 5vw, 60px)',
              color: 'var(--cream-50)',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            LIVE SPORT{' '}
            <span style={{ color: 'var(--gold-500)' }}>TODAY</span>
          </h2>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--text-muted)', marginTop: 12 }}>
            Catch all the action on our 15 big screens.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 860, margin: '0 auto' }}>
          {events.map((event, idx) => (
            <motion.div
              key={event.id || idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              viewport={{ once: true }}
              className="hw-card"
              style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}
            >
              {/* Time */}
              <div style={{ minWidth: 80, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 20, color: 'var(--gold-400)' }}>{event.time}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{event.date}</div>
              </div>

              <div style={{ width: 1, height: 36, background: 'var(--border)', flexShrink: 0 }} className="hidden md:block" />

              {/* Event info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 18, color: 'var(--cream-50)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{event.event}</div>
                {event.comp && (
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{event.comp}</div>
                )}
              </div>

              {/* Live badge */}
              <span className="hw-badge hw-badge-live" style={{ flexShrink: 0 }}>
                <span
                  className="hw-pulse"
                  style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--cream-50)', display: 'inline-block', flexShrink: 0 }}
                />
                LIVE
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Specials = () => {
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "specials"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Special[];
      setSpecials(items);
      setLoading(false);
    }, (err) => {
      console.warn("Specials listener error:", err.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return null;
  if (specials.length === 0) return null;

  return (
    <section id="specials" style={{ background: 'var(--ink-850)', padding: '80px 24px', overflow: 'hidden' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal-500)', marginBottom: 10 }}>
            Chef's Recommendations
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 5vw, 56px)',
              color: 'var(--cream-50)',
              textTransform: 'uppercase',
              margin: '0 0 12px',
            }}
          >
            DAILY SPECIALS
          </h2>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--text-muted)' }}>
            Freshly prepared favorites at unbeatable prices.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specials.map((special, idx) => (
            <motion.div
              key={special.id || idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="hw-card hw-card-interactive"
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {/* Image */}
              <div style={{ position: 'relative', height: 220, overflow: 'hidden', background: 'var(--ink-800)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FirebaseImage
                  src={normalizeImageUrl(special.image || "/logo.png")}
                  alt={special.name}
                  className="w-full h-full"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.5s ease' }}
                />
                {/* Price stamp */}
                {special.price && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      background: 'var(--red-500)',
                      color: 'var(--cream-50)',
                      fontFamily: 'var(--font-condensed)',
                      fontWeight: 700,
                      fontSize: 16,
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    ฿{special.price}
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ padding: '20px 20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-condensed)',
                    fontWeight: 600,
                    fontSize: 22,
                    color: 'var(--cream-50)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: 8,
                  }}
                >
                  {special.name}
                </h3>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.65, flex: 1 }}>
                  {special.description}
                </p>
                {special.endDate && (
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', marginTop: 14, paddingTop: 12, borderTop: `1px solid var(--border)` }}>
                    Available until {special.endDate}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Reviews = () => {
  const customReviews = [
    {
      author_name: "Noohin",
      rating: 5,
      text: "Me & my husband love to come have drinks and get dinner here so much! Delicious food, friendly staff and a cosy place. Nice restaurant with a quiz game every Monday night. And they make so, so good mojitos here. Love it!",
      relative_time_description: "Google review",
      profile_photo_url: ""
    },
    {
      author_name: "Darren Whitehead",
      rating: 5,
      text: "Very beautiful, inviting interior and decor with comfortable seating. Super friendly staff from entry to ordering. Had the Wagyu cheese and bacon burger \u2014 outstanding. I'd go as far as saying the best burger I have had in Pattaya. A comfortable, warm and welcoming atmosphere, and I look forward to my next visit.",
      relative_time_description: "Google review",
      profile_photo_url: ""
    },
    {
      author_name: "Sean Maccarthy",
      rating: 5,
      text: "Perfect venue. One of the best Sunday roasts I have had. Wagyu beef is delicious. Rob is a wonderful manager who also helps the local charity Father Ray Foundation.",
      relative_time_description: "Google review",
      profile_photo_url: ""
    }
  ];

  const reviewsToDisplay = customReviews;

  return (
    <section style={{ background: 'var(--ink-800)', padding: '80px 24px', overflow: 'hidden' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: 10 }}>
            Guest Feedback
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 4vw, 52px)',
              color: 'var(--cream-50)',
              textTransform: 'uppercase',
              margin: '0 0 14px',
            }}
          >
            WHAT OUR GUESTS SAY
          </h2>
          {/* Review volume */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>1000+ Google reviews</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviewsToDisplay.slice(0, 3).map((review, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="hw-card"
              style={{ padding: '28px 24px', position: 'relative' }}
            >
              <Quote
                style={{ position: 'absolute', top: 18, right: 18, color: 'var(--ink-500)', opacity: 0.6 }}
                size={36}
              />

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--ink-600)', border: `1px solid var(--border)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16, color: 'var(--gold-400)', flexShrink: 0 }}>
                  {review.author_name[0]}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 15, color: 'var(--cream-50)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{review.author_name}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-faint)', marginTop: 1 }}>{review.relative_time_description}</div>
                </div>
              </div>

              {/* Stars */}
              <div style={{ display: 'flex', color: 'var(--gold-400)', marginBottom: 12 }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} fill={i < review.rating ? "currentColor" : "none"} />
                ))}
              </div>

              {/* Text */}
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                "{review.text.length > 200 ? review.text.substring(0, 200) + '...' : review.text}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ContactUs = ({ companyProfile }: { companyProfile: CompanyProfile | null }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phone = companyProfile?.phone || "+6664 620 9225";
  const email = companyProfile?.email || "info@hemingwaysjomtien.com";
  const address = companyProfile?.address || "Hemingway's Jomtien, Jomtien Sai 2 Rd, Pattaya City, Chon Buri 20150";

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Contact Us | Hemingways Jomtien";
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      addDoc(collection(db, 'contact_submissions'), {
        ...formState,
        createdAt: new Date().toISOString(),
        source: 'contact_us_page',
      }).catch(err => console.error("Error saving contact form to Firestore:", err));

      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      toast.success("Thank you! We'll be in touch soon. — Hemingways Jomtien");
      setFormState({ name: '', email: '', message: '' });
    } catch (error) {
      console.error("Error sending contact form:", error instanceof Error ? error.message : 'Unknown error');
      toast.error("Failed to send message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-condensed)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: 6,
  };

  const cardTitle: React.CSSProperties = {
    fontFamily: 'var(--font-condensed)',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--gold-500)',
    marginBottom: 20,
  };

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  const socials = [
    { icon: <Facebook size={20} />, href: companyProfile?.socialLinks?.facebook || "https://www.facebook.com/hemingwaysjomtien", label: 'Facebook' },
    { icon: <Instagram size={20} />, href: companyProfile?.socialLinks?.instagram || "https://www.instagram.com/hemingwaysjomtien", label: 'Instagram' },
    ...(companyProfile?.socialLinks?.tripAdvisor ? [{ icon: <Globe size={20} />, href: companyProfile.socialLinks.tripAdvisor, label: 'TripAdvisor' }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-850)' }}>
      {/* Header */}
      <section style={{ background: 'var(--ink-900)', padding: '140px 24px 64px' }}>
        <div style={{ maxWidth: 'var(--container)', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: 12 }}>
            <span className="hw-badge hw-badge-teal">Get in Touch</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 5vw, 58px)', color: 'var(--cream-50)', textTransform: 'uppercase', margin: '0 0 14px' }}>
            Contact Us
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--text-muted)', maxWidth: 620, margin: '0 auto', lineHeight: 1.7 }}>
            Reservations, group bookings, private events or just a quick question — call us, message us, or drop in. We're on Jomtien Sai 2, and we're open every day.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="hw-btn-warm" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px' }}>
              <Phone size={16} /> Call {phone}
            </a>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', border: `1px solid var(--border)`, borderRadius: 'var(--radius-md)', color: 'var(--cream-50)', textDecoration: 'none', fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <MapPin size={16} /> Get Directions
            </a>
          </div>
        </div>
      </section>

      {/* Details + form */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }} className="grid md:grid-cols-2 gap-10">
          {/* Left: details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="hw-card" style={{ padding: '28px 24px' }}>
              <div style={cardTitle}>Contact Details</div>
              {[
                { icon: <Phone size={18} />, label: 'Phone', value: phone, href: `tel:${phone.replace(/\s/g, '')}` },
                { icon: <MessageCircle size={18} />, label: 'Email', value: email, href: `mailto:${email}` },
                { icon: <MapPin size={18} />, label: 'Address', value: address, href: directionsUrl },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.label === 'Address' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', textDecoration: 'none', borderBottom: `1px solid var(--border)` }}
                >
                  <span style={{ color: 'var(--gold-500)', marginTop: 2 }}>{item.icon}</span>
                  <span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{item.label}</span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--cream-50)', marginTop: 2, lineHeight: 1.5 }}>{item.value}</span>
                  </span>
                </a>
              ))}

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                {socials.map((sc) => (
                  <a
                    key={sc.label}
                    href={sc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={sc.label}
                    style={{ background: 'var(--ink-700)', border: `1px solid var(--border)`, borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-500)' }}
                  >
                    {sc.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Opening hours */}
            <div className="hw-card" style={{ padding: '28px 24px' }}>
              <div style={{ ...cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={15} /> Opening Hours
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--cream-50)', margin: 0 }}>Open Daily · 9:30 AM – 12:00 AM</p>
            </div>

            {/* Getting here */}
            <div className="hw-card" style={{ padding: '28px 24px' }}>
              <div style={cardTitle}>Getting Here</div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 16 }}>
                We're on Jomtien Sai 2 Road, a few minutes from Jomtien Beach and around 15 minutes from central Pattaya. Parking is available, and any taxi or Bolt driver will know the road — just say "Hemingways, Jomtien Sai Song".
              </p>
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="hw-btn-warm" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} /> Open in Google Maps
              </a>
            </div>
          </div>

          {/* Right: form + map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="hw-card" style={{ padding: '28px 24px' }}>
              <div style={cardTitle}>Send Us a Message</div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input
                    className="hw-input"
                    type="text"
                    placeholder="Your name"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    className="hw-input"
                    type="email"
                    placeholder="your@email.com"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Message</label>
                  <textarea
                    className="hw-input"
                    placeholder="Table for 4 on Sunday, a group booking, an event enquiry..."
                    rows={5}
                    value={formState.message}
                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <button
                  type="submit"
                  className="hw-btn-warm"
                  disabled={isSubmitting}
                  style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>

            <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 380, border: `1px solid var(--border)`, boxShadow: 'var(--shadow-card)' }}>
              {companyProfile?.mapEmbedUrl ? (
                <iframe title="Hemingways Jomtien map" width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" src={companyProfile.mapEmbedUrl} />
              ) : apiKey && apiKey !== 'undefined' ? (
                <iframe title="Hemingways Jomtien map" width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=place_id:${companyProfile?.googlePlaceId || "ChIJ5_lFroqWAjER6HN3niniP9o"}`} />
              ) : (
                <iframe title="Hemingways Jomtien map" width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`} />
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer companyProfile={companyProfile} />
    </div>
  );
};

const MainSite = ({ isAdmin, businessInfo, companyProfile }: { isAdmin: boolean, businessInfo: BusinessInfo | null, companyProfile: CompanyProfile | null }) => (
  <div style={{ minHeight: '100vh' }}>
    <Hero companyProfile={companyProfile} />
    <TriadStrip />
    <Features />
    <About />
    <Menu />
    <Specials />
    <SportsSchedule />
    <Reviews />
    <LatestPosts />
    <Location companyProfile={companyProfile} />
    <Footer companyProfile={companyProfile} />
  </div>
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Router>
      <Toaster position="top-center" richColors />
      <AppContent
        user={user}
        setUser={setUser}
        businessInfo={businessInfo}
        setBusinessInfo={setBusinessInfo}
        companyProfile={companyProfile}
        setCompanyProfile={setCompanyProfile}
        error={error}
        setError={setError}
      />
    </Router>
  );
}

function AppContent({ user, setUser, businessInfo, setBusinessInfo, companyProfile, setCompanyProfile, error, setError }: any) {
  const location = useLocation();

  // Legacy support: old HashRouter URLs (/#/menu, /#/staff, ...) -> real paths.
  // Also keeps the old /digitalmenu entry point working.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/')) {
      const target = hash.slice(1); // '#/menu' -> '/menu'
      window.location.replace(target);
      return;
    }
    if (window.location.pathname === '/digitalmenu') {
      window.location.replace('/menu');
    }
  }, []);

  const isDigitalMenu = location.pathname === "/menu" || location.pathname === "/digital-menu";
  const isDashboard = location.pathname.startsWith("/dashboard") || location.pathname === "/import";
  const isStaffApp = location.pathname === "/expense" || location.pathname === "/staff";

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const isHardcodedSuperAdmin = user.email?.toLowerCase() === "shaneruddle@gmail.com";
    const hasSuperAdminRole = user.role === 'super_admin';
    return isHardcodedSuperAdmin || hasSuperAdminRole;
  }, [user]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const isHardcodedAdmin = user.email?.toLowerCase() === "info@hemingwaysjomtien.com";
    const hasAdminRole = user.role === 'admin';
    return isSuperAdmin || isHardcodedAdmin || hasAdminRole;
  }, [user, isSuperAdmin]);

  const isManager = useMemo(() => {
    return isAdmin || user?.role === 'manager';
  }, [user, isAdmin]);

  const isMarketing = useMemo(() => {
    return isManager || user?.role === 'marketing';
  }, [user, isManager]);

  const isStaff = useMemo(() => {
    return isAdmin || ['cashier', 'marketing'].includes(user?.role || '');
  }, [user, isAdmin]);

  const isCashierOnly = useMemo(() => {
    return user?.role === 'cashier';
  }, [user]);

  const isEmployee = useMemo(() => {
    return user?.role === 'employee';
  }, [user]);

  const navigate = useNavigate();

  useEffect(() => {
    if (user && isCashierOnly && !isStaffApp) {
      navigate("/staff");
    }
  }, [user, isCashierOnly, isStaffApp, navigate]);

  useEffect(() => {
    fetchPlaceDetails(PLACE_ID)
      .then((info) => {
        if (info) {
          setBusinessInfo(info);
          setError(null);
        } else {
          setError("Could not fetch business details. Please check your API key configuration.");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch business info:", err);
        setError(err.message || "An unexpected error occurred while fetching business details.");
      });

    // Fetch Company Profile
    const unsubscribe = onSnapshot(doc(db, 'companyProfile', 'config'), (snapshot) => {
      try {
        if (snapshot.exists()) {
          setCompanyProfile(snapshot.data() as CompanyProfile);
        }
      } catch (err) {
        console.error("Error processing company profile snapshot:", err);
      }
    }, (err) => {
      console.warn("Company profile listener permission or access issue:", err.message);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-850)' }}>
      {isEmployee && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--ink-850)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: 'var(--ink-700)', border: `1px solid var(--border)`, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-500)', marginBottom: 20 }}>
            <Users size={36} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--cream-50)', textTransform: 'uppercase', marginBottom: 8 }}>Employee Portal</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-muted)', marginBottom: 28, maxWidth: 320 }}>Your account is pending approval. Please contact an administrator.</p>
          <button
            onClick={() => signOut(auth)}
            className="hw-btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      )}

      {!isDigitalMenu && !isDashboard && !isStaffApp && !isEmployee && (
        <Navbar canAccessDashboard={isMarketing} setUser={setUser} companyProfile={companyProfile} />
      )}

      {isAdmin && error && !isDigitalMenu && (
        <div style={{ paddingTop: 96, paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ maxWidth: 'var(--container)', margin: '0 auto', background: 'rgba(225,30,21,0.12)', border: `1px solid rgba(225,30,21,0.3)`, color: 'var(--red-400)', padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontFamily: 'var(--font-sans)' }}>
            <Settings size={15} />
            <span><strong>Admin Notice:</strong> {error}</span>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={isCashierOnly ? <Navigate to="/staff" replace /> : <MainSite isAdmin={isAdmin} businessInfo={businessInfo} companyProfile={companyProfile} />} />
        <Route path="/menu" element={isCashierOnly ? <div style={{ height: '100vh', background: 'var(--ink-850)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Access Denied</div> : <DigitalMenuDisplay />} />
        <Route path="/digital-menu" element={isCashierOnly ? <div style={{ height: '100vh', background: 'var(--ink-850)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Access Denied</div> : <DigitalMenuDisplay />} />
        <Route path="/expense" element={<Navigate to="/staff" replace />} />
        <Route path="/staff" element={isStaff ? <StaffPortal /> : <Navigate to="/" replace />} />

        {/* Dashboard Routes with Sidebar Layout */}
        <Route path="/dashboard" element={isMarketing ? <DashboardLayout user={user} /> : <div style={{ paddingTop: 128, textAlign: 'center', height: '100vh', background: 'var(--ink-850)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>Access Denied. <Auth onUserChange={setUser} /></div>}>
          <Route index element={isMarketing ? <Dashboard /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
          <Route path="categories" element={isMarketing ? <CategoriesDashboard /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
          <Route path="finance" element={isManager ? <FinanceDashboard user={user} /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
          <Route path="finance/import" element={isManager ? <BulkFinanceImport /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
          <Route path="users" element={isManager ? <UserManagement isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
          <Route path="loyalty" element={isManager ? <LoyaltyDashboard /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
          <Route path="specials" element={isMarketing ? <SpecialsDashboard /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
          <Route path="drinks" element={isMarketing ? <DrinksDashboard /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
          <Route path="images" element={isMarketing ? <ImageManagement /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
          <Route path="blog" element={isMarketing ? <BlogDashboard /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
          <Route path="careers" element={isManager ? <CareersDashboard user={user} /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
          <Route path="profile" element={isMarketing ? <CompanyProfileDashboard /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
          <Route path="logs" element={isManager ? <SystemLogs /> : <div style={{ padding: 80, textAlign: 'center' }}>Access Denied</div>} />
        </Route>

        <Route path="/import" element={isMarketing ? <BulkImport /> : <div style={{ paddingTop: 128, textAlign: 'center', height: '100vh', background: 'var(--ink-850)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>Access Denied. Please login as admin. <Auth onUserChange={setUser} /></div>} />
        <Route path="/contact-us" element={<ContactUs companyProfile={companyProfile} />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/careers" element={<CareersList />} />
        <Route path="/careers/:jobId" element={<CareersJobPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
      </Routes>

      {!isDigitalMenu && ((!isDashboard && !isStaffApp) || !user) && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 60 }}>
          <Auth onUserChange={setUser} />
        </div>
      )}

      {isStaffApp && !user && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--ink-850)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: 'var(--ink-700)', border: `1px solid var(--border)`, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-500)', marginBottom: 20 }}>
            <Settings size={36} style={{ animation: 'spin 2s linear infinite' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--cream-50)', textTransform: 'uppercase', marginBottom: 8 }}>Staff Portal</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-muted)', marginBottom: 28 }}>Please login to enter expenses</p>
          <Auth onUserChange={setUser} />
        </div>
      )}
    </div>
  );
}
