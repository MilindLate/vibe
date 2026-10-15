// src/components/upload/UploadPage.tsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCloudUploadAlt, FaTimes } from 'react-icons/fa';
import { videoApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', privacyLevel: 'PUBLIC',
    allowComments: true, allowDuet: true, allowStitch: true, hashtags: [] as string[],
  });
  const [hashtagInput, setHashtagInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = (f: File) => {
    if (!f.type.startsWith('video/')) { toast.error('Please select a video file'); return; }
    if (f.size > 500 * 1024 * 1024) { toast.error('File must be under 500MB'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!form.title) setForm((prev) => ({ ...prev, title: f.name.replace(/\.[^.]+$/, '') }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const addHashtag = () => {
    const tag = hashtagInput.replace(/^#/, '').trim().toLowerCase();
    if (tag && !form.hashtags.includes(tag)) {
      setForm((f) => ({ ...f, hashtags: [...f.hashtags, tag] }));
    }
    setHashtagInput('');
  };

  const removeHashtag = (tag: string) => {
    setForm((f) => ({ ...f, hashtags: f.hashtags.filter((t) => t !== tag) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a video'); return; }
    if (!form.title.trim()) { toast.error('Title is required'); return; }

    setUploading(true);
    const data = new FormData();
    data.append('video', file);
    data.append('title', form.title);
    data.append('description', form.description);
    data.append('privacyLevel', form.privacyLevel);
    data.append('allowComments', String(form.allowComments));
    data.append('allowDuet', String(form.allowDuet));
    data.append('allowStitch', String(form.allowStitch));
    data.append('hashtags', JSON.stringify(form.hashtags));

    try {
      await videoApi.upload(data, setProgress);
      toast.success('Video uploaded! Processing will begin shortly.');
      navigate('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-white text-2xl font-bold mb-6">Upload video</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drop zone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-vibe-border rounded-2xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <FaCloudUploadAlt className="text-6xl text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">Drag and drop or click to upload</p>
              <p className="text-gray-500 text-sm">MP4, MOV, AVI, MKV — up to 500MB</p>
              <input ref={fileRef} type="file" accept="video/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-vibe-card">
              <video src={preview!} className="w-full max-h-64 object-contain" controls />
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-3 right-3 bg-black/60 rounded-full p-2 text-white hover:bg-black/80"
              >
                <FaTimes />
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-white text-sm font-medium block mb-2">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Add a catchy title..."
              className="input-field"
              maxLength={150}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-white text-sm font-medium block mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe your video..."
              className="input-field resize-none"
              rows={3}
              maxLength={2200}
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="text-white text-sm font-medium block mb-2">Hashtags</label>
            <div className="flex gap-2 mb-2">
              <input
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
                placeholder="#hashtag"
                className="input-field flex-1"
              />
              <button type="button" onClick={addHashtag} className="btn-outline px-4">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.hashtags.map((tag) => (
                <span key={tag} className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  #{tag}
                  <button type="button" onClick={() => removeHashtag(tag)} className="hover:text-white"><FaTimes className="text-xs" /></button>
                </span>
              ))}
            </div>
          </div>

          {/* Privacy & settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white text-sm font-medium block mb-2">Privacy</label>
              <select
                value={form.privacyLevel}
                onChange={(e) => setForm((f) => ({ ...f, privacyLevel: e.target.value }))}
                className="input-field"
              >
                <option value="PUBLIC">Public</option>
                <option value="FOLLOWERS">Followers only</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>

            <div className="space-y-2">
              {[
                { key: 'allowComments', label: 'Allow comments' },
                { key: 'allowDuet', label: 'Allow duet' },
                { key: 'allowStitch', label: 'Allow stitch' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between text-white text-sm">
                  {label}
                  <input
                    type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div>
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-vibe-card rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file}
            className="btn-primary w-full py-3 text-base disabled:opacity-50"
          >
            {uploading ? `Uploading ${progress}%...` : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
}
