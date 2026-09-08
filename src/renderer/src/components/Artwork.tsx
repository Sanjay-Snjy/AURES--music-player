import { useState } from 'react'
import { Disc3 } from 'lucide-react'
import type { CSSProperties } from 'react'

interface ArtworkProps {
  src?: string | null
  alt?: string
  size?: number
  className?: string
  style?: CSSProperties
  radius?: number
  seed?: number
}

export function Artwork({
  src,
  alt = '',
  size,
  className = '',
  style,
  radius = 10,
  seed = 0
}: ArtworkProps): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const showImage = src && !failed

  const hues = [258, 190, 330, 210, 280, 160, 20]
  const h = hues[seed % hues.length]

  const baseStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    ...style
  }

  if (showImage) {
    return (
      <img
        src={src}
        alt={alt}
        className={`artwork-img ${className}`}
        style={baseStyle}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div
      className={`artwork-fallback ${className}`}
      style={{
        ...baseStyle,
        background: `linear-gradient(135deg, hsl(${h} 45% 26%), hsl(${(h + 40) % 360} 55% 16%))`
      }}
      aria-label={alt}
    >
      <Disc3 size={Math.round((size ?? 48) * 0.38)} color="rgba(255,255,255,0.55)" strokeWidth={1.4} />
    </div>
  )
}