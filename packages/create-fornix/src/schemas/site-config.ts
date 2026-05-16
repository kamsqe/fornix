import { z } from "zod";

// ── Sub-schemas ───────────────────────────────────────────

const NavLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

const CtaSchema = z.object({
  text: z.string().min(1),
  href: z.string().min(1),
});

const LogoSchema = z.object({
  type: z.enum(["monogram", "svg", "wordmark"]),
  /** For `monogram` and `wordmark`: the text to display. */
  text: z.string().min(1).optional(),
  /** For `svg`: path relative to `public/` (e.g. `/logo.svg`). */
  src: z.string().min(1).optional(),
});

const SocialSchema = z
  .object({
    twitter: z.string().optional(),
    github: z.string().optional(),
    instagram: z.string().optional(),
    linkedin: z.string().optional(),
    youtube: z.string().optional(),
    mastodon: z.string().optional(),
    bluesky: z.string().optional(),
    threads: z.string().optional(),
  })
  .catchall(z.string());

const ContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const LegalSchema = z.object({
  copyright: z.string().optional(),
  privacyHref: z.string().optional(),
  termsHref: z.string().optional(),
});

const MetaSchema = z.object({
  /** Path or URL to the Open Graph image. */
  ogImage: z.string().optional(),
  /** Twitter handle without the `@` (e.g. `"fornix"`). */
  twitterHandle: z.string().optional(),
});

const LocaleSchema = z.object({
  default: z.string().min(1),
  supported: z.array(z.string().min(1)).min(1),
});

// ── Main schema ───────────────────────────────────────────

export const SiteConfigSchema = z.object({
  /** Project / brand name. Used in headers, footers, meta, page titles. */
  name: z.string().min(1),

  /** One-line tagline. Used in meta description + as a hero subhead fallback. */
  tagline: z.string().optional(),

  /** Production URL (used for canonical links + sitemap). */
  url: z.string().url().optional(),

  /** Archetype this site was scaffolded as (saas/agency/portfolio/gym/restaurant). */
  archetype: z.string().optional(),

  /** Default + supported locales. */
  locale: LocaleSchema,

  /** Brand logo strategy. */
  logo: LogoSchema.optional(),

  /** Top-level navigation links. */
  nav: z.array(NavLinkSchema).optional(),

  /** Primary CTA — used wherever a block doesn't override. */
  ctaPrimary: CtaSchema.optional(),

  /** Secondary CTA. */
  ctaSecondary: CtaSchema.optional(),

  /** Social media handles. */
  social: SocialSchema.optional(),

  /** Contact info (consumed by contact + footer blocks). */
  contact: ContactSchema.optional(),

  /** Legal / footer info. */
  legal: LegalSchema.optional(),

  /** Meta tag overrides. */
  meta: MetaSchema.optional(),

  /**
   * Archetype-specific escape hatch — typed `Record<string, unknown>` so
   * archetypes can declare their own structured data (gym hours, restaurant
   * menu sections, portfolio project list, ...) without inflating the
   * top-level schema.
   */
  archetypeMeta: z.record(z.unknown()).optional(),
});

// ── Derived types ─────────────────────────────────────────

export type SiteConfig = z.infer<typeof SiteConfigSchema>;
export type NavLink = z.infer<typeof NavLinkSchema>;
export type Cta = z.infer<typeof CtaSchema>;
export type Logo = z.infer<typeof LogoSchema>;
export type Social = z.infer<typeof SocialSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type Legal = z.infer<typeof LegalSchema>;
export type Meta = z.infer<typeof MetaSchema>;
