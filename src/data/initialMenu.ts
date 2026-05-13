import { MenuItem } from '../types';

export const INITIAL_MENU_DATA: Partial<MenuItem>[] = [
  {
    name: "Full English Breakfast",
    description: "2 Eggs, 2 Sausages, 2 Bacon, Hash Browns, Beans, Grilled Tomato, Mushrooms and Toast.",
    category: "Breakfast",
    image: "menu-items/english-breakfast.webp",
    price: "295",
    published: true,
    order: 1
  },
  {
    name: "Hemingways Burger",
    description: "Premium beef patty, crispy bacon, cheddar, lettuce, tomato, and onion in a toasted brioche bun. Served with chunky chips.",
    category: "Burgers & Sandwiches",
    image: "menu-items/hemingway-burger.webp",
    price: "345",
    published: true,
    order: 1
  },
  {
    name: "Fish & Chips",
    description: "Traditional beer-battered cod served with chunky chips, mushy peas, and tartare sauce.",
    category: "Mains (Western)",
    image: "menu-items/fish-chips.webp",
    price: "395",
    published: true,
    order: 2
  },
  {
    name: "Pad Thai Shrimp",
    name_thai: "ผัดไทยกุ้งสด",
    description: "Classic Thai stir-fried noodles with fresh prawns, tofu, bean sprouts, and crushed peanuts.",
    category: "Thai Food",
    image: "menu-items/pad-thai.webp",
    price: "180",
    published: true,
    order: 1
  },
  {
    name: "Margherita Pizza",
    description: "Fresh tomato sauce, mozzarella, and basil on a crispy thin crust.",
    category: "Pizza",
    image: "menu-items/margherita-pizza.webp",
    price: "280",
    published: true,
    order: 1
  },
  {
    name: "Draught Heineken",
    description: "Pint / Half Pint",
    category: "Draught Beers & Ciders",
    image: "menu-items/beer.webp",
    price: "150 / 80",
    published: true,
    order: 1
  },
  {
    name: "Sunday Roast Beef",
    description: "Slow-roasted beef served with Yorkshire pudding, roast potatoes, seasonal vegetables, and rich gravy.",
    category: "Mains (Western)",
    image: "menu-items/roast-beef.webp",
    price: "450",
    published: true,
    order: 3
  }
];
