import { SITE } from '../../content/site';

export function Seo() {
  const title = `${SITE.name} — ${SITE.tagline}`;
  const description = SITE.description;
  const url = SITE.url;

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    email: SITE.email,
    telephone: SITE.phone,
    description: SITE.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.street,
      postalCode: '04109',
      addressLocality: 'Leipzig',
      addressCountry: 'DE',
    },
  };

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {/* JSON-LD Organization */}
      <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
    </>
  );
}
