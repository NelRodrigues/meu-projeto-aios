'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Cliente } from '@/types/database'

export function useClientes() {
  const supabase = useMemo(() => createClient(), [])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
    } else {
      setClientes(data || [])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  const criarCliente = useCallback(async (data: Partial<Cliente>) => {
    const { data: novo, error: err } = await supabase
      .from('clientes')
      .insert(data)
      .select()
      .single()

    if (err) throw new Error(err.message)
    setClientes(prev => [novo as Cliente, ...prev])
    return novo as Cliente
  }, [supabase])

  const actualizarCliente = useCallback(async (id: string, data: Partial<Cliente>) => {
    const { data: updated, error: err } = await supabase
      .from('clientes')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (err) throw new Error(err.message)
    setClientes(prev => prev.map(c => c.id === id ? updated as Cliente : c))
    return updated as Cliente
  }, [supabase])

  return { clientes, loading, error, fetchClientes, criarCliente, actualizarCliente }
}
