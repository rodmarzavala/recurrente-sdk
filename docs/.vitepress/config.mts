import { defineConfig } from 'vitepress';

export default defineConfig({
  title: "Recurrente SDK",
  description: "Official-grade TypeScript SDK for the Recurrente Payment Gateway",
  base: "/recurrente-sdk/",

  themeConfig: {
    logo: 'https://app.recurrente.com/favicon.ico',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/rodmarzavala/recurrente-sdk' }
    ],
    search: { provider: 'local' },
  },

  locales: {
    root: {
      label: 'Español',
      lang: 'es',
      themeConfig: {
        nav: [
          { text: 'Inicio', link: '/' },
          { text: 'Empezar', link: '/getting-started' },
          { text: 'Referencia API', link: '/api-reference' }
        ],
        sidebar: [
          {
            text: 'Introducción',
            items: [
              { text: '¿Por qué usarlo?', link: '/' },
              { text: 'Empezar (Instalación)', link: '/getting-started' },
              { text: 'Ejemplos por Framework', link: '/frameworks' }
            ]
          },
          {
            text: 'Core',
            items: [
              { text: 'Referencia API', link: '/api-reference' },
              { text: 'Webhooks', link: '/webhooks' },
              { text: 'CLI & Forwarder', link: '/cli' }
            ]
          }
        ],
        footer: {
          message: 'Publicado bajo la Licencia MIT.',
          copyright: 'Copyright © 2026 Rodmar Zavala'
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Getting Started', link: '/en/getting-started' },
          { text: 'API Reference', link: '/en/api-reference' }
        ],
        sidebar: [
          {
            text: 'Introduction',
            items: [
              { text: 'Why use it?', link: '/en/' },
              { text: 'Getting Started', link: '/en/getting-started' },
              { text: 'Framework Examples', link: '/en/frameworks' }
            ]
          },
          {
            text: 'Core Features',
            items: [
              { text: 'API Reference', link: '/en/api-reference' },
              { text: 'Webhooks', link: '/en/webhooks' },
              { text: 'CLI & Forwarder', link: '/en/cli' }
            ]
          }
        ],
        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Copyright © 2026 Rodmar Zavala'
        }
      }
    }
  }
});

