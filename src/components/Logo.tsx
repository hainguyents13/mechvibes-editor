import { siteIdentity, websiteUrl } from '@/config/siteIdentity';

interface LogoProps {
  text: string;
}

export const Logo = ({ text }: LogoProps) => {
  return (
    <div className="hidden sm:flex shrink-0 items-center">
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener"
        className="flex items-center space-x-2 whitespace-nowrap"
      >
        <img
          src="/logo.png"
          alt={`${siteIdentity.productName} Logo`}
          width={32}
          height={32}
          className="h-8 w-8"
        />
        <span className="font-bold">{text}</span>
      </a>
    </div>
  );
};
