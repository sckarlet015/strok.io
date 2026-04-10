import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <SignIn />
    </main>
  );
}
