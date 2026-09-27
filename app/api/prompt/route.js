import { connectTODB } from "@utils/database";
import Prompt from "@models/prompt";

// 1. Tell Next.js to always execute this route dynamically on every request
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const GET = async (request) => {
  try {
    await connectTODB();

    const prompts = await Prompt.find({}).populate("creator");

      // 2. Return headers that prevent Vercel CDN and browsers from caching
    return new Response(JSON.stringify(prompts), {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    return new Response(JSON.stringify(prompts), { status: 200 });
  } catch (error) {
    return new Response("Failed to fetch all prompts", { status: 500 });
  }
};
