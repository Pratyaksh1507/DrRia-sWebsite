import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  variant?: 'default' | 'cream';
  className?: string;
  isLink?: boolean;
}

export default function Logo({
  variant = 'default',
  className = '',
  isLink = true,
}: LogoProps) {
  const isCream = variant === 'cream';
  // Trimmed master dimensions: 989 x 241 (aspect ratio 4.1037)
  const masterWidth = 989;
  const masterHeight = 241;

  const src = isCream
    ? '/brand/dr-rias-logo-cream-360.webp'
    : '/brand/dr-rias-logo-360.webp';

  const defaultClasses = isCream
    ? 'h-10 w-auto object-contain'
    : 'h-9 md:h-11 w-auto object-contain';

  const imageElement = (
    <Image
      src={src}
      alt="Dr Ria's"
      width={masterWidth}
      height={masterHeight}
      loading="eager"
      className={className || defaultClasses}
    />
  );

  if (!isLink) {
    return imageElement;
  }

  return (
    <Link
      href="/"
      aria-label="Dr Ria's home"
      className="inline-flex items-center rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] focus:ring-offset-2 focus:ring-offset-[#FBF6EE] transition-opacity hover:opacity-90"
    >
      {imageElement}
    </Link>
  );
}
