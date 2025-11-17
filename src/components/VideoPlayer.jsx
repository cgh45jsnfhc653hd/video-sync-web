// src/components/VideoPlayer.jsx
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

  // HLS levels (resolutions)
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = Auto

  const { syncState, syncPlay, syncPause, syncSeek, syncVideoChange } = useRealtimeSync();

  // Handle video URL changes
  useEffect(() => {
    if (!syncState.videoId) return;
    const newUrl = syncState.videoUrl;
    if (videoUrl === newUrl) return;

    setVideoUrl(newUrl);
    const video = videoRef.current;
    if (!video) return;

    // Destroy previous HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(newUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Populate levels
        setLevels(hls.levels.map((lvl, idx) => ({ height: lvl.height, idx })));
        setCurrentLevel(hls.currentLevel);

        video.muted = true;
        video.play()
          .catch(e => console.log('Auto-play failed:', e))
          .finally(() => {
            video.muted = isMuted;
            if (!syncState.isPlaying) video.pause();
            setIsPlaying(syncState.isPlaying);
          });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setCurrentLevel(data.level);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = newUrl;
      if (syncState.isPlaying) video.play().catch(e => console.log('Play failed:', e));
      else video.pause();
      setIsPlaying(syncState.isPlaying);
    }

    // Reset time
    video.currentTime = 0;
    setCurrentTime(0);
  }, [syncState.videoId]);

  // Sync play/pause and seek
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Math.abs(video.currentTime - syncState.currentTime) > 0.5) {
      video.currentTime = syncState.currentTime;
    }

    if (syncState.isPlaying && video.paused) {
      video.play().catch(e => console.log('Play failed:', e));
      setIsPlaying(true);
    } else if (!syncState.isPlaying && !video.paused) {
      video.pause();
      setIsPlaying(false);
    }
  }, [syncState.currentTime, syncState.isPlaying]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    // Inside VideoPlayer.jsx useEffect for video event handlers
    const handleWaiting = () => {
      setBuffering(true);
      onSystemMessage?.(`${USERNAME} is buffering...`);
    };
    const handleCanPlay = () => {
      setBuffering(false);
      onSystemMessage?.(`${USERNAME} finished buffering`);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [onSystemMessage]);

  // Local play/pause
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        syncPlay();
        onSystemMessage?.(`${USERNAME} played the video`);
      }).catch(e => console.log('Play failed:', e));
    } else {
      video.pause();
      setIsPlaying(false);
      syncPause();
      onSystemMessage?.(`${USERNAME} paused the video`);
    }
  };

  // Seek
  const handleSeek = (e) => {
    const video = videoRef.current;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;

    video.currentTime = newTime;
    syncSeek(newTime);

    const direction = newTime > currentTime ? 'forward' : 'backward';
    const diff = Math.abs(newTime - currentTime).toFixed(0);
    onSystemMessage?.(`${USERNAME} skipped ${direction} ${diff}s`);
  };

  // Skip forward/backward
  const skip = (seconds) => {
    const video = videoRef.current;
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
    video.currentTime = newTime;
    syncSeek(newTime);

    const direction = seconds > 0 ? 'forward' : 'backward';
    onSystemMessage?.(`${USERNAME} skipped ${direction} ${Math.abs(seconds)}s`);
  };

  // Volume
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

  // Fullscreen
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  // Format time
  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="relative bg-black rounded-lg overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full aspect-video"
        onClick={togglePlayPause}
        muted={isMuted}
        loop={true}
      />

      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="w-full h-1 bg-gray-600 rounded cursor-pointer mb-2"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-red-600 rounded"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlayPause} className="text-white hover:text-gray-300">
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button onClick={() => skip(-10)} className="text-white hover:text-gray-300">
              <SkipBack size={20} />
            </button>
            <button onClick={() => skip(10)} className="text-white hover:text-gray-300">
              <SkipForward size={20} />
            </button>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white hover:text-gray-300">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Resolution selector */}
            {levels.length > 0 && (
              <select
                className="bg-gray-700 text-white text-sm p-1 rounded"
                value={currentLevel}
                onChange={(e) => {
                  const lvl = parseInt(e.target.value);
                  if (hlsRef.current) {
                    hlsRef.current.currentLevel = lvl;
                    setCurrentLevel(lvl);
                  }
                }}
              >
                <option value={-1}>Auto</option>
                {levels.map(lvl => (
                  <option key={lvl.idx} value={lvl.idx}>{lvl.height}p</option>
                ))}
              </select>
            )}
          </div>

          <button onClick={toggleFullscreen} className="text-white hover:text-gray-300">
            <Maximize size={20} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default VideoPlayer;
