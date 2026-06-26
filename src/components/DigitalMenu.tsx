import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { MenuItem, Category } from "../types";
import { handleFirestoreError } from "../utils/firestore";
import { normalizeImageUrl } from "../utils/images";
import { FirebaseImage } from "./ui/FirebaseImage";

// Optimized Sub-components
import MenuItemCardGrid from "./menu/MenuItemCardGrid";
import LanguageSwitcher from "./menu/LanguageSwitcher";

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

interface Special {
  id: string;
  name: string;
  day: string;
  image: string;
  order: number;
}

interface Drink {
  id: string;
  name: string;
  category: string;
  drinkType: string;
  description: string;
  price: string;
  order: number;
  published: boolean;
}

// Sentinel values — never real category names
const SPECIALS_TAB = '__specials__';
const DRINKS_TAB   = '__drinks__';

const DRINK_CATEGORY_ORDER = [
  'Beers & Ciders',
  'Cocktails & Alcopops',
  'Spirits',
  'Coffee & Tea',
  'Soft Drinks & Shakes',
];

const DAY_COLORS: Record<string, string> = {
  Monday:      '#1DA0A8',
  Tuesday:     '#1DA0A8',
  Wednesday:   '#D49F3D',
  Thursday:    '#D49F3D',
  Friday:      '#1DA0A8',
  Saturday:    '#1DA0A8',
  Sunday:      '#D49F3D',
  Weekend:     '#1DA0A8',
  Daily:       '#5cb85c',
  'Every Day': '#5cb85c',
};

