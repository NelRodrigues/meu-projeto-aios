import test from 'node:test'
import assert from 'node:assert/strict'
import { exportClientesCsv, parseCsv } from '../../src/lib/csv-utils.ts'

test('parseCsv ignora header opcional e devolve clientes validos', () => {
  const csv = [
    'nome,telefone,email,notas',
    'Maria Silva,923456789,maria@email.com,Cliente VIP',
    'Joao Pedro,244912000111,,',
  ].join('\n')

  const result = parseCsv(csv)

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.length, 2)
  assert.deepEqual(result.data[0], {
    nome: 'Maria Silva',
    telefone: '923456789',
    email: 'maria@email.com',
    notas: 'Cliente VIP',
  })
})

test('parseCsv reporta linhas invalidas sem perder as validas', () => {
  const csv = [
    'nome,telefone',
    'Ana,',
    ',923111222',
    'Cliente Valido,923000999',
  ].join('\n')

  const result = parseCsv(csv)

  assert.equal(result.data.length, 1)
  assert.equal(result.errors.length, 2)
  assert.match(result.errors[0], /telefone em falta/)
  assert.match(result.errors[1], /nome em falta/)
})

test('exportClientesCsv devolve header e linhas serializadas', () => {
  const csv = exportClientesCsv([
    {
      nome: 'Carla',
      telefone: '+244923456789',
      email: 'carla@email.com',
      estagio: 'vip',
      total_gasto: 25000,
      total_pedidos: 4,
      ultima_compra: '2026-05-30T10:00:00.000Z',
    },
  ])

  assert.match(csv, /^Nome,Telefone,Email,Estagio,Total Gasto \(Kz\),Total Pedidos,Ultima Compra/m)
  assert.match(csv, /"Carla",\+244923456789,carla@email.com,vip,25000,4,30\/05\/2026/)
})
