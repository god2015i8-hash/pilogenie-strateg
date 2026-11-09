import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Platform } from "react-native";
import { useApp } from "@/src/state/AppProvider";
import { Body, Card, Field, GhostButton, PrimaryButton, Screen, Subtitle, Title } from "@/src/ui/components";
import { applyMappedCsv, applyWeekmarkWorkbook, parseCsv, previewGeneric, type ColumnMapping, type ImportPreview } from "@/src/services/importService";
import * as XLSX from "xlsx";

async function readPickedFile(asset: DocumentPicker.DocumentPickerAsset): Promise<{ text?: string; base64?: string }> {
  const file = (asset as DocumentPicker.DocumentPickerAsset & { file?: File }).file;
  if (file) {
    if ((asset.name ?? file.name).toLowerCase().endsWith(".csv") || file.type.includes("csv")) {
      return { text: await file.text() };
    }
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return { base64: btoa(binary) };
  }
  if (asset.uri.startsWith("blob:") || asset.uri.startsWith("data:") || asset.uri.startsWith("http")) {
    const res = await fetch(asset.uri);
    const blob = await res.blob();
    if ((asset.name ?? "").toLowerCase().endsWith(".csv") || blob.type.includes("csv")) {
      return { text: await blob.text() };
    }
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return { base64: btoa(binary) };
  }
  if (Platform.OS !== "web") {
    const FileSystem = await import("expo-file-system/legacy");
    const isCsv = (asset.name ?? "").toLowerCase().endsWith(".csv") || asset.mimeType?.includes("csv");
    if (isCsv) {
      return { text: await FileSystem.readAsStringAsync(asset.uri, { encoding: "utf8" }) };
    }
    return { base64: await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 }) };
  }
  throw new Error("Не удалось прочитать файл в браузере");
}

export default function ImportScreen() {
  const { db, replace } = useApp();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const pick = async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/comma-separated-values",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) {
        setLoading(false);
        return;
      }
      const asset = result.assets[0];
      const name = asset.name ?? "file";
      const isCsv = name.toLowerCase().endsWith(".csv") || asset.mimeType?.includes("csv");
      const content = await readPickedFile(asset);
      if (isCsv && content.text != null) {
        const parsed = parseCsv(content.text);
        const p = previewGeneric(name, parsed.headers, parsed.rows);
        setPreview(p);
        setMapping({
          title: parsed.headers.find((h) => /задач|title|назван/i.test(h)),
          date: parsed.headers.find((h) => /дат/i.test(h)),
          amount: parsed.headers.find((h) => /сумм|amount/i.test(h)),
          type: parsed.headers.find((h) => /тип|type/i.test(h)),
          note: parsed.headers.find((h) => /коммент|note/i.test(h)),
          status: parsed.headers.find((h) => /статус|status/i.test(h)),
        });
      } else {
        const wb = XLSX.read(content.base64 ?? content.text, { type: content.base64 ? "base64" : "string" });
        const sheets: Record<string, unknown[][]> = {};
        for (const sheetName of wb.SheetNames) {
          sheets[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true }) as unknown[][];
        }
        const looksLikeWeek = wb.SheetNames.some((n) => /^\d{4}-\d{2}-\d{2}$/.test(n) || n === "Шаблон" || n === "Доп. задачи");
        if (looksLikeWeek) {
          const next = JSON.parse(JSON.stringify(db));
          const applied = applyWeekmarkWorkbook(next, sheets, name);
          await replace(applied.db);
          setMessage(applied.message);
          setPreview(null);
        } else {
          const first = wb.SheetNames[0];
          const rows = (sheets[first] ?? []) as unknown[][];
          const headers = (rows[0] ?? []).map((h) => String(h ?? ""));
          const recs = rows.slice(1).map((r) => {
            const o: Record<string, string> = {};
            headers.forEach((h, i) => {
              o[h] = String(r[i] ?? "");
            });
            return o;
          });
          setPreview(previewGeneric(name, headers, recs));
        }
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Не удалось прочитать файл");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    const next = JSON.parse(JSON.stringify(db));
    const applied = applyMappedCsv(next, preview, mapping);
    await replace(applied.db);
    setMessage(`Импортировано: ${applied.imported}`);
    setPreview(null);
  };

  return (
    <Screen>
      <Title>Импорт</Title>
      <Subtitle>
        Google Таблицы — только источник выгрузки. Пользовательские таблицы и права доступа в код не зашиты. Служебные формулы не импортируются.
      </Subtitle>
      <PrimaryButton label={loading ? "Чтение…" : "Выбрать CSV или XLSX"} onPress={pick} disabled={loading} />

      <Card>
        <Title>Ожидающие источники</Title>
        {db.importJobs
          .filter((j) => j.status === "pending_source")
          .map((j) => (
            <Body key={j.id}>{j.message}</Body>
          ))}
      </Card>

      <Card>
        <Title>История импорта</Title>
        {db.importJobs
          .filter((j) => j.status !== "pending_source")
          .map((j) => (
            <Subtitle key={j.id}>
              {j.fileName || j.sourceKind}: {j.message}
            </Subtitle>
          ))}
      </Card>

      {preview ? (
        <Card>
          <Title>Предпросмотр</Title>
          <Subtitle>
            Файл {preview.fileName} · тип {preview.sourceKind}
          </Subtitle>
          <Subtitle>Сопоставьте колонки</Subtitle>
          {(["title", "date", "amount", "type", "note", "status"] as const).map((key) => (
            <Field
              key={key}
              label={key}
              value={mapping[key] ?? ""}
              onChangeText={(v) => setMapping((m) => ({ ...m, [key]: v }))}
              placeholder={preview.headers.join(", ")}
            />
          ))}
          {preview.rows.slice(0, 8).map((row) => (
            <Subtitle key={row.index}>
              {Object.values(row.values).slice(0, 4).join(" · ")}
              {row.errors.length ? ` · ошибки: ${row.errors.join(", ")}` : ""}
            </Subtitle>
          ))}
          <GhostButton label="Подтвердить импорт" onPress={confirm} />
        </Card>
      ) : null}

      {message ? <Body>{message}</Body> : null}
    </Screen>
  );
}
