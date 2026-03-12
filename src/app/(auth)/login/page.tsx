import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your MenteIQ account — Swiss-made AI Business OS for service professionals.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return <LoginForm />;
}
