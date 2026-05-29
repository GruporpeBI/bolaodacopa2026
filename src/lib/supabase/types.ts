export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          phone: string;
          cpf: string;
          birth_date: string;
          accepted_terms_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      games: {
        Row: {
          id: string;
          home_team: string;
          away_team: string;
          stage: "group" | "round_of_16" | "quarterfinal" | "semifinal" | "final";
          scheduled_at: string;
          home_score: number | null;
          away_score: number | null;
          ball_possession_home: number | null;
          is_brazil_game: boolean;
          is_final: boolean;
          external_id: number | null;
          is_enabled: boolean;
          predictions_early: boolean;
          ranking_visible: boolean;
          sofascore_id: number | null;
          sofascore_url: string | null;
          status_type: string | null;
          status_description: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["games"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["games"]["Insert"]>;
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          home_score_pred: number;
          away_score_pred: number;
          possession_pred: number;
          submitted_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["predictions"]["Row"], "id" | "submitted_at">;
        Update: Partial<Database["public"]["Tables"]["predictions"]["Insert"]>;
      };
      tournament_predictions: {
        Row: {
          id: string;
          user_id: string;
          // Semifinal 1: semi1 vs semi2
          semi1: string;
          semi2: string;
          sf1_score_a: number;
          sf1_score_b: number;
          sf1_tiebreak: string | null; // quem avança se empate
          // Semifinal 2: semi3 vs semi4
          semi3: string;
          semi4: string;
          sf2_score_a: number;
          sf2_score_b: number;
          sf2_tiebreak: string | null;
          // Final (derivados dos SFs + placar)
          finalist1: string;
          finalist2: string;
          final_score_a: number;
          final_score_b: number;
          final_tiebreak: string | null; // quem vence se empate
          possession_pred_final: number | null;
          champion: string;
          locked_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tournament_predictions"]["Row"], "id" | "locked_at">;
        Update: Partial<Database["public"]["Tables"]["tournament_predictions"]["Insert"]>;
      };
      attendances: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          checked_in_at: string;
          verified_by: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["attendances"]["Row"], "id" | "checked_in_at">;
        Update: Partial<Database["public"]["Tables"]["attendances"]["Insert"]>;
      };
      scores: {
        Row: {
          user_id: string;
          attendance_pts: number;
          result_pts: number;
          exact_score_pts: number;
          tournament_pts: number;
          total_pts: number;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["scores"]["Row"], "updated_at">;
        Update: Partial<Database["public"]["Tables"]["scores"]["Insert"]>;
      };
    };
  };
}
