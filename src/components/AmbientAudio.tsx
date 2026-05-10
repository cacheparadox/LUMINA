'use client';

import { useEffect, useRef, useState } from 'react';
import { getThemePref } from '@/lib/db';
import { Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AmbientAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState('none');
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    // Check if we already have a preference
    getThemePref('ambient_sound').then(s => {
      if (s && s !== 'none') {
        setSound(s);
      }
    });

    const handleInteraction = () => setUserInteracted(true);
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    
    // Listen for custom event from customize page
    const handleSoundChange = (e: CustomEvent) => {
      const newSound = e.detail;
      setSound(newSound);
      if (newSound !== 'none') {
        setIsPlaying(true);
      }
    };
    
    window.addEventListener('ambientChange', handleSoundChange as EventListener);

    return () => {
      window.removeEventListener('ambientChange', handleSoundChange as EventListener);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  useEffect(() => {
    if (sound === 'none' || !userInteracted) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
    }

    // Map sound to a source (we can use open source nature sounds)
    const SOUND_MAP: Record<string, string> = {
      rain: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3',
      wind: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_6512ebdf92.mp3',
      fire: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_2491a921ff.mp3',
      ocean: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
      night: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_cf83e92592.mp3',
    };

    if (SOUND_MAP[sound] && audioRef.current.src !== SOUND_MAP[sound]) {
      audioRef.current.src = SOUND_MAP[sound];
    }

    if (isPlaying && userInteracted) {
      audioRef.current.play().catch(e => console.log('Audio play blocked:', e));
    } else {
      audioRef.current.pause();
    }
  }, [sound, isPlaying, userInteracted]);

  if (sound === 'none') return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => setIsPlaying(!isPlaying)}
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 90,
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--neutral-500)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}
      title="Toggle Ambient Sound"
    >
      {isPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </motion.button>
  );
}
