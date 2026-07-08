import { getDashboardData } from "@/lib/pros/data";
import { ProsDashboard } from "@/components/pros-dashboard";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const data = await getDashboardData();

  return (
    <main className="min-h-screen overflow-hidden bg-[#070A12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute left-[-20%] top-[-10%] h-[32rem] w-[32rem] rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute right-[-20%] top-[10%] h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[30%] h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>
      <ProsDashboard data={data} />
    </main>
  );
}
