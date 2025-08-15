interface BugzillaBug {
  id: number;
  status: string;
  summary: string;
  resolution?: string;
}

interface BugzillaResponse {
  bugs: BugzillaBug[];
}

interface BugStatusResult {
  success: boolean;
  status?: string;
  summary?: string;
  resolution?: string;
  error?: string;
}

interface CacheEntry {
  data: BugStatusResult;
  timestamp: number;
}

class BugStatusCache {
  private cache = new Map<number, CacheEntry>();
  private ttl: number;

  constructor(ttlMinutes: number = 1) {
    this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
  }

  get(bugNumber: number): BugStatusResult | null {
    const entry = this.cache.get(bugNumber);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(bugNumber);
      return null;
    }

    return entry.data;
  }

  set(bugNumber: number, data: BugStatusResult): void {
    this.cache.set(bugNumber, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const bugCache = new BugStatusCache();

export async function getBugStatus(
  bugNumber: number,
): Promise<BugStatusResult> {
  try {
    const response = await fetch(
      `https://bugzilla.mozilla.org/rest/bug/${bugNumber}?include_fields=id,status,summary,resolution`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: `Bug ${bugNumber} not found`,
        };
      }
      return {
        success: false,
        error: `HTTP error: ${response.status}`,
      };
    }

    const data: BugzillaResponse = await response.json();

    if (data.bugs.length === 0) {
      return {
        success: false,
        error: `Bug ${bugNumber} not found`,
      };
    }

    const bug = data.bugs[0];
    return {
      success: true,
      status: bug.status,
      summary: bug.summary,
      resolution: bug.resolution,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function getCachedBugStatus(
  bugNumber: number,
): Promise<BugStatusResult> {
  // Check cache first
  const cached = bugCache.get(bugNumber);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const result = await getBugStatus(bugNumber);

  // Only cache successful results
  if (result.success) {
    bugCache.set(bugNumber, result);
  }

  return result;
}

export function clearBugStatusCache(): void {
  bugCache.clear();
}
