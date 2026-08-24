-- ============================================================
-- Crear una cuenta admin ADICIONAL (en cualquier momento,
-- no solo al crear la iglesia — para eso está primer_admin.sql).
-- Úsalo cuando una iglesia ya tiene su plataforma en marcha y
-- necesita sumar a otra persona con rol de administrador.
--
-- Reemplaza los 3 valores de abajo y pega esto en
-- Supabase → SQL Editor → Run.
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

-- ============================================================
-- Extra: resetear la contraseña de una cuenta admin que ya
-- existe (por si la olvidaron). Corre esto por separado, no
-- junto con el bloque de arriba.
-- ============================================================

-- update auth.users
-- set encrypted_password = crypt('CAMBIAR-contraseña-nueva', gen_salt('bf')),
--     updated_at = now()
-- where email = 'CAMBIAR@correo.com';
