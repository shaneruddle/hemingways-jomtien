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
  HashRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate,
  useLocation,
  Navigate
} from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
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
import BulkImport from "./components/BulkImport";
import DigitalMenu from "./components/DigitalMenu";
import DigitalMenuDisplay from "./components/DigitalMenuDisplay";
import FinanceDashboard from "./components/finance/FinanceDashboard";
import BulkFinanceImport from "./components/finance/BulkFinanceImport";
import ExpenseEntry from "./components/finance/ExpenseEntry";
import DashboardLayout from "./components/DashboardLayout";
import UserManagement from "./components/UserManagement";
import ImageManagement from "./components/ImageManagement";
import SystemLogs from "./components/SystemLogs";
import LoyaltyDashboard from "./components/LoyaltyDashboard";
import CompanyProfileDashboard from "./components/CompanyProfileDashboard";
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
    { name: "Contact", href: "contact" },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsOpen(false);
    if (href === '/') {
      if (location.pathname === '/') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const sectionId = href;
    if (location.pathname !== '/') {
      // Just let the browser navigate to home then hash if needed
      // Actually navigate manually to ensure hash router works
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

  return (
    <nav className={`${isDashboard ? "sticky top-0 bg-white border-b border-gray-100 py-3 shadow-sm" : "fixed top-0 w-full transition-all duration-300 " + (scrolled ? "bg-navy shadow-md py-3" : "bg-transparent py-6")} z-50 w-full`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2" onClick={() => { setIsOpen(false); window.scrollTo(0, 0); }}>
            <UtensilsIcon className={scrolled || isDashboard ? "text-gold" : "text-white"} size={24} />
            <span className={`font-display font-bold text-xl tracking-tight ${scrolled || isDashboard ? "text-white" : "text-white"}`}>
              {companyProfile?.name.split(' ')[0] || "HEMINGWAYS"} <span className="text-gold">{companyProfile?.name.split(' ').slice(1).join(' ') || "JOMTIEN"}</span>
            </span>
          </Link>
        </div>
        
        <div className="hidden lg:flex space-x-6 items-center">
          {!isDashboard ? (
            <>
              {navLinks.map((item) => (
                <a 
                  key={item.name} 
                  href={item.href === '/' ? '#top' : `#${item.href}`}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`text-sm font-bold uppercase tracking-wider hover:text-gold transition-colors ${scrolled ? "text-white" : "text-white"}`}
                >
                  {item.name}
                </a>
              ))}
              {canAccessDashboard && (
                <Link 
                  to="/dashboard" 
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all ${scrolled ? "bg-gold text-white hover:bg-white hover:text-navy" : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"}`}
                >
                  <Settings size={14} /> Dashboard
                </Link>
              )}
              <Auth onUserChange={setUser} />
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm bg-navy text-white hover:bg-gold transition-all"
              >
                <ArrowLeft size={16} /> Back to Site
              </Link>
              <Auth onUserChange={setUser} />
            </div>
          )}
        </div>

        <button className="lg:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="text-white" /> : <MenuIcon className="text-white" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-navy border-t border-white/10 overflow-hidden"
          >
            <div className={`p-6 flex flex-col space-y-4`}>
              {!isDashboard ? (
                <>
                  {navLinks.map((item) => (
                    <a 
                      key={item.name} 
                      href={item.href === '/' ? '#top' : `#${item.href}`}
                      className="text-lg font-bold text-white uppercase tracking-wider hover:text-gold"
                      onClick={(e) => handleNavClick(e, item.href)}
                    >
                      {item.name}
                    </a>
                  ))}
                  <div className="pt-4 border-t border-white/10">
                    <Auth onUserChange={setUser} />
                  </div>
                  {canAccessDashboard && (
                    <Link 
                      to="/dashboard" 
                      className="flex items-center gap-2 text-lg font-bold text-gold"
                      onClick={() => setIsOpen(false)}
                    >
                      <Settings size={18} /> Dashboard
                    </Link>
                  )}
                </>
              ) : (
                <Link 
                  to="/" 
                  className="flex items-center gap-2 text-lg font-bold text-gold"
                  onClick={() => setIsOpen(false)}
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
    <section className="relative h-[90vh] flex items-center justify-center overflow-hidden bg-navy">
      {/* Subtle Dark Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.08] pointer-events-none z-0"
        style={{ 
          backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent)`,
          backgroundSize: '8px 8px' 
        }}
      />
      
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="flex flex-col items-center"
        >
          <div className="w-20 h-2px bg-gold/50 mb-6 rounded-full" />
          <h4 className="text-gold font-bold tracking-[0.3em] uppercase mb-4 text-sm md:text-base">ESTABLISHED SINCE 2004</h4>
          <h1 className="text-5xl md:text-8xl font-display font-bold text-white mb-6 drop-shadow-2xl">
            {companyProfile?.name.split(' ')[0] || "HEMINGWAYS"} <span className="text-gold italic font-light">{companyProfile?.name.split(' ').slice(1).join(' ') || "Jomtien"}</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-medium italic tracking-widest uppercase drop-shadow-lg max-w-3xl">
            {companyProfile?.description || "Jomtien's Biggest Expat Sports Bar & Restaurant"}
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-6">
            <a href="#menu" className="navy-button flex items-center gap-2 border border-white/20 px-8 py-4 rounded-full font-bold transition-all hover:bg-white/5 active:scale-95 shadow-xl shadow-black/20">Explore Menu <ChevronRight size={18} /></a>
            <a href="#location" className="gold-button flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all hover:opacity-90 active:scale-95 shadow-xl shadow-gold/20">Find Us <MapPin size={18} /></a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const About = () => {
  const images = { 
    pub: "gs://gen-lang-client-0190564722.firebasestorage.app/assets/about_pub.webp", 
    staff: "gs://gen-lang-client-0190564722.firebasestorage.app/assets/about_staff.webp" 
  };

return (
<section id="about" className="py-24 px-6 bg-white overflow-hidden">
  <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
    >
      <h4 className="text-gold font-bold tracking-widest uppercase mb-2 text-sm">Our Story</h4>
      <h2 className="text-4xl md:text-5xl font-display font-bold mb-8 text-navy">Welcome to Hemingways</h2>
      <p className="text-lg text-gray-600 mb-6 leading-relaxed">
        Hemingway's is Jomtien's biggest expat sports bar and restaurant. We pride ourselves on being a cornerstone of the local community, offering a warm and welcoming atmosphere for residents and visitors alike.
      </p>
      <p className="text-lg text-gray-600 mb-8 leading-relaxed">
        With our English management and staff, we provide a familiar and friendly service that makes every visit special. Whether you're here to catch the big game on one of our 15 screens, enjoy some quality draught beer, or indulge in our famous pub favorites, you'll find the perfect spot at Hemingway's.
      </p>
      
      <div className="grid grid-cols-2 gap-8">
        <div className="flex items-start gap-4">
          <div className="bg-navy/5 p-3 rounded-2xl text-navy">
            <UtensilsIcon size={24} />
          </div>
          <div>
            <h4 className="font-bold text-ink">Famous Pub Food</h4>
            <p className="text-sm text-gray-500">Quality Western & Thai</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="bg-navy/5 p-3 rounded-2xl text-navy">
            <Users size={24} />
          </div>
          <div>
            <h4 className="font-bold text-ink">Community Hub</h4>
            <p className="text-sm text-gray-500">Expat Friendly Environment</p>
          </div>
        </div>
      </div>
    </motion.div>
    
    <div className="relative">
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative pt-12"
        >
          <div className="absolute inset-x-0 bottom-0 top-12 bg-gold/10 rounded-3xl -z-10 transform -rotate-3"></div>
          <FirebaseImage 
            src={normalizeImageUrl(images.pub)} 
            alt="Hemingways Pub" 
            className="rounded-3xl w-full bg-gray-100 shadow-xl border-4 border-white aspect-[4/5] object-cover"
          />
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative"
        >
          <div className="absolute inset-x-0 bottom-0 top-0 bg-navy/10 rounded-3xl -z-10 transform rotate-3"></div>
          <FirebaseImage 
            src={normalizeImageUrl(images.staff)} 
            alt="Hemingways Staff" 
            className="rounded-3xl w-full bg-gray-100 shadow-xl border-4 border-white aspect-[4/5] object-cover"
          />
        </motion.div>
      </div>
      <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gold rounded-full flex items-center justify-center text-white text-center p-4 transform rotate-12 shadow-xl z-10 border-4 border-white">
        <span className="font-display italic text-sm font-bold">Local Community Hub</span>
      </div>
    </div>
  </div>
</section>
);
};

const Features = () => {
  const features = [
    {
      icon: <Users className="text-gold" />,
      title: "English Management",
      desc: "Friendly English staff and management team ensuring top-quality service."
    },
    {
      icon: <UtensilsIcon className="text-gold" />,
      title: "Famous Pub Food",
      desc: "Our quality western menu and traditional Thai food are local favorites."
    },
    {
      icon: <Zap className="text-gold" />,
      title: "15 Screen TVs",
      desc: "Catch every sport from around the world on our crystal clear displays."
    },
    {
      icon: <Droplets className="text-gold" />,
      title: "Draught Beers",
      desc: "Wide selection of your favorite draught beers and ciders served cold."
    }
  ];

  return (
    <section id="features" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="p-8 rounded-[32px] bg-cream border border-navy/5 hover:border-gold/30 transition-all group"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-ink">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
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
  const [activeCategory, setActiveCategory] = useState("Smoothie Bowls");
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
      
      // Sort in memory to avoid needing a composite index
      const sortedItems = menuItems.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setItems(sortedItems);
      if (sortedItems.length > 0 && !activeCategory) {
        // Find the first category from the ordered list that has items, excluding "More Add Ons"
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
    // Exclude "More Add Ons" from the main landing page
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
      <div className="mt-2 pt-2 border-t border-gray-50 text-lg font-black text-gold">
        {formattedOptions.join(' ')}
      </div>
    );
  }

  return null;
};

return (
<section id="menu" className="py-24 px-6 bg-cream min-h-screen">
  <div className="max-w-7xl mx-auto">
    <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
      <div className="text-center md:text-left">
        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-navy">Premium Selection</h2>
        <p className="text-lg text-gray-600 italic">
          Authentic British Pub favorites, quality Western dishes, and traditional Thai specialties.
        </p>
      </div>
      
      <div className="flex bg-white p-1 rounded-full shadow-sm border border-gray-100 ring-1 ring-navy/5">
        {[
          { code: 'en', label: 'EN' },
          { code: 'zh', label: '中文' },
          { code: 'ru', label: 'RU' },
          { code: 'th', label: 'TH' }
        ].map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code as Language)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              language === lang.code 
              ? "bg-navy text-white shadow-md" 
              : "text-gray-400 hover:text-navy"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>

    <div className="flex flex-wrap justify-center gap-4 mb-12">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => setActiveCategory(cat)}
          className={`px-6 py-2 rounded-full font-bold text-sm tracking-tight transition-all border ${
            activeCategory === cat 
            ? "bg-navy border-navy text-white shadow-lg" 
            : "bg-white border-gray-100 text-gray-500 hover:border-gold hover:text-gold"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>

    <motion.div 
      key={activeCategory + language}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid md:grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16"
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
      <div className="text-center py-24 bg-white rounded-[32px] border-2 border-dashed border-gray-100">
        <p className="text-gray-400 italic">No items found in this category.</p>
      </div>
    )}
  </div>
</section>
);
};

const Location = ({ companyProfile }: { companyProfile: CompanyProfile | null }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  return (
    <section id="location" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-[32px] overflow-hidden h-[500px] shadow-xl relative"
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
            ></iframe>
          ) : apiKey && apiKey !== 'undefined' ? (
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=place_id:${companyProfile?.googlePlaceId || "ChIJ5_lFroqWAjER6HN3niniP9o"}`}
            ></iframe>
          ) : (
        <div className="absolute inset-0 bg-navy/10 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl text-center max-w-xs">
            <MapPin className="mx-auto text-navy mb-4" size={32} />
            <h3 className="font-bold text-lg mb-2">Find Us Here</h3>
            <p className="text-gray-600 text-sm">{companyProfile?.address || "Hemingway's Jomtien, Jomtien Sai 2 Rd, Pattaya City, Chon Buri 20150"}</p>
          </div>
        </div>
      )}
    </motion.div>

    <motion.div
      initial={{ opacity: 0, x: 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
    >
      <h2 className="text-4xl md:text-5xl font-display font-bold mb-8">Visit Us</h2>
      
      <div className="space-y-8">
        <div className="flex items-start gap-4">
          <div className="bg-cream p-3 rounded-full text-navy">
            <MapPin size={24} />
          </div>
          <div>
            <h4 className="font-bold text-lg mb-1 text-ink">Address</h4>
            <p className="text-gray-600">{companyProfile?.address || "Hemingway's Jomtien, Jomtien Sai 2 Rd, Pattaya City, Chon Buri 20150"}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-cream p-3 rounded-full text-navy">
            <Phone size={24} />
          </div>
          <div>
            <h4 className="font-bold text-lg mb-1 text-ink">Phone</h4>
            <p className="text-gray-600">{companyProfile?.phone || "+66 38 232 422"}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-cream p-3 rounded-full text-navy">
            <Clock size={24} />
          </div>
          <div>
            <h4 className="font-bold text-lg mb-1 text-ink">Hours</h4>
            <div className="text-gray-600 space-y-1">
              {companyProfile?.openingHours ? (
                Object.entries(companyProfile.openingHours).map(([day, hours]) => (
                  <p key={day} className="flex justify-between gap-4">
                    <span className="capitalize w-24">{day}</span>
                    <span>{hours}</span>
                  </p>
                ))
              ) : (
                <>
                  <p>Open Daily: 10:00 AM - 12:00 AM</p>
                  <p>Food served until 11:00 PM</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 flex gap-4">
        <a href={companyProfile?.socialLinks.facebook || "https://www.facebook.com/hemingwaysjomtien"} target="_blank" rel="noopener noreferrer" className="bg-cream p-4 rounded-full text-navy hover:bg-navy hover:text-white transition-all">
          <Facebook size={24} />
        </a>
        <a href={companyProfile?.socialLinks.instagram || "https://hemingwaysjomtien.com"} target="_blank" rel="noopener noreferrer" className="bg-cream p-4 rounded-full text-navy hover:bg-navy hover:text-white transition-all">
          <Instagram size={24} />
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
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      if (!response.ok) throw new Error('Failed to send message');
      setSubmitted(true);
      toast.success("Thank you for getting in touch! We will get back to you as soon as possible. Hemingways Jomtien");
      setFormState({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Error sending contact form:", error instanceof Error ? error.message : 'Unknown error');
      toast.error("Failed to send message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
<footer className="bg-navy text-white py-16 px-6">
  <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 text-center md:text-left">
    <div className="col-span-2">
      <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
        <UtensilsIcon className="text-gold" size={24} />
        <span className="font-display font-bold text-2xl tracking-tight">
          {companyProfile?.name.split(' ')[0] || "HEMINGWAYS"} <span className="text-gold italic font-light">{companyProfile?.name.split(' ').slice(1).join(' ') || "Jomtien"}</span>
        </span>
      </div>
      <p className="text-white/60 max-w-sm mb-8 mx-auto md:mx-0">
        {companyProfile?.description || "Jomtien's biggest expat sports bar and restaurant. Quality food, cold beer, and all your favorite sports on 15 screens."}
      </p>
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 justify-center md:justify-start">
          <a href={companyProfile?.socialLinks.facebook || "https://www.facebook.com/hemingwaysjomtien"} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-gold transition-colors">
            <Facebook size={24} />
          </a>
          <a href={companyProfile?.socialLinks.instagram || "https://hemingwaysjomtien.com"} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-gold transition-colors">
            <Instagram size={24} />
          </a>
        </div>
        <div className="space-y-1">
          <p className="text-white/40 text-sm uppercase tracking-widest font-bold">Address</p>
          <p className="text-white/60 text-sm">{companyProfile?.address || "Hemingway's Jomtien, Jomtien Sai 2 Rd, Pattaya City, Chon Buri 20150"}</p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="font-bold mb-6 text-gold uppercase tracking-wider text-sm">Explore</h4>
      <ul className="space-y-4 text-white/60">
        <li><a href="#" className="hover:text-gold transition-colors">Home</a></li>
        <li><a href="#menu" className="hover:text-gold transition-colors">Food Menu</a></li>
        <li><a href="#sports" className="hover:text-gold transition-colors">Sports Schedule</a></li>
        <li><a href="#specials" className="hover:text-gold transition-colors">Daily Specials</a></li>
        <li><a href="#location" className="hover:text-gold transition-colors">Location</a></li>
      </ul>
    </div>

    <div>
      <h4 className="font-bold mb-6 text-gold uppercase tracking-wider text-sm">Newsletter</h4>
      <p className="text-sm text-white/50 mb-4 italic">Get updates on sports events & specials.</p>
      <form 
        className="flex flex-col gap-3" 
        onSubmit={handleFormSubmit}
      >
        <input 
          name="email"
          type="email" 
          placeholder="Your Email" 
          value={formState.email}
          onChange={(e) => setFormState({...formState, email: e.target.value})}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-gold outline-none"
          required
        />
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="gold-button text-sm py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Sending...' : 'Join Community'}
        </button>
      </form>
    </div>
  </div>
  
  <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 text-center text-white/20 text-xs">
    <p>&copy; {new Date().getFullYear()} Hemingways Jomtien. All rights reserved.</p>
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
    <section id="sports" className="py-24 px-6 bg-navy text-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h4 className="text-gold font-bold tracking-widest uppercase mb-2 text-sm">Live Sports</h4>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Sports Schedule</h2>
          <p className="text-white/60 italic">Catch all the action on our 15 big screens.</p>
          <div className="h-1 w-24 bg-gold mx-auto mt-6 rounded-full"></div>
        </div>

        <div className="grid gap-4 max-w-4xl mx-auto">
          {events.map((event, idx) => (
            <motion.div
              key={event.id || idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-6 text-center md:text-left flex-1">
                <div className="min-w-[80px]">
                  <div className="text-gold font-bold text-lg">{event.time}</div>
                  <div className="text-white/40 text-xs uppercase font-bold">{event.date}</div>
                </div>
                <div className="h-8 w-px bg-white/10 hidden md:block"></div>
                <div>
                  <div className="text-xl font-bold text-white">{event.event}</div>
                  <div className="text-gold/60 text-sm font-medium">{event.comp}</div>
                </div>
              </div>
              <div className="bg-gold/10 px-4 py-2 rounded-full border border-gold/20">
                <span className="text-gold text-xs font-black uppercase tracking-widest">Live Now</span>
              </div>
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
    <section id="specials" className="py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h4 className="text-gold font-bold tracking-widest uppercase mb-2 text-sm">Chef's Recommendations</h4>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-navy">Daily Specials</h2>
          <p className="text-gray-600 italic">Freshly prepared favorites at unbeatable prices.</p>
          <div className="h-1 w-24 bg-navy mx-auto mt-6 rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {specials.map((special, idx) => (
            <motion.div
              key={special.id || idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="bg-cream rounded-[40px] overflow-hidden shadow-sm border border-navy/5 group hover:shadow-xl transition-all h-full flex flex-col"
            >
              <div className="relative h-64 overflow-hidden">
                <FirebaseImage 
                  src={normalizeImageUrl(special.image || "/logo.png")} 
                  alt={special.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {special.price && (
                  <div className="absolute top-6 right-6 bg-gold text-white px-6 py-2 rounded-full font-black shadow-lg">
                    ฿{special.price}
                  </div>
                )}
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <h3 className="text-2xl font-display font-bold text-ink mb-3">{special.name}</h3>
                <p className="text-gray-500 text-sm italic leading-relaxed mb-6 flex-1">
                  {special.description}
                </p>
                {special.endDate && (
                  <div className="text-[10px] uppercase font-bold tracking-widest text-navy/40 border-t border-navy/5 pt-4">
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

const Reviews = ({ businessInfo }: { businessInfo: BusinessInfo | null }) => {
  const customReviews = [
    {
      author_name: "Yummy Mummy",
      rating: 5,
      text: "Great atmosphere, and the Sunday lunch is the best in Jomtien. 10/10",
      relative_time_description: "1 month ago",
      profile_photo_url: ""
    },
    {
      author_name: "John S",
      rating: 5,
      text: "Fantastic place! Best expat bar in Jomtien. Food is delicious and staff are amazing.",
      relative_time_description: "2 weeks ago",
      profile_photo_url: ""
    }
  ];

  const reviewsToDisplay = businessInfo?.reviews?.length ? businessInfo.reviews : customReviews;

  return (
    <section className="py-24 px-6 bg-cream overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h4 className="text-gold font-bold tracking-widest uppercase mb-2 text-sm">Guest Feedback</h4>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-navy">What Our Guests Say</h2>
          <div className="flex items-center justify-center gap-2 text-gold mb-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} fill={i < Math.ceil(businessInfo?.rating || 4.8) ? "currentColor" : "none"} />
              ))}
            </div>
            <span className="font-bold text-lg">{businessInfo?.rating || 4.8}</span>
            <span className="text-gray-400">({businessInfo?.user_ratings_total || 250}+ reviews)</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviewsToDisplay.slice(0, 3).map((review, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-[32px] shadow-sm relative border border-gray-100"
            >
              <Quote className="absolute top-6 right-8 text-cream/80" size={48} />
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-navy/5 flex items-center justify-center text-navy font-bold">
                  {review.author_name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-ink">{review.author_name}</h4>
                  <p className="text-xs text-gray-400">{review.relative_time_description}</p>
                </div>
              </div>
              <div className="flex text-gold mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} />
                ))}
              </div>
              <p className="text-gray-600 italic text-sm leading-relaxed">
                "{review.text.length > 200 ? review.text.substring(0, 200) + '...' : review.text}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const MainSite = ({ isAdmin, businessInfo, companyProfile }: { isAdmin: boolean, businessInfo: BusinessInfo | null, companyProfile: CompanyProfile | null }) => (
<div className="min-h-screen">
<Hero companyProfile={companyProfile} />
<Features />
<About />
<Menu />
<Specials />
<SportsSchedule />
<Reviews businessInfo={businessInfo} />
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
  const isDigitalMenu = location.pathname === "/menu" || location.pathname === "/digital-menu";
  const isDashboard = location.pathname.startsWith("/dashboard") || location.pathname === "/import";
  const isStaffApp = location.pathname === "/expense";

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const isHardcodedAdmin = user.email?.toLowerCase() === "info@hemingwaysjomtien.com";
    const hasAdminRole = user.role === 'admin';
    return isHardcodedAdmin || hasAdminRole;
  }, [user]);

  const isMarketing = useMemo(() => {
    return isAdmin || user?.role === 'marketing';
  }, [user, isAdmin]);

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
      navigate("/expense");
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
      // Don't throw here to avoid crashing the main app loop
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen">
      {isEmployee && (
        <div className="fixed inset-0 bg-cream z-[200] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-navy/10 rounded-full flex items-center justify-center text-navy mb-6">
            <Users size={40} />
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">Employee Portal</h2>
          <p className="text-gray-500 mb-8">Your account is pending approval. Please contact an administrator.</p>
          <button 
            onClick={() => signOut(auth)}
            className="px-8 py-3 bg-navy text-white rounded-2xl font-bold hover:bg-gold transition-all shadow-lg shadow-navy/20 flex items-center gap-2"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      )}
      {!isDigitalMenu && !isDashboard && !isStaffApp && !isEmployee && <Navbar canAccessDashboard={isMarketing} setUser={setUser} companyProfile={companyProfile} />}
      {isAdmin && error && !isDigitalMenu && (
        <div className="pt-24 px-6">
          <div className="max-w-7xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
            <Settings size={16} />
            <span><strong>Admin Notice:</strong> {error}</span>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={isCashierOnly ? <div className="h-screen bg-cream flex items-center justify-center">Redirecting to Staff Portal...</div> : <MainSite isAdmin={isAdmin} businessInfo={businessInfo} companyProfile={companyProfile} />} />
        <Route path="/menu" element={isCashierOnly ? <div className="h-screen bg-cream flex items-center justify-center">Access Denied</div> : <DigitalMenuDisplay />} />
        <Route path="/digital-menu" element={isCashierOnly ? <div className="h-screen bg-cream flex items-center justify-center">Access Denied</div> : <DigitalMenuDisplay />} />
        <Route path="/expense" element={isStaff ? <ExpenseEntry /> : <div className="pt-32 text-center h-screen bg-cream">Access Denied. Please login with a staff account.</div>} />
        
        {/* Dashboard Routes with Sidebar Layout */}
        <Route path="/dashboard" element={(isAdmin || isMarketing) ? <DashboardLayout user={user} /> : <div className="pt-32 text-center h-screen bg-cream flex flex-col items-center justify-center gap-4">Access Denied. <Auth onUserChange={setUser} /></div>}>
          <Route index element={(isAdmin || isMarketing) ? <Dashboard /> : <div className="p-20 text-center">Access Denied</div>} />
          <Route path="categories" element={(isAdmin || isMarketing) ? <CategoriesDashboard /> : <div className="p-20 text-center">Access Denied</div>} />
          <Route path="finance" element={isAdmin ? <FinanceDashboard /> : <div className="p-20 text-center">Access Denied</div>} />
          <Route path="finance/import" element={isAdmin ? <BulkFinanceImport /> : <div className="p-20 text-center">Access Denied</div>} />
          <Route path="users" element={isAdmin ? <UserManagement /> : <div className="p-20 text-center">Access Denied</div>} />
          <Route path="loyalty" element={isAdmin ? <LoyaltyDashboard /> : <div className="p-20 text-center">Access Denied</div>} />
          <Route path="images" element={(isAdmin || isMarketing) ? <ImageManagement /> : <div className="p-20 text-center">Access Denied</div>} />
          <Route path="profile" element={(isAdmin || isMarketing) ? <CompanyProfileDashboard /> : <div className="p-20 text-center">Access Denied</div>} />
          <Route path="logs" element={isAdmin ? <SystemLogs /> : <div className="p-20 text-center">Access Denied</div>} />
        </Route>

        <Route path="/import" element={(isAdmin || isMarketing) ? <BulkImport /> : <div className="pt-32 text-center h-screen bg-cream flex flex-col items-center justify-center gap-4">Access Denied. Please login as admin. <Auth onUserChange={setUser} /></div>} />
        <Route path="/admin/login" element={<AdminLogin />} />
      </Routes>
      {!isDigitalMenu && ((!isDashboard && !isStaffApp) || !user) && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <Auth onUserChange={setUser} />
        </div>
      )}
      {isStaffApp && !user && (
        <div className="fixed inset-0 bg-cream z-[100] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-navy/10 rounded-full flex items-center justify-center text-navy mb-6">
            <Settings size={40} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">Staff Portal</h2>
          <p className="text-gray-500 mb-8">Please login to enter expenses</p>
          <Auth onUserChange={setUser} />
        </div>
      )}
    </div>
  );
}
