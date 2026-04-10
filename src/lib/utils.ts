import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatNumber(amount: number, decimals = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateShort(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 1)} %`
}

export function getInitials(firstName: string | null, lastName: string | null): string {
  const f = firstName?.charAt(0) ?? ''
  const l = lastName?.charAt(0) ?? ''
  return `${f}${l}`.toUpperCase() || '?'
}

export function getClientDisplayName(client: {
  company_name: string | null
  first_name: string | null
  last_name: string | null
}): string {
  if (client.company_name) return client.company_name
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Client sans nom'
}

export function calculateItemTotalHT(quantity: number, unitPriceHT: number): number {
  return Math.round(quantity * unitPriceHT * 100) / 100
}

export function calculateItemTotalTTC(totalHT: number, tvaRate: number): number {
  return Math.round(totalHT * (1 + tvaRate / 100) * 100) / 100
}

export function calculateItemTVA(totalHT: number, tvaRate: number): number {
  return Math.round(totalHT * (tvaRate / 100) * 100) / 100
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
