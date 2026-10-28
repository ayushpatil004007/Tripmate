// Responsive Destination Image Gallery Component with Loading States & Fallbacks
import React, { useState } from 'react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80';

const DestinationGallery = ({ coverImage, gallery = [], title = 'Destination' }) => {
  // Normalize photos array
  const photos = React.useMemo(() => {
    const list = [];
    if (coverImage) {
      list.push({ url: coverImage, caption: `${title} Main View` });
    }
    if (Array.isArray(gallery)) {
      gallery.forEach((g) => {
        const url = typeof g === 'string' ? g : g?.url;
        const caption = typeof g === 'object' ? g?.caption : '';
        if (url && !list.some((existing) => existing.url === url)) {
          list.push({ url, caption: caption || `${title} photo` });
        }
      });
    }
    if (list.length === 0) {
      list.push({ url: FALLBACK_IMAGE, caption: `${title} scenic view` });
    }
    return list;
  }, [coverImage, gallery, title]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const activePhoto = photos[activeIndex] || photos[0];

  const handleNext = (e) => {
    e?.stopPropagation();
    setImageLoaded(false);
    setHasError(false);
    setActiveIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    setImageLoaded(false);
    setHasError(false);
    setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleThumbnailClick = (idx) => {
    if (idx !== activeIndex) {
      setImageLoaded(false);
      setHasError(false);
      setActiveIndex(idx);
    }
  };

  const handleImageError = () => {
    setHasError(true);
    setImageLoaded(true);
  };

  return (
    <div className="destination-gallery-container">
      {/* Main Viewport */}
      <div
        className="gallery-main-viewport"
        onClick={() => setIsLightboxOpen(true)}
        title="Click to view full screen"
      >
        {/* Loading skeleton */}
        {!imageLoaded && <div className="gallery-skeleton-loader" />}

        <img
          src={hasError ? FALLBACK_IMAGE : activePhoto.url}
          alt={activePhoto.caption || title}
          className={`gallery-main-image ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
        />

        {/* Counter Badge */}
        <div className="gallery-counter-badge">
          📷 {activeIndex + 1} / {photos.length}
        </div>

        {/* Prev / Next controls */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-nav-btn prev"
              onClick={handlePrev}
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery-nav-btn next"
              onClick={handleNext}
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        )}

        {/* Caption Bar */}
        {activePhoto.caption && (
          <div className="gallery-caption-bar">
            <span>{activePhoto.caption}</span>
          </div>
        )}
      </div>

      {/* Thumbnails Strip */}
      {photos.length > 1 && (
        <div className="gallery-thumbnails-strip">
          {photos.map((item, index) => (
            <button
              key={`${item.url}-${index}`}
              type="button"
              className={`gallery-thumb-btn ${index === activeIndex ? 'active' : ''}`}
              onClick={() => handleThumbnailClick(index)}
              aria-label={`View photo ${index + 1}`}
            >
              <img
                src={item.url}
                alt={`Thumbnail ${index + 1}`}
                className="gallery-thumb-img"
                onError={(e) => {
                  e.target.src = FALLBACK_IMAGE;
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div className="gallery-lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
          <div className="gallery-lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="gallery-lightbox-close"
              onClick={() => setIsLightboxOpen(false)}
            >
              ✕
            </button>

            <img
              src={hasError ? FALLBACK_IMAGE : activePhoto.url}
              alt={activePhoto.caption || title}
              className="gallery-lightbox-img"
            />

            <div className="gallery-lightbox-info">
              <span>{activePhoto.caption || title}</span>
              <span>
                {activeIndex + 1} of {photos.length}
              </span>
            </div>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-lightbox-nav prev"
                  onClick={handlePrev}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="gallery-lightbox-nav next"
                  onClick={handleNext}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DestinationGallery;
