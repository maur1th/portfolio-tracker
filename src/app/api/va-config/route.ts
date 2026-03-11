import { NextRequest, NextResponse } from "next/server";
import { saveVAConfig } from "@/lib/value-averaging";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, monthlyIncrement, initialValue } = body;

    if (!startDate || typeof monthlyIncrement !== "number" || typeof initialValue !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    if (monthlyIncrement <= 0) {
      return NextResponse.json(
        { error: "Monthly increment must be positive" },
        { status: 400 }
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const config = await saveVAConfig(startDate, monthlyIncrement, initialValue);

    return NextResponse.json({
      message: "Value Averaging configuration saved",
      config,
    });
  } catch (error) {
    console.error("Error saving VA config:", error);
    return NextResponse.json(
      { error: "Failed to save VA configuration" },
      { status: 500 }
    );
  }
}
