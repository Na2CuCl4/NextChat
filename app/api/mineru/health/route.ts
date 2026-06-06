import { NextResponse } from "next/server";
import { getServerSideConfig } from "@/app/config/server";

async function handle() {
  const serverConfig = getServerSideConfig();

  if (!serverConfig.minerUServer) {
    return NextResponse.json(
      { error: "MinerU server not configured" },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${serverConfig.minerUServer}/health`);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      return NextResponse.json(
        { error: "Health check failed" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      status: json.status,
      version: json.version,
      queued_tasks: json.queued_tasks,
      processing_tasks: json.processing_tasks,
      completed_tasks: json.completed_tasks,
      failed_tasks: json.failed_tasks,
      max_concurrent_requests: json.max_concurrent_requests,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export const GET = handle;

export const runtime = "edge";
