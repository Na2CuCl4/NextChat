import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "@/app/config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX } from "@/app/constant";

export async function POST(req: NextRequest) {
  const serverConfig = getServerSideConfig();

  // ── Access code validation ────────────────────────────────────
  if (serverConfig.needCode) {
    const authToken = (req.headers.get("Authorization") ?? "").trim();
    const token = authToken.replace(/^Bearer\s+/i, "").trim();
    const accessCode = token.startsWith(ACCESS_CODE_PREFIX)
      ? token.slice(ACCESS_CODE_PREFIX.length)
      : "";
    const hashedCode = md5.hash(accessCode).trim();
    if (!serverConfig.codes.has(hashedCode)) {
      return NextResponse.json(
        { error: !accessCode ? "empty access code" : "wrong access code" },
        { status: 403 },
      );
    }
  }

  try {
    const inForm = await req.formData();
    const file = inForm.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const engine = (inForm.get("engine") as string | null) ?? "markitdown";

    // ── MinerU path ──────────────────────────────────────────────
    if (engine === "mineru") {
      if (!serverConfig.minerUServer) {
        return NextResponse.json(
          { error: "MinerU server not configured" },
          { status: 503 },
        );
      }

      const outForm = new FormData();
      outForm.append("files", file);

      const langList = inForm.get("ocrLanguage");
      if (langList) outForm.append("lang_list", langList);

      const backend = inForm.get("minerUBackend");
      if (backend) outForm.append("backend", backend);

      const parseMethod = inForm.get("parseMethod");
      if (parseMethod) outForm.append("parse_method", parseMethod);

      const tableEnable = inForm.get("enableTableRecognition");
      if (tableEnable) outForm.append("table_enable", tableEnable);

      const formulaEnable = inForm.get("enableInlineFormulaRecognition");
      if (formulaEnable) outForm.append("formula_enable", formulaEnable);

      const imageAnalysis = inForm.get("enableImageAnalysis");
      if (imageAnalysis) outForm.append("image_analysis", imageAnalysis);

      const returnImages = inForm.get("return_images");
      if (returnImages) outForm.append("return_images", returnImages);

      const responseFormatZip = inForm.get("response_format_zip");
      if (responseFormatZip)
        outForm.append("response_format_zip", responseFormatZip);

      const maxPages = inForm.get("maxPages");
      if (maxPages) outForm.append("end_page_id", maxPages);

      const res = await fetch(`${serverConfig.minerUServer}/file_parse`, {
        method: "POST",
        body: outForm,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        return NextResponse.json(
          {
            error:
              json?.error ??
              json?.detail ??
              json?.msg ??
              "MinerU conversion failed",
          },
          { status: 502 },
        );
      }

      // MinerU may return JSON (task-result format with
      // results.{file_name}.md_content) or binary (ZIP).
      const ct = (res.headers.get("content-type") || "").toLowerCase();

      if (ct.includes("application/json") || ct.includes("text/")) {
        const json = await res.json();

        // Extract markdown content: results.{file_names[0]}.md_content
        const fileNames: string[] = json?.file_names ?? [];
        const firstFile = fileNames[0] ?? "";
        const mdContent: string | undefined =
          json?.results?.[firstFile]?.md_content;

        if (mdContent) {
          return NextResponse.json({ data: mdContent });
        }

        // If results structure not found, still an error
        return NextResponse.json(
          {
            error:
              json?.error ??
              json?.msg ??
              json?.detail ??
              "MinerU returned unexpected response structure",
          },
          { status: 502 },
        );
      }

      // Binary response (e.g. ZIP) — pass through
      const blob = await res.blob();
      return new NextResponse(blob, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="result.zip"',
        },
      });
    }

    // ── MarkItDown path (default) ─────────────────────────────────
    const outForm = new FormData();
    outForm.append("file", file);

    const enableDocIntel = inForm.get("enableDocIntelligence");
    if (enableDocIntel === "true") {
      outForm.append("docintel", "true");
    }

    const res = await fetch(`${serverConfig.fileReadingServer}/read_file`, {
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
