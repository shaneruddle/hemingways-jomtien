import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { MenuItem, Category, Special } from "../types";
import { handleFirestoreError } from "../utils/firestore";
import { normalizeImageUrl } from "../utils/images";
import { FirebaseImage } from "./ui/FirebaseImage";
// Optimized Sub-component
import MenuItemCard from "./menu/MenuItemCard";
import LanguageSwitcher from "./menu/LanguageSwitcher";

const SPECIALS_TAB = '__specials__';
const DRINKS_TAB = '__drinks__';

const SimpleListMember = ({ item, getLocalizedName }: { item: MenuItem; getLocalizedName: (item: MenuItem) => string }) => (
  <div className="flex justify-between items-center py-4 border-b border-gray-100 group hover:bg-cream/50 px-4 rounded-2xl transition-colors bg-white/50 backdrop-blur-sm">
    <span className="font-bold text-ink text-sm sm:text-base">{getLocalizedName(item)}</span>
    <span className="font-black text-navy text-sm sm:text-base">฿{item.price?.replace('฿', '').trim()}</span>
  </div>
);

type Language = 'en' | 'zh' | 'ru' | 'th';

interface SelectedIngredient {
  itemId: string;
  itemName: string;
  optionIndex: number;
  weight: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const DigitalMenuDisplay = () => {
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [loading, setLoading] = useState({ menu: true });
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [language, setLanguage] = useState<Language>('en');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [drinks, setDrinks] = useState<MenuItem[]>([]);
  const initialCategorySet = useRef(false);

  const isLoading = loading.menu || (isPreview && authLoading);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "categories"), orderBy("order", "asc")), (snapshot) => {
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
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Wait for auth to be determined if in preview mode
    if (isPreview && authLoading) return;

    console.log("Fetching menu items, preview mode:", isPreview, "User:", user?.email);

    const q = isPreview
      ? query(collection(db, "menu"))
      : query(collection(db, "menu"), where("published", "==", true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Menu snapshot received, docs:", snapshot.size);
      const menuItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MenuItem[];

      const sortedItems = menuItems.sort((a, b) => (a.order || 0) - (b.order || 0));
      setItems(sortedItems);

      setLoading(prev => ({ ...prev, menu: false }));
    }, (err) => {
      console.error("Menu snapshot error:", err);
      setLoading(prev => ({ ...prev, menu: false }));
    });

    return () => unsubscribe();
  }, [isPreview, authLoading, user]);

  // Specials listener
  useEffect(() => {
    const q = query(collection(db, "specials"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setSpecials(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Special[]);
    }, (err) => console.error("Specials error:", err));
    return () => unsub();
  }, []);

  // Drinks listener
  useEffect(() => {
    const q = query(collection(db, "drinks"), where("published", "==", true), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setDrinks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as MenuItem[]);
    }, (err) => console.error("Drinks error:", err));
    return () => unsub();
  }, []);

  // Separate effect to handle initial category selection once both items and categoryList are ready
  useEffect(() => {
    if (!initialCategorySet.current && !isLoading && items.length > 0) {
      const firstCat = categoryList.length > 0
        ? categoryList.find(c => items.some(i => i.category === c.name))?.name || items[0].category
        : items[0].category;
      setActiveCategory(firstCat);
      initialCategorySet.current = true;
    }
  }, [items, categoryList, isLoading]);

  const categories = useMemo(() => {
    const itemCats = Array.from(new Set<string>(items.map(item => item.category)));
    let cats: string[] = [];

    if (categoryList.length > 0) {
      const definedCats = categoryList.map(c => c.name);
      const otherCats = itemCats.filter(cat => !definedCats.includes(cat)).sort();
      cats = [...definedCats, ...otherCats];
    } else {
      cats = itemCats.sort();
    }
    return cats;
  }, [items, categoryList]);

  const filteredItems = useMemo(() => {
    return items.filter(item => item.category === activeCategory);
  }, [items, activeCategory]);

  // Fallback if active category disappears — don't reset sentinel tabs
  useEffect(() => {
    if (
      activeCategory &&
      activeCategory !== SPECIALS_TAB &&
      activeCategory !== DRINKS_TAB &&
      categories.length > 0 &&
      !categories.includes(activeCategory)
    ) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const getLocalizedName = useCallback((item: MenuItem) => {
    switch (language) {
      case 'zh': return item.name_chinese || item.name;
      case 'ru': return item.name_russian || item.name;
      case 'th': return item.name_thai || item.name;
      default: return item.name;
    }
  }, [language]);

  const getLocalizedDesc = useCallback((item: MenuItem) => {
    switch (language) {
      case 'zh': return item.description_chinese || item.description || "";
      case 'ru': return item.description_russian || item.description || "";
      case 'th': return item.description_thai || item.description || "";
      default: return item.description || "";
    }
  }, [language]);

  const renderPrice = useCallback((item: MenuItem) => {
    const extraPriceData = [
      { price: item.price2, label: item.price2Label },
      { price: item.price3, label: item.price3Label },
      { price: item.price4, label: item.price4Label }
    ].filter(p => p.price && p.price.trim() !== '');

    if (extraPriceData.length === 0) return null;

    const formattedOptions = extraPriceData.map((p) => {
      const labelText = p.label ? p.label.trim() : "";
      const cleanPrice = p.price!.trim().replace('฿', '');
      return `${labelText} ฿${cleanPrice}`.trim();
    });

    return (
      <div className="mt-2 pt-2 border-t border-gray-50 text-lg font-black text-navy">
        {formattedOptions.join(' ')}
      </div>
    );
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-8">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-32 h-32"
        >
          <FirebaseImage
            src={normalizeImageUrl("/logo.png")}
            alt="Loading..."
            className="w-32 h-32 rounded-full object-cover border-4 border-gold shadow-xl"
          />
        </motion.div>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream p-1 sm:p-2 relative">
      <div className="max-w-6xl mx-auto">
        <header className="mb-2 lg:mb-4 lg:text-center lg:flex lg:flex-col lg:items-center">
          <div className="hidden lg:block">
            <h1 className="text-3xl lg:text-5xl font-display font-bold text-navy">Hemingways Jomtien</h1>
          </div>
        </header>
        <div className="mb-2 lg:mb-4 flex justify-center">
          <LanguageSwitcher language={language} setLanguage={setLanguage} />
        </div>
        {/* Category Tabs - Sticky Bar */}
        <div className="sticky top-0 z-50 py-3 -mx-1 sm:-mx-2 px-1 sm:px-2 mb-4 lg:mb-8 bg-cream/95 backdrop-blur-md transition-all duration-300 border-b border-gray-100/50">
         <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-2 pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-4 py-0.5 sm:py-2 rounded-full font-bold text-sm transition-all border-2 ${
                  activeCategory === cat
                    ? "bg-navy border-navy text-white shadow-xl shadow-navy/20 scale-105"
                    : "bg-white border-gray-200 text-gray-600 hover:border-navy hover:text-navy active:scale-95"
                }`}
              >
                {cat}
              </button>
            ))}
            {specials.length > 0 && (
              <button
                onClick={() => { setActiveCategory(SPECIALS_TAB); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`px-4 py-0.5 sm:py-2 rounded-full font-bold text-sm transition-all border-2 ${
                  activeCategory === SPECIALS_TAB
                    ? "bg-teal-600 border-teal-600 text-white shadow-xl shadow-teal-600/20 scale-105"
                    : "bg-white border-gray-200 text-gray-600 hover:border-teal-600 hover:text-teal-600 active:scale-95"
                }`}
              >
                ★ Specials
              </button>
            )}
            {drinks.length > 0 && (
              <button
                onClick={() => { setActiveCategory(DRINKS_TAB); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`px-4 py-0.5 sm:py-2 rounded-full font-bold text-sm transition-all border-2 ${
                  activeCategory === DRINKS_TAB
                    ? "bg-amber-700 border-amber-700 text-white shadow-xl shadow-amber-700/20 scale-105"
                    : "bg-white border-gray-200 text-gray-600 hover:border-amber-700 hover:text-amber-700 active:scale-95"
                }`}
              >
                🍺 Drinks
              </button>
            )}
          </div>
        </div>
        <div className="min-h-[60vh] scroll-mt-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory + language}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {activeCategory === SPECIALS_TAB ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {specials.map((special) => (
                    <div key={special.id} className="bg-white rounded-[40px] overflow-hidden shadow-md">
                      {special.image && (
                        <div className="w-full overflow-hidden" style={{ aspectRatio: '210/297' }}>
                          <FirebaseImage
                            src={normalizeImageUrl(special.image)}
                            alt={special.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="font-bold text-navy text-xl">{special.name}</h3>
                          {special.price && (
                            <span className="font-black text-navy text-xl whitespace-nowrap">฿{special.price}</span>
                          )}
                        </div>
                        {special.description && (
                          <p className="text-gray-500 text-sm mt-2 leading-relaxed">{special.description}</p>
                        )}
                        {special.endDate && (
                          <p className="text-xs text-gray-400 mt-3 uppercase tracking-wider">Available until {special.endDate}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeCategory === DRINKS_TAB ? (
                (() => {
                  // Group drinks by category, preserving Firestore order within each group
                  const groups: Record<string, MenuItem[]> = {};
                  for (const item of drinks) {
                    const cat = item.category || 'Drinks';
                    if (!groups[cat]) groups[cat] = [];
                    groups[cat].push(item);
                  }
                  const groupEntries = Object.entries(groups);
                  return drinks.length === 0 ? (
                    <div className="text-center py-24 bg-white/50 rounded-[40px] border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 italic">No drinks available.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {groupEntries.map(([cat, catItems]) => (
                        <div key={cat} className="bg-white rounded-[32px] p-6 shadow-sm">
                          {groupEntries.length > 1 && (
                            <h3 className="font-bold text-navy text-base uppercase tracking-wider mb-4 pb-3 border-b border-gray-100">{cat}</h3>
                          )}
                          <div>
                            {catItems.map((item) => {
                              const extraPrices = [
                                item.price2Label && item.price2 ? `${item.price2Label} ฿${item.price2.replace('฿','').trim()}` : null,
                                item.price3Label && item.price3 ? `${item.price3Label} ฿${item.price3.replace('฿','').trim()}` : null,
                                item.price4Label && item.price4 ? `${item.price4Label} ฿${item.price4.replace('฿','').trim()}` : null,
                              ].filter(Boolean);
                              return (
                                <div key={item.id} className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <p className="font-semibold text-ink text-sm">{getLocalizedName(item)}</p>
                                    {getLocalizedDesc(item) && (
                                      <p className="text-xs text-gray-400 mt-0.5">{getLocalizedDesc(item)}</p>
                                    )}
                                    {extraPrices.length > 0 && (
                                      <p className="text-xs text-gray-400 mt-0.5">{extraPrices.join(' / ')}</p>
                                    )}
                                  </div>
                                  {item.price && (
                                    <span className="font-black text-navy text-sm whitespace-nowrap">
                                      ฿{item.price.replace('฿','').trim()}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <div className={activeCategory === "More Add Ons" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
                  {filteredItems.map((item, index) => (
                    activeCategory === "More Add Ons" ? (
                      <SimpleListMember
                        key={item.id}
                        item={item}
                        getLocalizedName={getLocalizedName}
                      />
                    ) : (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        language={language}
                        getLocalizedName={getLocalizedName}
                        getLocalizedDesc={getLocalizedDesc}
                        renderPrice={renderPrice}
                        priority={index < 2}
                      />
                    )
                  ))}
                  {filteredItems.length === 0 && (
                    <div className="col-span-full text-center py-24 bg-white/50 rounded-[40px] border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 italic">No items found in this category.</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default DigitalMenuDisplay;
