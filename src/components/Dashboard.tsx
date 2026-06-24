import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, auth, storage } from '../firebase';
import { ref, uploadBytes } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { imageService } from '../services/imageService';
import { MenuItem, Category, OperationType } from '../types';
import { handleFirestoreError } from '../utils/firestore';
import { handleStorageError } from '../utils/storage';
import { normalizeImageUrl } from '../utils/images';
import { logActivity } from '../utils/logger';
import { FirebaseImage } from './ui/FirebaseImage';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  Globe,
  LayoutGrid,
  Image as ImageIcon,
  Tag,
  Eye,
  EyeOff,
  Upload,
  Download,
  FileText,
  GripVertical,
  Search,
  Filter,
  Trash,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import MenuItemCosting from './MenuItemCosting';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  ink850:      '#f8f9fb',   // page background
  ink800:      '#ffffff',   // toolbar / panels
  ink700:      '#ffffff',   // table rows / cards
  ink600:      '#f3f4f6',   // hover / alt rows
  ink500:      '#e5e7eb',   // dividers / subtle borders
  gold500:     '#D49F3D',
  gold400:     '#B97D15',   // darker gold — readable on white
  teal500:     '#1DA0A8',
  teal400:     '#34B2BA',
  red500:      '#E11E15',
  cream50:     '#111827',   // primary text
  cream100:    '#374151',   // secondary text
  muted:       '#6b7280',   // muted text
  faint:       '#9ca3af',   // faint text
  border:      '#e5e7eb',   // solid light border
  borderStrong:'#d1d5db',   // slightly stronger border
  shadowCard:  '0 2px 8px rgba(0,0,0,0.08)',
  shadowPop:   '0 8px 32px rgba(0,0,0,0.14)',
};

// ─── SortableRow ─────────────────────────────────────────────────────────────
interface SortableRowProps {
  item: MenuItem;
  startEdit: (item: MenuItem) => void;
  handleDelete: (id: string) => Promise<void>;
  togglePublished: (item: MenuItem) => Promise<void>;
  startCosting: (item: MenuItem) => void;
}

const SortableRow: React.FC<SortableRowProps> = ({ item, startEdit, handleDelete, togglePublished, startCosting }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id! });

  const [hovered, setHovered] = useState(false);

  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    position: 'relative',
    background: isDragging ? T.ink600 : hovered ? T.ink700 : T.ink800,
    boxShadow: isDragging ? T.shadowCard : 'none',
    borderBottom: `1px solid ${T.border}`,
  };

  return (
    <tr
      ref={setNodeRef}
      style={rowStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Drag handle */}
      <td style={{ padding: '0 12px', width: 36 }}>
        <button
          {...attributes}
          {...listeners}
          style={{
            background: 'none',
            border: 'none',
            color: T.faint,
            cursor: 'grab',
            padding: '8px 4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <GripVertical size={16} />
        </button>
      </td>

      {/* Item: image + name + desc */}
      <td
        style={{ padding: '12px 16px', cursor: 'pointer' }}
        onClick={() => startEdit(item)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 2,
            overflow: 'hidden',
            flexShrink: 0,
            background: T.ink600,
            border: `1px solid ${T.border}`,
          }}>
            <FirebaseImage
              src={normalizeImageUrl(item.primaryPhotoPath || item.image)}
              fallbackSrc="/logo.png"
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <div style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 500,
              fontSize: 15,
              color: T.cream50,
              lineHeight: 1.2,
            }}>
              {item.name}
            </div>
            <div style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 12,
              color: T.faint,
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 2,
            }}>
              {item.description}
            </div>
          </div>
        </div>
      </td>

      {/* Category badge */}
      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
        <span style={{
          background: T.ink700,
          border: `1px solid ${T.border}`,
          borderRadius: 2,
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: T.muted,
          padding: '3px 8px',
          display: 'inline-block',
        }}>
          {item.category}
        </span>
      </td>

      {/* Price */}
      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
        <span style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 600,
          fontSize: 15,
          color: T.gold400,
        }}>
          ฿{item.price || '0'}
        </span>
        {(item.price2 || item.price3 || item.price4) && (
          <span style={{ marginLeft: 6, fontSize: 10, color: T.faint }}>+ options</span>
        )}
      </td>

      {/* Status toggle */}
      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
        <button
          onClick={() => togglePublished(item)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 2,
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 600,
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: item.published ? T.teal500 : T.ink600,
            color: item.published ? '#0a0a0a' : T.faint,
            transition: 'background 0.15s',
          }}
        >
          {item.published ? <Eye size={12} /> : <EyeOff size={12} />}
          {item.published ? 'Active' : 'Hidden'}
        </button>
      </td>

      {/* Actions */}
      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <ActionBtn onClick={() => startCosting(item)} hoverColor={T.teal400} title="Food Cost">
            <Calculator size={16} />
          </ActionBtn>
          <ActionBtn onClick={() => startEdit(item)} hoverColor={T.gold400} title="Edit">
            <Edit2 size={16} />
          </ActionBtn>
          <ActionBtn onClick={() => handleDelete(item.id!)} hoverColor={T.red500} title="Delete">
            <Trash2 size={16} />
          </ActionBtn>
        </div>
      </td>
    </tr>
  );
};

