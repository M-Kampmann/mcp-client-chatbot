"use client";

import { motion } from "framer-motion";
import { authClient } from "auth/client";
import { useMemo } from "react";
import { FlipWords } from "ui/flip-words";
import { useTranslations } from "next-intl";

function getGreetingByTime() {
  const hour = new Date().getHours();
  if (hour < 12) return "goodMorning";
  if (hour < 18) return "goodAfternoon";
  return "goodEvening";
}

export const Greeting = () => {
  const { data: session } = authClient.useSession();

  const t = useTranslations("Chat.Greeting");

  const user = session?.user;

  const word = useMemo(() => {
    if (!user?.name) return "";
    const words = [
      t(getGreetingByTime(), { name: user.name }),
      t("niceToSeeYouAgain", { name: user.name }),
      t("whatAreYouWorkingOnToday", { name: user.name }),
      t("letMeKnowWhenYoureReadyToBegin"),
      t("whatAreYourThoughtsToday"),
      t("whereWouldYouLikeToStart"),
      t("whatAreYouThinking", { name: user.name }),
    ];
    return words[Math.floor(Math.random() * words.length)];
  }, [user?.name]);

  return (
    <motion.div
      key="welcome"
      className="max-w-3xl mx-auto my-4 h-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-2 leading-relaxed text-center">
        <h1 className="text-4xl font-semibold">
          {word ? <FlipWords words={[word]} className="text-primary" /> : ""}
        </h1>
        <div className="text-4xl"></div>
      </div>
    </motion.div>
  );
};
