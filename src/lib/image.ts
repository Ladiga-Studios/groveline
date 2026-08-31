/* Shrinks a photo to a reasonable upload size using the canvas, entirely in
   the browser. Phone camera photos are often 4 to 10MB; this brings a typical
   photo down to a few hundred KB with no visible quality loss on screen,
   which matters on the spotty data most sellers have out at a market. */
export async function resizeImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.[a-zA-Z0-9]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
