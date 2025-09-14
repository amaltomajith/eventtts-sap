import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // ✅ Pass your keys here using your custom environment variable names
  publishableKey: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API,
  secretKey: process.env.CLERK_API_KEY,
  
  publicRoutes: [
    "/",
    "/event/:id",
    "/api/webhook/clerk",
    "/api/webhook/stripe",
    "/api/uploadthing",
  ],
  ignoredRoutes: [
    "/api/webhook/clerk",
    "/api/webhook/stripe",
    "/api/uploadthing",
  ],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};