import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  User, Shield, Bell, Palette, Download, Trash2, Lock,
  Eye, EyeOff, Sun, Moon, Monitor, Type,
  LogOut, Save, AlertTriangle, Check, Globe
} from 'lucide-react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import styles from './Settings.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PrivacySettings {
  account_private: boolean;
  who_can_message: string;
  who_can_comment: string;
  who_can_follow: string;
  show_online_status: boolean;
  show_last_seen: boolean;
}

interface NotifSettings {
  likes: boolean;
  comments: boolean;
  friend_requests: boolean;
  messages: boolean;
  mentions: boolean;
  email_notifications: boolean;
}

interface AppearanceSetting {
  theme: 'light' | 'dark' | 'system';
  language: string;
  font_size: 'small' | 'medium' | 'large';
}

interface ProfileData {
  full_name: string;
  username: string;
  email: string;
  bio: string;
  profile_picture: string;
  cover_photo?: string;
}

type Section = 'account' | 'security' | 'privacy' | 'notifications' | 'appearance' | 'data';

const API = '${import.meta.env.VITE_API_URL}/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getToken() {
  return auth.currentUser?.getIdToken(true);
}

const authHeaders = async () => ({
  Authorization: `Bearer ${await getToken()}`,
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({
  checked, onChange,
}: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={styles.switch}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className={styles.slider} />
    </label>
  );
}

function SkeletonPanel() {
  return (
    <div className={styles.panelBody}>
      <div className={styles.avatarRow}>
        <div className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
        <div style={{ flex: 1 }}>
          <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: '60%' }} />
          <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: '40%' }} />
        </div>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className={styles.field}>
          <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: '25%', height: 10 }} />
          <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: '100%', height: 42 }} />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Settings() {
  const { user, logout } = useAuth();

  const [activeSection, setActiveSection] = useState<Section>('account');
  const [loading, setLoading] = useState(true);

  // Profile state
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '', username: '', email: '', bio: '', profile_picture: '', cover_photo: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Security state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Privacy state
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    account_private: false,
    who_can_message: 'everyone',
    who_can_comment: 'everyone',
    who_can_follow: 'everyone',
    show_online_status: true,
    show_last_seen: true,
  });
  const [privacySaving, setPrivacySaving] = useState(false);

  // Notification state
  const [notifs, setNotifs] = useState<NotifSettings>({
    likes: true, comments: true, friend_requests: true,
    messages: true, mentions: true, email_notifications: false,
  });
  const [notifsSaving, setNotifsSaving] = useState(false);

  // Appearance state
  const [appearance, setAppearance] = useState<AppearanceSetting>({
    theme: 'system', language: 'en', font_size: 'medium',
  });
  const [appearanceSaving, setAppearanceSaving] = useState(false);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ── Load all settings ────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const hdrs = await authHeaders();
      const res = await axios.get(`${API}/settings`, { headers: hdrs });
      const { settings, profile: p } = res.data;
      setProfile({ ...p, email: user.email || p.email });
      if (settings.privacy)       setPrivacy(settings.privacy);
      if (settings.notifications) setNotifs(settings.notifications);
      setAppearance({
        theme:     settings.theme     || 'system',
        language:  settings.language  || 'en',
        font_size: settings.font_size || 'medium',
      });
    } catch (err: any) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // ── Profile ──────────────────────────────────────────────────────────────
  const handleProfileSave = async () => {
    try {
      setProfileSaving(true);
      const hdrs = await authHeaders();
      await axios.put(`${API}/settings/profile`, {
        full_name: profile.full_name,
        username:  profile.username,
        bio:       profile.bio,
      }, { headers: hdrs });
      toast.success('Profile updated ✓');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    try {
      const token = await getToken();
      const res = await axios.post(`${API}/profile/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setProfile(p => ({ ...p, profile_picture: res.data.profile_picture }));
      toast.success('Profile picture updated ✓');
    } catch {
      toast.error('Failed to upload image');
    }
  };

  // ── Password ─────────────────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    if (!pwForm.current) return toast.error('Enter your current password');
    if (pwForm.next.length < 6) return toast.error('New password must be at least 6 characters');
    if (pwForm.next !== pwForm.confirm) return toast.error('Passwords do not match');
    const currentFbUser = auth.currentUser;
    if (!currentFbUser || !currentFbUser.email) return toast.error('Not authenticated');
    try {
      setPwSaving(true);
      // Re-authenticate
      const cred = EmailAuthProvider.credential(currentFbUser.email, pwForm.current);
      await reauthenticateWithCredential(currentFbUser, cred);
      // Update password
      await updatePassword(currentFbUser, pwForm.next);
      // Notify backend (optional audit)
      const hdrs = await authHeaders();
      await axios.put(`${API}/settings/password`, {}, { headers: hdrs });
      toast.success('Password changed successfully ✓');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      const msg = err?.code === 'auth/wrong-password'
        ? 'Current password is incorrect'
        : err?.code === 'auth/too-many-requests'
        ? 'Too many attempts. Try again later.'
        : 'Failed to change password';
      toast.error(msg);
    } finally {
      setPwSaving(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success(`Reset email sent to ${user.email}`);
    } catch {
      toast.error('Failed to send reset email');
    }
  };

  // ── Privacy ──────────────────────────────────────────────────────────────
  const handlePrivacySave = async () => {
    try {
      setPrivacySaving(true);
      const hdrs = await authHeaders();
      await axios.put(`${API}/settings/privacy`, privacy, { headers: hdrs });
      toast.success('Privacy settings saved ✓');
    } catch {
      toast.error('Failed to save privacy settings');
    } finally {
      setPrivacySaving(false);
    }
  };

  // ── Notifications ────────────────────────────────────────────────────────
  const handleNotifsSave = async () => {
    try {
      setNotifsSaving(true);
      const hdrs = await authHeaders();
      await axios.put(`${API}/settings/notifications`, notifs, { headers: hdrs });
      toast.success('Notification preferences saved ✓');
    } catch {
      toast.error('Failed to save notification settings');
    } finally {
      setNotifsSaving(false);
    }
  };

  // ── Appearance ───────────────────────────────────────────────────────────
  const applyTheme = (t: 'light' | 'dark' | 'system') => {
    setAppearance(a => ({ ...a, theme: t }));
    if (t === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('theme', t);
    }
  };

  const applyFontSize = (size: 'small' | 'medium' | 'large') => {
    setAppearance(a => ({ ...a, font_size: size }));
    const map = { small: '13px', medium: '15px', large: '17px' };
    document.documentElement.style.fontSize = map[size];
  };

  const handleAppearanceSave = async () => {
    try {
      setAppearanceSaving(true);
      const hdrs = await authHeaders();
      await axios.put(`${API}/settings/theme`, appearance, { headers: hdrs });
      toast.success('Appearance saved ✓');
    } catch {
      toast.error('Failed to save appearance');
    } finally {
      setAppearanceSaving(false);
    }
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API}/settings/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data');
    }
  };

  // ── Delete Account ───────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (!deletePassword) return toast.error('Enter your password to confirm');
    const currentFbUser = auth.currentUser;
    if (!currentFbUser || !currentFbUser.email) return;
    try {
      setDeleting(true);
      // Re-authenticate
      const cred = EmailAuthProvider.credential(currentFbUser.email, deletePassword);
      await reauthenticateWithCredential(currentFbUser, cred);
      // Delete from backend (removes all MySQL data + Firebase user)
      const hdrs = await authHeaders();
      await axios.delete(`${API}/settings/account`, { headers: hdrs });
      // Sign out
      await logout();
      toast.success('Account deleted. Goodbye 👋');
    } catch (err: any) {
      const msg = err?.code === 'auth/wrong-password'
        ? 'Incorrect password'
        : err?.response?.data?.message || 'Failed to delete account';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // ─── Sidebar config ────────────────────────────────────────────────────────
  const NAV = [
    { id: 'account',       label: 'Account',       icon: <User size={18} /> },
    { id: 'security',      label: 'Security',       icon: <Lock size={18} /> },
    { id: 'privacy',       label: 'Privacy',        icon: <Shield size={18} /> },
    { id: 'notifications', label: 'Notifications',  icon: <Bell size={18} /> },
    { id: 'appearance',    label: 'Appearance',     icon: <Palette size={18} /> },
    { id: 'data',          label: 'Data & Account', icon: <Download size={18} /> },
  ] as const;

  // ─── Render panels ─────────────────────────────────────────────────────────

  function renderAccount() {
    const initials = profile.full_name
      ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      : (profile.username?.[0]?.toUpperCase() || 'U');

    return (
      <>
        {loading ? <SkeletonPanel /> : (
          <div className={styles.panelBody}>
            {/* Avatar — click to change */}
            <div className={styles.field}>
              <span className={styles.label}>Profile Picture</span>
              <div
                className={styles.avatarUploadWrap}
                onClick={() => avatarInputRef.current?.click()}
                title="Click to change photo"
              >
                {profile.profile_picture ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL}${profile.profile_picture}`}
                    alt="avatar"
                    className={styles.avatarLarge}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className={styles.avatarLargePlaceholder}>{initials}</div>
                )}
                <div className={styles.avatarOverlay}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              </div>
              <span className={styles.hint}>Click photo to change · JPG or PNG, max 2 MB</span>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                }}
              />
            </div>

            <hr className={styles.divider} />

            {/* Full Name */}
            <div className={styles.field}>
              <label className={styles.label}>Full Name</label>
              <input
                className={styles.input}
                value={profile.full_name}
                onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Your full name"
                maxLength={100}
              />
            </div>

            {/* Username */}
            <div className={styles.field}>
              <label className={styles.label}>Username</label>
              <input
                className={styles.input}
                value={profile.username}
                onChange={e => setProfile(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                placeholder="username"
                maxLength={30}
              />
              <span className={styles.hint}>Letters, numbers, underscores only. 3–30 characters.</span>
            </div>

            {/* Email (read-only, managed by Firebase) */}
            <div className={styles.field}>
              <label className={styles.label}>Email Address</label>
              <input
                className={styles.input}
                value={profile.email}
                readOnly
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
              <span className={styles.hint}>Email is managed via Firebase authentication.</span>
            </div>

            {/* Bio */}
            <div className={styles.field}>
              <label className={styles.label}>Bio</label>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                value={profile.bio}
                onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                placeholder="Tell people about yourself…"
                maxLength={200}
              />
              <span className={styles.charCount}>{profile.bio?.length || 0} / 200</span>
            </div>

            <button
              className={styles.saveBtn}
              onClick={handleProfileSave}
              disabled={profileSaving}>
              {profileSaving ? 'Saving…' : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        )}
      </>
    );
  }

  function renderSecurity() {
    return (
      <div className={styles.panelBody}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Re-authentication is required before changing your password to protect your account.
        </p>

        <div className={styles.field}>
          <label className={styles.label}>Current Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className={styles.input}
              type={showPw ? 'text' : 'password'}
              value={pwForm.current}
              onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
              placeholder="Enter current password"
              style={{ paddingRight: '3rem', width: '100%' }}
            />
            <button
              onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>New Password</label>
          <input
            className={styles.input}
            type={showPw ? 'text' : 'password'}
            value={pwForm.next}
            onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
            placeholder="At least 6 characters"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Confirm New Password</label>
          <input
            className={styles.input}
            type={showPw ? 'text' : 'password'}
            value={pwForm.confirm}
            onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
            placeholder="Re-enter new password"
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className={styles.saveBtn} onClick={handlePasswordChange} disabled={pwSaving}>
            {pwSaving ? 'Changing…' : <><Lock size={16} /> Change Password</>}
          </button>
          <button
            onClick={handleForgotPassword}
            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'underline' }}>
            Forgot Password? Send Reset Email
          </button>
        </div>

        <hr className={styles.divider} />

        <div className={styles.dangerCard}>
          <div className={styles.dangerInfo}>
            <h4>Log Out</h4>
            <p>Sign out from this device.</p>
          </div>
          <button className={styles.dangerBtn} onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    );
  }

  function renderPrivacy() {
    const selectOpts = [
      { value: 'everyone', label: 'Everyone' },
      { value: 'friends',  label: 'Friends Only' },
      { value: 'nobody',   label: 'Nobody' },
    ];
    return (
      <div className={styles.panelBody}>
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>Private Account</span>
            <span className={styles.toggleDesc}>Only approved followers see your posts</span>
          </div>
          <Toggle
            checked={privacy.account_private}
            onChange={v => setPrivacy(p => ({ ...p, account_private: v }))}
          />
        </div>

        {([
          { key: 'who_can_message', label: 'Who Can Message Me' },
          { key: 'who_can_comment', label: 'Who Can Comment' },
          { key: 'who_can_follow',  label: 'Who Can Follow Me' },
        ] as const).map(({ key, label }) => (
          <div key={key} className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>{label}</span>
            </div>
            <select
              className={styles.select}
              value={(privacy as any)[key]}
              onChange={e => setPrivacy(p => ({ ...p, [key]: e.target.value }))}>
              {selectOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}

        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>Show Online Status</span>
            <span className={styles.toggleDesc}>Let others see when you're active</span>
          </div>
          <Toggle
            checked={privacy.show_online_status}
            onChange={v => setPrivacy(p => ({ ...p, show_online_status: v }))}
          />
        </div>

        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>Show Last Seen</span>
            <span className={styles.toggleDesc}>Let others see when you were last active</span>
          </div>
          <Toggle
            checked={privacy.show_last_seen}
            onChange={v => setPrivacy(p => ({ ...p, show_last_seen: v }))}
          />
        </div>

        <button className={styles.saveBtn} onClick={handlePrivacySave} disabled={privacySaving}>
          {privacySaving ? 'Saving…' : <><Save size={16} /> Save Privacy Settings</>}
        </button>
      </div>
    );
  }

  function renderNotifications() {
    const items: { key: keyof NotifSettings; label: string; desc: string }[] = [
      { key: 'likes',              label: 'Likes',           desc: 'When someone likes your post' },
      { key: 'comments',           label: 'Comments',        desc: 'When someone comments on your post' },
      { key: 'friend_requests',    label: 'Friend Requests', desc: 'When someone sends a friend request' },
      { key: 'messages',           label: 'Messages',        desc: 'When you receive a new message' },
      { key: 'mentions',           label: 'Mentions',        desc: 'When someone mentions you' },
      { key: 'email_notifications',label: 'Email Notifications', desc: 'Receive important updates via email' },
    ];
    return (
      <div className={styles.panelBody}>
        {items.map(({ key, label, desc }) => (
          <div key={key} className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>{label}</span>
              <span className={styles.toggleDesc}>{desc}</span>
            </div>
            <Toggle
              checked={notifs[key]}
              onChange={v => setNotifs(n => ({ ...n, [key]: v }))}
            />
          </div>
        ))}
        <button className={styles.saveBtn} onClick={handleNotifsSave} disabled={notifsSaving}>
          {notifsSaving ? 'Saving…' : <><Save size={16} /> Save Preferences</>}
        </button>
      </div>
    );
  }

  function renderAppearance() {
    const themes: { value: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }[] = [
      { value: 'light',  label: 'Light',  icon: <Sun size={28} /> },
      { value: 'dark',   label: 'Dark',   icon: <Moon size={28} /> },
      { value: 'system', label: 'System', icon: <Monitor size={28} /> },
    ];
    const fontSizes: { value: 'small' | 'medium' | 'large'; label: string }[] = [
      { value: 'small',  label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large',  label: 'Large' },
    ];
    const languages = [
      { value: 'en', label: '🇬🇧 English' },
      { value: 'es', label: '🇪🇸 Spanish' },
      { value: 'fr', label: '🇫🇷 French' },
      { value: 'de', label: '🇩🇪 German' },
      { value: 'hi', label: '🇮🇳 Hindi' },
      { value: 'zh', label: '🇨🇳 Chinese' },
      { value: 'ar', label: '🇸🇦 Arabic' },
    ];

    return (
      <div className={styles.panelBody}>
        {/* Theme */}
        <div className={styles.field}>
          <span className={styles.label}>Theme</span>
          <div className={styles.themeGrid}>
            {themes.map(t => (
              <button
                key={t.value}
                className={`${styles.themeCard} ${appearance.theme === t.value ? styles.themeCardActive : ''}`}
                onClick={() => applyTheme(t.value)}>
                {t.icon}
                <span>{t.label}</span>
                {appearance.theme === t.value && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className={styles.field}>
          <span className={styles.label}>Font Size</span>
          <div className={styles.themeGrid}>
            {fontSizes.map(f => (
              <button
                key={f.value}
                className={`${styles.themeCard} ${appearance.font_size === f.value ? styles.themeCardActive : ''}`}
                onClick={() => applyFontSize(f.value)}>
                <Type size={f.value === 'small' ? 18 : f.value === 'medium' ? 24 : 30} />
                <span>{f.label}</span>
                {appearance.font_size === f.value && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className={styles.field}>
          <span className={styles.label}>Language</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Globe size={18} color="var(--text-secondary)" />
            <select
              className={styles.select}
              value={appearance.language}
              onChange={e => setAppearance(a => ({ ...a, language: e.target.value }))}>
              {languages.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <span className={styles.hint}>Language setting is saved to your profile.</span>
        </div>

        <button className={styles.saveBtn} onClick={handleAppearanceSave} disabled={appearanceSaving}>
          {appearanceSaving ? 'Saving…' : <><Save size={16} /> Save Appearance</>}
        </button>
      </div>
    );
  }

  function renderData() {
    return (
      <div className={styles.panelBody}>
        {/* Export */}
        <div className={styles.dangerCard} style={{ borderColor: 'rgba(0,115,177,0.25)', background: 'rgba(0,115,177,0.04)' }}>
          <div className={styles.dangerInfo}>
            <h4>Download My Data</h4>
            <p>Export a JSON file containing your profile, posts, comments, likes, friends, messages, notifications, and saved posts.</p>
          </div>
          <button className={styles.downloadBtn} onClick={handleExport}>
            <Download size={16} /> Export
          </button>
        </div>

        <hr className={styles.divider} />

        {/* Delete Account */}
        <div className={styles.dangerCard}>
          <div className={styles.dangerInfo}>
            <h4>Delete Account</h4>
            <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
          </div>
          <button className={styles.dangerBtn} onClick={() => setShowDeleteModal(true)}>
            <Trash2 size={16} /> Delete Account
          </button>
        </div>
      </div>
    );
  }

  const PANEL_META: Record<Section, { title: string; icon: React.ReactNode; render: () => React.ReactNode }> = {
    account:       { title: 'Account',            icon: <User size={20} className={styles.panelIcon} />,    render: renderAccount },
    security:      { title: 'Security',           icon: <Lock size={20} className={styles.panelIcon} />,    render: renderSecurity },
    privacy:       { title: 'Privacy',            icon: <Shield size={20} className={styles.panelIcon} />,  render: renderPrivacy },
    notifications: { title: 'Notifications',      icon: <Bell size={20} className={styles.panelIcon} />,    render: renderNotifications },
    appearance:    { title: 'Appearance',         icon: <Palette size={20} className={styles.panelIcon} />, render: renderAppearance },
    data:          { title: 'Data & Account',     icon: <Download size={20} className={styles.panelIcon} />,render: renderData },
  };

  const current = PANEL_META[activeSection];

  return (
    <div className={styles.page}>

      {/* ── Delete Account Modal ── */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>
              <AlertTriangle size={20} color="#e74c3c" /> Delete Account
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              This will permanently delete your account, posts, messages, and all data.
              Enter your password to confirm. <strong>This cannot be undone.</strong>
            </p>
            <div className={styles.field}>
              <label className={styles.label}>Your Password</label>
              <input
                className={styles.input}
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDeleteAccount()}
                placeholder="Enter your password"
                autoFocus
              />
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }}
                style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                className={styles.dangerBtn}
                style={{ opacity: !deletePassword || deleting ? 0.6 : 1 }}>
                {deleting ? 'Deleting…' : <><Trash2 size={15} /> Yes, Delete My Account</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <nav className={styles.sidebar}>
        <div className={styles.sidebarTitle}>Settings</div>
        {NAV.map(item => (
          <button
            key={item.id}
            className={`${styles.sidebarItem} ${activeSection === item.id ? styles.active : ''} ${item.id === 'data' ? styles.sidebarDanger : ''}`}
            onClick={() => setActiveSection(item.id)}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* ── Content Panel ── */}
      <section className={styles.content}>
        <div className={styles.panelHeader}>
          {current.icon}
          <h2>{current.title}</h2>
        </div>
        {current.render()}
      </section>
    </div>
  );
}
