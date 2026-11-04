-- =============================================================================
-- 0021 — Product catalogue: plant protein, 3 formulas x flavours x 2 packs
--   APP = Active Plant Protein, DPP = Daily Plant Protein, FPP = Flow Plant Protein
--   CHO = Chocolate, MLT = Malt, MXB = Mixberry
--   -840 = กระปุก 840 กรัม, -420 = กล่อง 10 ซอง 420 กรัม
-- Prices are left at 0 to be filled in on the products page. Re-running is
-- harmless: existing SKUs are skipped.
-- =============================================================================

insert into public.products (sku, name, unit, product_type)
select
  f.code || '-' || v.code || '-' || p.code,
  f.name || ' (' || v.name || ' Flavor) ' || p.label,
  p.unit,
  'finished_good'
from (values
  ('APP', 'Active Plant Protein', 1),
  ('DPP', 'Daily Plant Protein',  2),
  ('FPP', 'Flow Plant Protein',   3)
) as f (code, name, ord)
join (values
  ('APP', 'CHO', 'Chocolate', 1),
  ('APP', 'MLT', 'Malt',      2),
  ('DPP', 'CHO', 'Chocolate', 1),
  ('DPP', 'MLT', 'Malt',      2),
  ('DPP', 'MXB', 'Mixberry',  3),
  ('FPP', 'MXB', 'Mixberry',  1)
) as v (formula, code, name, ord) on v.formula = f.code
cross join (values
  ('840', 'กระปุก 840 กรัม',       'กระปุก', 1),
  ('420', 'กล่อง 10 ซอง 420 กรัม', 'กล่อง',  2)
) as p (code, label, unit, ord)
order by f.ord, v.ord, p.ord
on conflict (sku) do nothing;
