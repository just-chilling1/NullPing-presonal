import { redirect } from "next/navigation";
import { supportRoutes } from "@/config/support.config";

export default function Page() {
  redirect(supportRoutes.home);
}
