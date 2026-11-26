// Reduz a foto no navegador antes de enviar (fotos de celular têm 3–10 MB).

async function canvasBlob(canvas: HTMLCanvasElement, types: string[], quality: number): Promise<Blob> {
  for (const type of types) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));
    // Alguns navegadores (Safari antigo) ignoram webp e devolvem png: aceita só o tipo pedido
    if (blob && blob.type === type) return blob;
  }
  throw new Error("Não foi possível processar a imagem.");
}

/**
 * Recorta no centro para a proporção pedida e reduz para a largura máxima.
 * Logo: quadrada (1:1). Capa: retangular (12:5).
 */
export async function resizeImage(file: File, opts: { width: number; aspect: number; keepTransparency?: boolean }): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  const source: CanvasImageSource & { width: number; height: number } =
    bitmap ??
    (await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Arquivo não é uma imagem."));
      img.src = URL.createObjectURL(file);
    }));

  // Área central com a proporção desejada
  let sw = source.width;
  let sh = source.height;
  if (sw / sh > opts.aspect) sw = sh * opts.aspect;
  else sh = sw / opts.aspect;
  const sx = (source.width - sw) / 2;
  const sy = (source.height - sh) / 2;

  const w = Math.min(opts.width, Math.round(sw));
  const h = Math.round(w / opts.aspect);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (!opts.keepTransparency) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
  bitmap?.close();
  // Capa em JPEG: é a imagem da prévia do link no WhatsApp, que nem sempre aceita WebP
  return canvasBlob(canvas, opts.keepTransparency ? ["image/webp", "image/png"] : ["image/jpeg"], 0.85);
}
