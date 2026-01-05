import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
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


function App() {
  const [videoPath, setVideoPath] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle'; message: string }>({ type: 'idle', message: '' });
  const [isLoading, setIsLoading] = useState(false);

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
        setVideoPath(selected as string);
        setStatus({ type: 'idle', message: '' });
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
        setStatus({ type: 'idle', message: '' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to open file dialog' });
    }
  };

  const execute = async () => {
    if (!videoPath || !imagePath) {
      setStatus({ type: 'error', message: 'Please select both a video and an image file.' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const result = await invoke<string>("set_thumbnail", {
        videoPath,
        imagePath
      });
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

      <div className="input-group">
        <label className="input-label">サムネイル画像</label>
        <div className="input-wrapper">
          <input
            type="text"
            value={imagePath}
            readOnly
            placeholder="Select an image file..."
          />
          <button className="btn-secondary" onClick={selectImage} title="Select Image">
            <ImageIcon /> Browse
          </button>
        </div>
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
