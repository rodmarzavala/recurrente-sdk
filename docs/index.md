---
layout: home

hero:
  name: Recurrente SDK
  text: El SDK en TypeScript para Recurrente.
  tagline: Arquitectura Edge-first, cero dependencias y tipado estricto. Cobra suscripciones en Guatemala en minutos.
  actions:
    - theme: brand
      text: Primeros Pasos
      link: /getting-started
    - theme: alt
      text: Ver Referencia API
      link: /api-reference

features:
  - title: 100% Edge-First
    details: Funciona perfectamente en Vercel Edge, Cloudflare Workers, Next.js, Astro y Bun. Olvídate de los errores de "crypto" en Node.js.
    icon: 
  - title: Cero Dependencias
    details: Usa fetch nativo y Web Crypto API. Tu bundle se mantiene liviano, seguro y rapidísimo.
    icon: 
  - title: Cero Cobros Dobles (Resiliente)
    details: Trae idempotencia automática y reintentos (backoff) en caso de fallos de red intermitentes.
    icon: 
  - title: Tipado Estricto
    details: Escrito en TypeScript. VSCode te va a autocompletar todo, evitándote errores HTTP 422.
    icon: 
---

## ¿Por qué usar este SDK y no un "fetch" básico?

Hacer integraciones de pagos a mano con `fetch` básico es arriesgado. Aquí te van 4 razones técnicas (y críticas) de por qué este SDK es indispensable:

### 1. El infierno de verificar Webhooks 
Recurrente usa Svix para webhooks. Validar las firmas criptográficas a mano implica lidiar con hashes HMAC, timestamps y ataques de replay. Nuestro SDK lo reduce a **una línea de código** (`verifySignature`) que corre nativamente en el Edge, sin necesidad de instalar la pesada librería oficial de Svix.

### 2. Idempotencia automática (No más cobros dobles)
Si el internet falla intermitentemente justo cuando el usuario hace clic en "Pagar", podrías terminar cobrándole dos veces. Este SDK inyecta silenciosamente un `Idempotency-Key` único (UUID v4) en cada mutación (POST/DELETE), protegiéndote a ti y a tus clientes sin que tengas que programar nada extra.

### 3. Resiliencia contra caídas
¿Las APIs tiran errores 429 (Too Many Requests) o 500? El SDK tiene un cliente inteligente con *Exponential Backoff*. Esperará unos milisegundos y reintentará la petición automáticamente antes de mostrar un error al usuario final.

### 4. Paginación sin dolor
Si tienes más de 100 pagos, traerlos todos a mano te obliga a hacer ciclos `while` complejos leyendo los cursores. Aquí simplemente usas el helper `autoPagingToArray` y el SDK hace todas las llamadas internamente hasta entregarte un array plano listo para usar.

