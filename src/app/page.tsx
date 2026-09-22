import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import CornerFrame from "@/components/CornerFrame";

interface UserRow {
  username: string;
  serial_number: string;
  first_name: string;
  last_name: string;
  email: string;
  fame_rating: number;
  is_verified: boolean;
}

export default async function HomePage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const { rows } = await query<UserRow>(
    `SELECT username, serial_number, first_name, last_name, email, fame_rating, is_verified
     FROM users WHERE id = $1`,
    [userId],
  );

  const user = rows[0];
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <CornerFrame className="w-full max-w-md border border-accent/30 bg-white/60 p-8 backdrop-blur-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
          Unit Dashboard
        </p>
        <h1 className="font-display mb-6 text-4xl tracking-wide">
          {user.first_name} {user.last_name}
        </h1>

        <dl className="font-mono flex flex-col gap-3 text-sm">
          <div className="flex justify-between border-b border-foreground/10 pb-2">
            <dt className="field-label opacity-60">Unit ID</dt>
            <dd>{user.username}</dd>
          </div>
          <div className="flex justify-between border-b border-foreground/10 pb-2">
            <dt className="field-label opacity-60">Serial No.</dt>
            <dd>{user.serial_number}</dd>
          </div>
          <div className="flex justify-between border-b border-foreground/10 pb-2">
            <dt className="field-label opacity-60">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between border-b border-foreground/10 pb-2">
            <dt className="field-label opacity-60">Fame Rating</dt>
            <dd>{user.fame_rating}</dd>
          </div>
          <div className="flex justify-between border-b border-foreground/10 pb-2">
            <dt className="field-label opacity-60">Status</dt>
            <dd>{user.is_verified ? "Activated" : "Pending activation"}</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap justify-end gap-4 font-mono text-sm underline">
          <Link href="/profile">
            Edit profile
          </Link>
          <Link href="/discover">
            Discover profiles
          </Link>
          <Link href="/activity">
            View activity
          </Link>
          <Link href="/users/fixture-001">
            View fixture profile
          </Link>
        </div>
      </CornerFrame>
    </div>
  );
}
