import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type Prediction = Database["public"]["Tables"]["predictions"]["Row"];
export type PredictionScorer = Database["public"]["Tables"]["prediction_scorers"]["Row"];
export type MatchScorer = Database["public"]["Tables"]["match_scorers"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type LeaderboardRow = Database["public"]["Functions"]["get_leaderboard"]["Returns"][number];
export type FinishedPredictionRow =
  Database["public"]["Functions"]["get_finished_predictions_for_user"]["Returns"][number];

export type AppUser = {
  id: string;
  email: string;
};

export type AdminUser = Profile & {
  is_admin: boolean;
};

export type PredictionWithScorers = Prediction & {
  scorers: PredictionScorer[];
};

export type MatchScorerWithPlayer = MatchScorer & {
  player?: Pick<Player, "id" | "name" | "team_name" | "position"> | null;
};

export type AuthPayload = {
  session: { user: AppUser } | null;
  user: AppUser | null;
  profile: Profile | null;
  role: AppRole;
  isAdmin: boolean;
};

function appUserFromSupabase(user: { id: string; email?: string | null } | null | undefined): AppUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? "",
  };
}

function messageFromError(error: { message?: string } | null, fallback: string) {
  return error?.message ?? fallback;
}

async function getAuthPayload(): Promise<AuthPayload> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);

  const user = appUserFromSupabase(sessionData.session?.user);
  if (!user) {
    return { session: null, user: null, profile: null, role: "user", isAdmin: false };
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (profile?.deleted_at) {
    await supabase.auth.signOut();
    throw new Error("Esta cuenta fue eliminada por un administrador.");
  }

  const { data: roles, error: rolesError } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (rolesError) throw new Error(rolesError.message);

  const isAdmin = Boolean(roles?.some((item) => item.role === "admin") || profile?.role === "admin");

  return {
    session: { user },
    user,
    profile,
    role: isAdmin ? "admin" : profile?.role ?? "user",
    isAdmin,
  };
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error(messageFromError(error, "Debes iniciar sesion."));
  return data.user;
}

export const api = {
  getSession() {
    return getAuthPayload();
  },

  async login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return getAuthPayload();
  },

  async signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });
    if (error) throw new Error(error.message);
    return getAuthPayload();
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    return { ok: true as const };
  },

  async sendPasswordReset(email: string) {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new Error(error.message);
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },

  async updateProfile(fullName: string) {
    const user = await requireUser();
    const email = user.email ?? "";
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: email.toLowerCase(),
        full_name: fullName.trim(),
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
    return getAuthPayload();
  },

  async listMatches() {
    const { data, error } = await supabase.from("matches").select("*").order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async listPlayers() {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("active", true)
      .order("team_name", { ascending: true })
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async listMatchScorers() {
    const { data, error } = await supabase
      .from("match_scorers")
      .select("*, player:players(id,name,team_name,position)")
      .order("minute", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as MatchScorerWithPlayer[];
  },

  async listMyPredictions() {
    const user = await requireUser();
    const { data: predictions, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const predictionIds = (predictions ?? []).map((prediction) => prediction.id);
    if (predictionIds.length === 0) return [];

    const { data: scorers, error: scorerError } = await supabase
      .from("prediction_scorers")
      .select("*")
      .in("prediction_id", predictionIds)
      .order("slot_number", { ascending: true });
    if (scorerError) throw new Error(scorerError.message);

    const scorersByPrediction = new Map<string, PredictionScorer[]>();
    for (const scorer of scorers ?? []) {
      const current = scorersByPrediction.get(scorer.prediction_id) ?? [];
      current.push(scorer);
      scorersByPrediction.set(scorer.prediction_id, current);
    }

    return (predictions ?? []).map((prediction) => ({
      ...prediction,
      scorers: scorersByPrediction.get(prediction.id) ?? [],
    }));
  },

  async savePrediction(input: {
    match_id: string;
    home_goals: number;
    away_goals: number;
    scorer_player_ids: { team_name: string; player_id: string; slot_number: number }[];
  }) {
    const user = await requireUser();
    const { data: prediction, error } = await supabase
      .from("predictions")
      .upsert(
        {
          user_id: user.id,
          match_id: input.match_id,
          home_goals: input.home_goals,
          away_goals: input.away_goals,
          points: null,
        },
        { onConflict: "user_id,match_id" },
      )
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const { error: deleteError } = await supabase.from("prediction_scorers").delete().eq("prediction_id", prediction.id);
    if (deleteError) throw new Error(deleteError.message);

    if (input.scorer_player_ids.length > 0) {
      const { error: insertError } = await supabase.from("prediction_scorers").insert(
        input.scorer_player_ids.map((scorer) => ({
          prediction_id: prediction.id,
          player_id: scorer.player_id,
          team_name: scorer.team_name,
          slot_number: scorer.slot_number,
        })),
      );
      if (insertError) throw new Error(insertError.message);
    }

    return this.listMyPredictions();
  },

  async getLeaderboard() {
    const { data, error } = await supabase.rpc("get_leaderboard");
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getFinishedPredictionsForUser(userId: string) {
    const { data, error } = await supabase.rpc("get_finished_predictions_for_user", { p_user_id: userId });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async listAdminUsers() {
    const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([
      supabase.from("profiles").select("*").is("deleted_at", null).order("created_at", { ascending: true }),
      supabase.from("user_roles").select("*"),
    ]);

    if (profilesError) throw new Error(profilesError.message);
    if (rolesError) throw new Error(rolesError.message);

    const adminIds = new Set((roles ?? []).filter((role) => role.role === "admin").map((role) => role.user_id));
    return (profiles ?? []).map((profile) => ({
      ...profile,
      is_admin: adminIds.has(profile.id) || profile.role === "admin",
    }));
  },

  async setAdminRole(userId: string, isAdmin: boolean) {
    if (isAdmin) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      if (roleError) throw new Error(roleError.message);
    } else {
      const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (deleteError) throw new Error(deleteError.message);
    }

    const { error: profileError } = await supabase.from("profiles").update({ role: isAdmin ? "admin" : "user" }).eq("id", userId);
    if (profileError) throw new Error(profileError.message);
  },

  async deleteUserFromApp(userId: string) {
    const { error: predictionsError } = await supabase.from("predictions").delete().eq("user_id", userId);
    if (predictionsError) throw new Error(predictionsError.message);

    const { error: rolesError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (rolesError) throw new Error(rolesError.message);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        deleted_at: new Date().toISOString(),
        role: "user",
      })
      .eq("id", userId);
    if (profileError) throw new Error(profileError.message);
  },

  async updateMatch(matchId: string, input: MatchUpdate) {
    const { data, error } = await supabase.from("matches").update(input).eq("id", matchId).select("*").single();
    if (error) throw new Error(error.message);

    if (input.status === "finished") {
      const { error: pointsError } = await supabase.rpc("calculate_points", { p_match_id: matchId });
      if (pointsError) throw new Error(pointsError.message);
    }

    return data;
  },

  async replaceMatchScorers(
    matchId: string,
    scorers: { player_id: string; team_name: string; minute: number | null }[],
  ) {
    const { error: deleteError } = await supabase.from("match_scorers").delete().eq("match_id", matchId);
    if (deleteError) throw new Error(deleteError.message);

    if (scorers.length === 0) return;

    const { error: insertError } = await supabase.from("match_scorers").insert(
      scorers.map((scorer) => ({
        match_id: matchId,
        player_id: scorer.player_id,
        team_name: scorer.team_name,
        minute: scorer.minute,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  },
};
