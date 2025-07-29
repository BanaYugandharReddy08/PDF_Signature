
const SIGN_ENDPOINT = "https://pdf-signature-89wb.onrender.com/sign";
export async function signPdfFile(file) {
  const formData = new FormData();
  formData.append("pdf", file);

  const response = await fetch(SIGN_ENDPOINT, { method: "POST", body: formData });

  if (!response.ok) {
    throw new Error("Signing failed");
  }

  return await response.blob();
}
