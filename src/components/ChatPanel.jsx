import { useState, useEffect, useRef } from 'react';
import { X, Send, Trash2 } from 'lucide-react';

const USERNAME = import.meta.env.VITE_USER_NAME || 'User';

export default function ChatPanel({ isOpen, onClose, messages, onSendMessage, onClearChat, otherUsers }) {
  const [inputText, setInputText] = useState('');
  const [isClearing, setIsClearing] = useState(false); // disable while clearing
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleClearChat = async () => {
    if (confirm('Are you sure you want to delete all chat messages?')) {
      setIsClearing(true);
      await onClearChat();
      setIsClearing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-6 bottom-6 w-106 h-[300px] bg-gray-900 rounded-lg shadow-2xl flex flex-col border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h3 className="text-white font-semibold">Chat & Notifications</h3>
          {/* Online Users */}
          <div className="flex gap-2 mt-1">
            {otherUsers.map(user => (
              <div key={user.name} className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded-full ${user.online ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-white text-xs">{user.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            disabled={isClearing}
            className={`text-gray-400 hover:text-white ${isClearing ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Clear Chat"
          >
            <Trash2 size={18} />
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center mt-8">No messages yet</div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }) {
  const isCurrentUser = message.userName === USERNAME;
  const isSystem = message.isSystem;

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-800 text-gray-300 text-sm px-3 py-1 rounded-full">
          {message.message}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[70%]">
        <div className="text-xs text-gray-400 mb-1">{message.userName}</div>
        <div className={`px-4 py-2 rounded-lg ${isCurrentUser ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
          {message.message}
        </div>
      </div>
    </div>
  );
}
