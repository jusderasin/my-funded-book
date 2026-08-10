-- =====================================================================
--  SEED DÉMO (optionnel) — reproduit les chiffres de la vidéo :
--  Net P&L $8 966,56 · Win rate 57,14% · Profit factor 2,45
--
--  1. Crée d'abord un compte via l'app (login/signup).
--  2. Récupère ton user_id : select id from auth.users where email = 'toi@email.com';
--  3. Remplace :USER_ID ci-dessous par cet UUID, puis exécute.
-- =====================================================================

-- \set USER_ID '00000000-0000-0000-0000-000000000000'

insert into public.trades (user_id, date, symbol, dir, session, grade, r, pnl, setup, tags, why, plan) values
(:'USER_ID','2026-08-07','MNQ','long','NY AM','A+', 1, 6537,'NY continuation model','{}','Swept 4hr, created ifvg respecting htf bias, took longs to 3 equal highs.', true),
(:'USER_ID','2026-08-07','MNQ','long','NY AM','A+',-1,-4105,'NY continuation model','{}','Clean rejection of 15m fvg confirming bullish momentum. Market went straight to my SL.', true),
(:'USER_ID','2026-08-05','MNQ','long','NY AM','C', -1,-1037,'NY ATH','{Chased,"FOMO entry"}','Had not tapped a htf PD array, felt fomo as price was near ATH.', false),
(:'USER_ID','2026-08-05','MNQ','long','NY AM','C', -1,-1037,'NY continuation model','{"FOMO entry"}','Complete fomo entry, did not wait for confluences.', false),
(:'USER_ID','2026-08-04','MNQ','long','NY AM','A+', 1, 1445,'NY continuation model','{}','ES moving same direction confirmed the trade.', true),
(:'USER_ID','2026-08-03','MNQ','long','NY AM','A+', 1, 4723,'2m rejection','{}','Rejected off the 2m nicely, stops at the bottom of the 2 minute.', true),
(:'USER_ID','2026-08-03','MGC','short','Asia','A+',1, 2440.56,'Asia gold dump to NWOG','{}','Strong rejection of key level highs, clear target DOL, dxy divergence.', true);

insert into public.playbooks (user_id, name, description, rules) values
(:'USER_ID','NY continuation model','Continuation NY AM après sweep de liquidité et displacement.',
 '{"Liquidity swept above/below Asia range","Displacement through structure","Entry on FVG retrace","Stop beyond sweep, min 2R target"}');

insert into public.accounts (user_id, firm, size, cost, type, status, date, note) values
(:'USER_ID','MFF',50000,0,'funded','funded','2026-06-14','Rapid 50K financé'),
(:'USER_ID','MFF',100000,265,'eval','active','2026-07-20','Rapid 100K'),
(:'USER_ID','Lucid',50000,87,'eval','failed','2026-05-02','Cramé daily loss'),
(:'USER_ID','Phidias',50000,99,'eval','passed','2026-07-01','En attente funded');

insert into public.certificates (user_id, firm, amount, date, type, note) values
(:'USER_ID','Alpha',50000,'2026-06-10','eval_passed','Certificate of achievement'),
(:'USER_ID','Topstep',50000,'2026-02-02','eval_passed','Certified funded trader'),
(:'USER_ID','Topstep',1017,'2026-02-09','payout','Express funded payout'),
(:'USER_ID','MFF',1240,'2026-07-05','payout','Premier payout'),
(:'USER_ID','MFF',2380,'2026-07-28','payout','Split 90/10');

insert into public.expenses (user_id, firm, amount, date, note) values
(:'USER_ID','MFF',265,'2026-07-20','Éval Rapid 100K'),
(:'USER_ID','Lucid',87,'2026-05-02','Challenge 50K'),
(:'USER_ID','Phidias',99,'2026-07-01','Éval 50K'),
(:'USER_ID','MFF',45,'2026-06-01','Reset');

-- Débloque l'accès en démo (à retirer en prod, l'abonnement passe par Stripe) :
update public.subscriptions set status = 'active',
  current_period_end = now() + interval '1 year' where user_id = :'USER_ID';
