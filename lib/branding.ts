// Shared list of font choices for tenant branding.
// `id` is what's stored on tenants.font_family.
// `css` is the font-family value applied to the page.
// `googleFont` is the Google Fonts family param (null for system fonts, which need no <link>).
export const FONT_OPTIONS = [
  {
    id: 'system',
    label: 'System default',
    css: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif`,
    googleFont: null as string | null,
  },
  {
    id: 'inter',
    label: 'Inter (modern, clean)',
    css: `'Inter', sans-serif`,
    googleFont: 'Inter:wght@400;600;700',
  },
  {
    id: 'poppins',
    label: 'Poppins (rounded, friendly)',
    css: `'Poppins', sans-serif`,
    googleFont: 'Poppins:wght@400;600;700',
  },
  {
    id: 'montserrat',
    label: 'Montserrat (bold, geometric)',
    css: `'Montserrat', sans-serif`,
    googleFont: 'Montserrat:wght@400;600;700',
  },
  {
    id: 'playfair',
    label: 'Playfair Display (elegant serif)',
    css: `'Playfair Display', serif`,
    googleFont: 'Playfair+Display:wght@400;600;700',
  },
  {
    id: 'lora',
    label: 'Lora (classic serif)',
    css: `'Lora', serif`,
    googleFont: 'Lora:wght@400;600;700',
  },
]

export function getFontOption(id: string | null | undefined) {
  return FONT_OPTIONS.find((f) => f.id === id) || FONT_OPTIONS[0]
}

export function fontFamilyCss(id: string | null | undefined) {
  return getFontOption(id).css
}

export function googleFontHref(id: string | null | undefined) {
  const font = getFontOption(id)
  if (!font.googleFont) return null
  return `https://fonts.googleapis.com/css2?family=${font.googleFont}&display=swap`
}

// Convenience: build the inline CSS custom properties + font-family for a
// tenant's branded pages, given a tenant row with brand_color / background_color
// / text_color / font_family columns.
export function tenantBrandStyle(tenant: {
  brand_color?: string | null
  background_color?: string | null
  text_color?: string | null
  font_family?: string | null
}) {
  const style: Record<string, string> = {
    ['--tenant-font' as string]: fontFamilyCss(tenant.font_family),
  }
  if (tenant.brand_color) style['--brand'] = tenant.brand_color
  if (tenant.background_color) style['--bg'] = tenant.background_color
  if (tenant.text_color) style['--text'] = tenant.text_color
  return style
}
