/**
 * Image utilities para Vision pipeline
 * Descarregar + converter para base64 com tamanho controlado
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ImageData {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  sizeBytes: number;
}

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB (limite Claude Vision)

/**
 * Descarregar imagem de URL e converter para base64
 * Suporta URLs directas e URLs de media UAZAPI
 */
export async function downloadImageAsBase64(
  mediaUrl: string,
  uazapiToken?: string
): Promise<ImageData> {
  const headers: Record<string, string> = {};

  // UAZAPI requer token de autorização para media
  if (uazapiToken && mediaUrl.includes("uazapi")) {
    headers["Authorization"] = `Bearer ${uazapiToken}`;
  }

  const res = await fetch(mediaUrl, { headers });

  if (!res.ok) {
    throw new Error(`Failed to download image: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  const mediaType = normalizeMediaType(contentType);

  const arrayBuffer = await res.arrayBuffer();

  if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
    throw new Error(`Image too large: ${arrayBuffer.byteLength} bytes (max ${MAX_SIZE_BYTES})`);
  }

  // Converter para base64
  const uint8Array = new Uint8Array(arrayBuffer);
  const base64 = btoa(String.fromCharCode(...uint8Array));

  return {
    base64,
    mediaType,
    sizeBytes: arrayBuffer.byteLength,
  };
}

function normalizeMediaType(contentType: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  if (contentType.includes("png")) return "image/png";
  if (contentType.includes("webp")) return "image/webp";
  if (contentType.includes("gif")) return "image/gif";
  return "image/jpeg"; // default
}

/**
 * Guardar imagem em Supabase Storage (bucket vision)
 */
export async function saveImageToStorage(
  supabase: SupabaseClient,
  imageData: ImageData,
  clienteId: string
): Promise<string> {
  const ext = imageData.mediaType.split("/")[1];
  const path = `${clienteId}/${Date.now()}.${ext}`;

  // Converter base64 de volta para Uint8Array para upload
  const binaryStr = atob(imageData.base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const { error } = await supabase.storage
    .from("vision")
    .upload(path, bytes, {
      contentType: imageData.mediaType,
      upsert: false,
    });

  if (error) {
    console.error("[image-utils] Storage upload failed:", error);
    // Não fatal — continuar sem storage
    return "";
  }

  return path;
}
