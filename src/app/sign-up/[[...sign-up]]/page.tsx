import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <SignUp />
    </main>
  );
}
