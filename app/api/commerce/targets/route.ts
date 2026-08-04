import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPurchasableProduct } from "@/lib/commerce/products";
import { getUserBillingState } from "@/lib/billing";

type TargetOption = {
  id: string;
  label: string;
  description?: string;
  eligible: boolean;
  reason?: string;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productKey = (url.searchParams.get("productKey") ?? "").trim();
    const locale = (url.searchParams.get("locale") ?? "en").toLowerCase() === "es" ? "es" : "en";

    if (!productKey) {
      return NextResponse.json({ error: "productKey is required" }, { status: 400 });
    }

    const product = getPurchasableProduct(productKey);
    if (!product) {
      return NextResponse.json({ error: "Invalid or unavailable product" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized", redirectTo: "/login" }, { status: 401 });
    }

    const billing = await getUserBillingState(supabase, user.id);

    if (product.key === "enhanced_valuation_report" && billing.entitlements.valuationLevel === "enhanced") {
      return NextResponse.json({
        options: [] as TargetOption[],
        includedMessage:
          locale === "es"
            ? "Incluido en tu plan Pro. Usa directamente el flujo de valuacion."
            : "Included in your Pro plan. Use the valuation workflow directly.",
        route: `/${locale === "es" ? "es/" : ""}valuation?mode=detailed`,
      });
    }

    if (product.key === "deal_room_90" && billing.entitlements.dealRooms) {
      const { count: activeRoomCount } = await supabase
        .from("deal_rooms")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("status", "active");

      if ((activeRoomCount ?? 0) < billing.entitlements.activeDealRoomLimit) {
        return NextResponse.json({
          options: [] as TargetOption[],
          includedMessage:
            locale === "es"
              ? "Incluido en tu plan Pro. Usa tu capacidad incluida de Deal Room."
              : "Included in your Pro plan. Use your included Deal Room capacity.",
          route: `/${locale === "es" ? "es/" : ""}deals`,
        });
      }
    }

    if (product.key === "confidential_sale_launch" && billing.entitlements.confidentialListings) {
      return NextResponse.json({
        options: [] as TargetOption[],
        includedMessage:
          locale === "es"
            ? "La capacidad de listado confidencial ya esta incluida en tu plan actual."
            : "Confidential listing capability is already included in your current plan.",
        route: `/${locale === "es" ? "es/" : ""}sell`,
      });
    }

    if (product.key === "enhanced_valuation_report") {
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, deleted_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      const options: TargetOption[] = (businesses ?? []).map((business) => ({
        id: String(business.id),
        label: String(business.name ?? (locale === "es" ? "Negocio" : "Business")),
        eligible: business.deleted_at === null,
        reason:
          business.deleted_at !== null
            ? locale === "es"
              ? "No elegible: negocio archivado"
              : "Not eligible: archived business"
            : undefined,
      }));

      return NextResponse.json({ options });
    }

    if (product.key === "deal_room_90") {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, listing_id, status")
        .eq("seller_id", user.id)
        .in("status", ["active", "qualified", "nda_requested"])
        .order("updated_at", { ascending: false });

      const conversationIds = (conversations ?? []).map((row) => String(row.id));
      const listingIds = (conversations ?? []).map((row) => String(row.listing_id));

      const [{ data: rooms }, { data: listings }] = await Promise.all([
        conversationIds.length
          ? supabase
              .from("deal_rooms")
              .select("id, conversation_id")
              .in("conversation_id", conversationIds)
          : Promise.resolve({ data: [] as Array<{ id: string; conversation_id: string }> }),
        listingIds.length
          ? supabase
              .from("business_listings")
              .select("id, business_name, teaser_title, is_confidential")
              .in("id", listingIds)
          : Promise.resolve({ data: [] as Array<{ id: string; business_name: string | null; teaser_title: string | null; is_confidential: boolean }> }),
      ]);

      const roomByConversation = new Map<string, string>();
      for (const room of rooms ?? []) {
        roomByConversation.set(String(room.conversation_id), String(room.id));
      }

      const listingById = new Map<string, { business_name: string | null; teaser_title: string | null; is_confidential: boolean }>();
      for (const listing of listings ?? []) {
        listingById.set(String(listing.id), {
          business_name: listing.business_name,
          teaser_title: listing.teaser_title,
          is_confidential: Boolean(listing.is_confidential),
        });
      }

      const options: TargetOption[] = (conversations ?? []).map((conversation) => {
        const listing = listingById.get(String(conversation.listing_id));
        const existingRoomId = roomByConversation.get(String(conversation.id));
        const title = listing?.is_confidential && listing.teaser_title
          ? listing.teaser_title
          : listing?.business_name ?? (locale === "es" ? "Listado" : "Listing");

        return {
          id: String(conversation.id),
          label: title,
          description:
            locale === "es"
              ? `Estado: ${conversation.status}`
              : `Status: ${conversation.status}`,
          eligible: !existingRoomId,
          reason: existingRoomId
            ? locale === "es"
              ? "No elegible: ya existe un Deal Room"
              : "Not eligible: Deal Room already exists"
            : undefined,
        };
      });

      return NextResponse.json({ options });
    }

    if (product.key === "confidential_sale_launch") {
      const { data: listings } = await supabase
        .from("business_listings")
        .select("id, business_name, teaser_title, status, is_public, is_confidential, deleted_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      const listingIds = (listings ?? []).map((row) => String(row.id));
      const { data: launches } = listingIds.length
        ? await supabase
            .from("confidential_sale_launches")
            .select("listing_id, status")
            .in("listing_id", listingIds)
            .eq("status", "active")
        : { data: [] as Array<{ listing_id: string; status: string }> };

      const activeLaunchIds = new Set((launches ?? []).map((row) => String(row.listing_id)));

      const options: TargetOption[] = (listings ?? []).map((listing) => {
        const title = listing.is_confidential && listing.teaser_title
          ? listing.teaser_title
          : listing.business_name ?? (locale === "es" ? "Listado" : "Listing");

        let eligible = true;
        let reason: string | undefined;
        if (listing.deleted_at) {
          eligible = false;
          reason = locale === "es" ? "No elegible: listado archivado" : "Not eligible: archived listing";
        } else if (activeLaunchIds.has(String(listing.id))) {
          eligible = false;
          reason =
            locale === "es"
              ? "No elegible: lanzamiento confidencial activo"
              : "Not eligible: confidential launch already active";
        } else if (listing.status !== "published" || !listing.is_public) {
          eligible = false;
          reason =
            locale === "es"
              ? "Completa y publica el listado antes de comprar"
              : "Complete and publish this listing before checkout";
        } else if (!String(listing.teaser_title ?? "").trim()) {
          eligible = false;
          reason =
            locale === "es"
              ? "Agrega un titulo teaser para proteger la identidad"
              : "Add a teaser title to protect business identity";
        }

        return {
          id: String(listing.id),
          label: title,
          description:
            locale === "es"
              ? `Estado: ${listing.status} · ${listing.is_confidential ? "Confidencial" : "Publico"}`
              : `Status: ${listing.status} · ${listing.is_confidential ? "Confidential" : "Public"}`,
          eligible,
          reason,
        };
      });

      return NextResponse.json({ options });
    }

    return NextResponse.json({ options: [] as TargetOption[] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Commerce targets error:", message);
    return NextResponse.json({ error: "Unable to load target options" }, { status: 500 });
  }
}
