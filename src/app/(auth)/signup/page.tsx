import type { Metadata } from "next";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your MenteIQ account — Swiss-made AI Business OS with CRM, invoicing, and knowledge base for service professionals.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return <SignupForm />;
}
