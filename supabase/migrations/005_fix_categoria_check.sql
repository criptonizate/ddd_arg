-- Corregir check constraint de transactions.categoria
-- El app usa valores específicos para egresos que no estaban permitidos
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_categoria_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_categoria_check
  CHECK (categoria IN (
    'venta',
    'filamento_insumos',
    'electricidad',
    'repuestos_impresora',
    'envios',
    'comisiones',
    'otros'
  ));
