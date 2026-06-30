// Уменьшение изображения в браузере перед загрузкой (хиро с телефона тяжёлые).

/**
 * Сжимает изображение: вписывает в квадрат maxDim, перекодирует в JPEG.
 * При любой ошибке возвращает исходный файл — загрузка не должна падать.
 */
export async function downscaleImage(
  file: File | Blob,
  maxDim = 1280,
  quality = 0.82
): Promise<Blob> {
  try {
    if (typeof document === "undefined") return file;
    const bitmap = await loadBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    if (scale >= 1) {
      close(bitmap);
      return file; // уже небольшое — не трогаем
    }
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    close(bitmap);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

async function loadBitmap(file: File | Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  // запасной путь без createImageBitmap
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function close(bitmap: ImageBitmap | HTMLImageElement) {
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
}
