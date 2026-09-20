# Design System: identidad visual de Block by Block (EAG × ETH × HSK Chain)

Es el **ADN visual** del producto: una sola fuente de verdad para colores, tipografía, layout y componentes. Complementa a [vision.md](vision.md) (qué somos) y a
[frontend_spec.md](frontend_spec.md) (qué pantallas y qué comportamiento); aquí se define **cómo se ve y se siente**. Requisito: **NFR-018**. Vocabulario de la interfaz: [glossary.md](glossary.md).

Estado: **Reviewed** (decidido 2026-09-20). Migración del frontend hecha el 2026-09-20 (tokens en `globals.css`, Inter + IBM Plex Mono, botón primario con gradiente y etiqueta `#050816`, estados de causa con su color fijo). Pendiente: logo `public/logo.png` (fondo claro), hover de cards, hero con glow propio y revisión visual pantalla por pantalla.

## 1. Dirección visual

Producto Web3 premium, tecnológico y profesional, para builders, aplicaciones e infraestructura on-chain. Referencia conceptual: **"Linear meets Web3 infrastructure"**.

Debe transmitir: **Infrastructure + Builders + Ethereum + Speed + Trust + Innovation**. Se siente: limpio, técnico, premium, rápido, confiable, on-chain.

- **Sí:** dark cinematic, minimalista, alta legibilidad, superficies ligeramente elevadas, bordes sutiles, luz mediante gradientes y acentos. Inspiración: Linear, Vercel, Stripe, Coinbase.
- **No:** fondo negro plano sin profundidad, exceso de gradientes o neón, glassmorphism exagerado, sombras pesadas, texturas, animaciones constantes, cards gigantes sin jerarquía, estética casino, meme o gamer, landing crypto genérica.

Para una plataforma de donaciones esto suma una regla propia: **la confianza manda sobre el efecto**. Montos, estados y hashes se leen primero; el brillo es secundario.

## 2. Jerarquía de marcas (regla de color)

| Marca | Representa | Colores | Se usa para |
|-------|------------|---------|-------------|
| **EAG** | Comunidad, builders (dominante) | Púrpura / cian | Identidad general, acción principal (CTA), estados activos, métricas clave |
| **ETH** | Ecosistema, fundación | Azul / lavanda | Todo lo *on-chain*: contrato, transacciones, hashes, enlaces al explorador |
| **HSK** | Rendimiento, infraestructura | Púrpura / índigo | La red HSK Chain testnet, velocidad, "sin comisión" |

Los tres colores **no compiten**: en una sección general domina EAG; ETH y HSK aparecen como colores semánticos según el contexto.

## 3. Paleta

### EAG (principal)
`primary #6C5CE7` · `secondary #A78BFA` · `accent #22D3EE` · `light #EDE9FE` · `dark #0F172A`

### Ethereum
`primary #627EEA` · `secondary #A8B5F7` · `accent #8B82F6` · `light #EDE9FE` · `dark #111827`. El azul complementa al púrpura de EAG, no compite con él.

### HSK Chain
`primary #883BFF` · `secondary #C9B6FF` · `accent #4F5BFF` · `light #F4F5FB` · `dark #252525`. Highlight y elementos directamente ligados a HSK.

### Neutros y estado

| Rol | Valor | Rol | Valor |
|-----|-------|-----|-------|
| Fondo principal | `#050816` | Texto principal | `#EDE9FE` |
| Fondo secundario | `#0B1220` | Texto secundario | `#94A3B8` |
| Superficie | `#111827` | Texto atenuado | `#64748B` |
| Card | `#162033` | Blanco | `#FFFFFF` |
| Borde | `#334155` | | |
| Éxito | `#10B981` | Advertencia | `#F59E0B` |
| Error | `#EF4444` | Información | `#38BDF8` |

Los colores de estado se usan con moderación y nunca dominan la identidad.

### Estados del producto (mapeo obligatorio)

Un estado se ve **igual en todas partes** (API, contrato y TypeScript ya comparten los nombres; ver glosario).

| Estado de la causa | Etiqueta | Color |
|--------------------|----------|-------|
| `Pending` | En revisión | Información `#38BDF8` |
| `Verified` | Verificada | Éxito `#10B981` |
| `Rejected` | Rechazada | Error `#EF4444` |
| `Completed` | Completada | ETH `#627EEA` |

Elementos on-chain (hash, dirección, enlace al explorador): ETH. Indicador de red y "0 % de comisión": HSK. Botón Donar, Retirar, Crear causa: EAG.

## 4. Gradientes

