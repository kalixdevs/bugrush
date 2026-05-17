import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Log in — Bugrush" };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