// ─── Small helper components ──────────────────────────────────────────────────
const ActionBtn: React.FC<{
  onClick: () => void;
  hoverColor: string;
  title?: string;
  children: React.ReactNode;
}> = ({ onClick, hoverColor, title, children }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: hov ? hoverColor : T.faint,
        padding: 6,
        borderRadius: 2,
        transition: 'color 0.15s',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
};

// ─── Input field styles ───────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: T.ink700,
  border: `1px solid ${T.ink500}`,
  borderRadius: 2,
  padding: '10px 12px',
  fontFamily: "'Barlow', sans-serif",
  fontSize: 14,
  color: T.cream50,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Oswald', sans-serif",
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: T.muted,
  display: 'block',
  marginBottom: 6,
};

const sectionDividerStyle: React.CSSProperties = {
  fontFamily: "'Oswald', sans-serif",
  fontWeight: 600,
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: T.gold400,
  borderBottom: `1px solid ${T.border}`,
  paddingBottom: 8,
  marginBottom: 16,
};

// ─── ImageSlot ────────────────────────────────────────────────────────────────
const ImageSlot = ({
  label,
  value,
  initialValue,
  onUpload,
  onRemove,
  onChange,
  onDownload,
  onRename,
  uploading
}: {
  label: string;
  value: string;
  initialValue?: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void> | void;
  onRemove: () => void;
  onChange: (val: string) => void;
  onDownload: () => Promise<void> | void;
  onRename?: (oldPath: string, newPath: string) => Promise<void> | void;
  uploading: boolean;
  key?: any;
}) => {
  const hasChanged = initialValue && value !== initialValue && value.startsWith('gs://') && initialValue.startsWith('gs://');

  return (
    <div style={{
      background: T.ink700,
      border: `1px solid ${T.ink500}`,
      borderRadius: 2,
      padding: 16,
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Thumbnail */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 2,
            overflow: 'hidden',
            background: T.ink600,
            border: `1px dashed ${T.ink500}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            {value ? (
              <FirebaseImage
                src={normalizeImageUrl(value)}
                fallbackSrc="/logo.png"
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: T.faint }}>
                <ImageIcon size={20} />
                <span style={{ fontSize: 8, marginTop: 4, fontFamily: "'Oswald', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  No Image
                </span>
              </div>
            )}
            {uploading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(20,20,20,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: 20,
                  height: 20,
                  border: `2px solid ${T.teal500}`,
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
              </div>
            )}
          </div>
          {value && (
            <button
              type="button"
              onClick={onRemove}
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: T.ink600,
                border: `1px solid ${T.ink500}`,
                color: T.muted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <X size={10} />
            </button>
          )}
        </div>

        {/* Path input + upload */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>{label} Path / URL</span>
              {hasChanged && (
                <button
                  type="button"
                  onClick={() => onRename?.(initialValue!, value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    background: 'rgba(212,159,61,0.1)',
                    border: `1px solid ${T.gold500}`,
                    borderRadius: 2,
                    color: T.gold400,
                    fontSize: 9,
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={9} /> Sync Storage
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <FileText
                  size={12}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.faint }}
                />
                <input
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 30, fontSize: 11 }}
                  placeholder="gs://... or menu-items/..."
                />
              </div>
              {value && (
                <button
                  type="button"
                  onClick={onDownload}
                  style={{
                    background: T.ink600,
                    border: `1px solid ${T.ink500}`,
                    borderRadius: 2,
                    color: T.muted,
                    cursor: 'pointer',
                    padding: '0 10px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Download size={14} />
                </button>
              )}
            </div>
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            background: T.ink600,
            border: `1px solid ${T.ink500}`,
            borderRadius: 2,
            color: uploading ? T.faint : T.muted,
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.5 : 1,
            transition: 'border-color 0.15s, color 0.15s',
          }}>
            <Upload size={12} style={{ animation: uploading ? 'bounce 0.8s infinite' : 'none' }} />
            {uploading ? 'Uploading...' : (value ? 'Change Image' : 'Upload Image')}
            <input
              type="file"
              style={{ display: 'none' }}
              accept="image/*"
              onChange={onUpload}
              onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
              disabled={uploading}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

// ─── Shared button components ─────────────────────────────────────────────────
const TealBtn: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ onClick, children, disabled }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        background: hov ? T.teal400 : T.teal500,
        border: 'none',
        borderRadius: 2,
        color: '#0a0a0a',
        fontFamily: "'Oswald', sans-serif",
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  );
};

const GhostBtn: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}> = ({ onClick, children, disabled, danger }) => {
  const [hov, setHov] = useState(false);
  const borderColor = danger
    ? (hov ? T.red500 : T.ink500)
    : (hov ? T.borderStrong : T.ink500);
  const color = danger
    ? (hov ? T.red500 : T.muted)
    : (hov ? T.cream100 : T.muted);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        background: 'none',
        border: `1px solid ${borderColor}`,
        borderRadius: 2,
        color,
        fontFamily: "'Oswald', sans-serif",
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  );
};

// ─── Main Dashboard component ─────────────────────────────────────────────────
export default function Dashboard() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [costingItem, setCostingItem] = useState<MenuItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'ipad' | 'iphone'>('ipad');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isSaving, setIsSaving] = useState(false);
  const [isFixingBuckets, setIsFixingBuckets] = useState(false);
  const [isClearingImages, setIsClearingImages] = useState(false);
  const [showTranslationDescriptions, setShowTranslationDescriptions] = useState(false);
  const [initialPaths, setInitialPaths] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    name_chinese: '',
    name_russian: '',
    name_thai: '',
    description: '',
    description_chinese: '',
    description_russian: '',
    description_thai: '',
    price: '',
    priceLabel: '',
    price2: '',
    price2Label: '',
    price3: '',
    price3Label: '',
    price4: '',
    price4Label: '',
    category: 'Smoothie Bowls',
    image: '',
    secondaryImage: '',
    promoImages: [],
    published: true,
    order: 0
  });

  useEffect(() => {
    if (isAdding && !editingItem) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isAdding, editingItem]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 4000);

    const q = query(collection(db, 'menu'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const menuItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MenuItem[];
      setItems(menuItems);
      setLoading(false);
    }, (err) => {
      console.error("Menu snapshot error:", err);
      setLoading(false);
    });

    const categoriesQuery = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setCategoriesList(cats);
    }, (err) => {
      handleFirestoreError(err, 'list', 'categories');
    });

    return () => {
      unsubscribe();
      unsubscribeCategories();
      clearTimeout(timer);
    };
  }, []);

  const categories = useMemo(() => {
    const fromCollection = categoriesList.map(c => c.name);
    const fromItems = items.map(item => item.category);
    const allUnique = Array.from(new Set([...fromCollection, ...fromItems]));
    if (!allUnique.includes('Soup & Salad')) allUnique.push('Soup & Salad');
    return ['All', ...allUnique.sort()];
  }, [items, categoriesList]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, filterCategory]);

  const fixImageBuckets = async () => {
    if (!window.confirm('This will scan all menu items and update any old image URLs to use your current storage bucket. This helps fix "Permission Denied" errors for images from old projects. Continue?')) return;
    setIsFixingBuckets(true);
    let fixedCount = 0;
    try {
      const currentBucket = firebaseConfig.storageBucket || 'hemingways-jomtien-website.firebasestorage.app';
      const batch = writeBatch(db);
      items.forEach(item => {
        let needsUpdate = false;
        const updatedItem: any = {};
        const fields: (keyof MenuItem)[] = ['image', 'secondaryImage', 'highResImage', 'socialImage', 'primaryPhotoPath', 'secondaryPhotoPath'];
        fields.forEach(field => {
          const url = item[field] as string;
          if (url && url.startsWith('gs://') && !url.includes(currentBucket)) {
            const parts = url.split('/');
            const path = parts.slice(3).join('/');
            updatedItem[field] = `gs://${currentBucket}/${path}`;
            needsUpdate = true;
          }
        });
        if (item.promoImages && Array.isArray(item.promoImages)) {
          const newPromos = item.promoImages.map(url => {
            if (url && url.startsWith('gs://') && !url.includes(currentBucket)) {
              const parts = url.split('/');
              const path = parts.slice(3).join('/');
              needsUpdate = true;
              return `gs://${currentBucket}/${path}`;
            }
            return url;
          });
          if (needsUpdate) updatedItem.promoImages = newPromos;
        }
        if (needsUpdate && item.id) {
          batch.update(doc(db, 'menu', item.id), updatedItem);
          fixedCount++;
        }
      });
      if (fixedCount > 0) {
        await batch.commit();
        setSuccess(`Successfully updated ${fixedCount} items with correct bucket URLs!`);
        toast.success(`Fixed ${fixedCount} items!`);
      } else {
        setSuccess('All items are already using the correct bucket.');
        toast.info('No items needed fixing.');
      }
    } catch (err) {
      console.error("Fix buckets error:", err);
      setError('Failed to update bucket URLs.');
      toast.error('Failed to fix bucket URLs');
    } finally {
      setIsFixingBuckets(false);
    }
  };

  const clearAllImages = async () => {
    if (!window.confirm('WARNING: This will remove ALL image references from ALL menu items in the database. This is a "Fresh Start" action. Local files in /public/menu will NOT be affected, but the database will no longer point to them. Continue?')) return;
    setIsClearingImages(true);
    let clearedCount = 0;
    try {
      const batch = writeBatch(db);
      items.forEach(item => {
        if (item.id) {
          batch.update(doc(db, 'menu', item.id), {
            image: '',
            secondaryImage: '',
            highResImage: '',
            socialImage: '',
            primaryPhotoPath: '',
            secondaryPhotoPath: '',
            promoImages: []
          });
          clearedCount++;
        }
      });
      if (clearedCount > 0) {
        await batch.commit();
        setSuccess(`Successfully cleared image references for ${clearedCount} items!`);
        toast.success(`Cleared ${clearedCount} items!`);
        imageService.clearCache();
      }
    } catch (err) {
      console.error("Clear images error:", err);
      setError('Failed to clear image references.');
      toast.error('Failed to clear images');
    } finally {
      setIsClearingImages(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex) as MenuItem[];
      setItems(newItems);
      try {
        const batch = writeBatch(db);
        newItems.forEach((item, index) => {
          if (item.id) {
            const itemRef = doc(db, 'menu', item.id);
            batch.update(itemRef, { order: index });
          }
        });
        await batch.commit();
        setSuccess('Menu order updated!');
      } catch (err) {
        console.error("Error updating order:", err);
        setError('Failed to save new order.');
        handleFirestoreError(err, 'update', 'menu');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const { id, ...dataToSave } = formData;
      const cleanData = Object.fromEntries(
        Object.entries(dataToSave).filter(([_, v]) => v !== undefined)
      );
      if (editingItem?.id) {
        await updateDoc(doc(db, 'menu', editingItem.id), {
          ...cleanData,
          uid: auth.currentUser?.uid || null
        });
        await logActivity('Menu Item Updated', `Updated menu item: ${formData.name}`, 'menu');
        setSuccess('Item updated successfully!');
      } else {
        await addDoc(collection(db, 'menu'), {
          ...cleanData,
          uid: auth.currentUser?.uid || null
        });
        await logActivity('Menu Item Created', `Created menu item: ${formData.name}`, 'menu');
        setSuccess('Item added successfully!');
      }
      resetForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error("Save error:", err);
      setError('Failed to save item. Check permissions.');
      handleFirestoreError(err, editingItem ? 'update' : 'create', 'menu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'menu', id));
      await logActivity('Menu Item Deleted', `Deleted menu item ID: ${id}`, 'menu');
      setSuccess('Item deleted successfully!');
    } catch (err) {
      handleFirestoreError(err, 'delete', `menu/${id}`);
    }
  };

  const togglePublished = async (item: MenuItem) => {
    try {
      await updateDoc(doc(db, 'menu', item.id!), { published: !item.published });
      await logActivity('Menu Item Visibility Toggled', `${item.published ? 'Unpublished' : 'Published'} menu item: ${item.name}`, 'menu');
    } catch (err) {
      handleFirestoreError(err, 'update', `menu/${item.id}`);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setIsAdding(false);
    setInitialPaths({});
    setFormData({
      name: '', name_chinese: '', name_russian: '', name_thai: '',
      description: '', description_chinese: '', description_russian: '', description_thai: '',
      price: '', priceLabel: '', price2: '', price2Label: '',
      price3: '', price3Label: '', price4: '', price4Label: '',
      category: 'Smoothie Bowls',
      image: '', secondaryImage: '',
      primaryPhotoPath: '', secondaryPhotoPath: '',
      highResImage: '', socialImage: '',
      promoImages: [], published: true, order: 0
    });
  };

  const slugify = (text: string) => {
    if (!text) return 'item';
    const slug = text.toString().trim().toLowerCase()
      .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
    return slug || `item-${Date.now()}`;
  };

  const startAdd = () => {
    setEditingItem(null);
    setInitialPaths({});
    setFormData({
      name: '', name_chinese: '', name_russian: '', name_thai: '',
      description: '', description_chinese: '', description_russian: '', description_thai: '',
      price: '', priceLabel: '', price2: '', price2Label: '',
      price3: '', price3Label: '', price4: '', price4Label: '',
      category: 'Smoothie Bowls',
      image: '', secondaryImage: '',
      primaryPhotoPath: '', secondaryPhotoPath: '',
      highResImage: '', socialImage: '',
      promoImages: [], published: true, order: 0
    });
    setIsAdding(true);
  };

  const startEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData(item);
    setInitialPaths({
      image: item.image || '',
      secondaryImage: item.secondaryImage || '',
      primaryPhotoPath: item.primaryPhotoPath || '',
      secondaryPhotoPath: item.secondaryPhotoPath || '',
      highResImage: item.highResImage || '',
      socialImage: item.socialImage || '',
      ...(item.promoImages || []).reduce((acc, url, i) => ({ ...acc, [`promo_${i}`]: url }), {})
    });
    setIsAdding(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'image' | 'secondaryImage' | 'highResImage' | 'socialImage' | 'promoImages' | 'primaryPhotoPath' | 'secondaryPhotoPath',
    index?: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isHighRes = field === 'highResImage';
    const maxSize = isHighRes ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
    const maxSizeLabel = isHighRes ? "50MB" : "20MB";
    if (file.size > maxSize) {
      setError(`File is too large. Please upload an image smaller than ${maxSizeLabel}.`);
      toast.error(`File too large (>${maxSizeLabel})`);
      return;
    }
    setUploading(true);
    setError(null);
    let storagePath = '';
    try {
      const itemSlug = formData.name ? slugify(formData.name) : `item_${Date.now()}`;
      let fileName = file.name.replace(/\s+/g, '_');
      if (field === 'image') fileName = `primary_${Date.now()}_${fileName}`;
      else if (field === 'primaryPhotoPath') fileName = `direct_primary_${Date.now()}_${fileName}`;
      else if (field === 'secondaryPhotoPath') fileName = `direct_secondary_${Date.now()}_${fileName}`;
      else if (field === 'secondaryImage') fileName = `secondary_${Date.now()}_${fileName}`;
      else if (field === 'highResImage') fileName = `highres_${Date.now()}_${fileName}`;
      else if (field === 'socialImage') fileName = `social_${Date.now()}_${fileName}`;
      else if (field === 'promoImages') fileName = `promo_${index ?? Date.now()}_${fileName}`;
      storagePath = `menu-items/${itemSlug}/${fileName}`;

      let fileToUpload: File | Blob = file;
      if (file.type.startsWith("image/") && !file.name.endsWith(".svg")) {
        try {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const webpBlob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((blob) => resolve(blob), "image/webp", 0.85);
            });
            if (webpBlob) {
              const cleanName = fileName.replace(/\.[^/.]+$/, "");
              fileToUpload = new File([webpBlob], `${cleanName}.webp`, { type: "image/webp" });
              const pathParts = storagePath.split('.');
              if (pathParts.length > 1) { pathParts[pathParts.length - 1] = 'webp'; storagePath = pathParts.join('.'); }
              else storagePath = `${storagePath}.webp`;
            }
          }
          URL.revokeObjectURL(img.src);
        } catch (webpErr) {
          fileToUpload = file;
        }
      }

      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, fileToUpload);
      const gsUrl = `gs://${firebaseConfig.storageBucket || 'hemingways-jomtien-website.firebasestorage.app'}/${storagePath}`;
      imageService.clearCache(gsUrl);

      setInitialPaths(prev => {
        const key = field === 'promoImages' && typeof index === 'number' ? `promo_${index}` : field;
        return { ...prev, [key]: gsUrl };
      });

      if (field === 'promoImages' && typeof index === 'number') {
        setFormData(prev => {
          const newPromos = [...(prev.promoImages || [])];
          newPromos[index] = gsUrl;
          return { ...prev, promoImages: newPromos };
        });
      } else if (field === 'promoImages') {
        setFormData(prev => ({ ...prev, promoImages: [...(prev.promoImages || []), gsUrl] }));
      } else {
        setFormData(prev => ({ ...prev, [field]: gsUrl }));
      }
      setSuccess('File uploaded successfully!');
      toast.success('Image uploaded successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';
      setError(`Failed to upload file: ${errorMessage}. Check storage permissions in Firebase Console.`);
      toast.error(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (gsUrl: string) => {
    if (!gsUrl) return;
    try {
      let downloadUrl = gsUrl;
      if (gsUrl.startsWith('gs://')) {
        const parts = gsUrl.split('/');
        const bucket = parts[2];
        const path = parts.slice(3).join('/');
        downloadUrl = window.location.origin + `/api/image-proxy?path=${encodeURIComponent(path)}&bucket=${encodeURIComponent(bucket)}`;
      } else if (gsUrl.startsWith('/')) {
        downloadUrl = window.location.origin + gsUrl;
      }
      try {
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = gsUrl.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (fetchErr) {
        window.open(downloadUrl, '_blank');
      }
    } catch (err) {
      setError("Failed to download file.");
    }
  };

  const handleRenameFile = async (
    oldGsUrl: string,
    newGsUrl: string,
    field: 'image' | 'secondaryImage' | 'highResImage' | 'socialImage' | 'promoImages' | 'primaryPhotoPath' | 'secondaryPhotoPath',
    index?: number
  ) => {
    if (!oldGsUrl || !newGsUrl || oldGsUrl === newGsUrl) return;
    if (!oldGsUrl.startsWith('gs://') || !newGsUrl.startsWith('gs://')) {
      setError("Only gs:// paths can be renamed in storage.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const oldPath = oldGsUrl.replace('gs://', '').split('/').slice(1).join('/');
      const newPath = newGsUrl.replace('gs://', '').split('/').slice(1).join('/');
      const response = await fetch('/api/rename-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullPath: oldPath, newPath })
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error! status: ${response.status}`);
      }
      setInitialPaths(prev => {
        const key = field === 'promoImages' ? `promo_${index}` : field;
        return { ...prev, [key]: newGsUrl };
      });
      setSuccess(`File successfully moved in storage to: ${newPath}`);
    } catch (err) {
      setError("Failed to rename file in storage.");
    } finally {
      setUploading(false);
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: T.ink850,
    }}>
      <div style={{
        width: 36,
        height: 36,
        border: `2px solid ${T.teal500}`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.ink850, minHeight: '100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        input:focus, textarea:focus, select:focus { outline: none; border-color: ${T.gold400} !important; box-shadow: 0 0 0 2px rgba(227,184,96,0.18); }
        input::placeholder, textarea::placeholder { color: ${T.faint}; }
        select option { background: ${T.ink700}; color: ${T.cream50}; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${T.ink800}; }
        ::-webkit-scrollbar-thumb { background: ${T.ink500}; border-radius: 2px; }
      `}</style>

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <header style={{
        background: T.ink800,
        borderBottom: `1px solid ${T.border}`,
        padding: '20px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: T.gold400,
            marginBottom: 4,
          }}>
            Dashboard
          </div>
          <h1 style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: 28,
            color: T.cream50,
            margin: 0,
            lineHeight: 1,
            letterSpacing: '0.02em',
          }}>
            MENU MANAGEMENT
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <GhostBtn onClick={fixImageBuckets} disabled={isFixingBuckets}>
            {isFixingBuckets ? 'Fixing...' : 'Fix Buckets'}
          </GhostBtn>
          <GhostBtn onClick={clearAllImages} disabled={isClearingImages} danger>
            {isClearingImages ? 'Clearing...' : 'Clear Images'}
          </GhostBtn>
          <TealBtn onClick={startAdd}>
            <Plus size={14} /> Add Item
          </TealBtn>
        </div>
      </header>

      {/* ── Toolbar: search + category filter ──────────────────────────────── */}
      <div style={{
        background: T.ink800,
        borderBottom: `1px solid ${T.border}`,
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.gold400 }}
          />
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              ...inputStyle,
              paddingLeft: 34,
              background: T.ink700,
              borderRadius: 2,
            }}
          />
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: '2 1 300px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 12px',
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                color: filterCategory === cat ? T.cream50 : T.faint,
                borderBottom: filterCategory === cat ? `2px solid ${T.gold500}` : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Item count */}
        <div style={{
          background: T.ink700,
          borderRadius: 2,
          padding: '4px 12px',
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 600,
          fontSize: 12,
          color: T.gold400,
          whiteSpace: 'nowrap',
        }}>
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Inline messages ─────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          margin: '16px 28px 0',
          padding: '12px 16px',
          background: 'rgba(225,30,21,0.1)',
          border: `1px solid ${T.red500}`,
          borderRadius: 2,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <AlertCircle size={16} style={{ color: T.red500, flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: T.red500, margin: '0 0 2px' }}>Error</p>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: T.cream100, margin: 0 }}>{error}</p>
            {!auth.currentUser && (
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: T.red500, marginTop: 6 }}>
                You are currently logged out. Storage uploads require authentication.
              </p>
            )}
          </div>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div style={{
          margin: '16px 28px 0',
          padding: '12px 16px',
          background: 'rgba(29,160,168,0.1)',
          border: `1px solid ${T.teal500}`,
          borderRadius: 2,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}>
          <Check size={16} style={{ color: T.teal500 }} />
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: T.cream100, margin: 0 }}>{success}</p>
          <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 2, marginLeft: 'auto' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Digital Menu Preview Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showPreview && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              style={{
                background: T.ink800,
                border: `1px solid ${T.border}`,
                borderRadius: 4,
                boxShadow: T.shadowPop,
                display: 'flex',
                flexDirection: 'column',
                width: previewDevice === 'ipad' ? '90vw' : 390,
                height: previewDevice === 'ipad' ? '90vh' : 760,
                maxHeight: '95vh',
                overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '14px 20px',
                borderBottom: `1px solid ${T.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <h3 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: T.cream50, margin: 0, flex: 1 }}>
                  Digital Menu Preview
                </h3>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['ipad', 'iphone'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setPreviewDevice(d)}
                      style={{
                        padding: '4px 12px',
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        background: previewDevice === d ? T.ink600 : 'none',
                        border: `1px solid ${previewDevice === d ? T.gold500 : T.ink500}`,
                        borderRadius: 2,
                        color: previewDevice === d ? T.gold400 : T.faint,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {d === 'ipad' ? 'iPad' : 'iPhone'}
                    </button>
                  ))}
                </div>
                <Link
                  to="/digital-menu"
                  target="_blank"
                  style={{ color: T.muted, display: 'flex', alignItems: 'center', padding: 6 }}
                >
                  <Globe size={16} />
                </Link>
                <button
                  onClick={() => setShowPreview(false)}
                  style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 6 }}
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ flex: 1, background: T.ink700, overflow: 'hidden' }}>
                <iframe
                  src={`${window.location.origin}/digital-menu?preview=true`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Digital Menu Preview"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit / Add Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAdding && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '40px 16px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            overflowY: 'auto',
          }}>
            <motion.div
              ref={formRef}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              style={{
                background: T.ink800,
                border: `1px solid ${T.border}`,
                borderRadius: 4,
                boxShadow: T.shadowPop,
                width: '100%',
                maxWidth: 640,
                overflow: 'hidden',
              }}
            >
              {/* Modal header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${T.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <h2 style={{
                  fontFamily: "'Anton', sans-serif",
                  fontSize: 24,
                  color: T.cream50,
                  margin: 0,
                  letterSpacing: '0.02em',
                }}>
                  {editingItem ? 'EDIT ITEM' : 'ADD ITEM'}
                </h2>
                <button
                  onClick={resetForm}
                  style={{
                    background: T.ink600,
                    border: `1px solid ${T.ink500}`,
                    borderRadius: 2,
                    color: T.muted,
                    cursor: 'pointer',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} style={{ padding: 24 }}>
                {/* ── BASIC INFO ── */}
                <div style={{ ...sectionDividerStyle }}>Basic Info</div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>
                    <Globe size={11} style={{ display: 'inline', marginRight: 4 }} />
                    English Name *
                  </label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g. Mixed Berry Smoothie Bowl"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>English Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    style={{ ...inputStyle, height: 80, resize: 'vertical' }}
                  />
                </div>

                {/* ── PRICING ── */}
                <div style={{ ...sectionDividerStyle, marginTop: 20 }}>Pricing</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input
                    value={formData.priceLabel}
                    onChange={e => setFormData({ ...formData, priceLabel: e.target.value })}
                    style={{ ...inputStyle, fontSize: 13 }}
                    placeholder="Primary Label (e.g. Small)"
                  />
                  <input
                    required
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    style={{ ...inputStyle, fontSize: 13 }}
                    placeholder="Primary Price"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input value={formData.price2Label} onChange={e => setFormData({ ...formData, price2Label: e.target.value })} style={{ ...inputStyle, fontSize: 13 }} placeholder="Label 2" />
                  <input value={formData.price2} onChange={e => setFormData({ ...formData, price2: e.target.value })} style={{ ...inputStyle, fontSize: 13 }} placeholder="Price 2" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input value={formData.price3Label} onChange={e => setFormData({ ...formData, price3Label: e.target.value })} style={{ ...inputStyle, fontSize: 13 }} placeholder="Label 3" />
                  <input value={formData.price3} onChange={e => setFormData({ ...formData, price3: e.target.value })} style={{ ...inputStyle, fontSize: 13 }} placeholder="Price 3" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <input value={formData.price4Label} onChange={e => setFormData({ ...formData, price4Label: e.target.value })} style={{ ...inputStyle, fontSize: 13 }} placeholder="Label 4" />
                  <input value={formData.price4} onChange={e => setFormData({ ...formData, price4: e.target.value })} style={{ ...inputStyle, fontSize: 13 }} placeholder="Price 4" />
                </div>

                {/* Category */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>
                    <Tag size={11} style={{ display: 'inline', marginRight: 4 }} />
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    style={{ ...inputStyle }}
                  >
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Visibility toggle */}
                <div style={{
                  background: T.ink700,
                  border: `1px solid ${T.ink500}`,
                  borderRadius: 2,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                }}>
                  <div>
                    <div style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                      color: T.cream50,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 2,
                    }}>
                      {formData.published
                        ? <Eye size={14} style={{ color: T.teal500 }} />
                        : <EyeOff size={14} style={{ color: T.faint }} />}
                      Menu Visibility
                    </div>
                    <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: T.faint, margin: 0 }}>
                      {formData.published
                        ? 'Visible on the digital menu.'
                        : 'Hidden from the digital menu.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, published: !formData.published })}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: formData.published ? T.teal500 : T.ink500,
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 3,
                      left: formData.published ? 23 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </div>

                {/* ── TRANSLATIONS ── */}
                <div style={{ ...sectionDividerStyle }}>Translations</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Chinese Name</label>
                    <input value={formData.name_chinese} onChange={e => setFormData({ ...formData, name_chinese: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Russian Name</label>
                    <input value={formData.name_russian} onChange={e => setFormData({ ...formData, name_russian: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Thai Name</label>
                    <input value={formData.name_thai} onChange={e => setFormData({ ...formData, name_thai: e.target.value })} style={inputStyle} />
                  </div>
                </div>

                {/* Translation descriptions accordion */}
                <div style={{ marginBottom: 20 }}>
                  <button
                    type="button"
                    onClick={() => setShowTranslationDescriptions(!showTranslationDescriptions)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: T.faint,
                      padding: '8px 0',
                      borderTop: `1px solid ${T.border}`,
                    }}
                  >
                    Translation Descriptions
                    {showTranslationDescriptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <AnimatePresence>
                    {showTranslationDescriptions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ display: 'grid', gap: 10, paddingTop: 12 }}>
                          {(['chinese', 'russian', 'thai'] as const).map(lang => (
                            <div key={lang}>
                              <label style={labelStyle}>{lang.charAt(0).toUpperCase() + lang.slice(1)} Description</label>
                              <textarea
                                value={(formData as any)[`description_${lang}`]}
                                onChange={e => setFormData({ ...formData, [`description_${lang}`]: e.target.value })}
                                style={{ ...inputStyle, height: 64, resize: 'vertical', fontSize: 13 }}
                              />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── IMAGES ── */}
                <div style={{ ...sectionDividerStyle }}>Images</div>

                <ImageSlot
                  label="Primary Photo"
                  value={formData.primaryPhotoPath || ''}
                  initialValue={initialPaths.primaryPhotoPath}
                  onUpload={(e) => handleFileUpload(e, 'primaryPhotoPath')}
                  onRemove={() => setFormData(prev => ({ ...prev, primaryPhotoPath: '' }))}
                  onChange={(val) => setFormData(prev => ({ ...prev, primaryPhotoPath: val }))}
                  onDownload={() => handleDownload(formData.primaryPhotoPath || '')}
                  onRename={(old, curr) => handleRenameFile(old, curr, 'primaryPhotoPath')}
                  uploading={uploading}
                />

                {/* ── Actions ── */}
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      flex: 1,
                      padding: '11px 0',
                      background: 'none',
                      border: `1px solid ${T.ink500}`,
                      borderRadius: 2,
                      color: T.muted,
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    Cancel
                  </button>
                  {editingItem && (
                    <button
                      type="button"
                      onClick={() => { resetForm(); handleDelete(editingItem.id!); }}
                      style={{
                        padding: '11px 18px',
                        background: 'none',
                        border: `1px solid ${T.red500}`,
                        borderRadius: 2,
                        color: T.red500,
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 600,
                        fontSize: 13,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving || uploading}
                    style={{
                      flex: 2,
                      padding: '11px 0',
                      background: (isSaving || uploading) ? T.ink600 : T.teal500,
                      border: 'none',
                      borderRadius: 2,
                      color: (isSaving || uploading) ? T.faint : '#0a0a0a',
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: (isSaving || uploading) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'background 0.15s',
                    }}
                  >
                    {isSaving ? (
                      <div style={{
                        width: 14,
                        height: 14,
                        border: `2px solid ${T.faint}`,
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                    ) : (
                      <Save size={14} />
                    )}
                    {isSaving ? 'Saving...' : (editingItem ? 'Update Item' : 'Save Item')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: T.ink800,
            }}>
              <thead>
                <tr style={{
                  background: T.ink850,
                  borderBottom: `1px solid ${T.border}`,
                }}>
                  <th style={{ width: 36, padding: '10px 12px' }} />
                  {['Item', 'Category', 'Price', 'Status', 'Actions'].map((col, i) => (
                    <th
                      key={col}
                      style={{
                        padding: '10px 16px',
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 600,
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: T.faint,
                        textAlign: i === 4 ? 'right' : 'left',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={filteredItems.map(i => i.id!)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredItems.map(item => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      startEdit={startEdit}
                      handleDelete={handleDelete}
                      togglePublished={togglePublished}
                      startCosting={setCostingItem}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {filteredItems.length === 0 && (
            <div style={{
              background: T.ink700,
              border: `2px dashed ${T.border}`,
              borderTop: 'none',
              padding: '60px 24px',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: 18,
                color: T.cream100,
                marginBottom: 8,
              }}>
                No items found
              </div>
              <p style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: 13,
                color: T.faint,
                marginBottom: 20,
              }}>
                {searchTerm || filterCategory !== 'All'
                  ? 'Try adjusting your search or filter.'
                  : 'Get started by adding your first menu item.'}
              </p>
              <TealBtn onClick={startAdd}>
                <Plus size={14} /> Add Item
              </TealBtn>
            </div>
          )}
        </DndContext>
      </div>

      {/* Food cost calculator panel */}
      {costingItem && (
        <MenuItemCosting
          item={costingItem}
          onClose={() => setCostingItem(null)}
        />
      )}
    </div>
  );
}

