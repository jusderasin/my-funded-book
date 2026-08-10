"use client";

// Compresse une image côté client avant l'envoi : réduit la taille (coûts R2 = 0€,
// et surtout on reste sous la limite de payload des fonctions serverless en gratuit).
// Les PDF et GIF passent tels quels.
async function compressImage(file, maxDim = 1600, quality = 0.85) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const longest = Math.max(width, height);
    if (longest > maxDim) {
      const scale = maxDim / longest;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

// Envoie un fichier sur /api/upload et renvoie l'URL publique R2.
export async function uploadFile(file, folder, { compress = true } = {}) {
  const payload = compress ? await compressImage(file) : file;
  const fd = new FormData();
  fd.append("file", payload);
  fd.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Échec de l'upload");
  return data.url;
}
