ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS dummy BOOLEAN; -- Just so something happens if you accidentally run it in auth context, though we don't.
-- Execute this on the 'public' schema
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS readme_notebook_id UUID NULL REFERENCES public.notebooks(id) ON DELETE SET NULL;
