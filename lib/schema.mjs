// schema.mjs — language-aware JSON-LD (schema.org) injected into every page <head>.
// One @graph per page: a sitewide Organization + WebSite identity, a per-page
// WebPage, plus page-type extras — FAQPage on the home page (rich-result eligible)
// and Course + BreadcrumbList on each module page. All text is bilingual; the
// build calls this once per language so NL and EN each get their own correct graph.
import { SITE, BASE, canonical } from './urls.mjs';

const ORIGIN = `${SITE}${BASE}`;
const abs = (path) => `${ORIGIN}${path}`;          // /assets/x.png -> absolute URL
const ORG_ID = `${ORIGIN}/#organization`;
const SITE_ID = `${ORIGIN}/#website`;
const bcp47 = (lang) => (lang === 'nl' ? 'nl-NL' : 'en-US');

// Clean, human course names per module (the <title> is brand-first; these aren't).
const MODULES = {
  'modules/reanimatie-aed.html': { nl: 'Reanimatie & AED (Basic Life Support)', en: 'Resuscitation & AED (Basic Life Support)' },
  'modules/abcde.html': { nl: 'ABCDE-protocol voor de acuut zieke patiënt', en: 'ABCDE protocol for the acutely ill patient' },
  'modules/ecg.html': { nl: 'ECG-interpretatie', en: 'ECG interpretation' },
  'modules/als.html': { nl: 'Advanced Life Support (ALS)', en: 'Advanced Life Support (ALS)' },
};

// Home-page FAQ, mirrored from the visible <details> block in src/index.html.
const FAQ = [
  {
    nl: ['Op welke apparaten werkt Medu.game?', 'Je speelt Medu.game in de browser op je computer of laptop, waar de meeste mensen spelen, én als app op telefoon en tablet. Je voortgang wordt overal bewaard, dus je gaat verder waar je gebleven was.'],
    en: ['Which devices does Medu.game run on?', 'You play Medu.game in the browser on a computer or laptop, where most people play, and as an app on phone and tablet. Your progress is saved everywhere, so you continue where you left off.'],
  },
  {
    nl: ['Hoe wordt de content gemaakt?', 'Cases worden samengesteld uit herbruikbare bouwblokken in het platform, samen met inhoudelijke experts en getoetst aan actuele richtlijnen. Zo is nieuwe content snel te bouwen en blijft kwaliteit geborgd.'],
    en: ['How is the content created?', 'Cases are assembled from reusable building blocks in the platform, together with subject-matter experts and validated against current guidelines. This makes new content quick to build while quality stays assured.'],
  },
  {
    nl: ['Integreert het met ons LMS?', 'Ja. Er zijn kant-en-klare koppelingen met Moodle, Canvas, aNewSpring en andere bekende LMS-systemen voor voortgangsrapportage, plus single sign-on en gebruikersanalytics.'],
    en: ['Does it integrate with our LMS?', 'Yes. There are ready-made integrations with Moodle, Canvas, aNewSpring and other well-known LMS platforms for progress reporting, plus single sign-on and user analytics.'],
  },
  {
    nl: ['In welke talen is het beschikbaar?', 'Nederlands, Engels en Braziliaans-Portugees (pt-BR). Medu.game wordt in meerdere landen gebruikt. Nieuwe talen zijn eenvoudig toe te voegen.'],
    en: ['Which languages is it available in?', 'Dutch, English and Brazilian Portuguese (pt-BR). Medu.game is used in several countries, and new languages are easy to add.'],
  },
  {
    nl: ['Hoe meten we het resultaat?', 'Via gebruikersanalytics en LMS-rapportage zie je deelname, voortgang en prestaties: meetbaar opleiden voor HR en de organisatie.'],
    en: ['How do we measure results?', 'Through user analytics and LMS reporting you see participation, progress and performance: measurable training for HR and the organisation.'],
  },
  {
    nl: ['Wat kost Medu.game?', 'Je betaalt per gebruiker per jaar. Afhankelijk van welke modules je afneemt, het aantal licenties en of je ons leerplatform of je eigen LMS gebruikt, maken we een prijs op maat. Plan een demo, dan rekenen we het voor jullie situatie door.'],
    en: ['What does Medu.game cost?', "You pay per user per year. Depending on which modules you choose, the number of licences and whether you use our learning platform or your own LMS, we put together a custom price. Book a demo and we'll work it out for your situation."],
  },
];

function organization() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Medu.game',
    legalName: 'Medu.game B.V.',
    url: `${ORIGIN}/`,
    logo: { '@type': 'ImageObject', url: abs('/assets/logo-pink.png') },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Trompweg 35',
      addressLocality: 'Nijverdal',
      addressCountry: 'NL',
    },
    sameAs: ['https://www.linkedin.com/company/medu-game'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'aad.lievaart@medu.game',
    },
  };
}

function website() {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: `${ORIGIN}/`,
    name: 'Medu.game',
    publisher: { '@id': ORG_ID },
    inLanguage: ['nl-NL', 'en-US'],
  };
}

export function buildSchema({ relPath, lang, meta }) {
  const title = lang === 'nl' ? meta.titleNl : meta.titleEn;
  const desc = lang === 'nl' ? meta.descNl : meta.descEn;
  const url = canonical(relPath, lang);
  const inLanguage = bcp47(lang);

  const graph = [organization(), website()];

  graph.push({
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description: desc,
    isPartOf: { '@id': SITE_ID },
    inLanguage,
    primaryImageOfPage: { '@type': 'ImageObject', url: abs(meta.ogImage) },
  });

  if (relPath === 'index.html') {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage,
      isPartOf: { '@id': SITE_ID },
      mainEntity: FAQ.map((item) => {
        const [q, a] = item[lang];
        return { '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } };
      }),
    });
    graph.push({
      '@type': 'VideoObject',
      '@id': `${url}#intro-video`,
      name: lang === 'nl' ? 'Medu.game in actie' : 'Medu.game in action',
      description: lang === 'nl'
        ? 'Bekijk Medu.game in actie: klinisch redeneren in een realistische 3D-spoedopvang, met directe feedback op elke beslissing.'
        : 'Watch Medu.game in action: clinical reasoning in a realistic 3D emergency department, with instant feedback on every decision.',
      thumbnailUrl: abs('/assets/wat/abcde-intro-poster.webp'),
      uploadDate: '2026-06-24',
      duration: 'PT2M53S',
      contentUrl: abs('/assets/wat/abcde-intro.mp4'),
      inLanguage,
      publisher: { '@id': ORG_ID },
    });
  }

  if (MODULES[relPath]) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: lang === 'nl' ? 'Home' : 'Home', item: canonical('index.html', lang) },
        { '@type': 'ListItem', position: 2, name: MODULES[relPath][lang] },
      ],
    });
    graph.push({
      '@type': 'Course',
      '@id': `${url}#course`,
      name: MODULES[relPath][lang],
      description: desc,
      url,
      image: abs(meta.ogImage),
      inLanguage,
      provider: { '@id': ORG_ID },
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', inLanguage },
    });
  }

  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  // Escape '<' so a stray "</script>" in data can never break out of the tag.
  return `  <script type="application/ld+json">${json.replace(/</g, '\\u003c')}</script>`;
}