const DigitalMenu = () => {
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [language, setLanguage] = useState<Language>('en');
  const [loading, setLoading] = useState({ menu: true });
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [drinks, setDrinks]     = useState<Drink[]>([]);
  const initialCategorySet = useRef(false);

  const isLoading = loading.menu || (isPreview && authLoading);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setCategoryList(cats);
    }, (err) => {
      handleFirestoreError(err, 'list', 'categories');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Wait for auth to be determined if in preview mode
    if (isPreview && authLoading) return;

    const q = isPreview
      ? query(collection(db, "menu"))
      : query(collection(db, "menu"), where("published", "==", true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const menuItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MenuItem[];

      // Sort in memory to avoid needing a composite index
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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSpecials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Special)));
    }, (err) => {
      console.error("Specials snapshot error:", err);
    });
    return () => unsubscribe();
  }, []);

  // Drinks listener (published only)
  useEffect(() => {
    const q = query(
      collection(db, "drinks"),
      where("published", "==", true),
      orderBy("order", "asc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDrinks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Drink)));
    }, (err) => {
      console.error("Drinks snapshot error:", err);
    });
    return () => unsubscribe();
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
      // Include defined categories first, then any other categories found in items
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

  // Today's day name in Bangkok timezone UTC+7 (e.g. "Friday")
  const todayDayName = useMemo(() => {
    const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const bangkokMs = Date.now() + (7 * 60 * 60 * 1000);
    return DAYS[new Date(bangkokMs).getUTCDay()];
  }, []);

  // Only show specials matching today, Daily, Every Day, or Weekend (Sat/Sun)
  const todaysSpecials = useMemo(() => {
    return specials.filter(s =>
      s.day === todayDayName ||
      s.day === 'Daily' ||
      s.day === 'Every Day' ||
      (s.day === 'Weekend' && ['Saturday', 'Sunday'].includes(todayDayName))
    );
  }, [specials, todayDayName]);

  // Fallback if active category disappears
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
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Categories */}
        <aside className="w-64 bg-white border-r border-gray-100 overflow-y-auto p-4 hidden lg:block">
          <div className="mb-6 flex flex-col items-center">
            <h1 className="text-xl font-display font-bold text-navy mb-0.5">Hemingways</h1>
            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Menu Display</p>
          </div>

          <div className="mb-6 flex justify-center">
            <LanguageSwitcher language={language} setLanguage={setLanguage} />
          </div>

          <h2 className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-4">Categories</h2>
          <div className="space-y-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  activeCategory === cat
                  ? "bg-navy text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}

            {/* Specials tab — teal, always last */}
            {todaysSpecials.length > 0 && (
              <button
                onClick={() => setActiveCategory(SPECIALS_TAB)}
                className="w-full text-left px-4 py-2 rounded-xl font-medium text-sm transition-all mt-3"
                style={
                  activeCategory === SPECIALS_TAB
                    ? { background: '#1DA0A8', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }
                    : { color: '#1DA0A8', fontWeight: 600 }
                }
              >
                ★ Specials
              </button>
            )}

            {/* Drinks tab — amber, always last */}
            {drinks.length > 0 && (
              <button
                onClick={() => setActiveCategory(DRINKS_TAB)}
                className="w-full text-left px-4 py-2 rounded-xl font-medium text-sm transition-all mt-2"
                style={
                  activeCategory === DRINKS_TAB
                    ? { background: '#D49F3D', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }
                    : { color: '#B97D15', fontWeight: 600 }
                }
              >
                🍺 Drinks
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <div className="lg:hidden mb-4 flex justify-center">
            <LanguageSwitcher language={language} setLanguage={setLanguage} />
          </div>

          {/* Mobile Categories (Horizontal Scroll) */}
          <div className="lg:hidden flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full font-medium text-xs sm:text-sm transition-all ${
                  activeCategory === cat
                  ? "bg-navy text-white shadow-md"
                  : "bg-white text-ink shadow-sm border border-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}

            {/* Specials tab — teal pill, always last */}
            {todaysSpecials.length > 0 && (
              <button
                onClick={() => setActiveCategory(SPECIALS_TAB)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full font-medium text-xs sm:text-sm transition-all"
                style={
                  activeCategory === SPECIALS_TAB
                    ? { background: '#1DA0A8', color: '#fff', boxShadow: '0 2px 6px rgba(29,160,168,0.4)' }
                    : { background: 'rgba(29,160,168,0.1)', color: '#1DA0A8', border: '1px solid rgba(29,160,168,0.3)' }
                }
              >
                ★ Specials
              </button>
            )}

            {/* Drinks tab — amber pill, always last */}
            {drinks.length > 0 && (
              <button
                onClick={() => setActiveCategory(DRINKS_TAB)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full font-medium text-xs sm:text-sm transition-all"
                style={
                  activeCategory === DRINKS_TAB
                    ? { background: '#D49F3D', color: '#fff', boxShadow: '0 2px 6px rgba(212,159,61,0.4)' }
                    : { background: 'rgba(212,159,61,0.1)', color: '#B97D15', border: '1px solid rgba(212,159,61,0.3)' }
                }
              >
                🍺 Drinks
              </button>
            )}
          </div>

          {/* ── Drinks View ── */}
          {activeCategory === DRINKS_TAB ? (
            <>
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-ink">Drinks</h2>
                <div className="h-1 w-12 mt-2 rounded-full" style={{ background: '#D49F3D' }}></div>
              </div>

              <motion.div
                key="drinks"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-10"
              >
                {DRINK_CATEGORY_ORDER.filter(cat => drinks.some(d => d.category === cat)).map(cat => {
                  const catDrinks = drinks.filter(d => d.category === cat);
                  // group by drinkType within category
                  const typeGroups = Array.from(new Set(catDrinks.map(d => d.drinkType)));
                  return (
                    <div key={cat}>
                      {/* Category header */}
                      <div className="mb-4">
                        <h3 className="text-xl font-display font-bold text-navy uppercase tracking-wide">{cat}</h3>
                        <div className="h-0.5 w-8 mt-1 rounded-full" style={{ background: '#D49F3D' }}></div>
                      </div>

                      <div className="flex flex-col gap-6">
                        {typeGroups.map(type => {
                          const typeDrinks = catDrinks.filter(d => d.drinkType === type);
                          return (
                            <div key={type}>
                              {/* Type sub-header */}
                              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 pb-1 border-b border-gray-100">
                                {type}
                              </div>
                              <div className="divide-y divide-gray-50">
                                {typeDrinks.map(drink => (
                                  <div key={drink.id} className="flex items-baseline justify-between py-2.5 gap-4">
                                    <div className="min-w-0">
                                      <span className="font-medium text-ink text-sm sm:text-base leading-snug">{drink.name}</span>
                                      {drink.description && (
                                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{drink.description}</p>
                                      )}
                                    </div>
                                    {drink.price && (
                                      <span className="font-display font-bold text-navy whitespace-nowrap text-sm sm:text-base shrink-0">
                                        ฿{drink.price}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </>

          ) : /* ── Specials View ── */
          activeCategory === SPECIALS_TAB ? (
            <>
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-ink">Specials</h2>
                <div className="h-1 w-12 mt-2 rounded-full" style={{ background: '#1DA0A8' }}></div>
              </div>

              <motion.div
                key="specials"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {todaysSpecials.map((special) => (
                    <div
                      key={special.id}
                      className="rounded-2xl overflow-hidden shadow-md bg-white"
                      style={{ border: '1px solid #e5e7eb' }}
                    >
                      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '210/297' }}>
                        {special.image ? (
                          <FirebaseImage
                            src={normalizeImageUrl(special.image)}
                            alt={special.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-300 text-4xl">
                            🍽
                          </div>
                        )}
                        {/* Day badge */}
                        <div
                          className="absolute top-3 left-3 text-white text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg"
                          style={{ background: DAY_COLORS[special.day] || '#1DA0A8' }}
                        >
                          {special.day}
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        <p className="font-display font-bold text-navy text-lg uppercase tracking-wide">
                          {special.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          ) : (
            /* ── Regular Menu View ── */
            <>
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-ink">{activeCategory}</h2>
                <div className="h-1 w-12 bg-navy mt-2 rounded-full"></div>
              </div>
              <motion.div
                key={activeCategory + language}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredItems.map((item, index) => (
                    <MenuItemCardGrid
                      key={item.id}
                      item={item}
                      language={language}
                      getLocalizedName={getLocalizedName}
                      getLocalizedDesc={getLocalizedDesc}
                      renderPrice={renderPrice}
                      priority={index < 2}
                    />
                  ))}
                </div>
              </motion.div>

              {filteredItems.length === 0 && (
                <div className="text-center py-24 bg-white rounded-[32px] border-2 border-dashed border-gray-100">
                  <p className="text-gray-400 italic">No items found in this category.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default DigitalMenu;
