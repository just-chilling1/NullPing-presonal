/** Upload an image for the money page hero and return its public URL. */
export async function uploadMoneyPageImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/assets/upload-image", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
  return data.url as string;
}
