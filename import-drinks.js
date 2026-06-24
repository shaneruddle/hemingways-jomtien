/**
 * import-drinks.js
 *
 * Seeds the `drinks` Firestore collection from the CSV export.
 *
 * Run from Cloud Shell:
 *   npm install firebase-admin
 *   node import-drinks.js
 *
 * Uses Application Default Credentials — Cloud Shell is already
 * authenticated as info@hemingwaysjomtien.com so no service account needed.
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({ projectId: 'hemingways-jomtien-website' });
}

const db = getFirestore();

const drinks = [
  // ── Beers & Ciders — Tap ────────────────────────────────────────────────
  { name: "Heineken Lager ABV 5.0%",            category: "Beers & Ciders", drinkType: "Tap",     description: "0.5L - 125 / 0.25L - 75",                                         price: "125", order: 1,  published: true  },
  { name: "Tiger Lager ABV 5.0%",               category: "Beers & Ciders", drinkType: "Tap",     description: "0.5L - 125 / 0.25L - 75",                                         price: "125", order: 2,  published: true  },
  { name: "Guinness Irish Stout ABV 5.2%",      category: "Beers & Ciders", drinkType: "Tap",     description: "0.5L - 260 / 0.25L - 135",                                        price: "260", order: 3,  published: true  },
  { name: "Kilkenny Irish Ale ABV 4.3%",        category: "Beers & Ciders", drinkType: "Tap",     description: "0.5L - 250 / 0.25L - 135",                                        price: "250", order: 4,  published: true  },
  { name: "Thatchers Gold Cider ABV 4.8%",      category: "Beers & Ciders", drinkType: "Tap",     description: "Pint - 205 / Half - 110",                                         price: "205", order: 5,  published: true  },
  { name: "Stowford Press Cider ABV 4.5%",      category: "Beers & Ciders", drinkType: "Tap",     description: "Pint - 205 / Half - 110",                                         price: "205", order: 6,  published: true  },
  { name: "Thatchers Blood Orange Cider ABV 4.0%", category: "Beers & Ciders", drinkType: "Tap",  description: "Pint - 205 / Half - 110",                                         price: "205", order: 7,  published: true  },
  { name: "Chatri Craft IPA ABV 5.2%",          category: "Beers & Ciders", drinkType: "Tap",     description: "0.5l - 195 / 0.3l - 115",                                         price: "195", order: 8,  published: true  },
  { name: "Andechs Weissbier Hell ABV 5.5%",    category: "Beers & Ciders", drinkType: "Tap",     description: "0.5l - 195 / 0.3l - 115",                                         price: "195", order: 9,  published: true  },
  { name: "Andechs Weissbier Dunkel ABV 5.0%",  category: "Beers & Ciders", drinkType: "Tap",     description: "0.5l - 195 / 0.3l - 115",                                         price: "195", order: 10, published: true  },
  { name: "Henry Westons Vintage Cider ABV 5.2%", category: "Beers & Ciders", drinkType: "Tap",   description: "Pint - 205 / Half - 110",                                         price: "205", order: 11, published: true  },
  { name: "Stella Artois Pilsner Lager ABV 5.0%", category: "Beers & Ciders", drinkType: "Tap",   description: "0.5l - 195 / 0.25l - 115",                                        price: "195", order: 12, published: true  },
  { name: "Chalawan Pale Ale ABV 4.7%",         category: "Beers & Ciders", drinkType: "Tap",     description: "0.5l - 195 / 0.3l - 115",                                         price: "195", order: 13, published: true  },
  { name: "Andechs Weiss Dark Wheat Beer ABV 5.0%", category: "Beers & Ciders", drinkType: "Tap", description: "0.5l - 195 / 0.3l - 115",                                         price: "195", order: 14, published: false },

  // ── Beers & Ciders — Bottled ─────────────────────────────────────────────
  { name: "Heineken 320ml 5%",                  category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "95",  order: 20, published: true  },
  { name: "Heineken 0 330ml 0%",                category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "95",  order: 21, published: true  },
  { name: "Heineken Silver 4%",                 category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "95",  order: 22, published: false },
  { name: "Tiger 320ml 5%",                     category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "95",  order: 23, published: true  },
  { name: "Chang 320ml 4.8%",                   category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "85",  order: 24, published: true  },
  { name: "Singha 320ml 5%",                    category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "90",  order: 25, published: true  },
  { name: "Leo 320ml 5%",                       category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "85",  order: 26, published: true  },
  { name: "San Mig Light 330ml 5%",             category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "95",  order: 27, published: true  },
  { name: "Beer Lao 330ml 5%",                  category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "115", order: 28, published: false },
  { name: "Budweiser 330ml 5%",                 category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "95",  order: 29, published: true  },
  { name: "San Mig 0 330ml 3%",                 category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "95",  order: 30, published: true  },
  { name: "Singha Light 4.5%",                  category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "90",  order: 31, published: true  },
  { name: "Corona 330ml 4.5%",                  category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "180", order: 32, published: true  },
  { name: "Paulaner Weiss 5.3%",                category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "260", order: 33, published: true  },
  { name: "West Coast IPA 6.2%",                category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "220", order: 34, published: false },
  { name: "O'Hara Irish Stout",                 category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "215", order: 35, published: false },
  { name: "O'Hara Double IPA 7.5%",             category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "240", order: 36, published: true  },
  { name: "Thatchers Gold 4.8%",                category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "185", order: 37, published: true  },
  { name: "Thatchers Haze 4.5%",                category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "185", order: 38, published: true  },
  { name: "Thatchers Vintage 7.4%",             category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "225", order: 39, published: true  },
  { name: "Green Goblin 4.5%",                  category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "225", order: 40, published: true  },
  { name: "Thatchers Rascal 4.5%",              category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "225", order: 41, published: true  },
  { name: "Frosty Jack 7.5%",                   category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "150", order: 42, published: false },
  { name: "Thatchers Rose 4%",                  category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "185", order: 43, published: true  },
  { name: "Strongbow Gold 4.5%",                category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "120", order: 44, published: false },
  { name: "Strongbow Berry 4.5%",               category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "120", order: 45, published: false },
  { name: "Abbot Ale 5%",                       category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "180", order: 46, published: false },
  { name: "Carabao Dunkel 320ml 4.9%",          category: "Beers & Ciders", drinkType: "Bottled", description: "",  price: "95",  order: 47, published: true  },

  // ── Beers & Ciders — Wine ────────────────────────────────────────────────
  { name: "House Red",                           category: "Beers & Ciders", drinkType: "Wine",    description: "Glass (150ml) - 140 | Litre Carafe - 900 | 1/2 Litre Carafe - 450", price: "",    order: 50, published: true  },
  { name: "House White",                         category: "Beers & Ciders", drinkType: "Wine",    description: "Glass (150ml) - 140 | Litre Carafe - 900 | 1/2 Litre Carafe - 450", price: "",    order: 51, published: true  },
  { name: "By The Bottle",                       category: "Beers & Ciders", drinkType: "Wine",    description: "Bottled wine prices start from as low as ฿955",                     price: "",    order: 52, published: true  },

  // ── Cocktails & Alcopops — Cocktails ─────────────────────────────────────
  { name: "Sex on the Beach",                    category: "Cocktails & Alcopops", drinkType: "Cocktail", description: "Vodka, Peach Schnapps, Cranberry Juice, Orange Juice",              price: "195", order: 1,  published: true },
  { name: "Long Island",                         category: "Cocktails & Alcopops", drinkType: "Cocktail", description: "Vodka, White Rum, Gin, Tequila, Triple Sec, Lemon Juice",            price: "195", order: 2,  published: true },
  { name: "White Russian",                       category: "Cocktails & Alcopops", drinkType: "Cocktail", description: "Vodka, Coffee Liqueur, Light Cream",                                 price: "195", order: 3,  published: true },
  { name: "Margarita",                           category: "Cocktails & Alcopops", drinkType: "Cocktail", description: "White Tequila, Cointreau, Fresh Squeeze Lime Juice",                 price: "185", order: 4,  published: true },
  { name: "Pina Colada",                         category: "Cocktails & Alcopops", drinkType: "Cocktail", description: "White Rum, Pineapple Juice, Coconut Cream, Cream",                   price: "185", order: 5,  published: true },
  { name: "Bloody Mary",                         category: "Cocktails & Alcopops", drinkType: "Cocktail", description: "Vodka, Tomato Juice, Worcester Sauce, Tabasco",                      price: "175", order: 6,  published: true },
  { name: "B52",                                 category: "Cocktails & Alcopops", drinkType: "Cocktail", description: "Kahlua, Baileys, Grand Marnier",                                     price: "165", order: 7,  published: true },
  { name: "Mojito",                              category: "Cocktails & Alcopops", drinkType: "Cocktail", description: "White Rum, Club Soda, Lime, Mint",                                   price: "185", order: 8,  published: true },
  { name: "Mai Tai",                             category: "Cocktails & Alcopops", drinkType: "Cocktail", description: "White Rum, Grand Marnier, Amaretto, Pineapple Juice",                price: "185", order: 9,  published: true },

  // ── Cocktails & Alcopops — Alcopops ──────────────────────────────────────
  { name: "SPY Classic",                         category: "Cocktails & Alcopops", drinkType: "Alcopop",  description: "Wine Cooler with a Fresh and Fruity Taste",                           price: "120", order: 10, published: true  },
  { name: "SPY Red",                             category: "Cocktails & Alcopops", drinkType: "Alcopop",  description: "Wine Cooler with a Fresh and Fruity Taste",                           price: "120", order: 11, published: true  },
  { name: "BREEZER Orange",                      category: "Cocktails & Alcopops", drinkType: "Alcopop",  description: "Sweet and Citrusy Breezer",                                           price: "120", order: 12, published: false },
  { name: "Breezer Strawberry",                  category: "Cocktails & Alcopops", drinkType: "Alcopop",  description: "Strawberry Flavoured Bacardi Breezer",                                price: "120", order: 13, published: false },
  { name: "SMIRNOFF Ice Original",               category: "Cocktails & Alcopops", drinkType: "Alcopop",  description: "Crisp Taste, Bubbly Finish and Natural Lemon Lime Flavour",            price: "120", order: 14, published: true  },

  // ── Spirits — Brandy ─────────────────────────────────────────────────────
  { name: "Martell VSOP",                        category: "Spirits", drinkType: "Brandy",             description: "", price: "225", order: 1,  published: true },
  { name: "Remy Martin",                         category: "Spirits", drinkType: "Brandy",             description: "", price: "225", order: 2,  published: true },
  { name: "Hennessey",                           category: "Spirits", drinkType: "Brandy",             description: "", price: "225", order: 3,  published: true },

  // ── Spirits — Gin ────────────────────────────────────────────────────────
  { name: "House Gin",                           category: "Spirits", drinkType: "Gin",                description: "", price: "70",  order: 10, published: true },
  { name: "House Gin Double",                    category: "Spirits", drinkType: "Gin",                description: "", price: "130", order: 11, published: true },
  { name: "Gordons",                             category: "Spirits", drinkType: "Gin",                description: "", price: "130", order: 12, published: true },
  { name: "Beefeater",                           category: "Spirits", drinkType: "Gin",                description: "", price: "130", order: 13, published: true },
  { name: "Tanqueray",                           category: "Spirits", drinkType: "Gin",                description: "", price: "150", order: 14, published: true },
  { name: "Bombay Sapphire",                     category: "Spirits", drinkType: "Gin",                description: "", price: "160", order: 15, published: true },
  { name: "Hendricks",                           category: "Spirits", drinkType: "Gin",                description: "", price: "235", order: 16, published: true },

  // ── Spirits — Rum ────────────────────────────────────────────────────────
  { name: "Sangsom",                             category: "Spirits", drinkType: "Rum",                description: "", price: "70",  order: 20, published: true },
  { name: "Sangsom Double",                      category: "Spirits", drinkType: "Rum",                description: "", price: "130", order: 21, published: true },
  { name: "Bacardi",                             category: "Spirits", drinkType: "Rum",                description: "", price: "130", order: 22, published: true },
  { name: "Bundaberg",                           category: "Spirits", drinkType: "Rum",                description: "", price: "130", order: 23, published: true },
  { name: "Captain Morgan",                      category: "Spirits", drinkType: "Rum",                description: "", price: "130", order: 24, published: true },
  { name: "Malibu",                              category: "Spirits", drinkType: "Rum",                description: "", price: "130", order: 25, published: true },

  // ── Spirits — Tequila ────────────────────────────────────────────────────
  { name: "House Tequila",                       category: "Spirits", drinkType: "Tequila",            description: "", price: "70",  order: 30, published: true },
  { name: "Triple Sec",                          category: "Spirits", drinkType: "Tequila",            description: "", price: "120", order: 31, published: true },
  { name: "Tequila Silver",                      category: "Spirits", drinkType: "Tequila",            description: "", price: "125", order: 32, published: true },
  { name: "Tequila Gold",                        category: "Spirits", drinkType: "Tequila",            description: "", price: "125", order: 33, published: true },
  { name: "Tequila Rose",                        category: "Spirits", drinkType: "Tequila",            description: "", price: "125", order: 34, published: true },

  // ── Spirits — Vodka ──────────────────────────────────────────────────────
  { name: "House Vodka",                         category: "Spirits", drinkType: "Vodka",              description: "", price: "70",  order: 40, published: true },
  { name: "House Vodka Double",                  category: "Spirits", drinkType: "Vodka",              description: "", price: "130", order: 41, published: true },
  { name: "Absolute",                            category: "Spirits", drinkType: "Vodka",              description: "", price: "140", order: 42, published: true },
  { name: "Finlandia",                           category: "Spirits", drinkType: "Vodka",              description: "", price: "130", order: 43, published: true },
  { name: "Grey Goose / Orange",                 category: "Spirits", drinkType: "Vodka",              description: "", price: "165", order: 44, published: true },
  { name: "Smirnoff",                            category: "Spirits", drinkType: "Vodka",              description: "", price: "120", order: 45, published: true },
  { name: "Ghost Vodka",                         category: "Spirits", drinkType: "Vodka",              description: "", price: "175", order: 46, published: true },

  // ── Spirits — Whisky & Whiskey ───────────────────────────────────────────
  { name: "House Whiskey",                       category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "70",  order: 50, published: true },
  { name: "House Double",                        category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "130", order: 51, published: true },
  { name: "Jonnie Black Label",                  category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "150", order: 52, published: true },
  { name: "Jonnie Red Label",                    category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "130", order: 53, published: true },
  { name: "Jonnie Swing",                        category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "155", order: 54, published: true },
  { name: "Chivas Regal",                        category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "160", order: 55, published: true },
  { name: "Grants",                              category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "130", order: 56, published: true },
  { name: "JB",                                  category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "140", order: 57, published: true },
  { name: "Jack Daniels",                        category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "140", order: 58, published: true },
  { name: "Jim Beam",                            category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "140", order: 59, published: true },
  { name: "Famous Grouse",                       category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "130", order: 60, published: true },
  { name: "Southern Comfort",                    category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "130", order: 61, published: true },
  { name: "Jamesons",                            category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "130", order: 62, published: true },
  { name: "Glenfiddich",                         category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "245", order: 63, published: true },
  { name: "Canadian Club",                       category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "130", order: 64, published: true },
  { name: "Glen Morangie",                       category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "195", order: 65, published: true },
  { name: "Glen Livet 12 Years",                 category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "225", order: 66, published: true },
  { name: "Glen Livet 15 Years",                 category: "Spirits", drinkType: "Whisky & Whiskey",   description: "", price: "255", order: 67, published: true },

  // ── Spirits — Liqueurs ───────────────────────────────────────────────────
  { name: "Baileys",                             category: "Spirits", drinkType: "Liqueurs",           description: "", price: "135", order: 70, published: true },
  { name: "Cointreau",                           category: "Spirits", drinkType: "Liqueurs",           description: "", price: "155", order: 71, published: true },
  { name: "Drambuie",                            category: "Spirits", drinkType: "Liqueurs",           description: "", price: "165", order: 72, published: true },
  { name: "Fernet Branca",                       category: "Spirits", drinkType: "Liqueurs",           description: "", price: "195", order: 73, published: true },
  { name: "Jagermeister",                        category: "Spirits", drinkType: "Liqueurs",           description: "", price: "135", order: 74, published: true },
  { name: "Kahlua",                              category: "Spirits", drinkType: "Liqueurs",           description: "", price: "155", order: 75, published: true },
  { name: "Martini Bianco",                      category: "Spirits", drinkType: "Liqueurs",           description: "", price: "135", order: 76, published: true },
  { name: "Martini Extra Dry",                   category: "Spirits", drinkType: "Liqueurs",           description: "", price: "135", order: 77, published: true },
  { name: "Peppermint",                          category: "Spirits", drinkType: "Liqueurs",           description: "", price: "120", order: 78, published: true },
  { name: "Pernod",                              category: "Spirits", drinkType: "Liqueurs",           description: "", price: "125", order: 79, published: true },
  { name: "Port",                                category: "Spirits", drinkType: "Liqueurs",           description: "", price: "165", order: 80, published: true },
  { name: "Sambuca",                             category: "Spirits", drinkType: "Liqueurs",           description: "", price: "125", order: 81, published: true },
  { name: "Tia Maria",                           category: "Spirits", drinkType: "Liqueurs",           description: "", price: "135", order: 82, published: true },
  { name: "Triple Sec",                          category: "Spirits", drinkType: "Liqueurs",           description: "", price: "120", order: 83, published: true },
  { name: "Campari",                             category: "Spirits", drinkType: "Liqueurs",           description: "", price: "125", order: 84, published: true },
  { name: "Grand Marnier",                       category: "Spirits", drinkType: "Liqueurs",           description: "", price: "165", order: 85, published: true },
  { name: "Blue Curacao",                        category: "Spirits", drinkType: "Liqueurs",           description: "", price: "120", order: 86, published: true },

  // ── Coffee & Tea — Tea ───────────────────────────────────────────────────
  { name: "PG Tips / Tetley",                    category: "Coffee & Tea", drinkType: "Tea",            description: "Cup - 50 / Pot - 80",   price: "50",  order: 1,  published: true },
  { name: "Earl Grey",                           category: "Coffee & Tea", drinkType: "Tea",            description: "Cup - 70 / Pot - 110",  price: "70",  order: 2,  published: true },
  { name: "English Breakfast",                   category: "Coffee & Tea", drinkType: "Tea",            description: "Cup - 70 / Pot - 110",  price: "70",  order: 3,  published: true },
  { name: "Green Tea",                           category: "Coffee & Tea", drinkType: "Tea",            description: "Cup - 70 / Pot - 110",  price: "70",  order: 4,  published: true },
  { name: "Fruit Tea",                           category: "Coffee & Tea", drinkType: "Tea",            description: "Cup - 70 / Pot - 110",  price: "70",  order: 5,  published: true },
  { name: "Chamomile",                           category: "Coffee & Tea", drinkType: "Tea",            description: "Cup - 70 / Pot - 110",  price: "70",  order: 6,  published: true },
  { name: "Peppermint Tea",                      category: "Coffee & Tea", drinkType: "Tea",            description: "Cup - 70 / Pot - 110",  price: "70",  order: 7,  published: true },

  // ── Coffee & Tea — Coffee ────────────────────────────────────────────────
  { name: "Espresso",                            category: "Coffee & Tea", drinkType: "Coffee",         description: "Single Shot for that Instant Hit",                              price: "60",  order: 10, published: true },
  { name: "Americano",                           category: "Coffee & Tea", drinkType: "Coffee",         description: "",                                                              price: "70",  order: 11, published: true },
  { name: "Hot & Milky",                         category: "Coffee & Tea", drinkType: "Coffee",         description: "Flat White | Cappuccino | Café Latte",                          price: "70",  order: 12, published: true },
  { name: "Hot, Milky & Sweet",                  category: "Coffee & Tea", drinkType: "Coffee",         description: "Caramel Macchiato | Caramel Latte | Hot Chocolate | Café Latte Macchiato +10", price: "70", order: 13, published: true },
  { name: "Irish Coffee",                        category: "Coffee & Tea", drinkType: "Coffee",         description: "Contains Alcohol and may cause you to dance on the tables (please remove shoes first)", price: "185", order: 14, published: true },

  // ── Soft Drinks & Shakes — Water ─────────────────────────────────────────
  { name: "Water 600ml",                         category: "Soft Drinks & Shakes", drinkType: "Water",        description: "",                              price: "45",  order: 1,  published: true },
  { name: "Glass of Milk",                       category: "Soft Drinks & Shakes", drinkType: "Water",        description: "",                              price: "80",  order: 2,  published: true },
  { name: "Syrup & Soda",                        category: "Soft Drinks & Shakes", drinkType: "Water",        description: "",                              price: "60",  order: 3,  published: true },
  { name: "Fruit Juice",                         category: "Soft Drinks & Shakes", drinkType: "Water",        description: "Apple, Orange, Pineapple, Cranberry", price: "85", order: 4, published: true },
  { name: "Lemon Juice",                         category: "Soft Drinks & Shakes", drinkType: "Water",        description: "",                              price: "85",  order: 5,  published: true },

  // ── Soft Drinks & Shakes — Soft Drinks ───────────────────────────────────
  { name: "Coke / Coke Light / Coke Zero",       category: "Soft Drinks & Shakes", drinkType: "Soft Drink",   description: "",                              price: "50",  order: 10, published: true },
  { name: "Sprite",                              category: "Soft Drinks & Shakes", drinkType: "Soft Drink",   description: "",                              price: "50",  order: 11, published: true },
  { name: "Fanta",                               category: "Soft Drinks & Shakes", drinkType: "Soft Drink",   description: "",                              price: "50",  order: 12, published: true },
  { name: "Schweppes Lime",                      category: "Soft Drinks & Shakes", drinkType: "Soft Drink",   description: "",                              price: "50",  order: 13, published: true },
  { name: "Soda Water",                          category: "Soft Drinks & Shakes", drinkType: "Soft Drink",   description: "",                              price: "50",  order: 14, published: true },
  { name: "Tonic Water",                         category: "Soft Drinks & Shakes", drinkType: "Soft Drink",   description: "",                              price: "50",  order: 15, published: true },

  // ── Soft Drinks & Shakes — Shakes ────────────────────────────────────────
  { name: "Banana / Banana & Berry Shake",       category: "Soft Drinks & Shakes", drinkType: "Shake",        description: "",                              price: "125", order: 20, published: true },
  { name: "Chocolate Shake",                     category: "Soft Drinks & Shakes", drinkType: "Shake",        description: "",                              price: "125", order: 21, published: true },
  { name: "Lemon Shake",                         category: "Soft Drinks & Shakes", drinkType: "Shake",        description: "",                              price: "125", order: 22, published: true },
  { name: "Mango Shake",                         category: "Soft Drinks & Shakes", drinkType: "Shake",        description: "",                              price: "125", order: 23, published: true },
  { name: "Strawberry Shake",                    category: "Soft Drinks & Shakes", drinkType: "Shake",        description: "",                              price: "125", order: 24, published: true },
  { name: "Watermelon Shake",                    category: "Soft Drinks & Shakes", drinkType: "Shake",        description: "",                              price: "125", order: 25, published: true },
];

async function importDrinks() {
  console.log(`\nImporting ${drinks.length} drinks into 'drinks' collection...\n`);

  // Check if collection already has data
  const existing = await db.collection('drinks').limit(1).get();
  if (!existing.empty) {
    console.log('⚠️  The drinks collection already has documents.');
    console.log('    To avoid duplicates, exiting without importing.');
    console.log('    Delete the collection first if you want a fresh import.\n');
    process.exit(0);
  }

  // Firestore batch limit is 500 — split if needed
  const BATCH_SIZE = 400;
  let imported = 0;

  for (let i = 0; i < drinks.length; i += BATCH_SIZE) {
    const chunk = drinks.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(drink => {
      const ref = db.collection('drinks').doc();
      batch.set(ref, {
        ...drink,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    imported += chunk.length;
    console.log(`  ✓  Imported ${imported}/${drinks.length}`);
  }

  const published = drinks.filter(d => d.published).length;
  const unpublished = drinks.filter(d => !d.published).length;

  console.log(`\n✅  Done!`);
  console.log(`    ${published} published | ${unpublished} unpublished`);
  console.log(`    Check the admin at /dashboard/drinks to review.\n`);
}

importDrinks().catch(err => {
  console.error('❌  Import failed:', err.message);
  process.exit(1);
});
