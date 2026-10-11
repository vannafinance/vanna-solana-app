import { router } from "expo-router";

import { SpaceChooser } from "@/components/spaces/space-chooser";
import { useSpaceChoice } from "@/hooks/use-space-choice";
import { spaceRoutes } from "@/navigation/routes";

export default function Spaces() {
  const { choose } = useSpaceChoice();

  return (
    <SpaceChooser
      onChoose={(space) => {
        void choose();
        router.replace(spaceRoutes[space]);
      }}
    />
  );
}
