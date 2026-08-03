import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_LENGTH = 64;

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
