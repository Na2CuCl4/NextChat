import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "@/app/config/server";

export async function POST(req: NextRequest) {
  const serverConfig = getServerSideConfig();

  try {
    const inForm = await req.formData();
    const file = inForm.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const outForm = new FormData();
    outForm.append("file", file);
    const res = await fetch(serverConfig.fileReadingServer, {
      method: "POST",
      body: outForm,
    });

    const json = await res.json().catch(() => null);
    if (res.ok && json && (json.code === 0 || json.code === "0")) {
      return NextResponse.json({ data: json.data });
    }
    return NextResponse.json(
      { error: json?.msg ?? "Unknown response" },
      { status: 502 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export const runtime = "edge";
