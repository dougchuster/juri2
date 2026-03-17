import { NextRequest, NextResponse } from "next/server";
import { rootAdminLogout } from "@/actions/root-admin-auth";

export async function POST(request: NextRequest) {
  try {
    await rootAdminLogout();
    return NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[root-admin-logout] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
