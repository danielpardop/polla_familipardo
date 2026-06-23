export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      match_scorers: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          team_name: string;
          minute: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          team_name: string;
          minute?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_id?: string;
          team_name?: string;
          minute?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_scorers_match_id_fkey";
            columns: ["match_id"];
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_scorers_player_id_fkey";
            columns: ["player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          id: string;
          code: string;
          home_team: string;
          home_flag: string;
          away_team: string;
          away_flag: string;
          match_date: string;
          venue: string;
          phase: string;
          home_goals: number | null;
          away_goals: number | null;
          status: Database["public"]["Enums"]["match_status"];
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          home_team: string;
          home_flag: string;
          away_team: string;
          away_flag: string;
          match_date: string;
          venue: string;
          phase?: string;
          home_goals?: number | null;
          away_goals?: number | null;
          status?: Database["public"]["Enums"]["match_status"];
          display_order: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          home_team?: string;
          home_flag?: string;
          away_team?: string;
          away_flag?: string;
          match_date?: string;
          venue?: string;
          phase?: string;
          home_goals?: number | null;
          away_goals?: number | null;
          status?: Database["public"]["Enums"]["match_status"];
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          team_name: string;
          name: string;
          position: string;
          active: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_name: string;
          name: string;
          position?: string;
          active?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_name?: string;
          name?: string;
          position?: string;
          active?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      prediction_scorers: {
        Row: {
          id: string;
          prediction_id: string;
          player_id: string;
          team_name: string;
          slot_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          prediction_id: string;
          player_id: string;
          team_name: string;
          slot_number: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          prediction_id?: string;
          player_id?: string;
          team_name?: string;
          slot_number?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prediction_scorers_player_id_fkey";
            columns: ["player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prediction_scorers_prediction_id_fkey";
            columns: ["prediction_id"];
            referencedRelation: "predictions";
            referencedColumns: ["id"];
          },
        ];
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          home_goals: number;
          away_goals: number;
          points: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: string;
          home_goals: number;
          away_goals: number;
          points?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          match_id?: string;
          home_goals?: number;
          away_goals?: number;
          points?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey";
            columns: ["match_id"];
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "predictions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: Database["public"]["Enums"]["app_role"];
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: Database["public"]["Enums"]["app_role"];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      calculate_points: {
        Args: { p_match_id: string };
        Returns: undefined;
      };
      get_leaderboard: {
        Args: Record<PropertyKey, never>;
        Returns: {
          user_id: string;
          full_name: string;
          total_points: number;
          exact_scores: number;
          goal_differences: number;
          outcomes: number;
          scorer_hits: number;
          predictions_count: number;
        }[];
      };
      has_role: {
        Args: { _user_id: string; _role: Database["public"]["Enums"]["app_role"] };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      match_status: "open" | "closed" | "finished";
    };
    CompositeTypes: Record<string, never>;
  };
};
