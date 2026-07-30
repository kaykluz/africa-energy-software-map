const maximumTokenLength = 512;

export async function authorisedOperationsRequest(request: Request) {
  const configured = process.env.OPERATIONS_TOKEN ?? "";
  const supplied = bearerToken(request.headers.get("authorization"));
  if (
    !configured ||
    !supplied ||
    configured.length > maximumTokenLength ||
    supplied.length > maximumTokenLength
  ) {
    return false;
  }
  const [left, right] = await Promise.all([
    sha256(configured),
    sha256(supplied),
  ]);
  return constantTimeEqual(left, right);
}

function bearerToken(value: string | null) {
  if (!value?.startsWith("Bearer ")) return "";
  return value.slice("Bearer ".length).trim();
}

async function sha256(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}
