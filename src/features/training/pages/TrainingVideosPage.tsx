import Link from "next/link";
import { CheckCircle2, Lightbulb, LucideIcon, Play, Star } from "lucide-react";
import {
  getAcademyOverview,
  getPlatformTutorialVideos,
  getPremiumTutorialVideos,
  trainingProTips,
  trainingQuickStartChecklist,
  trainingWorkflowSteps,
} from "@/lib/training-content";
import { TrainingPageLayout } from "../components/TrainingPageLayout";
import { TrainingVideoCard } from "../components/TrainingVideoCard";
import { TrainingCtaSection } from "../components/TrainingCtaSection";
import {
  AcademyOverview,
  TrainingSectionNav,
  type AcademySectionLink,
} from "../components/TrainingSectionNav";

function TrainingSectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--np-line-pulse)] bg-pulse-100">
        <Icon className="h-5 w-5 text-pulse-700" />
      </div>
      <div>
        <h2 className="text-lg font-medium text-text-heading">{title}</h2>
        <p className="text-sm text-text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

export default function TrainingVideosPage() {
  const platformVideos = getPlatformTutorialVideos();
  const premiumVideos = getPremiumTutorialVideos();
  const overview = getAcademyOverview();

  const sectionLinks: AcademySectionLink[] = [
    { id: "platform-tutorials", label: "Core tutorials" },
    { id: "quick-reference", label: "Quick reference" },
    ...(premiumVideos.length > 0
      ? [{ id: "premium-tutorials", label: "Premium" } as AcademySectionLink]
      : []),
    { id: "launch-resources", label: "Launch resources" },
  ];

  return (
    <TrainingPageLayout>
      <AcademyOverview
        platformCount={overview.platformCount}
        premiumCount={overview.premiumCount}
        faqCount={overview.faqCount}
      />

      <TrainingSectionNav sections={sectionLinks} />

      <section id="platform-tutorials" className="scroll-mt-24 flex flex-col gap-6">
        <TrainingSectionHeader
          icon={Play}
          title="Platform Tutorials"
          subtitle="Core NullPing Cash workflow — watch in order after Dashboard intro videos"
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7 xl:grid-cols-3 xl:gap-8">
          {platformVideos.map((video, index) => (
            <TrainingVideoCard key={video.title} video={video} index={index} />
          ))}
        </div>
      </section>

      <section id="quick-reference" className="scroll-mt-24 glass-card p-5 sm:p-6">
        <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-text-muted">
          Quick reference
        </h3>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trainingWorkflowSteps.map((step) => (
            <li key={step.step} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pulse-100 text-[13px] font-medium text-pulse-700">
                {step.step}
              </span>
              <div className="min-w-0">
                <Link
                  href={step.page}
                  className="text-sm font-medium text-text-heading transition-colors hover:text-pulse-700"
                >
                  {step.title}
                </Link>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {premiumVideos.length > 0 ? (
        <section id="premium-tutorials" className="scroll-mt-24 flex flex-col gap-6">
          <TrainingSectionHeader
            icon={Star}
            title="Premium Feature Tutorials"
            subtitle="Scale after your first live money page — watch in any order"
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7">
            {premiumVideos.map((video) => (
              <TrainingVideoCard key={video.badge} video={video} />
            ))}
          </div>
        </section>
      ) : null}

      <div id="launch-resources" className="scroll-mt-24 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="glass-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-pulse-700" />
            <h3 className="text-base font-medium text-text-heading">Launch checklist</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {trainingQuickStartChecklist.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-text-secondary">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pulse-700" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-pulse-700" />
            <h3 className="text-base font-medium text-text-heading">Pro tips</h3>
          </div>
          <ul className="mt-4 space-y-4">
            {trainingProTips.map((tip) => (
              <li key={tip.title}>
                <p className="text-sm font-medium text-text-heading">{tip.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">{tip.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <TrainingCtaSection />
    </TrainingPageLayout>
  );
}
