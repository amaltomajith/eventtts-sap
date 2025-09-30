import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
    // Ensure Clerk knows where to send unauthenticated users
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
    publicRoutes: [
        '/',
        '/sign-in',
        '/sign-up',
        '/event/:id',
        '/api/webhook/clerk',
        '/api/webhook/stripe',
        '/api/uploadthing',
        '/api/health',
        '/api/predict',
        '/track',
    ],
    ignoredRoutes: [
        '/api/webhook/clerk',
        '/api/webhook/stripe',
        '/api/uploadthing',
    ],
});

export const config = {
	matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
