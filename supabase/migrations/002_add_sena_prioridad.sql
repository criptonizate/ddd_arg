-- Agregar seña y prioridad a la tabla de órdenes
alter table orders add column if not exists sena numeric(12,2) not null default 0;
alter table orders add column if not exists prioridad boolean not null default false;
