import { useState, useRef, useCallback, useMemo } from "react";

import styles from "./file-conversion.module.scss";

import CloseIcon from "../icons/close.svg";
import UploadIcon from "../icons/upload.svg";
import ClearIcon from "../icons/clear.svg";
import FileConversionIcon from "../icons/file-conversion.svg";
import DocxIcon from "../icons/docx.svg";
import PptxIcon from "../icons/pptx.svg";
import XlsxIcon from "../icons/xlsx.svg";
import PdfIcon from "../icons/pdf.svg";
import ImageIcon from "../icons/image.svg";

import { IconButton } from "./button";
import { InputRange } from "./input-range";
import { List, ListItem, Select, showToast } from "./ui-lib";

import Locale from "../locales";

import { Path } from "../constant";
import { useAppConfig, useAccessStore } from "../store";
import { useNavigate } from "react-router-dom";

type FileConversionEngine = "markitdown" | "docintel" | "mineru";
type MinerUBackend = "pipeline" | "vlm-auto-engine" | "hybrid-auto-engine";
type ParseMethod = "auto" | "txt" | "ocr";
type OcrLanguage =
  | "ch"
  | "ch_lite"
  | "ch_server"
  | "en"
  | "korean"
  | "japan"
  | "chinese_cht"
  | "ta"
  | "te"
  | "ka"
  | "th"
  | "el"
  | "latin"
  | "arabic"
  | "east_slavic"
  | "cyrillic"
  | "devanagari";

type FileStatus = "pending" | "converting" | "success" | "error";

interface FileItem {
  id: string;
  name: string;
  size: number;
  status: FileStatus;
}

const FILE_CONVERSION_ENGINES: Record<FileConversionEngine, string> = {
  markitdown: Locale.FileConversion.Engine.MarkItDownDesc,
  docintel: Locale.FileConversion.Engine.DocIntelligenceDesc,
  mineru: Locale.FileConversion.Engine.MinerUDesc,
};

const MINERU_BACKEND: Record<MinerUBackend, string> = {
  pipeline: Locale.FileConversion.MinerU.ParseBackend.PipelineDesc,
  "vlm-auto-engine":
    Locale.FileConversion.MinerU.ParseBackend.VlmAutoEngineDesc,
  "hybrid-auto-engine":
    Locale.FileConversion.MinerU.ParseBackend.HybridAutoEngineDesc,
};

const PARSE_METHOD: { value: ParseMethod; desc: string }[] = [
  { value: "auto", desc: Locale.FileConversion.MinerU.ParseMethod.Auto },
  { value: "txt", desc: Locale.FileConversion.MinerU.ParseMethod.Txt },
  { value: "ocr", desc: Locale.FileConversion.MinerU.ParseMethod.Ocr },
];

const OCR_LANGUAGES: { value: OcrLanguage; desc: string }[] = [
  { value: "ch", desc: Locale.FileConversion.MinerU.OcrLanguage.Ch },
  { value: "ch_lite", desc: Locale.FileConversion.MinerU.OcrLanguage.ChLite },
  {
    value: "ch_server",
    desc: Locale.FileConversion.MinerU.OcrLanguage.ChServer,
  },
  { value: "en", desc: Locale.FileConversion.MinerU.OcrLanguage.En },
  { value: "korean", desc: Locale.FileConversion.MinerU.OcrLanguage.Korean },
  { value: "japan", desc: Locale.FileConversion.MinerU.OcrLanguage.Japan },
  {
    value: "chinese_cht",
    desc: Locale.FileConversion.MinerU.OcrLanguage.ChineseCht,
  },
  { value: "ta", desc: Locale.FileConversion.MinerU.OcrLanguage.Ta },
  { value: "te", desc: Locale.FileConversion.MinerU.OcrLanguage.Te },
  { value: "ka", desc: Locale.FileConversion.MinerU.OcrLanguage.Ka },
  { value: "th", desc: Locale.FileConversion.MinerU.OcrLanguage.Th },
  { value: "el", desc: Locale.FileConversion.MinerU.OcrLanguage.El },
  { value: "latin", desc: Locale.FileConversion.MinerU.OcrLanguage.Latin },
  { value: "arabic", desc: Locale.FileConversion.MinerU.OcrLanguage.Arabic },
  {
    value: "east_slavic",
    desc: Locale.FileConversion.MinerU.OcrLanguage.EastSlavic,
  },
  {
    value: "cyrillic",
    desc: Locale.FileConversion.MinerU.OcrLanguage.Cyrillic,
  },
  {
    value: "devanagari",
    desc: Locale.FileConversion.MinerU.OcrLanguage.Devanagari,
  },
];

