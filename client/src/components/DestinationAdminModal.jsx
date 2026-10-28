// Destination Admin CRUD & JSON Import/Export Modal
import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { SUPPORTED_CURRENCY_CODES } from '../utils/currency';

const DestinationAdminModal = ({
  destinationToEdit = null,
  onClose,
  onSuccess
}) => {
  const isEditing = Boolean(destinationToEdit);

  // Form State
  const [formData, setFormData] = useState({
    name: destinationToEdit?.name || '',
    slug: destinationToEdit?.slug || '',
    country: destinationToEdit?.country || '',
    state: destinationToEdit?.state || '',
    categories: destinationToEdit?.categories?.join(', ') || destinationToEdit?.category || 'Adventure, Scenic',
    description: destinationToEdit?.description || '',
    coverImage: destinationToEdit?.coverImage || destinationToEdit?.imageUrl || '',
    galleryUrls: destinationToEdit?.gallery?.map((g) => (typeof g === 'string' ? g : g.url)).join('\n') || '',
    bestVisitingTime: destinationToEdit?.bestVisitingTime || '',
    estimatedBudget: destinationToEdit?.estimatedBudget || destinationToEdit?.averageCostPerDay || 5000,
    currency: destinationToEdit?.currency || 'INR',
    duration: destinationToEdit?.duration || '3-5 Days',
    highlights: destinationToEdit?.highlights?.join('\n') || '',
    lat: destinationToEdit?.coordinates?.lat || 0,
    lng: destinationToEdit?.coordinates?.lng || 0,
    featured: Boolean(destinationToEdit?.featured)
  });

  const [activeTab, setActiveTab] = useState('form'); // 'form' or 'json'
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Submit Destination CRUD
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const categoriesArray = formData.categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const galleryArray = formData.galleryUrls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean)
        .map((url, i) => ({ url, caption: `${formData.name} photo ${i + 1}` }));

      const highlightsArray = formData.highlights
        .split('\n')
        .map((h) => h.trim())
        .filter(Boolean);

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        country: formData.country.trim(),
        state: formData.state.trim(),
        categories: categoriesArray.length > 0 ? categoriesArray : ['Adventure'],
        description: formData.description.trim(),
        coverImage: formData.coverImage.trim(),
        gallery: galleryArray.length > 0 ? galleryArray : [{ url: formData.coverImage.trim(), caption: formData.name }],
        bestVisitingTime: formData.bestVisitingTime.trim(),
        estimatedBudget: Number(formData.estimatedBudget),
        currency: formData.currency.toUpperCase(),
        duration: formData.duration.trim(),
        highlights: highlightsArray,
        coordinates: {
          lat: Number(formData.lat) || 0,
          lng: Number(formData.lng) || 0
        },
        featured: formData.featured
      };

      const url = isEditing ? `/api/destinations/${destinationToEdit._id}` : '/api/destinations';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res?.success) {
        setSuccessMsg(isEditing ? 'Destination updated!' : 'Destination created!');
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  // Export JSON
  const handleExportJson = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/destinations/export/json');
      if (res?.success && res.data) {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `destinations_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        setSuccessMsg(`Exported ${res.data.length} destinations to JSON file`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  // Import JSON
  const handleImportJson = async () => {
    if (!jsonText.trim()) {
      setErrorMsg('Please paste JSON or upload a file');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (pe) {
        throw new Error('Invalid JSON format: ' + pe.message);
      }

      const res = await apiFetch('/api/destinations/import/json', {
        method: 'POST',
        body: JSON.stringify(parsed)
      });

      if (res?.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  // File upload reader
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonText(event.target?.result || '');
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <h3>
            {isEditing ? '✏️ Edit Destination' : '⚙️ Manage & Add Destinations'}
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab switch between Form and JSON import/export */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`dashboard-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.95rem' }}
          >
            {isEditing ? 'Destination Form' : '+ New Destination Form'}
          </button>
          {!isEditing && (
            <button
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'json' ? 'active' : ''}`}
              onClick={() => setActiveTab('json')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.95rem' }}
            >
              📥 Import / 📤 Export JSON
            </button>
          )}
        </div>

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        {activeTab === 'form' ? (
          <form onSubmit={handleSubmitForm}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="dest-name">Destination Name *</label>
                <input
                  id="dest-name"
                  type="text"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Kyoto"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dest-slug">Slug (URL identifier)</label>
                <input
                  id="dest-slug"
                  type="text"
                  name="slug"
                  className="form-input"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="e.g. kyoto (auto-generated if empty)"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="dest-country">Country *</label>
                <input
                  id="dest-country"
                  type="text"
                  name="country"
                  className="form-input"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="e.g. Japan"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dest-state">State / Province</label>
                <input
                  id="dest-state"
                  type="text"
                  name="state"
                  className="form-input"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Kansai"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dest-categories">Categories (comma-separated)</label>
              <input
                id="dest-categories"
                type="text"
                name="categories"
                className="form-input"
                value={formData.categories}
                onChange={handleChange}
                placeholder="Culture & Heritage, Temples, Scenic"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dest-desc">Description *</label>
              <textarea
                id="dest-desc"
                name="description"
                className="form-textarea"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                placeholder="Comprehensive summary of the destination..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dest-cover">Cover Image URL *</label>
              <input
                id="dest-cover"
                type="url"
                name="coverImage"
                className="form-input"
                value={formData.coverImage}
                onChange={handleChange}
                placeholder="https://images.unsplash.com/..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dest-gallery">Gallery Photo URLs (one per line)</label>
              <textarea
                id="dest-gallery"
                name="galleryUrls"
                className="form-textarea"
                rows="3"
                value={formData.galleryUrls}
                onChange={handleChange}
                placeholder="https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="dest-budget">Estimated Budget</label>
                <input
                  id="dest-budget"
                  type="number"
                  name="estimatedBudget"
                  className="form-input"
                  value={formData.estimatedBudget}
                  onChange={handleChange}
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dest-curr">Currency</label>
                <select
                  id="dest-curr"
                  name="currency"
                  className="form-select"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  {SUPPORTED_CURRENCY_CODES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dest-dur">Ideal Duration</label>
                <input
                  id="dest-dur"
                  type="text"
                  name="duration"
                  className="form-input"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="e.g. 5-7 Days"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="dest-time">Best Visiting Time</label>
                <input
                  id="dest-time"
                  type="text"
                  name="bestVisitingTime"
                  className="form-input"
                  value={formData.bestVisitingTime}
                  onChange={handleChange}
                  placeholder="e.g. Oct to Mar"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dest-lat">Latitude</label>
                <input
                  id="dest-lat"
                  type="number"
                  step="any"
                  name="lat"
                  className="form-input"
                  value={formData.lat}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dest-lng">Longitude</label>
                <input
                  id="dest-lng"
                  type="number"
                  step="any"
                  name="lng"
                  className="form-input"
                  value={formData.lng}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dest-highlights">Highlights & Top Sights (one per line)</label>
              <textarea
                id="dest-highlights"
                name="highlights"
                className="form-textarea"
                rows="3"
                value={formData.highlights}
                onChange={handleChange}
                placeholder="Fushimi Inari shrine&#10;Arashiyama bamboo grove&#10;Kinkaku-ji golden temple"
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="dest-featured"
                name="featured"
                checked={formData.featured}
                onChange={handleChange}
                style={{ width: '18px', height: '18px' }}
              />
              <label htmlFor="dest-featured" style={{ fontWeight: 600, cursor: 'pointer' }}>
                ⭐ Mark as Featured Destination
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Destination'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ margin: 0 }}>Export Catalog</h4>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--slate)', fontSize: '0.85rem' }}>
                  Download all MongoDB destinations as a structured JSON file.
                </p>
              </div>
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleExportJson} disabled={loading}>
                📥 Download JSON Export
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />

            <div>
              <h4 style={{ marginBottom: '0.5rem' }}>Import Destinations JSON</h4>
              <p style={{ color: 'var(--slate)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Upload or paste an array of destination objects. Existing destinations are safely updated by slug, avoiding duplicates.
              </p>

              <div className="form-group">
                <label className="form-label">Upload JSON File</label>
                <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="form-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Or Paste JSON Content</label>
                <textarea
                  className="form-textarea"
                  rows="6"
                  placeholder='[ { "name": "Tokyo", "country": "Japan", ... } ]'
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImportJson}
                disabled={loading || !jsonText.trim()}
              >
                {loading ? 'Importing...' : '🚀 Process JSON Import'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DestinationAdminModal;
