import { NextResponse } from "next/server";
import { getActiveModulesMap, getSubscriptionInfo } from "@/lib/licensing/engine";

export async function GET() {
  try {
    const [info, activeModules] = await Promise.all([
      getSubscriptionInfo(),
      getActiveModulesMap(),
    ]);

    return NextResponse.json({
      ok: true,
      subscription: info,
      activeModules,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo obtener el estado de la suscripción.",
      },
      { status: 500 }
    );
  }
}

