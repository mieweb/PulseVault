-- CreateTable
CREATE TABLE "video_events" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_metrics" (
    "videoId" TEXT NOT NULL,
    "watched50Count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "video_metrics_pkey" PRIMARY KEY ("videoId")
);