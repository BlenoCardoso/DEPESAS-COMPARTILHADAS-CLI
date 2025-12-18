import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app } from "./firebase";

const storage = getStorage(app);

/**
 * Comprimir imagem antes do upload
 */
async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Redimensionar se necessário
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Erro ao comprimir imagem"));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Erro ao carregar imagem"));
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
  });
}

/**
 * Fazer upload de anexo de despesa
 */
export async function uploadExpenseAttachment(
  groupId: string,
  expenseId: string,
  file: File,
  userId: string
): Promise<string> {
  try {
    // Comprimir imagem
    const compressedBlob = await compressImage(file);

    // Gerar nome único
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${extension}`;

    // Path no Storage
    const storagePath = `expense-attachments/${groupId}/${expenseId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Metadata com informações do uploader
    const metadata = {
      contentType: "image/jpeg",
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
      },
    };

    // Upload
    await uploadBytes(storageRef, compressedBlob, metadata);

    // Obter URL de download
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    throw error;
  }
}

/**
 * Deletar anexo de despesa
 */
export async function deleteExpenseAttachment(attachmentUrl: string): Promise<void> {
  try {
    // Extrair path do Storage da URL
    const storageRef = ref(storage, attachmentUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Erro ao deletar anexo:", error);
    // Não lançar erro - anexo pode já ter sido deletado
  }
}

/**
 * Validar arquivo de imagem
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Tamanho máximo: 10MB
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: "Arquivo muito grande. Máximo: 10MB" };
  }

  // Tipos permitidos
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "Tipo de arquivo não permitido. Use JPG, PNG ou WebP" };
  }

  return { valid: true };
}
