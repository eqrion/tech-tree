// Add helper functions for URL handling
export function getUrlParameter(name: string): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

export function updateUrlParameters(params: Record<string, string | null>) {
  const url = new URL(window.location.href);

  Object.entries(params).forEach(([key, value]) => {
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });

  // Only push state if the URL actually changed
  if (url.toString() !== window.location.href) {
    window.history.pushState({}, "", url.toString());
  }
}