function formatFileSize(bytes: number): string {
  const n = Number(bytes);
  if (!isFinite(n) || n < 0) return "0 B";
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

const FILE_ICONS: Record<
  string,
  React.FunctionComponent<React.SVGProps<SVGSVGElement>>
> = {
  docx: DocxIcon,
  doc: DocxIcon,
  pptx: PptxIcon,
  ppt: PptxIcon,
  xlsx: XlsxIcon,
  xls: XlsxIcon,
  pdf: PdfIcon,
};

function FileIcon({ ext }: { ext: string }) {
  const Icon = FILE_ICONS[ext] ?? ImageIcon;
  return <Icon className={styles["file-icon"]} />;
}

function MinerUSettings() {
  const config = useAppConfig();
  const fc = config.fileConversionConfig;

  return (
    <>
      <ListItem
        title={Locale.FileConversion.MinerU.ParseBackend.Title}
        subTitle={MINERU_BACKEND[fc.minerUBackend]}
      >
        <Select
          aria-label={Locale.FileConversion.MinerU.ParseBackend.Title}
          value={fc.minerUBackend}
          onChange={(e) => {
            const val = e.target.value as MinerUBackend;
            config.update((c) => (c.fileConversionConfig.minerUBackend = val));
          }}
        >
          <option value="pipeline">
            {Locale.FileConversion.MinerU.ParseBackend.Pipeline}
          </option>
          <option value="vlm-auto-engine">
            {Locale.FileConversion.MinerU.ParseBackend.VlmAutoEngine}
          </option>
          <option value="hybrid-auto-engine">
            {Locale.FileConversion.MinerU.ParseBackend.HybridAutoEngine}
          </option>
        </Select>
      </ListItem>

      <ListItem title={Locale.FileConversion.MinerU.MaxPages.Title}>
        <InputRange
          aria={Locale.FileConversion.MinerU.MaxPages.Title}
          title={`${fc.maxPages}`}
          value={fc.maxPages}
          min="1"
          max="1000"
          step="1"
          onChange={(e) => {
            const val = Number(e.target.value);
            config.update((c) => (c.fileConversionConfig.maxPages = val));
          }}
        />
      </ListItem>

      <ListItem
        title={Locale.FileConversion.MinerU.EnableTableRecognition.Title}
        subTitle={Locale.FileConversion.MinerU.EnableTableRecognition.Desc}
      >
        <input
          aria-label={Locale.FileConversion.MinerU.EnableTableRecognition.Title}
          type="checkbox"
          checked={fc.enableTableRecognition}
          onChange={(e) => {
            const checked = e.target.checked;
            config.update(
              (c) => (c.fileConversionConfig.enableTableRecognition = checked),
            );
          }}
        />
      </ListItem>

      <ListItem
        title={
          Locale.FileConversion.MinerU.EnableInlineFormulaRecognition.Title
        }
        subTitle={
          Locale.FileConversion.MinerU.EnableInlineFormulaRecognition.Desc
        }
      >
        <input
          aria-label={
            Locale.FileConversion.MinerU.EnableInlineFormulaRecognition.Title
          }
          type="checkbox"
          checked={fc.enableInlineFormulaRecognition}
          onChange={(e) => {
            const checked = e.target.checked;
            config.update(
              (c) =>
                (c.fileConversionConfig.enableInlineFormulaRecognition =
                  checked),
            );
          }}
        />
      </ListItem>

      <ListItem
        title={Locale.FileConversion.MinerU.EnableImageAnalysis.Title}
        subTitle={Locale.FileConversion.MinerU.EnableImageAnalysis.Desc}
      >
        <input
          aria-label={Locale.FileConversion.MinerU.EnableImageAnalysis.Title}
          type="checkbox"
          checked={fc.enableImageAnalysis}
          onChange={(e) => {
            const checked = e.target.checked;
            config.update(
              (c) => (c.fileConversionConfig.enableImageAnalysis = checked),
            );
          }}
        />
      </ListItem>

      <ListItem
        title={Locale.FileConversion.MinerU.ParseMethod.Title}
        subTitle={PARSE_METHOD.find((m) => m.value === fc.parseMethod)?.desc}
      >
        <Select
          aria-label={Locale.FileConversion.MinerU.ParseMethod.Title}
          value={fc.parseMethod}
          onChange={(e) => {
            const val = e.target.value as ParseMethod;
            config.update((c) => (c.fileConversionConfig.parseMethod = val));
          }}
        >
          {PARSE_METHOD.map((m) => (
            <option key={m.value} value={m.value}>
              {m.value}
            </option>
          ))}
        </Select>
      </ListItem>

      <ListItem
        title={Locale.FileConversion.MinerU.OcrLanguage.Title}
        subTitle={OCR_LANGUAGES.find((l) => l.value === fc.ocrLanguage)?.desc}
      >
        <Select
          aria-label={Locale.FileConversion.MinerU.OcrLanguage.Title}
          value={fc.ocrLanguage}
          onChange={(e) => {
            const val = e.target.value as OcrLanguage;
            config.update((c) => (c.fileConversionConfig.ocrLanguage = val));
          }}
        >
          {OCR_LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.value}
            </option>
          ))}
        </Select>
      </ListItem>
    </>
  );
}

function addFilesToList(files: FileList | File[]): FileItem[] {
  return Array.from(files).map((file) => ({
    id: Math.random().toString(36).slice(2, 9),
    name: file.name,
    size: Number(file.size) || 0,
    status: "pending" as FileStatus,
  }));
}

