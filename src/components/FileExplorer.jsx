// src/components/FileExplorer.jsx
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase';
import { Folder, Play, Clock } from 'lucide-react';

const USERNAME = import.meta.env.VITE_USER_NAME || 'User';
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;

export default function FileExplorer({ onVideoSelect, onSystemMessage }) {
  const [folders, setFolders] = useState([]);
  const [videos, setVideos] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState([]); // keeps track of expanded folders
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    const q = query(collection(firestoreDb, 'folders'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, snapshot =>
      setFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(firestoreDb, 'videos'), orderBy('title', 'asc'));
    const unsubscribe = onSnapshot(q, snapshot =>
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
    return () => unsubscribe();
  }, []);

  const handleFolderClick = (folderId) => {
    if (expandedFolders.includes(folderId)) {
      // collapse folder
      setExpandedFolders(expandedFolders.filter(id => id !== folderId));
      setSelectedFolderId(null);
    } else {
      // expand folder
      setExpandedFolders([...expandedFolders, folderId]);
      setSelectedFolderId(folderId);
    }
  };

  const handleVideoSelect = (video) => {
    const videoUrl = `${R2_PUBLIC_URL}/${video.filename}/master.m3u8`;
    setSelectedVideo(video.id);
    onVideoSelect?.(video.id, videoUrl);
    onSystemMessage?.(`${USERNAME} changed video to "${video.title}"`);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const renderFolder = (folder, level = 0) => {
    const childFolders = folders.filter(f => f.parentId === folder.id);
    const isExpanded = expandedFolders.includes(folder.id);
    const videosInFolder = videos.filter(v => v.folderId === folder.id);

    return (
      <div key={folder.id} className="space-y-1">
        <button
          onClick={() => handleFolderClick(folder.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg w-full text-left ${
            isExpanded ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          style={{ marginLeft: `${level * 16}px` }}
        >
          <Folder size={16} /> {folder.name} {childFolders.length > 0 && `(${childFolders.length})`}
        </button>

        {/* Child folders */}
        {isExpanded && childFolders.map(child => renderFolder(child, level + 1))}

        {/* Videos for this folder */}
        {isExpanded && videosInFolder.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2 mb-2" style={{ marginLeft: `${(level + 1) * 16}px` }}>
            {videosInFolder.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                isSelected={selectedVideo === video.id}
                onSelect={() => handleVideoSelect(video)}
                formatDuration={formatDuration}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Only top-level folders (parentId = null) initially
  const topLevelFolders = folders.filter(f => !f.parentId);

  return (
    <div className="space-y-4">
      {topLevelFolders.map(folder => renderFolder(folder))}
    </div>
  );
}

function VideoCard({ video, isSelected, onSelect, formatDuration }) {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = video.thumbnailUrl || `${R2_PUBLIC_URL}/${video.filename}/thumbnail.jpg`;

  return (
    <div onClick={onSelect} className={`group cursor-pointer rounded-lg overflow-hidden bg-gray-800 transition-all hover:scale-105 hover:shadow-2xl ${isSelected ? 'ring-4 ring-red-600' : ''}`}>
      <div className="relative aspect-video bg-gray-900">
        {!imgError ? (
          <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <Play size={48} className="text-gray-600" />
          </div>
        )}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
            <Clock size={12} /> {formatDuration(video.duration)}
          </div>
        )}
        {isSelected && (
          <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">NOW PLAYING</div>
        )}
      </div>
      <div className="p-3">
        <h4 className="text-white font-medium text-sm line-clamp-2 group-hover:text-red-400 transition">{video.title}</h4>
      </div>
    </div>
  );
}
