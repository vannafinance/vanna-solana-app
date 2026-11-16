import { type Href, Redirect } from "expo-router";

import { isWelcomeSeen } from "@/state/session";

export default function Index() {
  return <Redirect href={(isWelcomeSeen() ? "/portfolio" : "/welcome") as Href} />;
}
