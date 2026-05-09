export const storage = {
  async get(key: string): Promise<{ value: string } | null> {
    if (typeof window === 'undefined') return null;
    const value = localStorage.getItem(key);
    return value !== null ? { value } : null;
  },

  async set(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },

  async list(prefix: string): Promise<{ keys: string[] }> {
    if (typeof window === 'undefined') return { keys: [] };
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    return { keys };
  },

  async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};
