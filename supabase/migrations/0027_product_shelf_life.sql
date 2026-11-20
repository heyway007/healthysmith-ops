-- ============================================================================
-- 0027_product_shelf_life.sql
-- อายุสินค้า (shelf life) per product, in months. The real expiry date belongs
-- to a lot (it is typed when the lot is received); this is only the default
-- the receiving forms fill in (receipt date + shelf life), editable each time.
--
-- product_stock was created in 0019 as "select p.*", and a view keeps the
-- column list it was created with -- so products.track_lot (0026) and the new
-- column are not in it yet. Recreate it so they are.
-- ============================================================================

alter table public.products
  add column shelf_life_months integer
  check (shelf_life_months is null or shelf_life_months between 1 and 600);

drop view public.product_stock;

create view public.product_stock with (security_invoker = true) as
select p.*,
       coalesce(s.on_hand, 0)::numeric(14, 3)       as on_hand,
       coalesce(w.in_production, 0)::numeric(14, 3) as in_production,
       s.last_movement_date
  from public.products p
  left join (
    select product_id, sum(quantity) as on_hand, max(movement_date) as last_movement_date
      from public.stock_movements
     group by product_id
  ) s on s.product_id = p.id
  left join (
    select i.product_id, sum(greatest(i.quantity - i.received_quantity, 0)) as in_production
      from public.production_order_items i
      join public.production_orders o on o.id = i.production_order_id
     where o.status in ('open', 'partial')
     group by i.product_id
  ) w on w.product_id = p.id;

grant select on public.product_stock to authenticated;
