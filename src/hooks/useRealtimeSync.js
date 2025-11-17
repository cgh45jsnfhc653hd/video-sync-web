// src/hooks/useRealtimeSync.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { realtimeDb } from '../lib/firebase';

const USERNAME = import.meta.env.VITE_USER_NAME || 'User';

export function useRealtimeSync() {
  const [syncState, setSyncState] = useState({
    videoId: null,
    videoUrl: null,
    isPlaying: false,
    currentTime: 0,
    lastUpdatedBy: null,
  });

  const isLocalUpdate = useRef(false);
  const lastSeekTime = useRef(0);

  // Subscribe to sync state
  useEffect(() => {
    const syncRef = ref(realtimeDb, 'syncState');

    const unsubscribe = onValue(syncRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      // Skip own updates
      if (isLocalUpdate.current) {
        isLocalUpdate.current = false;
        return;
      }

      setSyncState(data);
    });

    return () => unsubscribe();
  }, []);

  const updateSync = useCallback(async (updates) => {
    isLocalUpdate.current = true;
    const syncRef = ref(realtimeDb, 'syncState');
    await update(syncRef, {
      ...updates,
      lastUpdatedBy: USERNAME,
      lastUpdatedAt: Date.now(),
    });
  }, []);

  // Play / Pause
  const syncPlay = useCallback(() => updateSync({ isPlaying: true }), [updateSync]);
  const syncPause = useCallback(() => updateSync({ isPlaying: false }), [updateSync]);

  // Seek (throttled)
  const syncSeek = useCallback((time) => {
    const now = Date.now();
    if (now - lastSeekTime.current > 300) {
      updateSync({ currentTime: time });
      lastSeekTime.current = now;
    }
  }, [updateSync]);

  // Change video
  const syncVideoChange = useCallback((videoId, videoUrl) => {
    updateSync({
      videoId,
      videoUrl,
      currentTime: 0,
      isPlaying: false,
    });
  }, [updateSync]);

  return {
    syncState,
    syncPlay,
    syncPause,
    syncSeek,
    syncVideoChange,
  };
}
