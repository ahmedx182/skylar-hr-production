import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/constants/auth";
import { assertSameOrigin } from "@/server/guards/same-origin";
import { errorResponse } from "@/server/http/error-response";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    return errorResponse(error, "POST /api/auth/logout");
  }
}
