import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar } from 'lucide-react';
import DOMPurify from 'dompurify';
import { db } from '../firebase';
import { normalizeImageUrl } from '../utils/images';
import { FirebaseImage } from './ui/FirebaseImage';
import type { BlogPost } from './BlogDashboard';

export const usePublishedPosts = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'blog_posts'),
      where('published', '==', true),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost)));
      setLoading(false);
    }, err => {
      console.error('Error loading blog posts:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { posts, loading };
};

const formatDate = (d: string) => {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const isHtml = (text: string) => /<(p|h2|h3|ul|ol|li|strong|em|blockquote|a|br)\b/i.test(text || '');

// Legacy fallback: posts written before the rich text editor used simple markdown
const renderInline = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ color: 'var(--cream-50)' }}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
};

const LegacyMarkdown = ({ text }: { text: string }) => {
  const blocks = (text || '').split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        if (lines.every(l => l.trim().startsWith('- '))) {
          return (
            <ul key={i} style={{ margin: '0 0 20px', paddingLeft: 20, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.8 }}>
              {lines.map((l, j) => <li key={j}>{renderInline(l.trim().slice(2))}</li>)}
            </ul>
          );
        }
        if (block.startsWith('## ') || block.startsWith('# ')) {
          return (
            <h2 key={i} style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--cream-50)', textTransform: 'uppercase', margin: '32px 0 14px' }}>
              {block.replace(/^#+\s*/, '')}
            </h2>
          );
        }
        return (
          <p key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.8, margin: '0 0 20px' }}>
            {renderInline(block)}
          </p>
        );
      })}
    </>
  );
};

export const PostBody = ({ text }: { text: string }) => {
  if (!isHtml(text)) return <LegacyMarkdown text={text} />;
  const clean = DOMPurify.sanitize(text || '', {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 's', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
  return <div className="hw-post-body" dangerouslySetInnerHTML={{ __html: clean }} />;
};

export const BlogList = () => {
  const { posts, loading } = usePublishedPosts();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Blog | Hemingways Jomtien';
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-850)' }}>
      <section style={{ background: 'var(--ink-900)', padding: '140px 24px 56px' }}>
        <div style={{ maxWidth: 'var(--container)', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: 12 }}>
            <span className="hw-badge hw-badge-teal">News & Events</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 5vw, 58px)', color: 'var(--cream-50)', textTransform: 'uppercase', margin: '0 0 14px' }}>
            The Blog
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--text-muted)', maxWidth: 620, margin: '0 auto', lineHeight: 1.7 }}>
            What's on at Hemingways Jomtien — events, sport, new dishes and everything in between.
          </p>
        </div>
      </section>

      <section style={{ padding: '56px 24px 80px' }}>
        <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
          {loading ? (
            <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', textAlign: 'center' }}>Loading posts...</p>
          ) : posts.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', textAlign: 'center' }}>No posts yet — check back soon.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  viewport={{ once: true }}
                >
                  <Link to={`/blog/${post.slug}`} onClick={() => window.scrollTo(0, 0)} style={{ textDecoration: 'none', display: 'block' }}>
                    <div className="hw-card" style={{ overflow: 'hidden', height: '100%' }}>
                      {post.heroImage && (
                        <FirebaseImage
                          src={normalizeImageUrl(post.heroImage)}
                          alt={post.title}
                          className="w-full"
                          style={{ height: 190, objectFit: 'cover', width: '100%' }}
                        />
                      )}
                      <div style={{ padding: '22px 22px 26px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: 10 }}>
                          <Calendar size={12} /> {formatDate(post.date)}
                        </div>
                        <h2 style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 19, color: 'var(--cream-50)', textTransform: 'uppercase', margin: '0 0 10px', lineHeight: 1.3 }}>
                          {post.title}
                        </h2>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                          {post.excerpt}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export const BlogPostPage = () => {
  const { slug } = useParams();
  const { posts, loading } = usePublishedPosts();
  const post = posts.find(p => p.slug === slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (post) document.title = `${post.title} | Hemingways Jomtien`;
  }, [post]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink-850)', paddingTop: 160, textAlign: 'center', fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink-850)', paddingTop: 160, textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--cream-50)', textTransform: 'uppercase' }}>Post Not Found</h1>
        <Link to="/blog" className="hw-btn-warm" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <ArrowLeft size={16} /> Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-850)' }}>
      <article style={{ maxWidth: 780, margin: '0 auto', padding: '140px 24px 80px' }}>
        <Link to="/blog" onClick={() => window.scrollTo(0, 0)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-condensed)', fontWeight: 600, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-400)', textDecoration: 'none', marginBottom: 24 }}>
          <ArrowLeft size={14} /> All Posts
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: 12 }}>
          <Calendar size={12} /> {formatDate(post.date)}
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4.5vw, 48px)', color: 'var(--cream-50)', textTransform: 'uppercase', margin: '0 0 24px', lineHeight: 1.15 }}>
          {post.title}
        </h1>

        {post.heroImage && (
          <FirebaseImage
            src={normalizeImageUrl(post.heroImage)}
            alt={post.title}
            className="w-full"
            style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 32 }}
          />
        )}

        <PostBody text={post.body} />
      </article>
    </div>
  );
};

export const LatestPosts = () => {
  const { posts } = usePublishedPosts();
  if (posts.length === 0) return null;

  return (
    <section id="blog" style={{ background: 'var(--ink-900)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: 10 }}>
            News & Events
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 52px)', color: 'var(--cream-50)', textTransform: 'uppercase', margin: 0 }}>
            Latest From The Blog
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {posts.slice(0, 3).map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              viewport={{ once: true }}
            >
              <Link to={`/blog/${post.slug}`} onClick={() => window.scrollTo(0, 0)} style={{ textDecoration: 'none', display: 'block' }}>
                <div className="hw-card" style={{ overflow: 'hidden', height: '100%' }}>
                  {post.heroImage && (
                    <FirebaseImage
                      src={normalizeImageUrl(post.heroImage)}
                      alt={post.title}
                      className="w-full"
                      style={{ height: 180, objectFit: 'cover', width: '100%' }}
                    />
                  )}
                  <div style={{ padding: '20px 22px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: 10 }}>
                      <Calendar size={12} /> {formatDate(post.date)}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 18, color: 'var(--cream-50)', textTransform: 'uppercase', margin: '0 0 8px', lineHeight: 1.3 }}>
                      {post.title}
                    </h3>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                      {post.excerpt}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to="/blog" onClick={() => window.scrollTo(0, 0)} className="hw-btn-warm" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}>
            View All Posts
          </Link>
        </div>
      </div>
    </section>
  );
};
