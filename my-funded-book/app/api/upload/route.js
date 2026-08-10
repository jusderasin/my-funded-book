import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024; // 15 Mo
const EXT_BY_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};
const ALLOWED_FOLDERS = new Set(["trades", "certificates"]);

function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function POST(req) {
  // 1. Auth : la route n'est PAS ouverte au public (sinon n'importe qui remplit ton bucket).
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // 2. Garde-fou config
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET_NAME || !process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
    return NextResponse.json({ error: "Stockage R2 non configuré côté serveur." }, { status: 500 });
  }

  // 3. Lecture du FormData
  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const file = form.get("file");
  const folder = String(form.get("folder") || "trades");

  if (!file || typeof file === "string") return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  if (!ALLOWED_FOLDERS.has(folder)) return NextResponse.json({ error: "Dossier non autorisé." }, { status: 400 });

  const ext = EXT_BY_TYPE[file.type];
  if (!ext) return NextResponse.json({ error: "Type de fichier non supporté (png, jpg, webp, gif, pdf)." }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fichier trop lourd (max 15 Mo)." }, { status: 413 });

  // 4. Nom unique : folder/userId/uuid.ext  → pas de collision, traçable
  const key = `${folder}/${user.id}/${randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  try {
    await r2Client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
  } catch (err) {
    return NextResponse.json({ error: "Échec de l'envoi vers R2: " + err.message }, { status: 502 });
  }

  // 5. URL publique finale (bucket public r2.dev ou domaine custom)
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, "");
  return NextResponse.json({ url: `${base}/${key}`, key });
}
