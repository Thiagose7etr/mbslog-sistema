// CONFIGURAÇÃO DO BANCO DE DADOS EM NUVEM (SUPABASE / VERCEL - VAYKO LABS)
//
// Credenciais do projeto Supabase conectado à Vercel.

const SUPABASE_URL = "https://kwivvvenqqfchrczoyou.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aXZ2dmVucXFmY2hyY3pveW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjg5MjIsImV4cCI6MjEwNjYwNDkyMn0.eeH6UjHjaG0JYJveA4oCVIvdo2aoUSOjU-5CpE2Z0fI";

// Indica se o Supabase deve ser ativado ou se rodará em LocalStorage
const USE_SUPABASE = SUPABASE_URL.trim() !== "" && SUPABASE_ANON_KEY.trim() !== "";
