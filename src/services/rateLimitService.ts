class RateLimitService {
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly LIMITS = {
    'gemini-free': { limit: 8, windowMs: 60000 }, // 8 requests per minute (buffer below 10)
    'gemini-tier1': { limit: 150, windowMs: 60000 },
    'openai': { limit: 50, windowMs: 60000 },
    'anthropic': { limit: 30, windowMs: 60000 },
  };

  canMakeRequest(provider: string, tier: string = 'free'): boolean {
    const key = `${provider}-${tier}`;
    const limit = this.LIMITS[key as keyof typeof this.LIMITS] || this.LIMITS['gemini-free'];
    
    const now = Date.now();
    const record = this.requestCounts.get(key);
    
    if (!record || now >= record.resetTime) {
      // Reset window
      this.requestCounts.set(key, { count: 1, resetTime: now + limit.windowMs });
      return true;
    }
    
    if (record.count >= limit.limit) {
      const waitTime = Math.ceil((record.resetTime - now) / 1000);
      console.warn(`[RateLimit] ${key} limit exceeded. Wait ${waitTime}s`);
      return false;
    }
    
    record.count++;
    return true;
  }

  recordRequest(provider: string, tier: string = 'free'): void {
    const key = `${provider}-${tier}`;
    // Request already recorded in canMakeRequest
  }

  getWaitTime(provider: string, tier: string = 'free'): number {
    const key = `${provider}-${tier}`;
    const record = this.requestCounts.get(key);
    
    if (!record) return 0;
    
    const waitTime = Math.max(0, record.resetTime - Date.now());
    return Math.ceil(waitTime / 1000);
  }

  getRemainingRequests(provider: string, tier: string = 'free'): number {
    const key = `${provider}-${tier}`;
    const limit = this.LIMITS[key as keyof typeof this.LIMITS] || this.LIMITS['gemini-free'];
    const record = this.requestCounts.get(key);
    
    if (!record || Date.now() >= record.resetTime) {
      return limit.limit;
    }
    
    return Math.max(0, limit.limit - record.count);
  }
}

export const rateLimitService = new RateLimitService();