import "dotenv/config";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

async function updateAdminPassword() {
  try {
    const hashedPassword = await bcrypt.hash("admin123456", 10);
    
    const updated = await db.superAdmin.update({
      where: { email: "admin@sistema.com.br" },
      data: { senhaHash: hashedPassword }
    });
    
    console.log("✅ Admin password updated!");
    console.log("📧 Email: admin@sistema.com.br");
    console.log("🔐 Password: admin123456");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

updateAdminPassword();
