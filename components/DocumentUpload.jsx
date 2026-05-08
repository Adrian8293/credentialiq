import { useState, useRef, useCallback } from 'react'

const ALLOWED_TYPES = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
}

const DOCUMENT_CATEGORIES = [
  { id: 'license', label: 'Professional License', icon: '📜' },
  { id: 'malpractice', label: 'Malpractice Insurance', icon: '🛡️' },
  { id: 'dea', label: 'DEA Certificate', icon: '💊' },
  { id: 'npi', label: 'NPI Confirmation', icon: '🆔' },
  { id: 'caqh', label: 'CAQH Documents', icon: '✓' },
  { id: 'education', label: 'Education/Training', icon: '🎓' },
  { id: 'board_cert', label: 'Board Certification', icon: '🏅' },
  { id: 'cv', label: 'CV/Resume', icon: '📄' },
  { id: 'w9', label: 'W-9 Form', icon: '📋' },
  { id: 'other', label: 'Other', icon: '📎' },
]

export function DocumentUpload({ providerId, providerName, docType, onUploadComplete, onCancel }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [category, setCategory] = useState(docType || 'other')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFile = (selectedFile) => {
    setError(null)
    
    // Validate file type
    const mimeType = selectedFile.type
    if (!ALLOWED_TYPES[mimeType] && mimeType !== 'application/octet-stream') {
      setError('Invalid file type. Please upload PDF, JPG, PNG, WebP, DOC, or DOCX files.')
      return
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    setFile(selectedFile)

    // Create preview for images
    if (mimeType.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result)
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90))
      }, 100)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-filename': file.name,
          'x-provider-id': providerId || 'general',
          'x-doc-type': category,
        },
        body: file,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const result = await response.json()
      setProgress(100)

      // Call parent callback with upload result
      if (onUploadComplete) {
        onUploadComplete({
          url: result.url,
          pathname: result.pathname,
          filename: file.name,
          size: result.size,
          contentType: result.contentType,
          category,
          uploadedAt: new Date().toISOString(),
        })
      }

      // Reset form after short delay to show 100%
      setTimeout(() => {
        setFile(null)
        setPreview(null)
        setProgress(0)
        setUploading(false)
      }, 500)
    } catch (err) {
      setError(err.message)
      setUploading(false)
      setProgress(0)
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="document-upload">
      <div className="card">
        <div className="card-header">
          <h3>Upload Document</h3>
          {providerName && (
            <span className="badge b-blue">{providerName}</span>
          )}
        </div>
        <div className="card-body">
          {/* Category selection */}
          <div className="fg" style={{ marginBottom: 16 }}>
            <label>Document Type</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              disabled={uploading}
            >
              {DOCUMENT_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Drop zone */}
          <div
            className={`drop-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--pr)' : file ? 'var(--success)' : 'var(--border)'}`,
              borderRadius: 'var(--r)',
              padding: file ? '16px' : '32px',
              textAlign: 'center',
              cursor: uploading ? 'default' : 'pointer',
              background: dragActive ? 'var(--pr-l)' : file ? 'rgba(16,185,129,.05)' : 'var(--elevated)',
              transition: 'all .15s ease',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              style={{ display: 'none' }}
              disabled={uploading}
            />

            {!file ? (
              <>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>
                  {dragActive ? '📥' : '📄'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>
                  {dragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  PDF, JPG, PNG, WebP, DOC, DOCX (max 10MB)
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {preview ? (
                  <img 
                    src={preview} 
                    alt="Preview" 
                    style={{ 
                      width: 60, 
                      height: 60, 
                      objectFit: 'cover', 
                      borderRadius: 'var(--r)',
                      border: '1px solid var(--border)',
                    }} 
                  />
                ) : (
                  <div style={{
                    width: 60,
                    height: 60,
                    background: 'var(--pr-l)',
                    borderRadius: 'var(--r)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {file.type.includes('pdf') ? '📑' : '📄'}
                  </div>
                )}
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ 
                    fontSize: 13, 
                    fontWeight: 600, 
                    color: 'var(--text-1)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 200,
                  }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {formatSize(file.size)} • {ALLOWED_TYPES[file.type] || 'Document'}
                  </div>
                </div>
                {!uploading && (
                  <button
                    className="btn btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                      setPreview(null)
                    }}
                    style={{ flexShrink: 0 }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div style={{ marginTop: 16 }}>
              <div style={{ 
                height: 6, 
                background: 'var(--elevated)', 
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: progress === 100 ? 'var(--success)' : 'var(--pr)',
                  borderRadius: 3,
                  transition: 'width .2s ease',
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>
                {progress === 100 ? 'Upload complete!' : `Uploading... ${progress}%`}
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'rgba(239,68,68,.08)',
              border: '1px solid rgba(239,68,68,.2)',
              borderRadius: 'var(--r)',
              color: 'var(--danger)',
              fontSize: 12,
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
            {onCancel && (
              <button 
                className="btn" 
                onClick={onCancel}
                disabled={uploading}
              >
                Cancel
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentUpload
