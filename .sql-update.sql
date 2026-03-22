-- First, let's check if the admin exists
SELECT id, email, "senhaHash" FROM super_admins WHERE email = 'admin@sistema.com.br' LIMIT 1;
