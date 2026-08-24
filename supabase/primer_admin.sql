-- ============================================================
-- Crear el PRIMER administrador de una iglesia nueva
-- Reemplaza los 3 valores de abajo (correo, contraseña, nombre)
-- y pega esto en Supabase → SQL Editor → Run.
-- Solo se usa UNA vez, después de correr schema.sql.
-- ============================================================

do $$
declare
  v_email text := 'CAMBIAR@correo.com';
  v_password text := 'CAMBIAR-contraseña-temporal';
  v_nombre text := 'CAMBIAR Nombre Completo';
  new_user_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_user_id, 'authenticated', 'authenticated', v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider','email','providers', array['email'], 'role', 'admin'),
    '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), new_user_id::text, new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', v_email),
    'email', now(), now(), now()
  );

  insert into public.profiles (id, role, nombre_completo)
  values (new_user_id, 'admin', v_nombre);
end $$;
