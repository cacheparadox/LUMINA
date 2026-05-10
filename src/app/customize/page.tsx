'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, getThemePref, setThemePref } from '@/lib/db';
import AppShell from '@/components/AppShell';
import { Palette, Type, Music, Image as ImageIcon, Check } from 'lucide-react';

const FONT_OPTIONS = [
  { id: 'outfit', label: 'Outfit', family: "'Outfit', sans-serif", style: 'Modern & Clean' },
  { id: 'crimson', label: 'Crimson Text', family: "'Crimson Text', serif", style: 'Classic Journal' },
  { id: 'georgia', label: 'Georgia', family: 'Georgia, serif', style: 'Traditional' },
  { id: 'system', label: 'System', family: '-apple-system, BlinkMacSystemFont, sans-serif', style: 'Native' },
];

const THEME_OPTIONS = [
  { id: 'cream', label: 'Cream Dream', bg: '#FFF9F5', accent: '#F4A0B5', card: 'rgba(255,249,245,0.72)' },
  { id: 'lavender', label: 'Lavender Mist', bg: '#F5F0FA', accent: '#A892D0', card: 'rgba(245,240,250,0.72)' },
  { id: 'sage', label: 'Forest Sage', bg: '#F0F5ED', accent: '#7BA88C', card: 'rgba(240,245,237,0.72)' },
  { id: 'rose', label: 'Rose Petal', bg: '#FFF0F3', accent: '#E88099', card: 'rgba(255,240,243,0.72)' },
  { id: 'midnight', label: 'Midnight', bg: '#0D0B14', accent: '#C4B5E0', card: 'rgba(20,16,32,0.85)' },
  { id: 'ocean', label: 'Deep Ocean', bg: '#0B1420', accent: '#6BAED6', card: 'rgba(11,20,32,0.85)' },
];

const AMBIENT_SOUNDS = [
  { id: 'none', label: 'Silent', emoji: '🔇' },
  { id: 'rain', label: 'Rain', emoji: '🌧️' },
  { id: 'wind', label: 'Wind', emoji: '🍃' },
  { id: 'fire', label: 'Fireplace', emoji: '🔥' },
  { id: 'ocean', label: 'Ocean', emoji: '🌊' },
  { id: 'night', label: 'Night', emoji: '🦗' },
];

export default function CustomizePage() {
  const [selectedFont, setSelectedFont] = useState('outfit');
  const [selectedTheme, setSelectedTheme] = useState('cream');
  const [selectedAmbient, setSelectedAmbient] = useState('none');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const font = await getThemePref('journal_font');
      const theme = await getThemePref('color_theme');
      const ambient = await getThemePref('ambient_sound');
      if (font) setSelectedFont(font);
      if (theme) setSelectedTheme(theme);
      if (ambient) setSelectedAmbient(ambient);
    })();
  }, []);

  const applyTheme = (themeId: string) => {
    document.documentElement.setAttribute('data-theme', themeId);
  };

  const handleSave = async () => {
    await setThemePref('journal_font', selectedFont);
    await setThemePref('color_theme', selectedTheme);
    await setThemePref('ambient_sound', selectedAmbient);
    applyTheme(selectedTheme);
    window.dispatchEvent(new CustomEvent('ambientChange', { detail: selectedAmbient }));
    const fontOpt = FONT_OPTIONS.find(f => f.id === selectedFont);
    if (fontOpt) {
      document.documentElement.style.setProperty('--font-journal', fontOpt.family);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell>
      <div className="page-enter">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Palette size={24} style={{ color: 'var(--pink-300)' }} />
            Customize
          </h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 28 }}>
            Make LUMINA feel like yours
          </p>
        </motion.div>

        {/* Font Picker */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Type size={18} style={{ color: 'var(--lavender-400)' }} /> Journal Font
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FONT_OPTIONS.map(font => (
              <motion.button key={font.id} whileTap={{ scale: 0.98 }} onClick={() => setSelectedFont(font.id)} style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: selectedFont === font.id ? '2px solid var(--pink-300)' : '1px solid var(--neutral-200)',
                background: selectedFont === font.id ? 'var(--pink-100)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'left',
              }}>
                <div>
                  <p style={{ fontFamily: font.family, fontSize: 16, color: 'var(--neutral-700)', marginBottom: 2 }}>
                    The quiet thoughts that bloom at midnight...
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--neutral-400)' }}>{font.label} — {font.style}</p>
                </div>
                {selectedFont === font.id && <Check size={18} style={{ color: 'var(--pink-400)', flexShrink: 0 }} />}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Color Theme */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card-static" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Palette size={18} style={{ color: 'var(--pink-300)' }} /> Color Theme
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {THEME_OPTIONS.map(theme => (
              <motion.button key={theme.id} whileTap={{ scale: 0.95 }} onClick={() => setSelectedTheme(theme.id)} style={{
                padding: 16,
                borderRadius: 'var(--radius-lg)',
                border: selectedTheme === theme.id ? '2px solid var(--pink-300)' : '1px solid var(--neutral-200)',
                background: theme.bg,
                cursor: 'pointer',
                textAlign: 'center',
                position: 'relative',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: theme.accent,
                  margin: '0 auto 8px', boxShadow: `0 0 15px ${theme.accent}40`,
                }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: theme.id.includes('midnight') || theme.id.includes('ocean') ? '#ddd' : 'var(--neutral-700)' }}>{theme.label}</p>
                {selectedTheme === theme.id && (
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <Check size={14} style={{ color: 'var(--pink-400)' }} />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Ambient Sound */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card-static" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Music size={18} style={{ color: 'var(--sage-300)' }} /> Ambient Sound
          </h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {AMBIENT_SOUNDS.map(sound => (
              <motion.button key={sound.id} whileTap={{ scale: 0.9 }} onClick={() => setSelectedAmbient(sound.id)} style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-full)',
                border: selectedAmbient === sound.id ? '2px solid var(--pink-300)' : '1px solid var(--neutral-200)',
                background: selectedAmbient === sound.id ? 'var(--pink-100)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--neutral-600)',
                fontFamily: "'Outfit', sans-serif",
              }}>
                <span style={{ fontSize: 16 }}>{sound.emoji}</span>
                {sound.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Save */}
        <motion.button className="btn-primary" onClick={handleSave} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ width: '100%', padding: '14px 24px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saved ? <>Saved ✨</> : <>Save Preferences</>}
        </motion.button>
      </div>
    </AppShell>
  );
}
