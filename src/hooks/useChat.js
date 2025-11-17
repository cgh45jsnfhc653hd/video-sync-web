// src/hooks/useChat.js
import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase';

const USERNAME = import.meta.env.VITE_USER_NAME || 'User';
const SESSION_KEY = 'chat_session_id';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  // Initialize session
  useEffect(() => {
    const existingSession = sessionStorage.getItem(SESSION_KEY);
    if (existingSession) {
      setSessionId(existingSession);
    } else {
      const newSession = `session_${Date.now()}`;
      sessionStorage.setItem(SESSION_KEY, newSession);
      setSessionId(newSession);
    }
  }, []);

  // Subscribe to messages
  useEffect(() => {
    if (!sessionId) return;

    const q = query(
      collection(firestoreDb, 'chatMessages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [sessionId]);

  // Send message
  const sendMessage = async (text) => {
    if (!text.trim() || !sessionId) return;

    await addDoc(collection(firestoreDb, 'chatMessages'), {
      userName: USERNAME,
      message: text,
      isSystem: false,
      sessionId: sessionId,
      createdAt: serverTimestamp()
    });
  };

  // Send system notification
  const sendSystemMessage = async (text) => {
    if (!sessionId) return;

    await addDoc(collection(firestoreDb, 'chatMessages'), {
      userName: 'System',
      message: text,
      isSystem: true,
      sessionId: sessionId,
      createdAt: serverTimestamp()
    });
  };

  // Clear entire chat for everyone
  // Clear entire chat for everyone
  const clearChat = async () => {
    const chatCollection = collection(firestoreDb, 'chatMessages');

    // Get all messages
    const snapshot = await getDocs(chatCollection);

    // Delete all messages
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Add system message to notify everyone
    await addDoc(chatCollection, {
      userName: 'System',
      message: 'Chat cleared by user',
      isSystem: true,
      createdAt: serverTimestamp()
    });

    // Remove session (optional)
    sessionStorage.removeItem(SESSION_KEY);
  };


  return {
    messages,
    sendMessage,
    sendSystemMessage,
    clearChat
  };
}