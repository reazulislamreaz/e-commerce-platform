import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  titleAccent?: string;
  description: string;
  image: string;
  /** Optional mobile crop; desktop always uses `image`. */
  mobileImage?: string;
  imageAlt?: string;
  /** Unique layout variant per page */
  variant?: 'split' | 'full' | 'centered' | 'asymmetric';
  cta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
};

function ResponsiveHeroImage({
  image,
  mobileImage,
  imageAlt,
  sizes,
  className,
  priority = false,
}: {
  image: string;
  mobileImage?: string;
  imageAlt: string;
  sizes: string;
  className: string;
  priority?: boolean;
}) {
  if (!mobileImage) {
    return (
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority={priority}
        sizes={sizes}
        className={className}
      />
    );
  }

  return (
    <>
      <Image
        src={mobileImage}
        alt={imageAlt}
        fill
        priority={priority}
        sizes={sizes}
        className={`${className} md:hidden`}
      />
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority={priority}
        sizes={sizes}
        className={`${className} hidden md:block`}
      />
    </>
  );
}

function HeroTitle({ title, titleAccent }: { title: ReactNode; titleAccent?: string }) {
  if (!titleAccent) return <>{title}</>;
  return (
    <>
      {title} <span className="text-[#C9A227]">{titleAccent}</span>
    </>
  );
}

export function PageHero({
  eyebrow,
  title,
  titleAccent,
  description,
  image,
  mobileImage,
  imageAlt = '',
  variant = 'split',
  cta,
  secondaryCta,
}: PageHeroProps) {
  if (variant === 'full') {
    return (
      <section className="relative min-h-[42vh] overflow-hidden border-b border-[#E5E7EB] bg-[#FAFAFA] sm:min-h-[48vh]">
        <ResponsiveHeroImage
          image={image}
          mobileImage={mobileImage}
          imageAlt={imageAlt}
          priority
          sizes="100vw"
          className="object-cover object-center opacity-55"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#FAFAFA] via-[#FAFAFA]/85 to-[#FAFAFA]/40" />
        <div className="relative mx-auto flex min-h-[42vh] max-w-[1400px] flex-col justify-end px-5 pb-10 pt-16 sm:min-h-[48vh] sm:px-7 sm:pb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
            {eyebrow}
          </p>
          <h1 className="mt-2 max-w-xl text-[clamp(36px,8vw,64px)] font-extrabold leading-[.95] tracking-[-.04em] text-[#111111]">
            <HeroTitle title={title} titleAccent={titleAccent} />
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#555555]">{description}</p>
          <HeroActions cta={cta} secondaryCta={secondaryCta} />
        </div>
      </section>
    );
  }

  if (variant === 'centered') {
    return (
      <section className="border-b border-[#E5E7EB] bg-[#FAFAFA] px-5 py-14 text-center sm:px-7 sm:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
          {eyebrow}
        </p>
        <h1 className="mx-auto mt-2 max-w-2xl text-[clamp(36px,7vw,56px)] font-extrabold leading-[.95] tracking-[-.04em] text-[#111111]">
          <HeroTitle title={title} titleAccent={titleAccent} />
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[#555555]">
          {description}
        </p>
        <div className="mt-6 flex justify-center">
          <HeroActions cta={cta} secondaryCta={secondaryCta} />
        </div>
      </section>
    );
  }

  if (variant === 'asymmetric') {
    return (
      <section className="overflow-hidden border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[1.05fr_.95fr]">
          <div className="flex flex-col justify-center px-3 py-12 sm:px-6 sm:py-14 lg:py-16 lg:pr-10">
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-[clamp(36px,7vw,58px)] font-extrabold leading-[.95] tracking-[-.04em] text-[#111111]">
              <HeroTitle title={title} titleAccent={titleAccent} />
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#555555]">{description}</p>
            <HeroActions cta={cta} secondaryCta={secondaryCta} />
          </div>
          <div className="relative min-h-[280px] overflow-hidden sm:min-h-[360px] lg:min-h-[480px]">
            <ResponsiveHeroImage
              image={image}
              mobileImage={mobileImage}
              imageAlt={imageAlt}
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-top"
            />
          </div>
        </div>
      </section>
    );
  }

  // split (default)
  return (
    <section className="overflow-hidden border-b border-[#E5E7EB] bg-[#FAFAFA]">
      <div className="mx-auto grid max-w-[1400px] lg:grid-cols-2">
        <div className="relative z-10 flex flex-col justify-center px-3 py-12 sm:px-6 sm:py-14 lg:py-16 lg:pr-10">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-[clamp(36px,7vw,58px)] font-extrabold leading-[.95] tracking-[-.04em] text-[#111111]">
            <HeroTitle title={title} titleAccent={titleAccent} />
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#555555]">{description}</p>
          <HeroActions cta={cta} secondaryCta={secondaryCta} />
        </div>
        <div className="relative min-h-[280px] overflow-hidden sm:min-h-[360px]">
          <ResponsiveHeroImage
            image={image}
            mobileImage={mobileImage}
            imageAlt={imageAlt}
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function HeroActions({
  cta,
  secondaryCta,
}: {
  cta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
}) {
  if (!cta && !secondaryCta) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-2.5">
      {cta && (
        <Link
          href={cta.href}
          className="border border-[#111111] bg-[#111111] px-5 py-2.5 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
        >
          {cta.label}
        </Link>
      )}
      {secondaryCta && (
        <Link
          href={secondaryCta.href}
          className="border border-[#111111] bg-white px-5 py-2.5 text-[11px] font-bold uppercase text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
        >
          {secondaryCta.label}
        </Link>
      )}
    </div>
  );
}
