import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";

/** "My Profile" opens the signed-in employee's own record in form view. */
export default async function ProfilePage() {
  const user = await requireUser();
  redirect(`/employees/${user.id}`);
}
