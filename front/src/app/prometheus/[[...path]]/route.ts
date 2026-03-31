import type { NextRequest } from "next/server";
import { proxyMonitoringRequest } from "@/lib/monitoring/proxy";

async function handle(request: NextRequest): Promise<Response> {
  return proxyMonitoringRequest(request, "/prometheus");
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as HEAD, handle as OPTIONS };
