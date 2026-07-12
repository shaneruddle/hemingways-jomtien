import { useState, useEffect } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { logActivity } from '../utils/logger';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff, FileText } from 'lucide-react';
import RichTextEditor from './ui/RichTextEditor';

export interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  heroImage: string;
  published: boolean;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

const EMPTY: BlogPost = {
  title: '', slug: '', excerpt: '', body: '', heroImage: '',
  published: false, date: new Date().toISOString().slice(0, 10),
};

export const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500';
const LBL_CLS = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1';

export default function BlogDashboard() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'blog_posts'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost)));
      setLoading(false);
    }, err => {
      console.error('Error loading blog posts:', err);
      toast.error('Failed to load blog posts');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const save = async () => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) { toast.error('Title is required'); return; }
    const slug = editing.slug.trim() || slugify(title);
    if (posts.some(p => p.slug === slug && p.id !== editing.id)) {
      toast.error('That slug is already used by another post');
      return;
    }
    setSaving(true);
    const payload = {
      title,
      slug,
      excerpt: editing.excerpt.trim(),
      body: editing.body,
      heroImage: editing.heroImage.trim(),
      published: editing.published,
      date: editing.date || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    };
    try {
      if (editing.id) {
        await updateDoc(doc(db, 'blog_posts', editing.id), payload);
        logActivity('Blog Post Updated', `Updated: ${title}`, 'menu');
        toast.success('Post updated');
      } else {
        await addDoc(collection(db, 'blog_posts'), { ...payload, createdAt: new Date().toISOString() });
        logActivity('Blog Post Created', `Created: ${title}`, 'menu');
        toast.success('Post created');
      }
      setEditing(null);
    } catch (err) {
      console.error('Error saving blog post:', err);
      toast.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (post: BlogPost) => {
    if (!post.id) return;
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'blog_posts', post.id));
      logActivity('Blog Post Deleted', `Deleted: ${post.title}`, 'menu');
      toast.success('Post deleted');
    } catch (err) {
      console.error('Error deleting blog post:', err);
      toast.error('Failed to delete post');
    }
  };

  const togglePublished = async (post: BlogPost) => {
    if (!post.id) return;
    try {
      await updateDoc(doc(db, 'blog_posts', post.id), {
        published: !post.published,
        updatedAt: new Date().toISOString(),
      });
      toast.success(post.published ? 'Post unpublished' : 'Post published');
    } catch (err) {
      console.error('Error updating blog post:', err);
      toast.error('Failed to update post');
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={22} /> Blog
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Write and publish news, events and updates for the website.</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-sm font-semibold"
          >
            <Plus size={16} /> New Post
          </button>
        )}
      </div>

      {editing && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Edit Post' : 'New Post'}</h2>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={LBL_CLS}>Title</label>
              <input
                className={INPUT_CLS}
                value={editing.title}
                onChange={e => setEditing({
                  ...editing,
                  title: e.target.value,
                  slug: editing.id ? editing.slug : slugify(e.target.value),
                })}
                placeholder="Quiz night is back every Monday"
              />
            </div>
            <div>
              <label className={LBL_CLS}>Slug (URL)</label>
              <input
                className={INPUT_CLS}
                value={editing.slug}
                onChange={e => setEditing({ ...editing, slug: slugify(e.target.value) })}
                placeholder="quiz-night-is-back"
              />
            </div>
            <div>
              <label className={LBL_CLS}>Date</label>
              <input
                type="date"
                className={INPUT_CLS}
                value={editing.date}
                onChange={e => setEditing({ ...editing, date: e.target.value })}
              />
            </div>
            <div>
              <label className={LBL_CLS}>Hero image (path or URL)</label>
              <input
                className={INPUT_CLS}
                value={editing.heroImage}
                onChange={e => setEditing({ ...editing, heroImage: e.target.value })}
                placeholder="/assets/roast-food.jpg"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className={LBL_CLS}>Excerpt (shown on the blog list)</label>
            <textarea
              className={INPUT_CLS}
              rows={2}
              value={editing.excerpt}
              onChange={e => setEditing({ ...editing, excerpt: e.target.value })}
              placeholder="A short one or two line summary."
            />
          </div>

          <div className="mb-4">
            <label className={LBL_CLS}>Body</label>
            <RichTextEditor
              value={editing.body}
              onChange={html => setEditing({ ...editing, body: html })}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={editing.published}
                onChange={e => setEditing({ ...editing, published: e.target.checked })}
              />
              Published (visible on the website)
            </label>
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-md text-sm font-semibold"
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading posts...</p>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-10 text-center">
          <p className="text-gray-500 text-sm">No posts yet. Click "New Post" to write the first one.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Title</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Slug</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Date</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-right font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{post.title}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">/{post.slug}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{post.date}</td>
                  <td className="px-4 py-3">
                    <span className={'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ' + (post.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                      {post.published ? <Eye size={12} /> : <EyeOff size={12} />}
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => togglePublished(post)} className="p-2 text-gray-500 hover:text-amber-600" title={post.published ? 'Unpublish' : 'Publish'}>
                        {post.published ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => setEditing(post)} className="p-2 text-gray-500 hover:text-blue-600" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => remove(post)} className="p-2 text-gray-500 hover:text-red-600" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
