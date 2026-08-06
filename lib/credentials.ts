import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_LENGTH = 64;

function getEncryptionKey() {
  const secret = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY?.trim();

  if (!secret) {
    throw new Error("PAYMENT_CREDENTIALS_ENCRYPTION_KEY is not configured.");
  }

  return scryptSync(secret, "prado-commerce-payment-credentials", 32);
}

export function hashSecret(value: string, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(value, salt, HASH_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

export function verifySecret(value: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const derivedHash = Buffer.from(hashSecret(value, salt).split(":")[1] ?? "", "hex");
  const storedBuffer = Buffer.from(hash, "hex");

  if (derivedHash.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedHash, storedBuffer);
}

export function createTokenPair() {
  const tokenId = randomBytes(12).toString("hex");
  const tokenSecret = randomBytes(24).toString("hex");

  return {
    tokenId,
    tokenSecret,
    token: `${tokenId}.${tokenSecret}`,
  };
}

export function createOnboardingToken() {
  return createTokenPair();
}

export function encryptStoredSecret(value: string) {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptStoredSecret(value: string) {
  const [ivHex, tagHex, encryptedHex] = value.split(":");

  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error("Encrypted secret is malformed.");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
