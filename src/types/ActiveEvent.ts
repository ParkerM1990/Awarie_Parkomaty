export interface ActiveEvent {
  id: string;
  structure: string;

  event_name: string;
  event_code: string;

  hardware: string;
  date: string;

  event_level_name?: string;
  info_count?: number;

  level?: string;
}