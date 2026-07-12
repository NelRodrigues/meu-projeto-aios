import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mapSharedContactStage,
  mapSharedContactToCliente,
  mapSharedDealStatus,
  mapSharedDealToPedido,
} from '../../src/lib/backend/shared-mappers.ts'

test('mapSharedContactStage normaliza estados do backend partilhado', () => {
  assert.equal(mapSharedContactStage('lead'), 'novo')
  assert.equal(mapSharedContactStage('contactado'), 'contactado')
  assert.equal(mapSharedContactStage('vip'), 'vip')
  assert.equal(mapSharedContactStage('inactivo'), 'inactivo')
})

test('mapSharedContactToCliente converte contacts para o contrato local', () => {
  const cliente = mapSharedContactToCliente({
    id: 'c1',
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-01T11:00:00.000Z',
    nome: 'Maria Silva',
    telefone: '244900000000',
    email: 'maria@example.com',
    estagio: 'lead',
    origem: 'whatsapp',
    notas: 'Cliente VIP',
    valor_total_pago: '150000',
    whatsapp_id: '244900000000',
  })

  assert.equal(cliente.nome, 'Maria Silva')
  assert.equal(cliente.estagio, 'novo')
  assert.equal(cliente.total_gasto, 150000)
  assert.equal(cliente.origem, 'whatsapp')
})

test('mapSharedDealStatus cobre estados mais comuns', () => {
  assert.equal(mapSharedDealStatus('negotiation'), 'orcamento')
  assert.equal(mapSharedDealStatus('won'), 'pago')
  assert.equal(mapSharedDealStatus('lost'), 'cancelado')
})

test('mapSharedDealToPedido converte deals para o contrato local', () => {
  const pedido = mapSharedDealToPedido({
    id: 'd1',
    lead_id: 'l1',
    title: 'Bolo de Aniversario',
    status: 'won',
    total_paid: '25000',
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-01T11:00:00.000Z',
    expected_close_date: '2026-06-05',
    notes: 'Entrega ao fim da tarde',
    payment_status: 'paid',
    leads: { name: 'Maria Silva', phone: '244900000000' },
  })

  assert.equal(pedido.cliente_nome, 'Maria Silva')
  assert.equal(pedido.estado, 'pago')
  assert.equal(pedido.valor_final, 25000)
  assert.equal(pedido.data_entrega, '2026-06-05')
})
