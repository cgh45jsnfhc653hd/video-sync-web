// src/hooks/useRealtimeSync.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { realtimeDb } from '../lib/firebase';

const USERNAME = import.meta.env.VITE_USER_NAME || 'User';

export function useRealtimeSync(videoRef) {
  const [syncState, setSyncState] = useState({
    videoUrl: '',
    isPlaying: false,
    currentTime: 0,
    lastUpdatedBy: '',
  });

  const isLocalUpdate = useRef(false);

  /** 
   * Only call this when the user performs a seek action.
   * NOT during playback.
   */
  const syncSeek = useCallback((newTime) => {
    if (!videoRef.current) return;

    isLocalUpdate.current = true;
    update(ref(realtimeDb, 'syncState'), {
      currentTime: newTime,
      lastUpdatedBy: USERNAME,
    });
  }, [videoRef]);

  /**
   * Only call this when user presses play/pause.
   */
  const syncPlayPause = useCallback((isPlaying) => {
    isLocalUpdate.current = true;
    update(ref(realtimeDb, 'syncState'), {
      isPlaying,
      lastUpdatedBy: USERNAME,
    });
  }, []);

  /**
   * Sync video URL when changed (manual change).
   */
  const syncVideoUrl = useCallback((url) => {
    isLocalUpdate.current = true;
    update(ref(realtimeDb, 'syncState'), {
      videoUrl: url,
      currentTime: 0,
      lastUpdatedBy: USERNAME,
    });
  }, []);

  // Listen for realtime changes
  useEffect(() => {
    const syncRef = ref(realtimeDb, 'syncState');
    const unsubscribe = onValue(syncRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      // ignore our own writes
      if (isLocalUpdate.current) {
        isLocalUpdate.current = false;
        return;
      }

      setSyncState(data);

      // Apply remote playback changes
      const video = videoRef.current;
      if (!video) return;

      if (data.isPlaying && video.paused) video.play();
      if (!data.isPlaying && !video.paused) video.pause();

      // Apply remote seek ONLY if time drift is large (>3 sec)
      if (Math.abs(video.currentTime - data.currentTime) > 3) {
        video.currentTime = data.currentTime;
      }
    });

    return () => unsubscribe();
  }, [videoRef]);

  return { syncState, syncSeek, syncPlayPause, syncVideoUrl };
}
