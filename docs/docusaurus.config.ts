import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SyloPay Spec Portal',
  tagline: 'Especificações Técnicas de Buy Now, Pay Later na Stellar',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://sylopay.com',
  baseUrl: '/',

  organizationName: 'Sylopay',
  projectName: 'sylopay',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Sylopay/sylopay/tree/main/docs/',
        },
        blog: false, // Disabled to focus purely on documentation
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'SyloPay Spec Portal',
      logo: {
        alt: 'SyloPay Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Specifications',
        },
        {
          href: 'https://github.com/Sylopay/sylopay',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Specs',
          items: [
            {
              label: 'Portal Overview',
              to: '/docs/intro',
            },
            {
              label: 'Smart Contracts',
              to: '/docs/smart_contracts',
            },
            {
              label: 'Frontend UI',
              to: '/docs/frontend_ui',
            },
          ],
        },
        {
          title: 'Stellar Developers',
          items: [
            {
              label: 'Stellar Docs',
              href: 'https://developers.stellar.org/',
            },
            {
              label: 'Soroban SDK',
              href: 'https://soroban.stellar.org/',
            },
            {
              label: 'Stellar Horizon API',
              href: 'https://horizon-testnet.stellar.org',
            },
          ],
        },
        {
          title: 'SyloPay Ecosystem',
          items: [
            {
              label: 'GitHub Repository',
              href: 'https://github.com/Sylopay/sylopay',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} SyloPay. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['rust', 'typescript', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
