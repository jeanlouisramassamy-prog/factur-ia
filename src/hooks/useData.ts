import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Client, Invoice, Quote, Product } from '@/lib/types'

export function useClients(businessId?: string) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('clients')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else if (data) setClients(data)
    setLoading(false)
  }, [businessId])

  useEffect(() => { fetch() }, [fetch])
  return { clients, loading, error, refetch: fetch }
}

export function useInvoices(businessId?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('business_id', businessId)
      .order('issue_date', { ascending: false })
    if (err) setError(err.message)
    else if (data) setInvoices(data)
    setLoading(false)
  }, [businessId])

  useEffect(() => { fetch() }, [fetch])
  return { invoices, loading, error, refetch: fetch }
}

export function useQuotes(businessId?: string) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('quotes')
      .select('*, client:clients(*)')
      .eq('business_id', businessId)
      .order('issue_date', { ascending: false })
    if (err) setError(err.message)
    else if (data) setQuotes(data)
    setLoading(false)
  }, [businessId])

  useEffect(() => { fetch() }, [fetch])
  return { quotes, loading, error, refetch: fetch }
}

export function useProducts(businessId?: string) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name')
    if (err) setError(err.message)
    else if (data) setProducts(data)
    setLoading(false)
  }, [businessId])

  useEffect(() => { fetch() }, [fetch])
  return { products, loading, error, refetch: fetch }
}
