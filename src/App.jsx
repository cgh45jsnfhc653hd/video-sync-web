// src/App.jsx
import { useState, useRef } from 'react';
import VideoPlayer from './components/VideoPlayer';
import FileExplorer from './components/FileExplorer';
import ChatPanel from './components/ChatPanel';
import FloatingChatButton from './components/FloatingChatButton';
import MediaManager from './components/MediaManager';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { useChat } from './hooks/useChat';
import { usePresence } from './hooks/usePresence';
import { Settings, Users } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('watch'); // 'watch' or 'manage'
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastOpened, setLastOpened] = useState(Date.now());

  const videoRef = useRef(null);

  // Hooks
  const { syncPlay, syncPause, syncSeek, syncVideoChange } = useRealtimeSync(videoRef);
  const { messages, sendMessage, sendSystemMessage, clearChat } = useChat();
  const { isConnected, otherUsers, currentUser } = usePresence();

  // Unread messages
  const unreadCount = messages.filter(
    msg => !msg.isSystem && msg.createdAt?.toMillis() > lastOpened
  ).length;

  // Handle chat open/close
  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
    if (!isChatOpen) setLastOpened(Date.now()); // reset unread count
  };

  // Handle video selection
  const handleVideoSelect = (videoId, videoUrl) => {
    if (currentVideoUrl === videoUrl) return;
    setCurrentVideoUrl(videoUrl);
    syncVideoChange(videoId, videoUrl);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">SyncWatch</h1>
          <div className="flex items-center gap-4">
            {/* Presence indicator */}
            <div className="flex items-center gap-2 text-gray-400">
              <Users size={20} />
              <span className="text-sm">
                {currentUser} {otherUsers.length > 0 && `+ ${otherUsers.length}`}
              </span>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>

            {/* View toggle */}
            <button
              onClick={() => setCurrentView(currentView === 'watch' ? 'manage' : 'watch')}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              <Settings size={20} />
              {currentView === 'watch' ? 'Manage Media' : 'Watch Videos'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {currentView === 'watch' ? (
          <div className="space-y-6">
            <VideoPlayer
              ref={videoRef}
              videoUrl={currentVideoUrl}
              onPlay={syncPlay}
              onPause={syncPause}
              onSeek={syncSeek}
              onSystemMessage={sendSystemMessage}
            />
            <FileExplorer
              onVideoSelect={handleVideoSelect}
              onSystemMessage={sendSystemMessage}
            />
          </div>
        ) : (
          <MediaManager />
        )}
      </main>

      {/* Floating Chat */}
      {currentView === 'watch' && (
        <>
          {!isChatOpen && (
            <FloatingChatButton
              onClick={toggleChat}
              unreadCount={unreadCount}
            />
          )}
          
          <ChatPanel
            isOpen={isChatOpen}
            onClose={toggleChat}
            messages={messages}
            onSendMessage={sendMessage}
            onClearChat={clearChat}
            otherUsers={otherUsers} // pass presence data
          />
        </>
      )}
    </div>
  );
}
