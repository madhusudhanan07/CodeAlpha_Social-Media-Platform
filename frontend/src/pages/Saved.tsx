import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { Bookmark, LayoutGrid, List, Plus, Search, X, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { auth } from '../config/firebase';
import PostCard from '../components/PostCard/PostCard';
import styles from './Saved.module.css';

interface Collection {
  id: number;
  name: string;
}

type ModalMode = 'create' | 'rename';

export default function Saved() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCollection, setActiveCollection] = useState<number | null>(null);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [postTypeFilter, setPostTypeFilter] = useState<'all' | 'images' | 'text'>('all');
  const [sortBy, setSortBy] = useState<'recent_saved' | 'newest' | 'oldest'>('recent_saved');

  // Collection modal state (shared for create & rename)
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [showModal, setShowModal] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalTargetId, setModalTargetId] = useState<number | null>(null);
  const [savingModal, setSavingModal] = useState(false);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Hovered collection tab
  const [hoveredCollectionId, setHoveredCollectionId] = useState<number | null>(null);

  const modalInputRef = useRef<HTMLInputElement>(null);

  const getToken = useCallback(async () => {
    return await auth.currentUser?.getIdToken(true);
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await getToken();
      const [postsRes, colsRes] = await Promise.all([
        axios.get('${import.meta.env.VITE_API_URL}/api/saved', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('${import.meta.env.VITE_API_URL}/api/saved/collections/all', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setPosts(postsRes.data.posts || []);
      setCollections(colsRes.data.collections || []);
    } catch (err: any) {
      console.error('fetchData error:', err?.response?.data || err.message);
      toast.error('Failed to load saved posts');
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Focus input when modal opens
  useEffect(() => {
    if (showModal) {
      setTimeout(() => modalInputRef.current?.focus(), 50);
    }
  }, [showModal]);

  // ── Open create modal ─────────────────────────────────────────────
  const openCreate = () => {
    setModalMode('create');
    setModalName('');
    setModalTargetId(null);
    setShowModal(true);
  };

  // ── Open rename modal ─────────────────────────────────────────────
  const openRename = (c: Collection, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode('rename');
    setModalName(c.name);
    setModalTargetId(c.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalName('');
    setModalTargetId(null);
  };

  // ── Submit modal (create or rename) ──────────────────────────────
  const handleModalSubmit = async () => {
    const name = modalName.trim();
    if (!name) return;
    try {
      setSavingModal(true);
      const token = await getToken();
      if (modalMode === 'create') {
        const res = await axios.post(
          '${import.meta.env.VITE_API_URL}/api/saved/collections',
          { name },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCollections(prev => [res.data.collection, ...prev]);
        toast.success('Collection created!');
      } else {
        const res = await axios.patch(
          `${import.meta.env.VITE_API_URL}/api/saved/collections/${modalTargetId}`,
          { name },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCollections(prev =>
          prev.map(c => c.id === modalTargetId ? { ...c, name: res.data.collection.name } : c)
        );
        toast.success('Collection renamed!');
      }
      closeModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Operation failed');
    } finally {
      setSavingModal(false);
    }
  };

  // ── Delete collection ─────────────────────────────────────────────
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (confirmDeleteId === null) return;
    try {
      const token = await getToken();
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/saved/collections/${confirmDeleteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCollections(prev => prev.filter(c => c.id !== confirmDeleteId));
      if (activeCollection === confirmDeleteId) setActiveCollection(null);
      toast.success('Collection deleted');
    } catch {
      toast.error('Failed to delete collection');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleUnsave = (postId: number) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const filteredPosts = useMemo(() => {
    let result = [...posts];
    if (activeCollection !== null) {
      result = result.filter(p => p.collection_id === activeCollection);
    }
    if (searchQuery.trim()) {
      result = result.filter(p => p.content?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (postTypeFilter === 'images') {
      result = result.filter(p => p.images?.length > 0 || !!p.image_url);
    } else if (postTypeFilter === 'text') {
      result = result.filter(p => (!p.images || p.images.length === 0) && !p.image_url);
    }
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      result.sort((a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime());
    }
    return result;
  }, [posts, activeCollection, searchQuery, sortBy, postTypeFilter]);

  // ── Shared modal overlay ──────────────────────────────────────────
  const modalTitle = modalMode === 'create' ? 'New Collection' : 'Rename Collection';
  const modalBtn   = modalMode === 'create'
    ? (savingModal ? 'Creating…' : 'Create')
    : (savingModal ? 'Saving…'  : 'Save');

  return (
    <div className={styles.container}>

      {/* ── Collection create/rename modal ── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--card-bg)', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {modalMode === 'rename' ? <Pencil size={18} /> : <Plus size={18} />}
                {modalTitle}
              </h3>
              <button onClick={closeModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            <input
              ref={modalInputRef}
              type="text"
              placeholder="Collection name e.g. Travel, Work…"
              value={modalName}
              onChange={e => setModalName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleModalSubmit()}
              style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--input-bg, var(--hover-bg))',
                color: 'var(--text-primary)', outline: 'none', fontSize: '1rem', boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button onClick={closeModal}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={!modalName.trim() || savingModal}
                style={{
                  padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none',
                  background: 'var(--primary-color, #0a66c2)', color: 'white', cursor: 'pointer',
                  opacity: !modalName.trim() || savingModal ? 0.6 : 1
                }}>
                {modalBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {confirmDeleteId !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--card-bg)', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗑️</div>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Delete Collection?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              This will remove the collection. Saved posts inside it will remain in "All Items".
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setConfirmDeleteId(null)}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmDelete}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: '#e74c3c', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <h1>Saved</h1>
      </div>

      <div className={styles.controls}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '13px' }} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search your saved posts…"
            style={{ paddingLeft: '44px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={postTypeFilter}
          onChange={e => setPostTypeFilter(e.target.value as any)}
          style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <option value="all">All Media</option>
          <option value="images">Images</option>
          <option value="text">Text Only</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <option value="recent_saved">Recently Saved</option>
          <option value="newest">Newest Post</option>
          <option value="oldest">Oldest Post</option>
        </select>
        <button
          className={styles.toggleBtn}
          onClick={() => setLayout(l => l === 'grid' ? 'list' : 'grid')}
          title={`Switch to ${layout === 'grid' ? 'list' : 'grid'} view`}>
          {layout === 'grid' ? <List size={20} /> : <LayoutGrid size={20} />}
        </button>
      </div>

      {/* ── Collection tabs ── */}
      <div className={styles.collectionsList}>
        {/* All Items tab */}
        <button
          className={`${styles.collectionTab} ${activeCollection === null ? styles.active : ''}`}
          onClick={() => setActiveCollection(null)}>
          All Items
        </button>

        {/* User collection tabs */}
        {collections.map(c => (
          <div
            key={c.id}
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={() => setHoveredCollectionId(c.id)}
            onMouseLeave={() => setHoveredCollectionId(null)}
          >
            <button
              className={`${styles.collectionTab} ${activeCollection === c.id ? styles.active : ''}`}
              onClick={() => setActiveCollection(c.id)}
              style={{ paddingRight: hoveredCollectionId === c.id ? '64px' : undefined, transition: 'padding 0.15s' }}
            >
              {c.name}
            </button>

            {/* Edit / Delete actions — appear on hover */}
            {hoveredCollectionId === c.id && (
              <span style={{
                position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                display: 'flex', gap: '2px', alignItems: 'center'
              }}>
                <button
                  title="Rename collection"
                  onClick={e => openRename(c, e)}
                  style={{
                    background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '6px',
                    cursor: 'pointer', padding: '3px 5px', display: 'flex', alignItems: 'center',
                    color: 'var(--text-primary)', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(10,102,194,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                >
                  <Pencil size={13} />
                </button>
                <button
                  title="Delete collection"
                  onClick={e => handleDelete(c.id, e)}
                  style={{
                    background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '6px',
                    cursor: 'pointer', padding: '3px 5px', display: 'flex', alignItems: 'center',
                    color: '#e74c3c', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(231,76,60,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                >
                  <Trash2 size={13} />
                </button>
              </span>
            )}
          </div>
        ))}

        <button className={styles.newCollectionBtn} onClick={openCreate}>
          <Plus size={16} /> New Collection
        </button>
      </div>

      {/* ── Posts ── */}
      {loading ? (
        <div className={layout === 'grid' ? styles.grid : styles.list}>
          {[1, 2, 3, 4].map(i => <div key={i} className={styles.skeletonCard} />)}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className={styles.emptyState}>
          <Bookmark size={48} color="var(--border-color)" />
          <h2>No saved posts</h2>
          <p>When you save a post, it will appear here.</p>
        </div>
      ) : (
        <div className={layout === 'grid' ? styles.grid : styles.list}>
          {filteredPosts.map(p => (
            <PostCard
              key={p.id}
              post={p}
              onDelete={() => {}}
              onUpdate={() => {}}
              overrideSavedRemoval={handleUnsave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
