import { siteIdentity, websiteUrl } from '@/config/siteIdentity';

interface LogoProps {
  text: string;
  /** The navbar leaves the logo out on phones to keep room for its buttons. */
  showOnPhones?: boolean;
}

export const Logo = ({ text, showOnPhones = false }: LogoProps) => {
  return (
    <div
      className={`${showOnPhones ? 'flex' : 'hidden sm:flex'} shrink-0 items-center`}
    >
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
