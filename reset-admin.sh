#!/bin/bash

# This script resets the super admin password
# Email: admin@sistema.com.br
# Password: admin123456

echo "⚠️  This will reset the admin password to: admin123456"
echo "Proceed? (y/n)"
read -r response

if [ "$response" = "y" ]; then
  npx prisma exec --stdin << SQL
UPDATE "super_admins" 
SET "senhaHash" = '\$2b\$10\$0d81Sk2KSX2LNNiDhYPaFeAHGejXL6em7gdFyFjQPVsc6VQIDJ29q'
WHERE email = 'admin@sistema.com.br';
SQL
  echo "✅ Admin password reset!"
  echo "📧 Email: admin@sistema.com.br"
  echo "🔐 Password: admin123456"
else
  echo "Cancelled"
fi
