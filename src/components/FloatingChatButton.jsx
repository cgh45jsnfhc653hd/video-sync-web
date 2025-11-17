// src/components/FloatingChatButton.jsx
import { MessageCircle } from 'lucide-react';

export default function FloatingChatButton({ onClick, unreadCount = 0 }) {
  return (
    <button
      onClick={onClick}
      className="fixed right-6 bottom-6 w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 z-50"
    >
      <MessageCircle size={28} />
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
          {unreadCount}
        </div>
      )}
    </button>
  );
}