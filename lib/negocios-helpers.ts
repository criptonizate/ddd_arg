import type { NegocioPedido } from './actions/negocios'

export function pedidoTotal(pedido: NegocioPedido): number {
  return pedido.negocio_items.reduce((s, i) => s + Number(i.precio_mayorista) * i.cantidad, 0)
}
