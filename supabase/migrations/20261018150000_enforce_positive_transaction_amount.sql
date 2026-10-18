ALTER TABLE public.transactions
ADD CONSTRAINT transactions_amount_positive
CHECK (amount > 0);
