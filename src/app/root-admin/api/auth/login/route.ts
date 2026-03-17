import { NextRequest, NextResponse } from "next/server";
import { rootAdminLogin } from "@/actions/root-admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await rootAdminLogin(email, password);

    if (result.success) {
      return NextResponse.json(
        { message: "Logged in successfully" },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("[root-admin-login] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
