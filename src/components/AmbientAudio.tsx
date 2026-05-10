'use client';

import { useEffect, useRef, useState } from 'react';
import { getThemePref } from '@/lib/db';
import { Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AmbientAudio() {
  const audioRef = useRef<any>(null);
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
    // If no sound or no interaction, stop everything
    if (sound === 'none' || !userInteracted || !isPlaying) {
      if (audioRef.current) {
        audioRef.current.close();
        audioRef.current = null;
      }
      return;
    }

    // Stop existing context if playing a different sound
    if (audioRef.current) {
      audioRef.current.close();
      audioRef.current = null;
    }

    const audioCtx = new AudioContext();
    // We store the context in audioRef (even though it's typed as HTMLAudioElement, we can cheat or use a new ref, let's just use it as any)
    (audioRef as any).current = audioCtx;

    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Generate different noise profiles based on sound type
    if (sound === 'rain' || sound === 'ocean') {
      // Brown noise
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }
    } else if (sound === 'wind' || sound === 'fire') {
      // Pink noise
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // compensate gain
        b6 = white * 0.115926;
      }
    } else {
      // Night (crickets simulation using high-pitch sine bursts, simple white noise for now)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.1;
      }
    }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    // Configure filters based on sound
    if (sound === 'rain') {
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      gainNode.gain.value = 0.2;
    } else if (sound === 'ocean') {
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      gainNode.gain.value = 0.3;
      
      // Simulate waves with an LFO
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.1; // 10 second waves
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.2;
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      lfo.start();
    } else if (sound === 'wind') {
      filter.type = 'bandpass';
      filter.frequency.value = 500;
      filter.Q.value = 0.5;
      gainNode.gain.value = 0.3;
      
      // Wind gusts LFO
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.2;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.15;
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      lfo.start();
    } else if (sound === 'fire') {
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      gainNode.gain.value = 0.15;
    } else if (sound === 'night') {
      filter.type = 'highpass';
      filter.frequency.value = 4000;
      gainNode.gain.value = 0.05;
      
      // Crickets LFO
      const lfo = audioCtx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 2; // Chirp rate
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.05;
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      lfo.start();
    }

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noiseSource.start();

    return () => {
      audioCtx.close();
    };
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
