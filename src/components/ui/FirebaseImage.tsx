import React, { useState, useEffect, useCallback } from 'react';
import { imageService } from '../../services/imageService';

interface FirebaseImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  useSkeleton?: boolean;
  priority?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  aspectRatio?: string;
}

/**
 * FirebaseImage: A component that resolves URLs using ImageService.
 * It strictly uses the provided path (ideally primaryPhotoPath) from Firebase Storage.
 * Implements lazy loading via Intersection Observer and provides a loading skeleton.
 */
export const FirebaseImage: React.FC<FirebaseImageProps> = ({ 
  src, 
  fallbackSrc,
  alt, 
  className,
  useSkeleton = true,
  priority = false,
  aspectRatio,
  ...props 
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [imageUnavailable, setImageUnavailable] = useState(false);

  const resolveImage = useCallback(async () => {
    setImageUnavailable(false);

    if (!src) {
      if (fallbackSrc) {
        setResolvedUrl(fallbackSrc);
      } else {
        setResolvedUrl(null);
        setImageUnavailable(true);
      }
      return;
    }

    try {
      const url = await imageService.resolve(src);
      setResolvedUrl(url);
    } catch (err) {
      if (fallbackSrc) {
        setResolvedUrl(fallbackSrc);
      } else {
        setResolvedUrl(null);
        setImageUnavailable(true);
      }
    }
  }, [src, fallbackSrc]);

  useEffect(() => {
    resolveImage();
  }, [resolveImage]);

  const handleError = () => {
    if (fallbackSrc && resolvedUrl !== fallbackSrc) {
      setResolvedUrl(fallbackSrc);
    } else {
      setResolvedUrl(null);
      setImageUnavailable(true);
    }
  };

  return (
    <div 
      className={`relative overflow-hidden ${className || ''}`}
      style={{ 
        minHeight: props.height ? `${props.height}px` : '100%',
        aspectRatio: aspectRatio || 'auto'
      }}
    >
      {imageUnavailable && (
        <div
          className="flex h-full min-h-32 w-full items-center justify-center bg-neutral-900 px-4 text-center text-xs font-semibold uppercase tracking-widest text-neutral-400"
          role="img"
          aria-label={alt ? `${alt} — image unavailable` : 'Image unavailable'}
        >
          Image unavailable
        </div>
      )}
      {resolvedUrl && (
        <img
          src={resolvedUrl}
          alt={alt}
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="w-full h-full object-cover"
          onError={handleError}
          referrerPolicy="no-referrer"
          {...props}
        />
      )}
    </div>
  );
};
