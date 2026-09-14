import React, { useState, useEffect, useRef } from 'react';
import { getFlagUrl, getLowResFlagUrl } from '../services/countriesApi';
import { isImagePreloaded, markImagePreloaded } from '../services/resourcePreloader';

// Module-level cache of high-res image URLs that are decoded in GPU/browser memory
const decodedMemoryCache = new Set<string>();

function isUrlCachedInBrowser(url: string): boolean {
  if (!url) return false;
  if (decodedMemoryCache.has(url) || isImagePreloaded(url)) return true;
  if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
    try {
      const testImg = new Image();
      testImg.src = url;
      if (testImg.complete && testImg.naturalWidth > 0) {
        decodedMemoryCache.add(url);
        markImagePreloaded(url);
        return true;
      }
    } catch {
      // safe fallback
    }
  }
  return false;
}

interface ProgressiveFlagProps {
  alpha2?: string;
  name?: string;
  flagUrl?: string;
  lowFlagUrl?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  loading?: 'eager' | 'lazy';
  alt?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const ProgressiveFlag: React.FC<ProgressiveFlagProps> = ({
  alpha2,
  name,
  flagUrl,
  lowFlagUrl,
  className = '',
  style,
  id,
  loading = 'eager',
  alt,
  onLoad,
  onError,
}) => {
  const code = alpha2 ? alpha2.toLowerCase() : '';
  const lowSrc = lowFlagUrl || (code ? getLowResFlagUrl(code) : '');
  const highSrc = flagUrl || (code ? getFlagUrl(code, 'high') : '');

  const isAlreadyWarm = isUrlCachedInBrowser(highSrc);
  const initialSrc = isAlreadyWarm ? highSrc : (isUrlCachedInBrowser(lowSrc) ? lowSrc : (lowSrc || highSrc));

  const [currentSrc, setCurrentSrc] = useState<string>(initialSrc);
  const [isHighResLoaded, setIsHighResLoaded] = useState<boolean>(isAlreadyWarm);
  const activeCodeRef = useRef<string>(code);

  useEffect(() => {
    activeCodeRef.current = code;

    const warm = isUrlCachedInBrowser(highSrc);
    if (warm) {
      setCurrentSrc(highSrc);
      setIsHighResLoaded(true);
      if (onLoad) onLoad();
      return;
    }

    setIsHighResLoaded(false);
    const startSrc = lowSrc || highSrc;
    setCurrentSrc(startSrc);

    if (!highSrc || highSrc === lowSrc) {
      setIsHighResLoaded(true);
      return;
    }

    let isSubscribed = true;
    const highImg = new Image();

    const handleHighLoaded = () => {
      if (highSrc) {
        decodedMemoryCache.add(highSrc);
        markImagePreloaded(highSrc);
      }
      if (!isSubscribed || activeCodeRef.current !== code) return;
      setCurrentSrc(highSrc);
      setIsHighResLoaded(true);
      if (onLoad) onLoad();
    };

    highImg.onload = () => {
      if (typeof highImg.decode === 'function') {
        highImg.decode()
          .then(handleHighLoaded)
          .catch(handleHighLoaded);
      } else {
        handleHighLoaded();
      }
    };

    highImg.onerror = () => {
      if (!isSubscribed || activeCodeRef.current !== code) return;
      // Fallback: stay with low-res or external CDN
      if (onError) onError();
    };

    highImg.src = highSrc;

    return () => {
      isSubscribed = false;
      highImg.onload = null;
      highImg.onerror = null;
    };
  }, [code, lowSrc, highSrc]);

  const altText = alt || (name ? `Flag of ${name}` : 'National Flag');

  return (
    <img
      id={id}
      src={currentSrc}
      alt={altText}
      className={`progressive-flag ${className} ${isHighResLoaded ? 'flag-highres-ready' : 'flag-lowres-active'}`}
      style={style}
      loading={loading}
      decoding="async"
      onLoad={onLoad}
      onError={onError}
    />
  );
};
