-- APPLIED 2026-11-03 as migration pin_search_path_online_helpers (security advisor: function_search_path_mutable).
alter function public.tc_valid(text) set search_path = public;
alter function public.tc_norm(text) set search_path = public;
alter function public.tc_mins(text) set search_path = public;
alter function public.tc_inc(text) set search_path = public;
alter function public.tc_category(int) set search_path = public;
alter function public.glicko2_f(double precision, double precision, double precision, double precision, double precision, double precision) set search_path = public;
alter function public.glicko2_decay(double precision, double precision, double precision) set search_path = public;
alter function public.rating_window(int) set search_path = public;
