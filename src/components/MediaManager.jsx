// src/components/MediaManager.jsx
import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase';
import { FolderPlus, Upload, Trash2, Edit2, Save, X } from 'lucide-react';

const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;

export default function MediaManager() {
  const [folders, setFolders] = useState([]);
  const [videos, setVideos] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState(''); // new
  const [editingFolder, setEditingFolder] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const foldersSnap = await getDocs(collection(firestoreDb, 'folders'));
    const videosSnap = await getDocs(collection(firestoreDb, 'videos'));
    setFolders(foldersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setVideos(videosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const createFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    await addDoc(collection(firestoreDb, 'folders'), {
      name: newFolderName,
      parentId: parentFolderId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    setNewFolderName('');
    setParentFolderId('');
    loadData();
  };

  const deleteFolder = async (folderId) => {
    if (!confirm('Delete this folder? Videos inside will remain.')) return;
    await deleteDoc(doc(firestoreDb, 'folders', folderId));
    loadData();
  };

  const startEditFolder = (folder) => {
    setEditingFolder(folder.id);
    setEditFolderName(folder.name);
  };

  const saveEditFolder = async (folderId) => {
    if (!editFolderName.trim()) return;
    await updateDoc(doc(firestoreDb, 'folders', folderId), {
      name: editFolderName,
      updatedAt: serverTimestamp()
    });
    setEditingFolder(null);
    loadData();
  };

  const deleteVideo = async (videoId) => {
    if (!confirm('Delete this video? This cannot be undone.')) return;
    await deleteDoc(doc(firestoreDb, 'videos', videoId));
    loadData();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-white mb-8">Media Management</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Folders Section */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Folders</h3>

          {/* Create Folder Form */}
          <form onSubmit={createFolder} className="mb-6 space-y-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
            <select
              value={parentFolderId}
              onChange={(e) => setParentFolderId(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded"
            >
              <option value="">No parent (top-level)</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FolderPlus size={20} /> Create Folder
            </button>
          </form>

          {/* Folder List */}
          <div className="space-y-2">
            {folders
              .filter(f => !f.parentId)
              .map(folder => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  folders={folders}
                  editingFolder={editingFolder}
                  editFolderName={editFolderName}
                  setEditFolderName={setEditFolderName}
                  startEditFolder={startEditFolder}
                  saveEditFolder={saveEditFolder}
                  deleteFolder={deleteFolder}
                />
              ))}
          </div>
        </div>

        {/* Videos Section */}
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Videos</h3>
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Upload size={20} /> Upload
            </button>
          </div>

          {showUploadForm && (
            <UploadForm
              folders={folders}
              onClose={() => setShowUploadForm(false)}
              onSuccess={loadData}
            />
          )}

          <div className="space-y-2 mt-4">
            {videos.map((video) => (
              <div key={video.id} className="bg-gray-800 p-3 rounded-lg flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-white font-medium">{video.title}</div>
                  <div className="text-gray-400 text-sm">{video.filename}</div>
                </div>
                <button onClick={() => deleteVideo(video.id)} className="text-red-500 hover:text-red-400">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Recursive folder item component to display nested folders
function FolderItem({ folder, folders, editingFolder, editFolderName, setEditFolderName, startEditFolder, saveEditFolder, deleteFolder, level = 0 }) {
  const nestedFolders = folders.filter(f => f.parentId === folder.id);

  return (
    <div className={`pl-${level * 4} space-y-1`}>
      {editingFolder === folder.id ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={editFolderName}
            onChange={(e) => setEditFolderName(e.target.value)}
            className="flex-1 bg-gray-700 text-white px-2 py-1 rounded"
          />
          <button onClick={() => saveEditFolder(folder.id)} className="text-green-500 hover:text-green-400">
            <Save size={18} />
          </button>
          <button onClick={() => setEditFolderName('')} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 p-2 rounded flex items-center justify-between">
          <span className="text-white">{folder.name}</span>
          <div className="flex gap-2">
            <button onClick={() => startEditFolder(folder)} className="text-blue-500 hover:text-blue-400"><Edit2 size={18} /></button>
            <button onClick={() => deleteFolder(folder.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
          </div>
        </div>
      )}

      {nestedFolders.map(sub => (
        <FolderItem
          key={sub.id}
          folder={sub}
          folders={folders}
          editingFolder={editingFolder}
          editFolderName={editFolderName}
          setEditFolderName={setEditFolderName}
          startEditFolder={startEditFolder}
          saveEditFolder={saveEditFolder}
          deleteFolder={deleteFolder}
          level={level + 1}
        />
      ))}
    </div>
  );
}

// UploadForm same as your existing one
function UploadForm({ folders, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    filename: '',
    folderId: '',
    duration: '',
    thumbnailUrl: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(firestoreDb, 'videos'), {
      title: formData.title,
      filename: formData.filename,
      folderId: formData.folderId || null,
      hlsUrl: `${R2_PUBLIC_URL}/${formData.filename}/master.m3u8`,
      duration: formData.duration ? parseInt(formData.duration) : null,
      createdAt: serverTimestamp()
    });
    onSuccess();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg space-y-3 mb-4">
      <input type="text" placeholder="Video title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-700 text-white px-3 py-2 rounded" required />
      <input type="text" placeholder="Folder name in R2" value={formData.filename} onChange={e => setFormData({...formData, filename: e.target.value})} className="w-full bg-gray-700 text-white px-3 py-2 rounded" required />
      <select value={formData.folderId} onChange={e => setFormData({...formData, folderId: e.target.value})} className="w-full bg-gray-700 text-white px-3 py-2 rounded">
        <option value="">No folder</option>
        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <input type="number" placeholder="Duration (seconds)" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full bg-gray-700 text-white px-3 py-2 rounded" />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded">Add Video</button>
        <button type="button" onClick={onClose} className="px-4 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded">Cancel</button>
      </div>
    </form>
  );
}
