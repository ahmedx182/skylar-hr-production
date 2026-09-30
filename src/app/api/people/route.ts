import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/require-session";
import { errorResponse } from "@/server/http/error-response";
import { listCompanyEmployees } from "@/server/repositories/briefing-read.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    const employees = await listCompanyEmployees(session.companyId);

    return NextResponse.json({
      employees: employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        detail: [employee.employeeCode, employee.jobTitle ?? employee.location].filter(Boolean).join(" · ") || "Employee file",
        summary: employee.summary,
      })),
    });
  } catch (error) {
    return errorResponse(error, "GET /api/people");
  }
}
