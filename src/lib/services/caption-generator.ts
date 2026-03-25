/**
 * Caption + CTA generator for fanpage posts.
 *
 * V1: template-based with workspace name interpolation.
 * Future: plug in OpenAI / Anthropic for AI-generated captions.
 */

export interface CaptionContext {
  fileName: string;
  fileType: string;
  workspaceName: string;
  platform: string;
  tags?: string[];
}

export interface GeneratedCaption {
  title: string;
  content: string;
  tags: string[];
}

const TEMPLATES = [
  {
    match: (ctx: CaptionContext) => ctx.fileType === "image",
    generate: (ctx: CaptionContext): GeneratedCaption => ({
      title: `New photo: ${cleanFileName(ctx.fileName)}`,
      content: [
        `📸 ${cleanFileName(ctx.fileName)}`,
        "",
        `Brought to you by ${ctx.workspaceName}.`,
        "",
        "💬 What do you think? Drop a comment below!",
        "#photography #realestate #newlisting",
      ].join("\n"),
      tags: ["auto-generated", "image", ...(ctx.tags ?? [])],
    }),
  },
  {
    match: (ctx: CaptionContext) => ctx.fileType === "video",
    generate: (ctx: CaptionContext): GeneratedCaption => ({
      title: `New video: ${cleanFileName(ctx.fileName)}`,
      content: [
        `🎬 ${cleanFileName(ctx.fileName)}`,
        "",
        `Watch the latest from ${ctx.workspaceName}!`,
        "",
        "👉 Like & share if you enjoyed this!",
        "#video #realestate #virtualtour",
      ].join("\n"),
      tags: ["auto-generated", "video", ...(ctx.tags ?? [])],
    }),
  },
];

const DEFAULT_TEMPLATE = (ctx: CaptionContext): GeneratedCaption => ({
  title: `New content: ${cleanFileName(ctx.fileName)}`,
  content: [
    `✨ ${cleanFileName(ctx.fileName)}`,
    "",
    `From ${ctx.workspaceName}.`,
    "",
    "📩 DM us for more info!",
  ].join("\n"),
  tags: ["auto-generated", ...(ctx.tags ?? [])],
});

function cleanFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function generateCaption(ctx: CaptionContext): GeneratedCaption {
  const matched = TEMPLATES.find((t) => t.match(ctx));
  return matched ? matched.generate(ctx) : DEFAULT_TEMPLATE(ctx);
}
