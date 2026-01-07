-- CreateTable
CREATE TABLE "video" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT,
    "title" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "originalSize" INTEGER,
    "originalChecksum" TEXT,
    "duration" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "renditions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "transcodedAt" TIMESTAMP(3),
    "organizationId" TEXT,

    CONSTRAINT "video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_videoId_key" ON "video"("videoId");

-- CreateIndex
CREATE INDEX "video_userId_idx" ON "video"("userId");

-- CreateIndex
CREATE INDEX "video_status_idx" ON "video"("status");

-- CreateIndex
CREATE INDEX "video_videoId_idx" ON "video"("videoId");

-- AddForeignKey
ALTER TABLE "video" ADD CONSTRAINT "video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
