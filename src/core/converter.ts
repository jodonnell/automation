export const CONVERTER_ID_PREFIX = "converter-"

export const isConverterId = (id: string) => id.startsWith(CONVERTER_ID_PREFIX)

export const convertLabel = (label: string) => {
  const trimmed = label.trim()
  if (!trimmed) return label
  if (/^[a-z]$/i.test(trimmed)) {
    const code = trimmed.toUpperCase().charCodeAt(0) - 64
    if (code >= 1 && code <= 26) return String(code)
  }
  if (/^\d+$/.test(trimmed)) {
    const value = Number(trimmed)
    if (Number.isFinite(value) && value >= 1 && value <= 26) {
      return String.fromCharCode(64 + value)
    }
  }
  return label
}
