import { useState, type CSSProperties, type SyntheticEvent } from 'react';
import { FirebaseImage } from './FirebaseImage';

interface AdaptiveImageBoxProps {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  /** Aspect ratio (width / height) shown before the image has loaded. */
  defaultAspectRatio?: string;
  /** Widest ratio allowed once the image's real dimensions are known. */
  maxAspectRatio?: number;
  /** Tallest (narrowest) ratio allowed once the image's real dimensions are known. */
  minAspectRatio?: number;
  priority?: boolean;
}

/**
 * An image container that sizes itself to the image's own natural aspect
 * ratio (portrait, landscape, or square) instead of forcing every card
 * image into one fixed pixel height. A fixed height previously meant
 * either cropping artwork (object-fit: cover) or letterboxing it with
 * visible bars (object-fit: contain).
 *
 * Renders at `defaultAspectRatio` until the underlying <img> fires
 * `onLoad`, at which point the container switches to the image's actual
 * width/height ratio (clamped between minAspectRatio and maxAspectRatio so
 * one unusually extreme upload — a tall receipt photo, a wide panorama —
 * can't blow out the surrounding card grid). Once the ratio is known the
 * image fills its box exactly via object-fit: cover, so within the clamped
 * range there's no cropping.
 */
export const AdaptiveImageBox = ({
  src,
  alt,
  className,
  style,
  defaultAspectRatio = '4 / 3',
  maxAspectRatio = 16 / 9,
  minAspectRatio = 3 / 5,
  priority,
}: AdaptiveImageBoxProps) => {
  const [aspectRatio, setAspectRatio] = useState<string>(defaultAspectRatio);

  const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const natural = img.naturalWidth / img.naturalHeight;
    const clamped = Math.min(maxAspectRatio, Math.max(minAspectRatio, natural));
    setAspectRatio(`${clamped}`);
  };

  return (
    <div
      className={className}
      style={{
        aspectRatio,
        background: 'var(--ink-800)',
        overflow: 'hidden',
        transition: 'aspect-ratio 0.2s ease',
        ...style,
      }}
    >
      <FirebaseImage
        src={src}
        alt={alt}
        priority={priority}
        onLoad={handleLoad}
        className="w-full h-full"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
};
