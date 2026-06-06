'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Task {
  id: string
  titulo: string
  descricao: string | null
  ordem: number
  completado: boolean
}

export function DailyChecklist() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const hoje = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function fetch() {
      const [{ data: tasksData }, { data: completions }] = await Promise.all([
        supabase.from('checklist_tasks').select('*').eq('activo', true).order('ordem'),
        supabase.from('checklist_completions').select('task_id').eq('completado_em', hoje),
      ])

      const completedIds = new Set(
        ((completions ?? []) as { task_id: string }[]).map((c) => c.task_id)
      )
      setTasks(
        ((tasksData ?? []) as Omit<Task, 'completado'>[]).map((t) => ({
          ...t,
          completado: completedIds.has(t.id),
        }))
      )
      setLoading(false)
    }
    fetch()
  }, [supabase, hoje])

  const toggle = async (task: Task) => {
    if (task.completado) {
      await supabase.from('checklist_completions').delete().eq('task_id', task.id).eq('completado_em', hoje)
    } else {
      await supabase.from('checklist_completions').insert({ task_id: task.id, completado_em: hoje })
    }
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completado: !t.completado } : t))
  }

  if (loading) return null

  const completadas = tasks.filter((t) => t.completado).length
  const total = tasks.length

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Checklist do dia</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          completadas === total ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {completadas}/{total}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${total > 0 ? (completadas / total) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggle(task)}
            className="flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-gray-50"
          >
            {task.completado ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
            )}
            <span className={`text-sm ${task.completado ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
              {task.titulo}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
