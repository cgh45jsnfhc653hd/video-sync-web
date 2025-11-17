// FIXED VideoPlayer.jsx with optimized sync
import { useEffect, useRef, useState, forwardRef } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

const USERNAME = import.meta.env.VITE_USER_NAME || 'User';

const VideoPlayer = forwardRef(({ onSystemMessage }, ref) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const progressRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);

  const { syncState, syncPlayPause, syncSeek, syncVideoUrl } = useRealtimeSync(videoRef);

  useEffect(() => {
    if (!syncState.videoUrl) return;

    if (videoUrl === syncState.videoUrl) return;

    setVideoUrl(syncState.videoUrl);

    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(syncState.videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(hls.levels.map((lvl, idx) => ({ height: lvl.height, idx })));
        setCurrentLevel(hls.currentLevel);

        video.muted = true;
        video.play().catch(() => {}).finally(() => {
          video.muted = isMuted;
          if (!syncState.isPlaying) video.pause();
          setIsPlaying(syncState.isPlaying);
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(data.level);
      });
    } else {
      video.src = syncState.videoUrl;
      if (syncState.isPlaying) video.play();
      else video.pause();
    }

    video.currentTime = 0;
    setCurrentTime(0);
  }, [syncState.videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Math.abs(video.currentTime - syncState.currentTime) > 3) {
      video.currentTime = syncState.currentTime;
    }

    if (syncState.isPlaying && video.paused) video.play();
    if (!syncState.isPlaying && !video.paused) video.pause();

    setIsPlaying(syncState.isPlaying);
  }, [syncState.currentTime, syncState.isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleWaiting = () => setBuffering(true);
    const handleCanPlay = () => setBuffering(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
      syncPlayPause(true);
    } else {
      video.pause();
      setIsPlaying(false);
      syncPlayPause(false);
    }
  };

  const handleSeek = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;

    videoRef.current.currentTime = newTime;
    syncSeek(newTime);
  };

  const skip = (seconds) => {
    const video = videoRef.current;
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
    video.currentTime = newTime;
    syncSeek(newTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    const video = videoRef.current;
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else videoRef.current.requestFullscreen();
  };

  const formatTime = (time) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative bg-black rounded-lg overflow-hidden" onMouseEnter={() => setShowControls(true)} onMouseLeave={() => setShowControls(false)}>
      <video ref={videoRef} className="w-full aspect-video" onClick={togglePlayPause} muted={isMuted} playsInline />

      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
      )}

      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div ref={progressRef} className="w-full h-1 bg-gray-600 rounded cursor-pointer mb-2" onClick={handleSeek}>
          <div className="h-full bg-red-600 rounded" style={{ width: `${(currentTime / duration) * 100}%` }} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlayPause} className="text-white">{isPlaying ? <Pause size={24} /> : <Play size={24} />}</button>
            <button onClick={() => skip(-10)} className="text-white"><SkipBack size={20} /></button>
            <button onClick={() => skip(10)} className="text-white"><SkipForward size={20} /></button>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
              <input type="range" min="0" max="1" step="0.1" value={volume} onChange={handleVolumeChange} className="w-20" />
            </div>

            <span className="text-white text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>

            {levels.length > 0 && (
              <select className="bg-gray-700 text-white text-sm p-1 rounded" value={currentLevel} onChange={(e) => {
                const lvl = parseInt(e.target.value);
                if (hlsRef.current) {
                  hlsRef.current.currentLevel = lvl;
                  setCurrentLevel(lvl);
                }
              }}>
                <option value={-1}>Auto</option>
                {levels.map(lvl => (
                  <option key={lvl.idx} value={lvl.idx}>{lvl.height}p</option>
                ))}
              </select>
            )}
          </div>

          <button onClick={toggleFullscreen} className="text-white"><Maximize size={20} /></button>
        </div>
      </div>
    </div>
  );
});

export default VideoPlayer;