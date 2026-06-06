import { OrderForm } from '@/components/pedidos/order-form'

export default function NovoPedidoPage() {
  return (
    <div>
      <div className="border-b bg-white px-4 py-4 md:px-6">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Novo Pedido</h1>
        <p className="mt-1 text-sm text-gray-500">Preenche os detalhes da encomenda</p>
      </div>
      <OrderForm />
    </div>
  )
}
