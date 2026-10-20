import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Alert } from '../common/Alert.tsx';
import { api } from '../../services/api.ts';
import {
  Send,
  UploadCloud,
  FileCheck,
  File,
  X,
  Shield,
  HelpCircle,
  Building,
  CheckCircle,
} from 'lucide-react';

interface ComplaintFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (complaintId: string, referenceNo: string) => void;
}

const CATEGORIES = [
  'Hostel',
  'Classroom',
  'Library',
  'Laboratory',
  'Canteen',
  'Cleanliness',
  'Electricity',
  'Water',
  'Civil/Maintenance',
  'IT/Internet',
  'Other',
];

export const ComplaintFormModal: React.FC<ComplaintFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [category, setCategory] = useState<string>('Hostel');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<{ file_name: string; file_url: string; file_size: number; mime_type: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selected = Array.from(e.target.files);

    setIsUploading(true);
    setError(null);

    try {
      const uploadedList = [...uploadedAttachments];
      for (const f of selected) {
        if (f.size > 10 * 1024 * 1024) {
          throw new Error(`File ${f.name} exceeds the 10MB maximum limit.`);
        }
        const uploaded = await api.uploadFile(f);
        uploadedList.push(uploaded);
      }
      setUploadedAttachments(uploadedList);
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setUploadedAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 5) {
      setError('Title must be at least 5 characters.');
      return;
    }
    if (description.trim().length < 15) {
      setError('Description must be at least 15 characters to explain the issue properly.');
      return;
    }
    if (!location.trim()) {
      setError('Specific campus location is required.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.submitComplaint({
        category,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        is_anonymous: isAnonymous,
        attachments: uploadedAttachments,
      });

      // Reset
      setTitle('');
      setDescription('');
      setLocation('');
      setIsAnonymous(false);
      setUploadedAttachments([]);
      onSuccess(res.id, res.reference_no);
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="File a New College Complaint"
      maxWidth="2xl"
    >
      {error && (
        <Alert type="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="category-select">
              Category *
            </label>
            <select
              id="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="location-input">
              Campus Location *
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="location-input"
                type="text"
                required
                placeholder="e.g. Hostel Block B, Room 304"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="title-input">
            Complaint Subject / Title *
          </label>
          <input
            id="title-input"
            type="text"
            required
            minLength={5}
            maxLength={200}
            placeholder="Brief summary of the issue (e.g. Water geyser leaking on 2nd floor)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="description-input">
            Detailed Description *
          </label>
          <textarea
            id="description-input"
            required
            rows={4}
            minLength={15}
            placeholder="Describe the exact problem, when it started, and how it impacts students..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <div className="text-[11px] text-slate-400 mt-1">Minimum 15 characters. Be specific to speed up resolution.</div>
        </div>

        {/* Real File Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Supporting Evidence / Photos (Optional)
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
            <input
              type="file"
              id="file-upload"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-1" />
              <div className="text-xs font-medium text-slate-700">
                Click to browse files or drag & drop evidence
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Images (PNG, JPG), PDF documents up to 10MB
              </div>
            </label>
          </div>

          {isUploading && (
            <div className="text-xs text-blue-600 flex items-center gap-2 mt-2">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Uploading evidence to storage...</span>
            </div>
          )}

          {uploadedAttachments.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="text-xs font-medium text-slate-600">Attached files:</div>
              {uploadedAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{att.file_name}</span>
                    <span className="text-[10px] text-slate-400">
                      ({Math.round(att.file_size / 1024)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    aria-label={`Remove file ${att.file_name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anonymous Submission Callout & Toggle */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Shield size={14} className="text-blue-600" />
                <span>Submit Anonymously</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                When enabled, your name, email, and roll number are concealed from Department Officers and Heads. Only your complaint text, location, and evidence are shown. Super Admin retains audit oversight to prevent system abuse.
              </p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || isUploading}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send size={15} />
                <span>Submit Complaint</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