| Nombre | Valor | Uso |
|--------|-------|-----|
| EAG | `linear-gradient(135deg, #6C5CE7 0%, #A78BFA 55%, #22D3EE 100%)` | CTA principal, resaltados del hero, estados activos, métricas importantes |
| ETH | `linear-gradient(135deg, #627EEA 0%, #8B82F6 100%)` | Componentes de Ethereum, métricas de la cadena, indicadores de red |
| HSK | `linear-gradient(135deg, #883BFF 0%, #4F5BFF 100%)` | Componentes HSK, indicadores de rendimiento |
| Glow global | `radial-gradient(circle, rgba(108,92,231,0.18) 0%, transparent 65%)` | Hero, fondo, hover, grandes áreas vacías |

El glow es muy sutil y **nunca va detrás de cada card**.

## 5. Tipografía

**Inter**; alternativa `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Limpia, técnica, muy legible; sin fuentes "futuristas". Para hashes, direcciones y montos: fuente monoespaciada (`ui-monospace`, ya usada hoy con IBM Plex Mono; ver decisión D2).

| Nivel | Tamaño | Peso | Interlineado |
|-------|--------|------|--------------|
| H1 | 48–64 px | 600–700 | 1.05–1.15 |
| H2 | 32–40 px | 600 | — |
| H3 | 24–28 px | 600 | — |
| Cuerpo | 16 px | 400 | 1.5 |
| Pequeño | 14 px | — | — |
| Caption | 12 px | — | — |

## 6. Layout

Basado en grid. Escritorio: ancho máximo 1200–1280 px, padding horizontal 24–32 px, 12 columnas. Tablet: 8 columnas. Móvil: 4 columnas, padding 16–20 px. Mucho espacio negativo.
Jerarquía: 1) hero y CTA principal, 2) información crítica, 3) funciones, 4) ecosistema, 5) métricas, 6) información secundaria.
En el flujo de donación la información crítica es: **estado de la causa, monto objetivo, monto recaudado y el botón de acción**.

## 7. Cards

Superficie oscura (`#111827`), borde `rgba(148,163,184,0.16)`, radio 12–16 px, sombra mínima. Hover casi imperceptible: borde algo más luminoso, `translateY` máximo −2 px, glow muy sutil. Sin radios "SaaS infantil".

## 8. Botones

- **Primario:** gradiente EAG (púrpura → cian), radio 8–10 px, alto 40–48 px, peso 500–600, padding horizontal 18–24 px.
- **Secundario:** transparente, borde `#334155`, texto `#EDE9FE`.
- **Ghost:** sin fondo; hover `rgba(108,92,231,0.10)`.

Sobrios y compactos. Un botón deshabilitado baja opacidad y muestra el motivo (p. ej. "El monto supera tu saldo").

## 9. Iconografía y marcas

Geométrica, minimalista, contorno, consistente; **Lucide** (trazo 1.5–2 px). No mezclar estilos. Los logos de EAG, Ethereum y HSK conservan su identidad: no se redibujan ni se recolorean.

## 10. Hero

Fondo `#050816`, glow púrpura de EAG, acento cian, formas geométricas inspiradas en bloques, tipografía grande, CTA claro, composición limpia (sin ilustración recargada). Titular con las palabras clave en gradiente.

## 11. Movimiento

Discreto y rápido: 150–250 ms en microinteracciones, 300–500 ms en elementos principales; solo `opacity`, `transform`, escala sutil, gradiente y glow. Sin rebotes, parallax excesivo, monedas girando ni elementos flotando. Respetar `prefers-reduced-motion` (ya está en `globals.css`).

## 12. Responsive (móvil primero)

Sin desbordamiento horizontal, sin textos cortados, sin cards demasiado anchas, botones tocables (≥ 44 px), grids que se apilan bien. En móvil: titulares más chicos, grids en pila, se conservan los gradientes y se reducen los glows, se prioriza contenido y CTA. Mínimo 360 px (NFR-010).

## 13. Accesibilidad y contraste (medido)

Razones de contraste calculadas (WCAG 2.x; AA exige 4.5:1 en texto normal, 3:1 en texto grande y en bordes de controles):

