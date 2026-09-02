// In-memory rate limiting map. 
// Note: In a Serverless environment (like Vercel), this memory is isolated per instance.
// But it is still highly effective for absorbing bot spam targeting a single instance.
const ipMap = new Map<string, { count: number; lastReset: number }>();

const RATE_LIMIT_MAX = 50; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

export function checkRateLimit(request: Request): { success: boolean; ip: string } {
  // Try to get IP from standard proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  let ip = 'unknown';

  if (forwardedFor) {
    ip = forwardedFor.split(',')[0].trim();
  } else if (realIp) {
    ip = realIp;
  }

  const now = Date.now();
  const record = ipMap.get(ip) || { count: 0, lastReset: now };

  // Reset the window if enough time has passed
  if (now - record.lastReset > RATE_LIMIT_WINDOW_MS) {
    record.count = 0;
    record.lastReset = now;
  }

  record.count += 1;
  ipMap.set(ip, record);

  // Clean up old entries occasionally to prevent memory leaks (probabilistic)
  if (Math.random() < 0.01) {
    ipMap.forEach((val, key) => {
      if (now - val.lastReset > RATE_LIMIT_WINDOW_MS) {
        ipMap.delete(key);
      }
    });
  }

  return { success: record.count <= RATE_LIMIT_MAX, ip };
}
