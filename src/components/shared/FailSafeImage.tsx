import { Image, ImageProps } from 'react-bootstrap';
import noImageUrl from '../../assets/noimage.svg';

export const DefaultFallbackUrl = noImageUrl;

interface Props extends ImageProps {
  fallbackUrl?: string;
}

export function FailSafeImage({ fallbackUrl = DefaultFallbackUrl, ...props }: Props) {
  return <Image {...props} onError={handleError} />;

  function handleError(event: React.SyntheticEvent<HTMLImageElement>) {
    if (fallbackUrl && event.currentTarget.src !== fallbackUrl) {
      event.currentTarget.src = fallbackUrl;
    }
  }
}
