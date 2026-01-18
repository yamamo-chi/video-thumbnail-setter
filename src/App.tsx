import { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import "./App.css";

// Icons
const FileVideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l5 5-5 5" /><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" /></svg>
);
const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
);
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
);
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
);

function App() {
  const [videoPath, setVideoPath] = useState("");
  const [videoSrc, setVideoSrc] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [capturedImage, setCapturedImage] = useState("");
  const [useCapturedImage, setUseCapturedImage] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle'; message: string }>({ type: 'idle', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectVideo = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Videos',
          extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm']
        }]
      });
      if (selected) {
        const path = selected as string;
        setVideoPath(path);
        setVideoSrc(convertFileSrc(path));
        setStatus({ type: 'idle', message: '' });
        // Reset capture state when new video is loaded
        setCapturedImage("");
        setUseCapturedImage(false);
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to open file dialog' });
    }
  };

  const selectImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'webp']
        }]
      });
      if (selected) {
        setImagePath(selected as string);
        setUseCapturedImage(false); // Switch to file mode if user selects a file
        setStatus({ type: 'idle', message: '' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to open file dialog' });
    }
  };

  const captureFrame = () => {
    console.log('Capture frame clicked');

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      console.log('Video ready state:', video.readyState);
      console.log('Video current time:', video.currentTime);

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setStatus({ type: 'error', message: 'Video metadata not loaded yet. Please wait for the video to load.' });
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          console.log('Captured image data URL length:', dataUrl.length);
          setCapturedImage(dataUrl);
          setUseCapturedImage(true); // Auto-select captured image
        } catch (error) {
          console.error('Error capturing frame:', error);
          setStatus({ type: 'error', message: `Failed to capture frame: ${error}` });
        }
      } else {
        setStatus({ type: 'error', message: 'Failed to get canvas context.' });
      }
    } else {
      console.log('Video ref or canvas ref not available');
      setStatus({ type: 'error', message: 'Video player not ready.' });
    }
  };

  const execute = async () => {
    if (!videoPath) {
      setStatus({ type: 'error', message: 'Please select a video file.' });
      return;
    }

    if (!useCapturedImage && !imagePath) {
      setStatus({ type: 'error', message: 'Please select an image file or capture a frame.' });
      return;
    }

    if (useCapturedImage && !capturedImage) {
      setStatus({ type: 'error', message: 'No captured image available.' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const args: any = {
        videoPath,
        imagePath: useCapturedImage ? null : imagePath,
        imageData: useCapturedImage ? capturedImage : null
      };

      const result = await invoke<string>("set_thumbnail", args);
      setStatus({ type: 'success', message: result });
    } catch (error) {
      setStatus({ type: 'error', message: error as string });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>動画サムネイル設定ツール</h1>

      <div className="input-group">
        <label className="input-label">動画ファイル</label>
        <div className="input-wrapper">
          <input
            type="text"
            value={videoPath}
            readOnly
            placeholder="Select a video file..."
          />
          <button className="btn-secondary" onClick={selectVideo} title="Select Video">
            <FileVideoIcon /> Browse
          </button>
        </div>
      </div>

      {videoSrc && (
        <div className="video-section">
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            crossOrigin="anonymous"
            className="video-player"
          />
          <div className="video-controls">
            <button className="btn-secondary" onClick={captureFrame}>
              <CameraIcon /> Capture Frame
            </button>
          </div>
          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      <div className="thumbnail-selection-section">
        <h3>サムネイルソース</h3>

        <div className="selection-option">
          <input
            type="radio"
            id="use-file"
            checked={!useCapturedImage}
            onChange={() => setUseCapturedImage(false)}
          />
          <label htmlFor="use-file">画像ファイルを使用</label>
        </div>

        <div className={`input-group ${useCapturedImage ? 'disabled' : ''}`}>
          <div className="input-wrapper">
            <input
              type="text"
              value={imagePath}
              readOnly
              placeholder="Select an image file..."
              disabled={useCapturedImage}
            />
            <button className="btn-secondary" onClick={selectImage} title="Select Image" disabled={useCapturedImage}>
              <ImageIcon /> Browse
            </button>
          </div>
        </div>

        <div className="selection-option">
          <input
            type="radio"
            id="use-capture"
            checked={useCapturedImage}
            onChange={() => setUseCapturedImage(true)}
            disabled={!capturedImage}
          />
          <label htmlFor="use-capture">キャプチャした画像を使用 {capturedImage ? '' : '(動画からキャプチャしてください)'}</label>
        </div>

        {capturedImage && (
          <div className={`captured-preview ${!useCapturedImage ? 'disabled' : ''}`}>
            <img src={capturedImage} alt="Captured thumbnail" />
          </div>
        )}
      </div>

      <button className="btn-primary" onClick={execute} disabled={isLoading}>
        {isLoading ? (
          <>
            <div className="spinner"></div> Processing...
          </>
        ) : (
          <><PlayIcon /> サムネイル設定</>
        )}
      </button>

      {status.message && (
        <div className={`status-box status-${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}

export default App;
