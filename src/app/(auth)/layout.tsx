import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8 sm:justify-center sm:py-12">
      <div className="mb-6">
        <Logo size="lg" />
      </div>
      <div className="card w-full max-w-md p-5 sm:p-8">{children}</div>
    </div>
  );
}
