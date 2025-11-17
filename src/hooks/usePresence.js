// src/hooks/usePresence.js
import { useState, useEffect } from 'react';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { realtimeDb } from '../lib/firebase';

const USERNAME = import.meta.env.VITE_USER_NAME || 'User';
const HEARTBEAT_INTERVAL = 10000; // 3 seconds

export function usePresence() {
  const [presenceData, setPresenceData] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const presenceRef = ref(realtimeDb, `presence/${USERNAME}`);
    const connectedRef = ref(realtimeDb, '.info/connected');

    let heartbeatInterval;

    // Monitor connection status
    const unsubscribeConnection = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        setIsConnected(true);
        
        // Initial presence
        set(presenceRef, {
          online: true,
          lastSeen: Date.now(),
          userName: USERNAME
        });

        // Remove presence on disconnect
        onDisconnect(presenceRef).set({
          online: false,
          lastSeen: Date.now(),
          userName: USERNAME
        });

        // Heartbeat
        heartbeatInterval = setInterval(() => {
          set(presenceRef, {
            online: true,
            lastSeen: Date.now(),
            userName: USERNAME
          });
        }, HEARTBEAT_INTERVAL);

      } else {
        setIsConnected(false);
        clearInterval(heartbeatInterval);
      }
    });

    // Listen to all presence
    const allPresenceRef = ref(realtimeDb, 'presence');
    const unsubscribePresence = onValue(allPresenceRef, (snapshot) => {
      const data = snapshot.val() || {};
      setPresenceData(data);
    });

    return () => {
      unsubscribeConnection();
      unsubscribePresence();
      clearInterval(heartbeatInterval);
    };
  }, []);

  const otherUsers = Object.entries(presenceData)
    .filter(([name]) => name !== USERNAME)
    .map(([name, data]) => ({
      name,
      online: data.online,
      lastSeen: data.lastSeen
    }));

  return {
    isConnected,
    otherUsers,
    currentUser: USERNAME
  };
}
