import React, { useState, useEffect, useRef } from 'react';
import { getFlagUrl, getLowResFlagUrl } from '../services/countriesApi';

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

  // Start with low-res source immediately
  const [currentSrc, setCurrentSrc] = useState<string>(lowSrc || highSrc);
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const activeCodeRef = useRef<string>(code);

  useEffect(() => {
    activeCodeRef.current = code;
    setIsHighResLoaded(false);

    const initialSrc = lowSrc || highSrc;
    setCurrentSrc(initialSrc);

    if (!highSrc || highSrc === lowSrc) {
      setIsHighResLoaded(true);
      return;
    }

    let isSubscribed = true;
    const highImg = new Image();

    const handleHighLoaded = () => {
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
      onLoad={onLoad}
      onError={onError}
    />
  );
};
