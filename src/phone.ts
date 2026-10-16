/**
 * Приводит введённый номер к международному виду без плюса (79991234567).
 * Возвращает null, если номер не похож на российский или белорусский.
 */
export const normalizePhone = (raw: string): number | null => {
  const digits = raw.replace(/\D/g, '')

  if (digits.length === 10) return Number(`7${digits}`)
  if (digits.length === 11 && digits.startsWith('8')) {
    return Number(`7${digits.slice(1)}`)
  }
  if (digits.length === 11 && digits.startsWith('7')) return Number(digits)
  if (digits.length === 12 && digits.startsWith('375')) return Number(digits)

  return null
}

export const formatPhone = (phone: string): string => {
  const match = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone)
  if (!match) return `+${phone}`
  return `+7 ${match[1]} ${match[2]}-${match[3]}-${match[4]}`
}
