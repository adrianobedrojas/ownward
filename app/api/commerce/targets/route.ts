import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProduct } from "@/lib/commerce/products";
import { getUserBillingState } from "@/lib/billing";
import { canPurchaseBusinessConfiguration } from "@/lib/business-access";
import { listPublicBusinessInABoxTemplateSummaries } from "@/lib/commerce/business-in-a-box-templates";

type TargetOption = {
  id: string;
  label: string;
  description?: string;
  eligible: boolean;
  reason?: string;
  setupStatus?: string;
  accessRole?: string;
};

type BusinessMembershipRow = {
  business_id: string;
  role: string;
  status: string;
};

type BusinessRow = {
  id: string;
  owner_id: string;
  name: string | null;
  profile_completion: number | null;
  deleted_at: string | null;
};

function normalizeBusinessRole(role: string | undefined): "owner" | "manager" | "finance" | "operations" | "viewer" {
  if (role === "manager" || role === "finance" || role === "operations" || role === "viewer") {
    return role;
  }
  return "owner";
}

function buildBusinessOptionDescription(locale: "en" | "es", profileCompletion: number | null, role: string): string {
  const pct = typeof profileCompletion === "number" ? profileCompletion : 0;
  const normalizedRole = normalizeBusinessRole(role);
  if (locale === "es") {
    const roleText =
      normalizedRole === "owner"
        ? "propietario"
        : normalizedRole === "manager"
          ? "administrador"
          : normalizedRole === "finance"
            ? "finanzas"
            : normalizedRole === "operations"
              ? "operaciones"
              : "visor";
    return `Perfil ${pct}% · Acceso ${roleText}`;
  }

  return `Profile ${pct}% · Access ${normalizedRole}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productKey = (url.searchParams.get("productKey") ?? "").trim();
    const locale = (url.searchParams.get("locale") ?? "en").toLowerCase() === "es" ? "es" : "en";

    if (!productKey) {
      return NextResponse.json({ error: "productKey is required" }, { status: 400 });
    }

    const product = getProduct(productKey);
    if (!product || !product.isPublic || !product.requiresAuth) {
      return NextResponse.json({ error: "Invalid or unavailable product" }, { status: 400 });
    }
    if (product.ctaBehavior !== "checkout") {
      return NextResponse.json(
        {
          error: "This solution does not require checkout targets.",
          route: product.accessRoute ?? product.detailRoute,
          options: [] as TargetOption[],
        },
        { status: 409 },
      );
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

    if (product.key === "business_in_a_box") {
      const [{ data: ownedBusinesses }, { data: memberships }] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, owner_id, name, profile_completion, deleted_at")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("business_members")
          .select("business_id, role, status")
          .eq("user_id", user.id)
          .eq("status", "active"),
      ]);

      const memberBusinessIds = Array.from(
        new Set((memberships ?? []).map((row) => String(row.business_id)).filter(Boolean))
      );

      const { data: memberBusinesses } = memberBusinessIds.length
        ? await supabase
            .from("businesses")
            .select("id, owner_id, name, profile_completion, deleted_at")
            .in("id", memberBusinessIds)
            .is("deleted_at", null)
        : {
            data: [] as Array<{
              id: string;
              owner_id: string;
              name: string;
              profile_completion: number | null;
              deleted_at: string | null;
            }>,
          };

      const businessById = new Map<
        string,
        {
          id: string;
          owner_id: string;
          name: string;
          profile_completion: number | null;
          accessRole: "owner" | "member";
        }
      >();

      for (const business of ownedBusinesses ?? []) {
        businessById.set(String(business.id), {
          id: String(business.id),
          owner_id: String(business.owner_id),
          name: String(business.name ?? (locale === "es" ? "Negocio" : "Business")),
          profile_completion:
            typeof business.profile_completion === "number" ? business.profile_completion : null,
          accessRole: "owner",
        });
      }

      for (const business of memberBusinesses ?? []) {
        const id = String(business.id);
        if (businessById.has(id)) {
          continue;
        }
        businessById.set(id, {
          id,
          owner_id: String(business.owner_id),
          name: String(business.name ?? (locale === "es" ? "Negocio" : "Business")),
          profile_completion:
            typeof business.profile_completion === "number" ? business.profile_completion : null,
          accessRole: "member",
        });
      }

      const businessIds = Array.from(businessById.keys());
      const activeStatuses = ["pending", "processing", "completed"];
      const purchasePermissionPairs = await Promise.all(
        businessIds.map(async (businessId) => [
          businessId,
          await canPurchaseBusinessConfiguration(user.id, businessId),
        ] as const)
      );
      const purchasePermissionByBusiness = new Map<string, boolean>(purchasePermissionPairs);
      const [setupsRes, openPurchasesRes] = await Promise.all([
        businessIds.length
          ? supabase
              .from("business_in_a_box_setups")
              .select("business_id, status")
              .in("business_id", businessIds)
              .in("status", activeStatuses)
          : Promise.resolve({ data: [] as Array<{ business_id: string; status: string }> }),
        businessIds.length
          ? supabase
              .from("purchases")
              .select("target_id, payment_status, fulfillment_status")
              .eq("product_key", "business_in_a_box")
              .eq("target_type", "business")
              .in("target_id", businessIds)
              .in("payment_status", ["pending", "paid"])
              .in("fulfillment_status", ["pending", "fulfilled"])
          : Promise.resolve({ data: [] as Array<{ target_id: string; payment_status: string; fulfillment_status: string }> }),
      ]);

      const setupStateByBusiness = new Map<string, string>();
      for (const row of setupsRes.data ?? []) {
        const businessId = String(row.business_id);
        const state = String(row.status);
        const prev = setupStateByBusiness.get(businessId);
        if (!prev || prev === "pending") {
          setupStateByBusiness.set(businessId, state);
        }
      }

      const openPurchaseByBusiness = new Set<string>(
        (openPurchasesRes.data ?? []).map((row) => String(row.target_id))
      );

      const options: TargetOption[] = businessIds.map((id) => {
        const business = businessById.get(id)!;
        const profilePct = typeof business.profile_completion === "number" ? business.profile_completion : 0;
        const hasOpenSetup = setupStateByBusiness.has(id);
        const hasOpenPurchase = openPurchaseByBusiness.has(id);
        const hasPurchasePermission = purchasePermissionByBusiness.get(id) ?? false;
        const accessRole = business.owner_id === user.id ? "owner" : "manager";
        const eligibleForPurchase = hasPurchasePermission && !hasOpenSetup && !hasOpenPurchase;
        const ineligible = hasOpenSetup || hasOpenPurchase;
        const setupStatus = setupStateByBusiness.get(id) ?? (hasOpenPurchase ? "pending" : "eligible");

        const description =
          locale === "es"
            ? `Perfil ${profilePct}% · Acceso ${accessRole === "owner" ? "propietario" : "administrador"} · Setup ${setupStatus}`
            : `Profile ${profilePct}% · Access ${accessRole} · Setup ${setupStatus}`;

        const reason =
          !hasPurchasePermission
            ? locale === "es"
              ? "No elegible: requiere permiso de propietario o administrador"
              : "Not eligible: owner or administrator permission required"
            : ineligible
            ? locale === "es"
              ? "No elegible: ya existe un setup activo o compra en proceso"
              : "Not eligible: active setup or pending purchase already exists"
            : undefined;

        return {
          id,
          label: business.name,
          description,
          eligible: eligibleForPurchase,
          reason,
          setupStatus,
          accessRole,
        };
      });

      const templates = listPublicBusinessInABoxTemplateSummaries(locale);
      return NextResponse.json({ options, templates });
    }

    if (product.requiredTargetType === "business") {
      const [{ data: ownedBusinesses, error: ownedBusinessesError }, { data: memberships, error: membershipsError }] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, owner_id, name, profile_completion, deleted_at")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("business_members")
          .select("business_id, role, status")
          .eq("user_id", user.id)
          .eq("status", "active"),
      ]);

      if (ownedBusinessesError || membershipsError) {
        console.error("Commerce targets business lookup failed:", {
          ownedBusinessesError: ownedBusinessesError?.message,
          membershipsError: membershipsError?.message,
        });
        return NextResponse.json({ error: "Unable to load target options" }, { status: 500 });
      }

      const membershipRows = (memberships ?? []) as BusinessMembershipRow[];
      const memberBusinessIds = Array.from(
        new Set(membershipRows.map((row) => String(row.business_id)).filter(Boolean))
      );

      const { data: memberBusinesses, error: memberBusinessesError } = memberBusinessIds.length
        ? await supabase
            .from("businesses")
            .select("id, owner_id, name, profile_completion, deleted_at")
            .in("id", memberBusinessIds)
            .is("deleted_at", null)
        : {
            data: [] as BusinessRow[],
            error: null,
          };

      if (memberBusinessesError) {
        console.error("Commerce targets member business lookup failed:", {
          memberBusinessesError: memberBusinessesError.message,
        });
        return NextResponse.json({ error: "Unable to load target options" }, { status: 500 });
      }

      const membershipRoleByBusinessId = new Map<string, string>();
      for (const row of membershipRows) {
        const businessId = String(row.business_id);
        if (!businessId) continue;
        membershipRoleByBusinessId.set(businessId, String(row.role ?? "viewer"));
      }

      const businessById = new Map<string, BusinessRow>();
      for (const business of (ownedBusinesses ?? []) as BusinessRow[]) {
        businessById.set(String(business.id), business);
      }
      for (const business of (memberBusinesses ?? []) as BusinessRow[]) {
        const id = String(business.id);
        if (!businessById.has(id)) {
          businessById.set(id, business);
        }
      }

      const businessIds = Array.from(businessById.keys());
      const purchasePermissionPairs = await Promise.all(
        businessIds.map(async (businessId) => [
          businessId,
          await canPurchaseBusinessConfiguration(user.id, businessId),
        ] as const)
      );
      const purchasePermissionByBusiness = new Map<string, boolean>(purchasePermissionPairs);

      const options: TargetOption[] = businessIds.map((businessId) => {
        const business = businessById.get(businessId)!;
        const role = business.owner_id === user.id
          ? "owner"
          : (membershipRoleByBusinessId.get(businessId) ?? "viewer");
        const eligible = purchasePermissionByBusiness.get(businessId) ?? false;
        const reason = eligible
          ? undefined
          : locale === "es"
            ? "No elegible: requiere permiso de propietario o administrador"
            : "Not eligible: owner or manager permission required";

        return {
          id: businessId,
          label: String(business.name ?? (locale === "es" ? "Negocio" : "Business")),
          description: buildBusinessOptionDescription(locale, business.profile_completion, role),
          eligible,
          reason,
        };
      });

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