| Combinación | Sobre `#050816` | Sobre `#111827` (card) | Veredicto |
|-------------|-----------------|------------------------|-----------|
| Texto principal `#EDE9FE` | 16.8 | 14.9 | Cumple |
| Texto secundario `#94A3B8` | 7.8 | 6.9 | Cumple |
| Texto atenuado `#64748B` | 4.2 | 3.7 | **No cumple**: solo captions decorativos, nunca información necesaria |
| Éxito `#10B981` / Advertencia `#F59E0B` | 7.9 / 9.3 | 7.0 / 8.3 | Cumple |
| Error `#EF4444` | 5.3 | 4.7 | Cumple |
| Púrpura EAG `#6C5CE7` como texto | 4.1 | 3.7 | **No cumple** como texto; usar `#A78BFA` (7.3) |
| Púrpura HSK `#883BFF` como texto | 3.9 | 3.5 | **No cumple** como texto; usar `#C9B6FF` |
| Borde `#334155` sobre card | — | 1.7 | **No cumple** 3:1 para el borde de un campo |
| Etiqueta blanca sobre el extremo cian del gradiente | 1.8 | — | **No cumple** |

Reglas que se derivan:
1. Texto legible = principal o secundario. El atenuado no lleva datos (montos, estados, errores).
2. Los púrpuras primarios son **fondos y acentos**, no color de texto; para enlaces y texto de marca usar los `secondary`.
3. Los campos de formulario llevan un borde más marcado que `#334155` (o anillo de foco visible ≥ 3:1); el borde sutil es solo para cards.
4. La etiqueta del botón primario va en `#050816`, peso 600 (≥ 4.1:1 sobre todo el gradiente); blanco falla en el tramo cian.
5. Un estado nunca se comunica **solo por color**: siempre etiqueta de texto (ya es así en `CauseStatusBadge`).
6. Foco visible en todo control interactivo; `prefers-reduced-motion` respetado.

## 14. Tokens

```css
:root {
  --eag-primary: #6C5CE7;
  --eag-secondary: #A78BFA;
  --eag-accent: #22D3EE;

  --eth-primary: #627EEA;
  --eth-secondary: #A8B5F7;
  --eth-accent: #8B82F6;

  --hsk-primary: #883BFF;
  --hsk-secondary: #C9B6FF;
  --hsk-accent: #4F5BFF;

  --bg-primary: #050816;
  --bg-secondary: #0B1220;

  --surface: #111827;
  --surface-card: #162033;

  --border: #334155;

  --text-primary: #EDE9FE;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;

  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #38BDF8;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.20);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.25);
}
```

Estos tokens viven en `frontend/app/globals.css` (bloque `@theme` de Tailwind 4); **no se escriben colores sueltos en los componentes**.

### Migración desde el estilo actual

Hoy el frontend usa una identidad clara "papel / plano de obra" (Big Shoulders, IBM Plex). Equivalencias para migrar sin tocar la lógica:

| Token actual | Nuevo | Uso |
|--------------|-------|-----|
| `paper` `#dcdcda` | `--bg-primary` | Fondo de página |
| `paper-raised` `#ececea` | `--surface` / `--surface-card` | Cards, paneles |
| `ink` `#1a1a1a` | `--text-primary` | Texto principal |
| `ink-soft` `#5c5c5c` | `--text-secondary` | Texto secundario |
| `line` `#adada8` | `--border` | Bordes |
| `blueprint` `#2e4e8c` / `-dark` | gradiente EAG (botones) y `--eag-secondary` (enlaces) | Acción principal |
| `brick` `#a8431f` | `--error` | Errores, "Rechazada" |
| `moss` `#3d6b52` | `--success` | "Verificada", éxito |
| `font-display` (Big Shoulders) | Inter 600–700 | Titulares |

## 15. Regla final (antes de crear cualquier componente)

1. ¿Pertenece al ecosistema EAG, ETH o HSK?
2. ¿Qué color representa su función?
3. ¿Mantiene la jerarquía visual?
4. ¿Funciona en móvil (360 px)?
5. ¿Se siente como infraestructura Web3 premium?
6. ¿Evita ruido visual innecesario?

No se introducen colores nuevos ni se cambia la estética por componente. Prioridad: **un lenguaje visual único, coherente y escalable en todo el proyecto**.

## 16. Decisiones abiertas

| # | Pregunta | Propuesta |
|---|----------|-----------|
| D1 | Etiqueta del botón primario: blanca (falla en el cian, 1.8:1) o `#050816` | `#050816`, peso 600; revisar con el render real |
| D2 | Tipografía monoespaciada para montos y hashes | Mantener una monoespaciada (IBM Plex Mono o `ui-monospace`) además de Inter |
| D3 | Modo claro | Fuera del MVP: el sistema es oscuro; el estilo actual claro se retira al migrar |
| D4 | Uso de los logos de EAG, Ethereum y HSK en la interfaz | Solo con sus versiones oficiales, en el footer y en el indicador de red |
| D5 | Página de aterrizaje del hackathon vs. producto | Misma identidad; el hero de la landing usa el titular del producto, no "Build the next generation of Web3" |
