'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Parceiro, Destino, Programa } from '@/types/database'

// ============================================================
// Hook do catálogo (story 2.2) — parceiros → destinos → programas.
// Segue o padrão de use-clientes: browser client, setState só em callbacks.
// Traz os 3 níveis de uma vez (o catálogo é pequeno) e expõe CRUD + toggle.
// ============================================================

export function useCatalogo() {
  const supabase = useMemo(() => createClient(), [])
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [destinos, setDestinos] = useState<Destino[]>([])
  const [programas, setProgramas] = useState<Programa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [pRes, dRes, prRes] = await Promise.all([
      supabase.from('parceiros').select('*').order('nome', { ascending: true }),
      supabase.from('destinos').select('*').order('pais', { ascending: true }),
      supabase.from('programas').select('*').order('nome', { ascending: true }),
    ])
    const err = pRes.error || dRes.error || prRes.error
    if (err) {
      setError(err.message)
    } else {
      setParceiros((pRes.data as Parceiro[]) || [])
      setDestinos((dRes.data as Destino[]) || [])
      setProgramas((prRes.data as Programa[]) || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    let activo = true
    ;(async () => {
      const [pRes, dRes, prRes] = await Promise.all([
        supabase.from('parceiros').select('*').order('nome', { ascending: true }),
        supabase.from('destinos').select('*').order('pais', { ascending: true }),
        supabase.from('programas').select('*').order('nome', { ascending: true }),
      ])
      if (!activo) return
      const err = pRes.error || dRes.error || prRes.error
      if (err) {
        setError(err.message)
      } else {
        setParceiros((pRes.data as Parceiro[]) || [])
        setDestinos((dRes.data as Destino[]) || [])
        setProgramas((prRes.data as Programa[]) || [])
      }
      setLoading(false)
    })()
    return () => {
      activo = false
    }
  }, [supabase])

  // ── Parceiros ─────────────────────────────────────────────
  const criarParceiro = useCallback(async (data: Partial<Parceiro>) => {
    const { data: novo, error: err } = await supabase.from('parceiros').insert(data).select().single()
    if (err) throw new Error(err.message)
    setParceiros(prev => [...prev, novo as Parceiro].sort((a, b) => a.nome.localeCompare(b.nome)))
    return novo as Parceiro
  }, [supabase])

  const actualizarParceiro = useCallback(async (id: string, data: Partial<Parceiro>) => {
    const { data: upd, error: err } = await supabase.from('parceiros').update(data).eq('id', id).select().single()
    if (err) throw new Error(err.message)
    setParceiros(prev => prev.map(p => (p.id === id ? (upd as Parceiro) : p)))
    return upd as Parceiro
  }, [supabase])

  const toggleParceiroActivo = useCallback(async (id: string, isActive: boolean) => {
    return actualizarParceiro(id, { is_active: isActive })
  }, [actualizarParceiro])

  // ── Destinos ──────────────────────────────────────────────
  const criarDestino = useCallback(async (data: Partial<Destino>) => {
    const { data: novo, error: err } = await supabase.from('destinos').insert(data).select().single()
    if (err) throw new Error(err.message)
    setDestinos(prev => [...prev, novo as Destino].sort((a, b) => a.pais.localeCompare(b.pais)))
    return novo as Destino
  }, [supabase])

  const actualizarDestino = useCallback(async (id: string, data: Partial<Destino>) => {
    const { data: upd, error: err } = await supabase.from('destinos').update(data).eq('id', id).select().single()
    if (err) throw new Error(err.message)
    setDestinos(prev => prev.map(d => (d.id === id ? (upd as Destino) : d)))
    return upd as Destino
  }, [supabase])

  // ── Programas ─────────────────────────────────────────────
  const criarPrograma = useCallback(async (data: Partial<Programa>) => {
    const { data: novo, error: err } = await supabase.from('programas').insert(data).select().single()
    if (err) throw new Error(err.message)
    setProgramas(prev => [...prev, novo as Programa].sort((a, b) => a.nome.localeCompare(b.nome)))
    return novo as Programa
  }, [supabase])

  const actualizarPrograma = useCallback(async (id: string, data: Partial<Programa>) => {
    const { data: upd, error: err } = await supabase.from('programas').update(data).eq('id', id).select().single()
    if (err) throw new Error(err.message)
    setProgramas(prev => prev.map(p => (p.id === id ? (upd as Programa) : p)))
    return upd as Programa
  }, [supabase])

  const toggleProgramaActivo = useCallback(async (id: string, isActive: boolean) => {
    return actualizarPrograma(id, { is_active: isActive })
  }, [actualizarPrograma])

  return {
    parceiros,
    destinos,
    programas,
    loading,
    error,
    fetchAll,
    criarParceiro,
    actualizarParceiro,
    toggleParceiroActivo,
    criarDestino,
    actualizarDestino,
    criarPrograma,
    actualizarPrograma,
    toggleProgramaActivo,
  }
}
