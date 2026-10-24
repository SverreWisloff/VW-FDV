// GitHub Contents API-klient for data.json.
// All token-håndtering ligger her. Tokenet skal aldri logges, vises i UI-et
// etter innliming, eller serialiseres inn i data.json.
//
// Bruk:
//   const client = createClient({ owner, repo, branch });
//   const { data, sha } = await client.readData();
//   const { sha: nySha } = await client.writeData(data, sha, "Legg til område");

const API_ROOT = "https://api.github.com";
const TOKEN_KEY = "vw-fdv.token";
const CONFIG_KEY = "vw-fdv.config";

export class GitHubError extends Error {
  constructor(message, { status = 0, kind = "unknown", details = "" } = {}) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.kind = kind;
    this.details = details;
  }
}

// --- Token og konfigurasjon (localStorage) ---------------------------------

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveToken(token) {
  const clean = String(token ?? "").trim();
  if (!clean) {
    clearToken();
    return;
  }
  try {
    localStorage.setItem(TOKEN_KEY, clean);
  } catch {
    throw new GitHubError("Nettleseren nekter å lagre tokenet. Sjekk personverninnstillingene.", {
      kind: "storage",
    });
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ingenting å rydde hvis lagring er avslått.
  }
}

export function hasToken() {
  return getToken().length > 0;
}

export function getConfig() {
  const fallback = { owner: "", repo: "", branch: "main" };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      owner: typeof parsed.owner === "string" ? parsed.owner : "",
      repo: typeof parsed.repo === "string" ? parsed.repo : "",
      branch: typeof parsed.branch === "string" && parsed.branch ? parsed.branch : "main",
    };
  } catch {
    return fallback;
  }
}

export function saveConfig(config) {
  const clean = {
    owner: String(config.owner ?? "").trim(),
    repo: String(config.repo ?? "").trim(),
    branch: String(config.branch ?? "").trim() || "main",
  };
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(clean));
  } catch {
    throw new GitHubError("Nettleseren nekter å lagre innstillingene.", { kind: "storage" });
  }
  return clean;
}

// --- Base64 med UTF-8 -------------------------------------------------------

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(base64) {
  const binary = atob(String(base64 ?? "").replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

// --- Feilmapping ------------------------------------------------------------

async function toGitHubError(response, { hasAuthToken }) {
  let details = "";
  try {
    const body = await response.json();
    details = typeof body?.message === "string" ? body.message : "";
  } catch {
    // Svaret var ikke JSON. Statusen er fortsatt nok.
  }

  const status = response.status;

  if (status === 401) {
    return new GitHubError("Tokenet er ugyldig eller utløpt. Lim inn et nytt token og prøv igjen.", {
      status,
      kind: "unauthorized",
      details,
    });
  }

  if (status === 403) {
    if (/rate limit/i.test(details)) {
      return new GitHubError("GitHub sier nei: for mange forespørsler. Vent noen minutter og prøv igjen.", {
        status,
        kind: "rate-limit",
        details,
      });
    }
    return new GitHubError(
      hasAuthToken
        ? "Tokenet mangler tilgang. Det må ha Contents: Read and write på dette repoet."
        : "GitHub avviste forespørselen. Er repoet privat, trengs et token.",
      { status, kind: "forbidden", details },
    );
  }

  if (status === 404) {
    return new GitHubError(
      "Fant ikke repoet eller data.json. Sjekk eier, reponavn, branch og at filen finnes.",
      { status, kind: "not-found", details },
    );
  }

  if (status === 409) {
    return new GitHubError(
      "Filen er endret av noen andre siden du lastet den. Last på nytt, eller overskriv med dine endringer.",
      { status, kind: "conflict", details },
    );
  }

  if (status === 422) {
    return new GitHubError("GitHub godtok ikke endringen. Sjekk at data.json er gyldig JSON.", {
      status,
      kind: "invalid",
      details,
    });
  }

  return new GitHubError(`GitHub svarte ${status}. Prøv igjen om litt.`, {
    status,
    kind: "http",
    details,
  });
}

// --- Klient -----------------------------------------------------------------

export function createClient(config = {}) {
  const owner = String(config.owner ?? "").trim();
  const repo = String(config.repo ?? "").trim();
  const branch = String(config.branch ?? "").trim() || "main";
  const path = String(config.path ?? "data.json").replace(/^\/+/, "");
  const token = config.token ?? getToken();

  if (!owner || !repo) {
    throw new GitHubError("Fyll ut eier og repo først.", { kind: "config" });
  }

  const encodedPath = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const fileUrl = `${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;

  function requestHeaders(extra = {}) {
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...extra,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function request(url, options = {}) {
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: requestHeaders(options.headers),
        cache: "no-store",
      });
    } catch {
      throw new GitHubError("Fikk ikke kontakt med GitHub. Sjekk nettet og prøv igjen.", {
        kind: "network",
      });
    }

    if (response.ok) {
      if (response.status === 204) return null;
      return response.json();
    }

    throw await toGitHubError(response, { hasAuthToken: Boolean(token) });
  }

  async function readFile() {
    const body = await request(`${fileUrl}?ref=${encodeURIComponent(branch)}`);

    if (!body || Array.isArray(body) || typeof body.content !== "string") {
      throw new GitHubError("Stien peker ikke på en fil. Forventet data.json.", {
        kind: "not-file",
      });
    }

    let text;
    try {
      text = decodeBase64(body.content);
    } catch {
      throw new GitHubError("Klarte ikke å lese data.json. Filen kan være skadet.", {
        kind: "decode",
      });
    }

    return { text, sha: body.sha, path: body.path ?? path };
  }

  async function readData() {
    const file = await readFile();

    if (!file.text.trim()) {
      return { data: null, sha: file.sha, text: file.text };
    }

    let data;
    try {
      data = JSON.parse(file.text);
    } catch {
      throw new GitHubError(
        "data.json er ikke gyldig JSON. Rett filen på GitHub før du lagrer herfra.",
        { kind: "parse" },
      );
    }

    return { data, sha: file.sha, text: file.text };
  }

  async function write(text, sha, message = "Oppdater data.json") {
    if (!token) {
      throw new GitHubError("Du må legge inn et token for å lagre. Uten token er appen bare lesbar.", {
        kind: "unauthorized",
      });
    }

    const body = {
      message,
      content: encodeBase64(text),
      branch,
    };
    if (sha) body.sha = sha;

    const result = await request(fileUrl, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    return {
      sha: result?.content?.sha ?? "",
      commit: result?.commit ?? null,
    };
  }

  async function writeData(data, sha, message = "Oppdater data.json") {
    return write(`${JSON.stringify(data, null, 2)}\n`, sha, message);
  }

  return { owner, repo, branch, path, readFile, readData, write, writeData };
}
