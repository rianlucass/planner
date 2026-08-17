alter table public.task_updates
  add column if not exists content_json jsonb null;

comment on column public.task_updates.content_json is
  'Documento Rich Text do Tiptap; content permanece como fallback em texto simples';
