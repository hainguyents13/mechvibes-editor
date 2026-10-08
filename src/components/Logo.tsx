import { siteIdentity, websiteUrl } from '@/config/siteIdentity';

interface LogoProps {
  text: string;
}

export const Logo = ({ text }: LogoProps) => {
  return (
    <div className="flex shrink-0 items-center">
      <a
        href={websiteUrl}
        className="flex items-center space-x-2 whitespace-nowrap"
      >
        <img
          src="/logo.svg"
          alt={`${siteIdentity.productName} Logo`}
          width={32}
          height={32}
          className="h-8 w-8"
        />
        <span className=" font-bold">{text}</span>
      </a>
    </div>
  );
};
