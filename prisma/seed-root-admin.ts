import "dotenv/config";
import { Pool } from "pg";
import crypto from "crypto";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding root admin...");

  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();

    // Use a fixed password for development/testing
    const testPassword = "admin123456";
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // Check if super admin already exists
    const existingResult = await client.query(
      'SELECT id FROM super_admins WHERE email = $1',
      ['admin@sistema.com.br']
    );

    if (existingResult.rows.length === 0) {
      // Create super admin
      const adminId = crypto.randomUUID();
      await client.query(
        `INSERT INTO super_admins (id, email, nome, "senhaHash", ativo, "mfaEnabled", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          adminId,
          'admin@sistema.com.br',
          'Super Admin',
          hashedPassword,
          true,
          false,
        ]
      );

      console.log("\n✅ Super admin created successfully!");
      console.log(`📧 Email: admin@sistema.com.br`);
      console.log(`🔐 Password: ${testPassword}`);
      console.log(
        "\n⚠️  Change this password after first login!\n"
      );
    } else {
      console.log(
        "✅ Super admin already exists: admin@sistema.com.br (skipping creation)"
      );
    }

    // Create default plans if they don't exist
    const plansResult = await client.query('SELECT COUNT(*) FROM planos');
    if (parseInt(plansResult.rows[0].count) === 0) {
      await client.query(
        `INSERT INTO planos (id, nome, slug, "precoMensal", "precoAnual", "maxUsuarios", "maxProcessos", "maxArmazenamentoMB", features, ativo, "createdAt", "updatedAt")
         VALUES
           ($1, 'Starter', 'starter', 99.0, 1089.0, 5, 100, 10240, $2, true, NOW(), NOW()),
           ($3, 'Pro', 'pro', 299.0, 3288.0, 20, 1000, 102400, $4, true, NOW(), NOW()),
           ($5, 'Enterprise', 'enterprise', 999.0, NULL, 999, NULL, 1024000, $6, true, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            crm: true,
            chat: true,
            documentos: true,
            agenda: true,
            financeiro: false,
            whatsapp: false,
          }),
          crypto.randomUUID(),
          JSON.stringify({
            crm: true,
            chat: true,
            documentos: true,
            agenda: true,
            financeiro: true,
            whatsapp: true,
            bi: true,
          }),
          crypto.randomUUID(),
          JSON.stringify({
            crm: true,
            chat: true,
            documentos: true,
            agenda: true,
            financeiro: true,
            whatsapp: true,
            bi: true,
            datajud: true,
            api: true,
          }),
        ]
      );

      console.log("✅ Default plans created (Starter, Pro, Enterprise)");
    }

    client.release();
    console.log("\n✨ Seed completed!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
