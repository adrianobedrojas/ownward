import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TRIAL_DAYS = 15;

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const { data: existingWorkspace, error: existingError } = await supabase
    .from("value_action_sprint_workspaces")
    .select(
      "id, user_id, access_mode, trial_started_at, trial_ends_at, status"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error(existingError);

    return NextResponse.json(
      { error: "Unable to check trial status." },
      { status: 500 }
    );
  }

  if (existingWorkspace) {
    return NextResponse.json({
      workspaceId: existingWorkspace.id,
      accessMode: existingWorkspace.access_mode,
      trialEndsAt: existingWorkspace.trial_ends_at,
      status: existingWorkspace.status,
    });
  }

  const trialStartedAt = new Date();
  const trialEndsAt = new Date(trialStartedAt);

  trialEndsAt.setUTCDate(
    trialEndsAt.getUTCDate() + TRIAL_DAYS
  );

  const { data: workspace, error: createError } = await supabase
    .from("value_action_sprint_workspaces")
    .insert({
      user_id: user.id,
      status: "not_started",
      access_mode: "trial",
      trial_started_at: trialStartedAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select(
      "id, user_id, access_mode, trial_started_at, trial_ends_at, status"
    )
    .single();

  if (createError) {
    console.error(createError);

    return NextResponse.json(
      { error: "Unable to start the trial." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    workspaceId: workspace.id,
    accessMode: workspace.access_mode,
    trialStartedAt: workspace.trial_started_at,
    trialEndsAt: workspace.trial_ends_at,
    status: workspace.status,
  });
}