export function FileConversion() {
  const navigate = useNavigate();
  const config = useAppConfig();
  const accessStore = useAccessStore();
  const fc = config.fileConversionConfig;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const customModelNames = useMemo(() => {
    const raw = [config.customModels, accessStore.customModels]
      .filter(Boolean)
      .join(",")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return [...new Set(raw)];
  }, [config.customModels, accessStore.customModels]);

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newFiles = addFilesToList(files);
    setFileList((prev) => [...prev, ...newFiles]);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      handleFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  const handleClearAll = useCallback(() => {
    setFileList([]);
  }, []);

  const handleConvert = useCallback(() => {
    const accessState = useAccessStore.getState();
    if (accessState.needCode && !accessState.accessCode) {
      showToast(Locale.FileConversion.FileList.AccessCodeError);
      return;
    }
    if (fileList.length === 0) return;
    setFileList((prev) =>
      prev.map((f) =>
        f.status === "pending" ? { ...f, status: "error" as FileStatus } : f,
      ),
    );
  }, [fileList.length]);

  const handleDeleteFile = useCallback((id: string) => {
    setFileList((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const dropZoneClass = [
    styles["drop-zone"],
    dragOver ? styles["drop-zone-active"] : "",
    fileList.length === 0 ? styles["drop-zone-empty"] : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <style>{`#file-convert-btn button path{fill:none!important;stroke:white}`}</style>
      <div className="window-header" data-tauri-drag-region>
        <div className="window-header-title">
          <div className="window-header-main-title">
            {Locale.FileConversion.Title}
          </div>
          <div className="window-header-sub-title">
            {Locale.FileConversion.SubTitle}
          </div>
        </div>
        <div className="window-actions">
          <div className="window-action-button"></div>
          <div className="window-action-button"></div>
          <div className="window-action-button">
            <IconButton
              aria={Locale.UI.Close}
              icon={<CloseIcon />}
              onClick={() => navigate(Path.Home)}
              bordered
            />
          </div>
        </div>
      </div>
      <div className={styles["file-conversion"]}>
        <div className={styles["file-conversion-section"]}>
          <div className={styles["file-conversion-section-header"]}>
            {Locale.FileConversion.Settings}
          </div>
          <List>
            <ListItem
              title={Locale.FileConversion.Engine.Title}
              subTitle={FILE_CONVERSION_ENGINES[fc.engine]}
            >
              <Select
                aria-label={Locale.FileConversion.Engine.Title}
                value={fc.engine}
                onChange={(e) => {
                  const val = e.target.value as FileConversionEngine;
                  config.update((c) => (c.fileConversionConfig.engine = val));
                }}
              >
                <option value="markitdown">
                  {Locale.FileConversion.Engine.MarkItDown}
                </option>
                <option value="docintel">
                  {Locale.FileConversion.Engine.DocIntelligence}
                </option>
                <option value="mineru">
                  {Locale.FileConversion.Engine.MinerU}
                </option>
              </Select>
            </ListItem>

            {fc.engine === "mineru" && <MinerUSettings />}
          </List>
        </div>

        <div className={styles["file-conversion-section"]}>
          <div className={styles["file-conversion-section-header"]}>
            {Locale.FileConversion.Conversion}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".docx,.pptx,.xlsx,.pdf,.doc,.ppt,.xls,.md,.txt,.html,.csv,.json,.xml,.jpg,.jpeg,.png"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <div
            className={dropZoneClass}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={styles["file-list-actions"]}>
              <IconButton
                icon={<UploadIcon />}
                text={Locale.FileConversion.FileList.Upload}
                bordered
                onClick={handleUpload}
              />
              <IconButton
                icon={<ClearIcon />}
                text={Locale.FileConversion.FileList.ClearAll}
                bordered
                onClick={handleClearAll}
              />
              <div id="file-convert-btn">
                <IconButton
                  icon={<FileConversionIcon />}
                  text={Locale.FileConversion.FileList.Convert}
                  type="primary"
                  onClick={handleConvert}
                />
              </div>
            </div>

            {fileList.length > 0 ? (
              <table className={styles["file-table"]}>
                <thead>
                  <tr>
                    <th></th>
                    <th>{Locale.FileConversion.FileList.Name}</th>
                    <th>{Locale.FileConversion.FileList.Size}</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {fileList.map((file) => (
                    <tr key={file.id}>
                      <td className={styles["file-icon-cell"]}>
                        <FileIcon ext={getFileExtension(file.name)} />
                      </td>
                      <td className={styles["file-name-cell"]}>{file.name}</td>
                      <td className={styles["file-size-cell"]}>
                        {formatFileSize(file.size ?? 0)}
                      </td>
                      <td>
                        <span
                          className={`${styles["file-status"]} ${
                            styles[`file-status-${file.status}`]
                          }`}
                        >
                          {
                            Locale.FileConversion.FileList.Status[
                              file.status as keyof typeof Locale.FileConversion.FileList.Status
                            ]
                          }
                        </span>
                      </td>
                      <td className={styles["file-delete-cell"]}>
                        <IconButton
                          icon={<CloseIcon />}
                          onClick={() => handleDeleteFile(file.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles["drag-drop-hint"]}>
                {Locale.FileConversion.FileList.DragDropHint}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
